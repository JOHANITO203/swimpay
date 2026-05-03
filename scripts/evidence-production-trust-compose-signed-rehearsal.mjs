#!/usr/bin/env node

import { buildEvidenceProductionTrustHandoffPlan, runEvidenceProductionTrustHandoff } from './evidence-production-trust-handoff.mjs';

const defaultBaseUrl = 'http://localhost:8080';
const composeOverrideFile = 'infra/docker-compose.signed-admin.override.yml';
const requiredMutatingEnv = [
  'SWIMPAY_SIGNED_COMPOSE_HANDOFF=true',
  'SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true',
  'ADMIN_TOKEN_HMAC_SECRET',
  'SWIMPAY_EVIDENCE_ID',
  'SWIMPAY_REQUESTER_TOKEN',
  'SWIMPAY_APPROVER_TOKEN'
];

export function buildSignedComposeHandoffPlan(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl);
  return {
    scope: 'local_compose_only',
    baseUrl,
    requiresProductionDeployment: false,
    requiresRealNotifications: false,
    requiresInstalledAppEnumeration: false,
    requiresSmsAccess: false,
    mutatesOnlyWithExplicitApproval: true,
    compose: {
      overrideFile: composeOverrideFile,
      upCommand:
        'docker compose --env-file .env.example -f infra/docker-compose.yml -f infra/docker-compose.signed-admin.override.yml up -d --build swimpay-api swimpay-web proxy',
      configCommand:
        'docker compose --env-file .env.example -f infra/docker-compose.yml -f infra/docker-compose.signed-admin.override.yml config',
      restoreCommand: 'docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api swimpay-web proxy'
    },
    requiredEnv: requiredMutatingEnv,
    tokenHelper: 'npm run operator:tokens',
    handoff: buildEvidenceProductionTrustHandoffPlan({ baseUrl }),
    acceptanceCriteria: [
      'local API is running with ADMIN_AUTH_MODE=signed_token',
      'evidence is approved_for_review_only before request',
      'requester and approver are distinct signed operators',
      'same-actor approval is blocked',
      'second-operator approval succeeds',
      'metadata trust is revoked before closeout',
      'audit trace stays redacted',
      'trusted=false and auto_confirm_enabled=false remain true for payment safety'
    ]
  };
}

export function validateSignedComposeHandoffEnvironment(env = process.env) {
  const failures = [];
  if (env.SWIMPAY_SIGNED_COMPOSE_HANDOFF !== 'true') {
    failures.push('SWIMPAY_SIGNED_COMPOSE_HANDOFF=true is required for signed Compose handoff rehearsal');
  }

  if (env.SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF !== 'true') {
    failures.push('SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true is required before mutating production trust metadata');
  }

  for (const key of ['ADMIN_TOKEN_HMAC_SECRET', 'SWIMPAY_EVIDENCE_ID', 'SWIMPAY_REQUESTER_TOKEN', 'SWIMPAY_APPROVER_TOKEN']) {
    if (!hasValue(env[key])) {
      failures.push(`${key} is required for signed Compose handoff rehearsal`);
    }
  }

  if (hasValue(env.SWIMPAY_REQUESTER_TOKEN) && env.SWIMPAY_REQUESTER_TOKEN === env.SWIMPAY_APPROVER_TOKEN) {
    failures.push('requester and approver tokens must be different');
  }

  return {
    ok: failures.length === 0,
    canMutate: failures.length === 0,
    failures,
    mode: failures.length === 0 ? 'signed_compose_mutating_drill' : 'guarded'
  };
}

export async function runSignedComposeHandoff(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? options.env?.SWIMPAY_BASE_URL ?? process.env.SWIMPAY_BASE_URL ?? defaultBaseUrl);
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required for signed Compose handoff rehearsal.');
  }

  const guard = validateSignedComposeHandoffEnvironment(env);
  if (!guard.ok) {
    return {
      ok: false,
      mutated: false,
      mode: 'guarded',
      failures: guard.failures,
      plan: buildSignedComposeHandoffPlan({ baseUrl })
    };
  }

  const health = await fetchHealth(fetchImpl, baseUrl);
  if (!health.ok) {
    return {
      ok: false,
      mutated: false,
      mode: 'signed_compose_health_failed',
      failures: [`local API health check failed with status ${health.status}`],
      health
    };
  }

  const handoff = await runEvidenceProductionTrustHandoff({
    baseUrl,
    evidenceId: env.SWIMPAY_EVIDENCE_ID,
    requesterToken: env.SWIMPAY_REQUESTER_TOKEN,
    approverToken: env.SWIMPAY_APPROVER_TOKEN,
    allowMutatingDrill: true,
    fetchImpl
  });

  return {
    ...handoff,
    mode: handoff.ok ? 'signed_compose_dual_operator_drill' : 'signed_compose_dual_operator_drill_failed',
    health
  };
}

async function fetchHealth(fetchImpl, baseUrl) {
  const response = await fetchImpl(`${baseUrl}/api-health`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    body: await response.json()
  };
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/u, '');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const baseUrl = process.env.SWIMPAY_BASE_URL ?? defaultBaseUrl;
  if (args.has('--plan')) {
    console.log(JSON.stringify(buildSignedComposeHandoffPlan({ baseUrl }), null, 2));
    return;
  }

  const result = await runSignedComposeHandoff({ baseUrl });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` ||
  process.argv[1]?.endsWith('evidence-production-trust-compose-signed-rehearsal.mjs')
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
