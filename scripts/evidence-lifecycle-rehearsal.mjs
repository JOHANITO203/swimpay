#!/usr/bin/env node

const defaultBaseUrl = 'http://localhost:8080';
const defaultAdminToken = 'change_me_local_admin_token';
const fullSha256Pattern = /\b[a-f0-9]{64}\b/iu;
const phonePattern = /(?:\+7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s()-]*\d{2}[\s()-]*\d{2}/u;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u;
const forbiddenRawKeys = [
  'raw_phone',
  'phone',
  'raw_notification_text',
  'raw_notification',
  'raw_title',
  'raw_body',
  'notification_text',
  'secret',
  'api_key',
  'private_key'
];

export function buildEvidenceLifecycleRehearsalPlan(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl);
  return {
    baseUrl,
    requiresRealNotifications: false,
    requiresInstalledAppEnumeration: false,
    requiresProductionDeployment: false,
    steps: [
      {
        name: 'fetch_review_dashboard',
        method: 'GET',
        path: '/v1/admin/bank-evidence/review-dashboard',
        url: `${baseUrl}/v1/admin/bank-evidence/review-dashboard`
      },
      {
        name: 'fetch_evidence_audit_trace',
        method: 'GET',
        path: '/v1/admin/audit-events?object_type=bank_package_evidence',
        url: `${baseUrl}/v1/admin/audit-events?object_type=bank_package_evidence`
      },
      {
        name: 'verify_review_only_safety_flags',
        method: 'ASSERT',
        path: 'dashboard.safety',
        expected: {
          trusted: false,
          production_trust_requested: false,
          auto_confirm_enabled: false
        }
      },
      {
        name: 'verify_production_trust_guardrails',
        method: 'ASSERT',
        path: 'production_trust_dry_run',
        expected: {
          same_actor_approval: 'bank_evidence_dual_control_required',
          trusted: false,
          auto_confirm_enabled: false
        }
      }
    ]
  };
}

export function inspectEvidenceLifecycleRehearsal(input) {
  const failures = [];
  const checked = [
    'review_dashboard_redacted',
    'audit_trace_redacted',
    'review_only_safety_flags',
    'production_trust_dual_control_guard'
  ];

  inspectDashboard(input.dashboard, failures);
  inspectAuditEvents(input.auditEvents, failures);
  inspectProductionTrustGuard(input.productionTrustGuard, failures);

  return {
    ok: failures.length === 0,
    failures,
    checked
  };
}

export async function runEvidenceLifecycleRehearsal(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl);
  const adminToken = options.adminToken ?? defaultAdminToken;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required for evidence lifecycle rehearsal.');
  }

  const dashboard = await fetchJson(fetchImpl, `${baseUrl}/v1/admin/bank-evidence/review-dashboard`, {
    method: 'GET',
    adminToken
  });
  const auditEvents = await fetchJson(fetchImpl, `${baseUrl}/v1/admin/audit-events?object_type=bank_package_evidence`, {
    method: 'GET',
    adminToken
  });
  const productionTrustGuard = await maybeExerciseProductionTrustGuard({
    baseUrl,
    adminToken,
    evidenceId: options.evidenceId,
    actorId: options.actorId,
    fetchImpl
  });

  return inspectEvidenceLifecycleRehearsal({
    dashboard: dashboard.body,
    auditEvents: auditEvents.body,
    productionTrustGuard
  });
}

async function maybeExerciseProductionTrustGuard(params) {
  if (!params.evidenceId) {
    return undefined;
  }

  const request = await fetchJson(
    params.fetchImpl,
    `${params.baseUrl}/v1/admin/bank-evidence/${encodeURIComponent(params.evidenceId)}/request-production-trust`,
    {
      method: 'POST',
      adminToken: params.adminToken,
      body: {
        reason_code: 'cert_matches_operator_expectation',
        notes: 'Sprint 4U dry-run guard validation; metadata only; no auto-confirm'
      }
    }
  );
  const sameActorApprove = await fetchJson(
    params.fetchImpl,
    `${params.baseUrl}/v1/admin/bank-evidence/${encodeURIComponent(params.evidenceId)}/approve-production-trust`,
    {
      method: 'POST',
      adminToken: params.adminToken,
      actorId: params.actorId,
      body: {
        reason_code: 'cert_matches_operator_expectation',
        notes: 'Sprint 4U same-actor approval must be blocked'
      }
    }
  );

  return {
    requestStatus: request.status,
    requestBody: request.body,
    sameActorApproveStatus: sameActorApprove.status,
    sameActorApproveBody: sameActorApprove.body
  };
}

