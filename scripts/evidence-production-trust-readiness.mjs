#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const defaultRoot = process.cwd();

const requiredArtifacts = [
  '.swimpay-agent/SPRINT_4Y_REPORT.md',
  '.swimpay-agent/BLOCKERS.md',
  'docs/BANK_EVIDENCE_SIGNED_COMPOSE_HANDOFF_PLAYBOOK.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_HANDOFF.md',
  'docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md',
  'infra/docker-compose.signed-admin.override.yml',
  'scripts/operator-token-helper.mjs',
  'scripts/evidence-production-trust-compose-signed-rehearsal.mjs'
];

const safetyScanFiles = [
  '.swimpay-agent/SPRINT_4Y_REPORT.md',
  'docs/BANK_EVIDENCE_SIGNED_COMPOSE_HANDOFF_PLAYBOOK.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_HANDOFF.md',
  'docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md',
  'docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md'
];

const forbiddenPatterns = [
  /official_bank_confirmation\s*["']?\s*[:=]\s*true/iu,
  /\bbank_confirmed\b/iu,
  /\bguaranteed_payment\b/iu,
  /\bpsp_confirmed\b/iu,
  /auto_confirm_enabled\s*["']?\s*[:=]\s*true/iu
];

export function buildProductionTrustReadinessChecklist() {
  return {
    scope: 'operator_handoff_readiness',
    mutatesEvidence: false,
    requiresProductionDeployment: false,
    requiresRealNotifications: false,
    requiresInstalledAppEnumeration: false,
    requiredArtifacts,
    acceptanceCriteria: [
      'Sprint 4Y report must be PASS',
      'blockers file must have no critical blocker',
      'signed Compose drill must have completed with audit continuity',
      'metadata trust must be revoked after every rehearsal',
      'Compose default local mode must be restored to dev_token after drills',
      'operator tokens must be treated as local secrets and never committed',
      'production trust must remain metadata-only',
      'auto-confirmation must remain disabled',
      'real bank notifications require a separate future readiness review'
    ],
    nextHumanGate: 'operator handoff package review before any production trust operation'
  };
}

export function inspectProductionTrustReadiness(options = {}) {
  const root = resolve(options.root ?? defaultRoot);
  const failures = [];
  const missingArtifacts = requiredArtifacts.filter((artifact) => !existsSync(join(root, artifact)));

  if (missingArtifacts.length > 0) {
    failures.push(`missing required artifacts: ${missingArtifacts.join(', ')}`);
  }

  const blockers = readOptional(root, '.swimpay-agent/BLOCKERS.md');
  const sprint4Y = readOptional(root, '.swimpay-agent/SPRINT_4Y_REPORT.md');
  const baseCompose = readOptional(root, 'infra/docker-compose.yml');
  const nextAction = readOptional(root, '.swimpay-agent/NEXT_ACTION.md');

  const blockersClear = blockers.includes('No current critical blockers.') && !blockers.includes('Current critical blocker');
  if (!blockersClear) {
    failures.push('blockers file must state no current critical blockers');
  }

  const sprint4YPassed = /status:\s*PASS\b/u.test(sprint4Y);
  if (!sprint4YPassed) {
    failures.push('Sprint 4Y report must have status: PASS');
  }

  const defaultComposeModeDocumented =
    baseCompose.includes('ADMIN_AUTH_MODE: ${ADMIN_AUTH_MODE:-dev_token}') ||
    baseCompose.includes('ADMIN_AUTH_MODE: dev_token') ||
    nextAction.includes('default mode restored to `dev_token`') ||
    sprint4Y.includes('restored local default dev-token mode');
  if (!defaultComposeModeDocumented) {
    failures.push('default local Compose dev-token mode must be documented or configured');
  }

  const forbiddenHits = findForbiddenSafetyText(root);
  if (forbiddenHits.length > 0) {
    failures.push(`forbidden safety text found: ${forbiddenHits.join(', ')}`);
  }

  return {
    ok: failures.length === 0,
    generatedAt: options.now ?? new Date().toISOString(),
    failures,
    summary: {
      requiredArtifactsPresent: missingArtifacts.length === 0,
      blockersClear,
      sprint4YPassed,
      noForbiddenSafetyText: forbiddenHits.length === 0,
      defaultComposeModeDocumented
    },
    missingArtifacts,
    forbiddenHits,
    checklist: buildProductionTrustReadinessChecklist()
  };
}

export function renderProductionTrustReadinessReport(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  const lines = [
    '# Production Trust Handoff Readiness Check',
    '',
    `status: ${status}`,
    `generated_at: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Required artifacts present: ${yesNo(result.summary.requiredArtifactsPresent)}`,
    `- Blockers clear: ${yesNo(result.summary.blockersClear)}`,
    `- Sprint 4Y passed: ${yesNo(result.summary.sprint4YPassed)}`,
    `- Safety wording clean: ${yesNo(result.summary.noForbiddenSafetyText)}`,
    `- Default Compose mode documented: ${yesNo(result.summary.defaultComposeModeDocumented)}`,
    '',
    '## Acceptance Criteria',
    '',
    ...result.checklist.acceptanceCriteria.map((item) => `- ${item}`),
    '',
    '## Safety Boundary',
    '',
    '- Production trust is app metadata trust only.',
    '- It is not official bank confirmation.',
    '- It does not enable auto-confirmation.',
    '- Real bank notifications require a separate future readiness review.',
    '- Operator tokens are local secrets and must not be committed.',
    '- Every rehearsal must end with metadata trust revoked.',
    '',
    '## Failures',
    '',
    ...(result.failures.length > 0 ? result.failures.map((failure) => `- ${failure}`) : ['- None'])
  ];

  return `${lines.join('\n')}\n`;
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
  const result = inspectProductionTrustReadiness();
  console.log(renderProductionTrustReadinessReport(result));
  if (!result.ok) {
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` ||
  process.argv[1]?.endsWith('evidence-production-trust-readiness.mjs')
) {
  main();
}
