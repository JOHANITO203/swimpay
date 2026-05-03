#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const requiredArtifacts = [
  '.swimpay-agent/SPRINT_4Z_REPORT.md',
  '.swimpay-agent/SPRINT_5A_REPORT.md',
  '.swimpay-agent/BLOCKERS.md',
  '.swimpay-agent/NEXT_ACTION.md',
  '.swimpay-agent/PROGRESS_LOG.md',
  'docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md',
  'docs/11_SECURITY_AND_PRIVACY.md',
  'scripts/operator-token-helper.mjs',
  'scripts/operator-identity-readiness.mjs',
  'infra/docker-compose.signed-admin.override.yml',
  'tasks/257_operator_identity_lifecycle_policy.md',
  'tasks/258_operator_secret_storage_and_rotation_runbook.md',
  'tasks/259_operator_revocation_and_break_glass_runbook.md',
  'tasks/260_production_admin_auth_preflight_gate.md',
  'tasks/261_operator_identity_readiness_tests.md',
  'tasks/262_security_docs_operator_identity_update.md',
  'tasks/263_sprint_5a_validation.md',
  'tasks/264_sprint_5a_closeout_review.md'
];

const safetyScanFiles = [
  'docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md',
  'docs/11_SECURITY_AND_PRIVACY.md',
  '.swimpay-agent/SPRINT_4Z_REPORT.md',
  '.swimpay-agent/SPRINT_5A_REPORT.md',
  '.swimpay-agent/BLOCKERS.md',
  '.swimpay-agent/NEXT_ACTION.md',
  '.swimpay-agent/PROGRESS_LOG.md',
  'tasks/257_operator_identity_lifecycle_policy.md',
  'tasks/258_operator_secret_storage_and_rotation_runbook.md',
  'tasks/259_operator_revocation_and_break_glass_runbook.md',
  'tasks/260_production_admin_auth_preflight_gate.md',
  'tasks/261_operator_identity_readiness_tests.md',
  'tasks/262_security_docs_operator_identity_update.md',
  'tasks/263_sprint_5a_validation.md',
  'tasks/264_sprint_5a_closeout_review.md'
];