async function fetchJson(fetchImpl, url, options) {
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${options.adminToken}`
  };
  if (options.method !== 'GET') {
    headers['content-type'] = 'application/json';
  }
  if (options.actorId) {
    headers['x-swimpay-operator-id'] = options.actorId;
  }

  const response = await fetchImpl(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

function inspectDashboard(dashboard, failures) {
  const dashboardJson = stringifyForInspection(dashboard);
  if (fullSha256Pattern.test(dashboardJson)) {
    failures.push('dashboard must not expose full certificate hashes');
  }
  if (containsForbiddenRawKey(dashboard)) {
    failures.push('dashboard must not expose raw phone or notification fields');
  }
  if (containsRawPhoneValue(dashboard)) {
    failures.push('dashboard must not expose raw phone values');
  }

  const safety = dashboard?.safety ?? {};
  if (safety.trusted !== false) {
    failures.push('dashboard safety must keep trusted=false');
  }
  if (safety.production_trust_requested !== false) {
    failures.push('dashboard safety must keep production_trust_requested=false');
  }
  if (safety.auto_confirm_enabled !== false) {
    failures.push('dashboard safety must keep auto_confirm_enabled=false');
  }
}

function inspectAuditEvents(auditEvents, failures) {
  const auditJson = stringifyForInspection(auditEvents);
  if (fullSha256Pattern.test(auditJson)) {
    failures.push('audit trace must not expose full certificate hashes');
  }
  if (containsForbiddenRawKey(auditEvents)) {
    failures.push('audit trace must not expose raw phone or notification fields');
  }
  if (containsRawPhoneValue(auditEvents)) {
    failures.push('audit trace must not expose raw phone values');
  }
  if (auditJson.includes('auto_confirm_enabled":true')) {
    failures.push('audit trace must not enable auto-confirmation');
  }
}

function inspectProductionTrustGuard(productionTrustGuard, failures) {
  if (!productionTrustGuard) {
    return;
  }

  const requestJson = stringifyForInspection(productionTrustGuard.requestBody);
  if (requestJson.includes('auto_confirm_enabled":true')) {
    failures.push('production trust request must not enable auto-confirmation');
  }
  if (productionTrustGuard.requestBody?.trusted !== false) {
    failures.push('production trust request must keep trusted=false');
  }
  if (productionTrustGuard.requestBody?.auto_confirm_enabled !== false) {
    failures.push('production trust request must keep auto_confirm_enabled=false');
  }

  const approvalCode = productionTrustGuard.sameActorApproveBody?.error?.code;
  if (productionTrustGuard.sameActorApproveStatus !== 409 || approvalCode !== 'bank_evidence_dual_control_required') {
    failures.push('same actor production trust approval must be blocked by dual-control');
  }
}

function containsForbiddenRawKey(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenRawKey(item));
  }

  return Object.entries(value).some(([key, nested]) => {
    const normalized = key.toLowerCase();
    return forbiddenRawKeys.includes(normalized) || containsForbiddenRawKey(nested);
  });
}

function containsRawPhoneValue(value) {
  if (typeof value === 'string') {
    if (uuidPattern.test(value) || isoTimestampPattern.test(value)) {
      return false;
    }
    return phonePattern.test(value);
  }
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsRawPhoneValue(item));
  }

  return Object.values(value).some((nested) => containsRawPhoneValue(nested));
}

function stringifyForInspection(value) {
  return JSON.stringify(value ?? {});
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/u, '');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const baseUrl = process.env.SWIMPAY_BASE_URL ?? defaultBaseUrl;
  if (args.has('--plan')) {
    console.log(JSON.stringify(buildEvidenceLifecycleRehearsalPlan({ baseUrl }), null, 2));
    return;
  }

  const result = await runEvidenceLifecycleRehearsal({
    baseUrl,
    adminToken: process.env.SWIMPAY_ADMIN_TOKEN ?? defaultAdminToken,
    evidenceId: process.env.SWIMPAY_EVIDENCE_ID,
    actorId: process.env.SWIMPAY_OPERATOR_ID
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('evidence-lifecycle-rehearsal.mjs')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
