#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const requiredArtifacts = [
  '.swimpay-agent/SPRINT_5A_REPORT.md',
  '.swimpay-agent/BLOCKERS.md',
  'docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md',
  'docs/PRODUCTION_ADMIN_AUTH_PREFLIGHT.md',
  'docs/ADMIN_AUTH_AND_RBAC.md',
  'docs/11_SECURITY_AND_PRIVACY.md',
  '.env.production.example',
  'infra/docker-compose.production-admin-auth.override.yml',
  'scripts/production-admin-auth-preflight.mjs'
];

const productionTemplateFiles = ['.env.production.example', 'infra/docker-compose.production-admin-auth.override.yml'];

const forbiddenSafetyPatterns = [
  /official_bank_confirmation\s*["']?\s*[:=]\s*true/iu,
  /\bbank_confirmed\b/iu,
  /\bguaranteed_payment\b/iu,
  /\bpsp_confirmed\b/iu,
  /auto_confirm_enabled\s*["']?\s*[:=]\s*true/iu,
  /\bop_[A-Za-z0-9_-]+\.[a-z_]+\.[A-Za-z0-9_-]{16,}\b/u
];

export function buildProductionAdminAuthPreflightPolicy() {
  return {
    scope: 'production_admin_auth_secret_injection_preflight',
    mutatesSecrets: false,
    generatesProductionSecrets: false,
    requiresProductionDeployment: false,
    requiresRealNotifications: false,
    allowedProductionAdminAuthModes: ['signed_token', 'external_identity_provider'],
    forbiddenProductionValues: [
      'ADMIN_AUTH_MODE=dev_token',
      'DEV_ADMIN_TOKEN set',
      'DEV_ADMIN_OPERATOR_ID set',
      'DEV_ADMIN_ROLE set',
      'ADMIN_TOKEN_HMAC_SECRET change_me placeholder',
      'operator tokens committed to repo'
    ],
    requiredSecretInjection: [
      'ADMIN_TOKEN_HMAC_SECRET from external environment or secret store',
      'dev admin token variables blank in production',
      'production env examples contain placeholders only'
    ]
  };
}

export function inspectProductionAdminAuthPreflight(options = {}) {
  const root = resolve(options.root ?? process.cwd());
  const envText = options.envText ?? readOptional(root, '.env.production.example');
  const templateMode = options.templateMode ?? true;
  const env = parseEnvText(envText);
  const failures = [];

  const missingArtifacts = requiredArtifacts.filter((artifact) => !existsSync(join(root, artifact)));
  if (missingArtifacts.length > 0) {
    failures.push(`missing required artifacts: ${missingArtifacts.join(', ')}`);
  }

  const blockers = readOptional(root, '.swimpay-agent/BLOCKERS.md');
  const docs = [
    readOptional(root, 'docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md'),
    readOptional(root, 'docs/PRODUCTION_ADMIN_AUTH_PREFLIGHT.md'),
    readOptional(root, 'docs/ADMIN_AUTH_AND_RBAC.md')
  ].join('\n');
  const override = readOptional(root, 'infra/docker-compose.production-admin-auth.override.yml');

  const productionTemplatePresent = existsSync(join(root, '.env.production.example'));
  const blockersClear = blockers.includes('No current critical blockers.') && !blockers.includes('Current critical blocker');
  if (!blockersClear) {
    failures.push('blockers file must state no current critical blockers');
  }

  const devAdminFailures = validateAdminEnv(env, templateMode);
  failures.push(...devAdminFailures);

  const secretInjectionDocumented =
    /(external|server) (environment|secret store|secret manager|secret storage)/iu.test(docs) &&
    override.includes('${ADMIN_TOKEN_HMAC_SECRET:?') &&
    override.includes('ADMIN_AUTH_MODE: signed_token') &&
    override.includes('DEV_ADMIN_TOKEN: ""');
  if (!secretInjectionDocumented) {
    failures.push('production secret injection must be documented and required by Compose override');
  }

  const committedSecretHits = findCommittedProductionSecretText(root);
  if (committedSecretHits.length > 0) {
    failures.push(`committed production secret-like value found: ${committedSecretHits.join(', ')}`);
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
    committedSecretHits,
    forbiddenHits,
    summary: {
      productionTemplatePresent,
      requiredArtifactsPresent: missingArtifacts.length === 0,
      blockersClear,
      devAdminValuesRejected: devAdminFailures.length === 0,
      secretInjectionDocumented,
      noCommittedProductionSecrets: committedSecretHits.length === 0,
      noForbiddenSafetyText: forbiddenHits.length === 0
    },
    policy: buildProductionAdminAuthPreflightPolicy()
  };
}

export function renderProductionAdminAuthPreflightReport(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  return [
    '# Production Admin Auth Preflight',
    '',
    `status: ${status}`,
    `generated_at: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Production template present: ${yesNo(result.summary.productionTemplatePresent)}`,
    `- Required artifacts present: ${yesNo(result.summary.requiredArtifactsPresent)}`,
    `- Blockers clear: ${yesNo(result.summary.blockersClear)}`,
    `- Dev admin values rejected: ${yesNo(result.summary.devAdminValuesRejected)}`,
    `- Secret injection documented: ${yesNo(result.summary.secretInjectionDocumented)}`,
    `- No committed production secrets: ${yesNo(result.summary.noCommittedProductionSecrets)}`,
    `- Safety wording clean: ${yesNo(result.summary.noForbiddenSafetyText)}`,
    '',
    '## Forbidden Production Values',
    '',
    ...result.policy.forbiddenProductionValues.map((value) => `- ${value}`),
    '',
    '## Required Secret Injection',
    '',
    ...result.policy.requiredSecretInjection.map((value) => `- ${value}`),
    '',
    '## Failures',
    '',
    ...(result.failures.length > 0 ? result.failures.map((failure) => `- ${failure}`) : ['- None'])
  ].join('\n') + '\n';
}

function validateAdminEnv(env, templateMode) {
  const failures = [];
  const nodeEnv = env.NODE_ENV?.toLowerCase();
  const adminMode = env.ADMIN_AUTH_MODE?.toLowerCase();

  if (nodeEnv === 'production' && adminMode === 'dev_token') {
    failures.push('production environment must not use ADMIN_AUTH_MODE=dev_token');
  }

  for (const key of ['DEV_ADMIN_TOKEN', 'DEV_ADMIN_OPERATOR_ID', 'DEV_ADMIN_ROLE']) {
    if (hasValue(env[key])) {
      failures.push(`production environment must not set ${key}`);
    }
  }

  if (adminMode && !['signed_token', 'external_identity_provider'].includes(adminMode)) {
    failures.push('production ADMIN_AUTH_MODE must be signed_token or external_identity_provider');
  }

  const secret = env.ADMIN_TOKEN_HMAC_SECRET;
  if (hasValue(secret) && /change_me|local|dev|example|placeholder/iu.test(secret)) {
    failures.push('ADMIN_TOKEN_HMAC_SECRET must not use a change_me placeholder');
  }

  if (!templateMode && adminMode === 'signed_token' && !hasValue(secret)) {
    failures.push('signed_token production environment must provide ADMIN_TOKEN_HMAC_SECRET');
  }

  return failures;
}

function findCommittedProductionSecretText(root) {
  const hits = [];
  for (const file of productionTemplateFiles) {
    const content = readOptional(root, file);
    const lines = content.split(/\r?\n/u);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      if (/^(ADMIN_TOKEN_HMAC_SECRET|DEV_ADMIN_TOKEN|SWIMPAY_REQUESTER_TOKEN|SWIMPAY_APPROVER_TOKEN)\s*=/u.test(trimmed)) {
        const [, value = ''] = trimmed.split(/=(.*)/su);
        if (hasValue(value) && !value.includes('${')) {
          hits.push(`${file}:${index + 1}`);
        }
      }
    });
  }
  return hits;
}

function findForbiddenSafetyText(root) {
  const hits = [];
  for (const file of [
    'docs/PRODUCTION_ADMIN_AUTH_PREFLIGHT.md',
    'docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md',
    'docs/11_SECURITY_AND_PRIVACY.md',
    '.swimpay-agent/SPRINT_5A_REPORT.md',
    '.swimpay-agent/NEXT_ACTION.md'
  ]) {
    const content = readOptional(root, file);
    for (const pattern of forbiddenSafetyPatterns) {
      if (pattern.test(content)) {
        hits.push(`${file}:${pattern.source}`);
      }
    }
  }
  return hits;
}

function parseEnvText(text) {
  const env = {};
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/gu, '');
    }
  }
  return env;
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function readOptional(root, relativePath) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function main() {
  const result = inspectProductionAdminAuthPreflight();
  console.log(renderProductionAdminAuthPreflightReport(result));
  if (!result.ok) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('production-admin-auth-preflight.mjs')) {
  main();
}