const forbiddenPatterns = [
  /official_bank_confirmation\s*["']?\s*[:=]\s*true/iu,
  /\bbank_confirmed\b/iu,
  /\bguaranteed_payment\b/iu,
  /\bpsp_confirmed\b/iu,
  /auto_confirm_enabled\s*["']?\s*[:=]\s*true/iu,
  /\bop_[A-Za-z0-9_-]+\.[a-z_]+\.[A-Za-z0-9_-]{16,}\b/u,
  /\braw_phone\b/iu,
  /\braw_notification_text\b/iu
];

export function buildOperatorIdentityLifecyclePolicy() {
  return {
    scope: 'production_operator_identity_secret_lifecycle',
    mutatesSecrets: false,
    generatesProductionSecrets: false,
    requiresProductionDeployment: false,
    requiresRealNotifications: false,
    requiredControls: [
      'operator_onboarding',
      'credential_issuance',
      'credential_rotation',
      'credential_revocation',
      'secure_secret_storage',
      'break_glass_access',
      'audit_review',
      'requester_approver_separation'
    ],
    forbiddenProductionStates: [
      'ADMIN_AUTH_MODE=dev_token',
      'DEV_ADMIN_TOKEN set',
      'DEV_ADMIN_OPERATOR_ID set',
      'DEV_ADMIN_ROLE set',
      'shared operator token',
      'untracked break-glass access'
    ],
    acceptedProductionAuthModes: ['signed_token_or_external_identity_provider'],
    nextHumanGate: 'choose production operator identity provider before production handoff'
  };
}

export function inspectOperatorIdentityReadiness(options = {}) {
  const root = resolve(options.root ?? process.cwd());
  const missingArtifacts = requiredArtifacts.filter((artifact) => !existsSync(join(root, artifact)));
  const failures = [];
  if (missingArtifacts.length > 0) {
    failures.push(`missing required artifacts: ${missingArtifacts.join(', ')}`);
  }

  const blockers = readOptional(root, '.swimpay-agent/BLOCKERS.md');
  const lifecycleDoc = readOptional(root, 'docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md');
  const readinessDoc = readOptional(root, 'docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md');
  const tokenHelper = readOptional(root, 'scripts/operator-token-helper.mjs');
  const composeOverride = readOptional(root, 'infra/docker-compose.signed-admin.override.yml');

  const blockersClear = blockers.includes('No current critical blockers.') && !blockers.includes('Current critical blocker');
  if (!blockersClear) {
    failures.push('blockers file must state no current critical blockers');
  }

  const localTokenHelperMarkedNonProduction =
    lifecycleDoc.includes('not production operator lifecycle tooling') ||
    readinessDoc.includes('not production operator lifecycle tooling') ||
    tokenHelper.includes('local_development_only');
  if (!localTokenHelperMarkedNonProduction) {
    failures.push('local token helper must be marked non-production');
  }

  const productionLifecycleDocumented = [
    'operator onboarding',
    'credential issuance',
    'credential rotation',
    'credential revocation',
    'break-glass access',
    'audit review'
  ].every((phrase) => lifecycleDoc.toLowerCase().includes(phrase));
  if (!productionLifecycleDocumented) {
    failures.push('operator identity lifecycle controls must be documented');
  }

  const productionPreflightDocumented =
    lifecycleDoc.includes('ADMIN_AUTH_MODE=dev_token') &&
    lifecycleDoc.includes('DEV_ADMIN_TOKEN') &&
    lifecycleDoc.includes('ADMIN_TOKEN_HMAC_SECRET') &&
    composeOverride.includes('ADMIN_AUTH_MODE: signed_token');
  if (!productionPreflightDocumented) {
    failures.push('production admin auth preflight must be documented');
  }

  const forbiddenHits = findForbiddenSafetyText(root);
  if (forbiddenHits.length > 0) {
    failures.push(`forbidden safety text found: ${forbiddenHits.join(', ')}`);
  }

  return {
    ok: failures.length === 0,
    generatedAt: options.now ?? new Date().toISOString(),
    failures,
    missingArtifacts,
    forbiddenHits,
    summary: {
      requiredArtifactsPresent: missingArtifacts.length === 0,
      blockersClear,
      localTokenHelperMarkedNonProduction,
      productionLifecycleDocumented,
      productionPreflightDocumented,
      noForbiddenSafetyText: forbiddenHits.length === 0
    },
    policy: buildOperatorIdentityLifecyclePolicy()
  };
}

export function renderOperatorIdentityReadinessReport(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  return [
    '# Operator Identity and Secret Lifecycle Readiness',
    '',
    `status: ${status}`,
    `generated_at: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Required artifacts present: ${yesNo(result.summary.requiredArtifactsPresent)}`,
    `- Blockers clear: ${yesNo(result.summary.blockersClear)}`,
    `- Local token helper marked non-production: ${yesNo(result.summary.localTokenHelperMarkedNonProduction)}`,
    `- Production lifecycle documented: ${yesNo(result.summary.productionLifecycleDocumented)}`,
    `- Production preflight documented: ${yesNo(result.summary.productionPreflightDocumented)}`,
    `- Safety wording clean: ${yesNo(result.summary.noForbiddenSafetyText)}`,
    '',
    '## Production-forbidden States',
    '',
    ...result.policy.forbiddenProductionStates.map((state) => `- ${state}`),
    '',
    '## Required Controls',
    '',
    ...result.policy.requiredControls.map((control) => `- ${control}`),
    '',
    '## Failures',
    '',
    ...(result.failures.length > 0 ? result.failures.map((failure) => `- ${failure}`) : ['- None'])
  ].join('\n') + '\n';
}

function findForbiddenSafetyText(root) {
  const hits = [];
  for (const file of safetyScanFiles) {
    const content = readOptional(root, file);
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        hits.push(`${file}:${pattern.source}`);
      }
    }
  }
  return hits;
}

function readOptional(root, relativePath) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function main() {
  const result = inspectOperatorIdentityReadiness();
  console.log(renderOperatorIdentityReadinessReport(result));
  if (!result.ok) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('operator-identity-readiness.mjs')) {
  main();
}
