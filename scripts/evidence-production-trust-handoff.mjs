#!/usr/bin/env node

const defaultBaseUrl = 'http://localhost:8080';
const defaultAdminToken = 'change_me_local_admin_token';
const fullSha256Pattern = /\b[a-f0-9]{64}\b/iu;
const phonePattern = /(?:\+7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s()-]*\d{2}[\s()-]*\d{2}/u;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u;
const requiredAuditEvents = [
  'bank_evidence.production_trust_requested',
  'bank_evidence.production_trust_approved',
  'bank_evidence.production_trust_revoked'
];
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

export function buildEvidenceProductionTrustHandoffPlan(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl);
  return {
    baseUrl,
    requiresRealNotifications: false,
    requiresInstalledAppEnumeration: false,
    requiresProductionDeployment: false,
    mutatesOnlyWithExplicitApproval: true,
    requiredOperatorRoles: ['requester', 'approver'],
    steps: [
      {
        name: 'fetch_review_dashboard',
        method: 'GET',
        path: '/v1/admin/bank-evidence/review-dashboard',
        url: `${baseUrl}/v1/admin/bank-evidence/review-dashboard`
      },
      {
        name: 'select_approved_review_only_evidence',
        method: 'OPERATOR_CHECK',
        path: 'evidence.status',
        expected: 'approved_for_review_only'
      },
      {
        name: 'request_production_trust_as_requester',
        method: 'POST',
        path: '/v1/admin/bank-evidence/:id/request-production-trust',
        expected: {
          status: 'production_trust_requested',
          trusted: false,
          auto_confirm_enabled: false
        }
      },
      {
        name: 'verify_same_actor_approval_blocked',
        method: 'POST',
        path: '/v1/admin/bank-evidence/:id/approve-production-trust',
        expected: {
          error_code: 'bank_evidence_dual_control_required'
        }
      },
      {
        name: 'approve_production_trust_as_second_operator',
        method: 'POST',
        path: '/v1/admin/bank-evidence/:id/approve-production-trust',
        expected: {
          status: 'production_trust_approved',
          metadata_only: true,
          auto_confirm_enabled: false
        }
      },
      {
        name: 'revoke_after_drill',
        method: 'POST',
        path: '/v1/admin/bank-evidence/:id/revoke-production-trust',
        expected: {
          status: 'production_trust_revoked',
          auto_confirm_enabled: false
        }
      },
      {
        name: 'verify_redacted_audit_continuity',
        method: 'GET',
        path: '/v1/admin/audit-events?object_type=bank_package_evidence&object_id=:id',
        expected_events: requiredAuditEvents
      }
    ]
  };
}

export function inspectEvidenceProductionTrustHandoff(input) {
  const failures = [];
  const checked = [
    'production_trust_request_guard',
    'same_actor_blocked',
    'second_actor_approval_guard',
    'revocation_guard',
    'audit_continuity_redacted'
  ];

  inspectRequest(input.request, failures);
  inspectSameActorApproval(input.sameActorApproval, failures);
  inspectSecondActorApproval(input.secondActorApproval, failures);
  inspectRevocation(input.revocation, failures);
  inspectAuditEvents(input.auditEvents, failures);

  return {
    ok: failures.length === 0,
    failures,
    checked
  };
}

export async function runEvidenceProductionTrustHandoff(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl);
  const requesterToken = options.requesterToken ?? defaultAdminToken;
  const approverToken = options.approverToken;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required for evidence production trust handoff.');
  }

  const dashboard = await fetchJson(fetchImpl, `${baseUrl}/v1/admin/bank-evidence/review-dashboard`, {
    method: 'GET',
    token: requesterToken
  });
  const initialAudit = await fetchJson(fetchImpl, `${baseUrl}/v1/admin/audit-events?object_type=bank_package_evidence`, {
    method: 'GET',
    token: requesterToken
  });

  if (!options.evidenceId || options.allowMutatingDrill !== true) {
    const failures = [];
    inspectNoRawData(dashboard.body, failures, 'review dashboard');
    inspectNoRawData(initialAudit.body, failures, 'audit trace');
    const safety = dashboard.body?.safety ?? {};
    if (safety.trusted !== false) {
      failures.push('review dashboard must keep trusted=false');
    }
    if (safety.auto_confirm_enabled !== false) {
      failures.push('review dashboard must keep auto_confirm_enabled=false');
    }
    return {
      ok: failures.length === 0,
      mutated: false,
      mode: 'plan_only',
      failures,
      checked: ['review_dashboard_accessible', 'audit_trace_accessible', 'read_only_redaction_guard']
    };
  }

  if (!approverToken) {
    return {
      ok: false,
      mutated: false,
      mode: 'missing_second_operator_token',
      failures: ['second operator token is required for mutating production trust handoff drill'],
      checked: ['operator_token_guard']
    };
  }

  const evidencePath = `/v1/admin/bank-evidence/${encodeURIComponent(options.evidenceId)}`;
  const request = await fetchJson(fetchImpl, `${baseUrl}${evidencePath}/request-production-trust`, {
    method: 'POST',
    token: requesterToken,
    body: {
      reason_code: 'cert_matches_operator_expectation',
      notes: 'Sprint 4W dual-operator handoff drill; metadata only; no auto-confirm'
    }
  });
  const sameActorApproval = await fetchJson(fetchImpl, `${baseUrl}${evidencePath}/approve-production-trust`, {
    method: 'POST',
    token: requesterToken,
    body: {
      reason_code: 'cert_matches_operator_expectation',
      notes: 'Sprint 4W same-actor approval must be blocked'
    }
  });
  const secondActorApproval = await fetchJson(fetchImpl, `${baseUrl}${evidencePath}/approve-production-trust`, {
    method: 'POST',
    token: approverToken,
    body: {
      reason_code: 'cert_matches_operator_expectation',
      notes: 'Sprint 4W second-operator metadata trust approval drill'
    }
  });
  const revocation = await fetchJson(fetchImpl, `${baseUrl}${evidencePath}/revoke-production-trust`, {
    method: 'POST',
    token: approverToken,
    body: {
      reason_code: 'other',
      notes: 'Sprint 4W drill cleanup; revoke metadata trust after rehearsal'
    }
  });
  const auditEvents = await fetchJson(
    fetchImpl,
    `${baseUrl}/v1/admin/audit-events?object_type=bank_package_evidence&object_id=${encodeURIComponent(options.evidenceId)}`,
    {
      method: 'GET',
      token: requesterToken
    }
  );

  const inspection = inspectEvidenceProductionTrustHandoff({
    request,
    sameActorApproval,
    secondActorApproval,
    revocation,
    auditEvents: auditEvents.body
  });

  return {
    ...inspection,
    mutated: true,
    mode: 'dual_operator_drill'
  };
}

function inspectRequest(request, failures) {
  if (!request) {
    failures.push('handoff drill must include production trust request response');
    return;
  }
  if (request.status !== 200) {
    failures.push('production trust request must return 200 in the drill');
  }
  if (request.body?.status !== 'production_trust_requested') {
    failures.push('production trust request must not approve directly');
  }
  inspectNoTrustOrAutoConfirm(request.body, failures, 'production trust request');
  inspectNoRawData(request.body, failures, 'production trust request');
}

function inspectSameActorApproval(sameActorApproval, failures) {
  const code = sameActorApproval?.body?.error?.code;
  if (sameActorApproval?.status !== 409 || code !== 'bank_evidence_dual_control_required') {
    failures.push('same actor approval must be blocked by dual-control');
  }
}

function inspectSecondActorApproval(secondActorApproval, failures) {
  if (!secondActorApproval) {
    failures.push('handoff drill must include second actor approval response');
    return;
  }
  if (secondActorApproval.status !== 200 || secondActorApproval.body?.status !== 'production_trust_approved') {
    failures.push('second actor approval must approve metadata trust');
  }
  inspectNoTrustOrAutoConfirm(secondActorApproval.body, failures, 'second actor approval');
  inspectNoRawData(secondActorApproval.body, failures, 'second actor approval');
}

function inspectRevocation(revocation, failures) {
  if (!revocation) {
    failures.push('handoff drill must include revocation response');
    return;
  }
  if (revocation.status !== 200 || revocation.body?.status !== 'production_trust_revoked') {
    failures.push('revocation must return production_trust_revoked');
  }
  inspectNoTrustOrAutoConfirm(revocation.body, failures, 'revocation');
  inspectNoRawData(revocation.body, failures, 'revocation');
}

function inspectAuditEvents(auditEvents, failures) {
  const events = extractAuditEvents(auditEvents);
  const eventTypes = new Set(events.map((event) => event.eventType ?? event.event_type));
  for (const eventType of requiredAuditEvents) {
    if (!eventTypes.has(eventType)) {
      failures.push('audit trace must include production trust request, approval and revocation events');
      break;
    }
  }
  inspectNoRawData(auditEvents, failures, 'audit trace');
  const auditJson = stringifyForInspection(auditEvents);
  if (auditJson.includes('auto_confirm_enabled":true')) {
    failures.push('audit trace must not enable auto-confirmation');
  }
}

function inspectNoTrustOrAutoConfirm(value, failures, label) {
  if (value?.trusted !== false) {
    failures.push(`${label} must keep trusted=false`);
  }
  if (value?.auto_confirm_enabled !== false) {
    failures.push(`${label} must keep auto_confirm_enabled=false`);
  }
}

function inspectNoRawData(value, failures, label) {
  const payload = stringifyForInspection(value);
  if (fullSha256Pattern.test(payload)) {
    failures.push(`${label} must not expose full certificate hashes`);
  }
  if (containsForbiddenRawKey(value)) {
    failures.push(`${label} must not expose raw phone or notification fields`);
  }
  if (containsRawPhoneValue(value)) {
    failures.push(`${label} must not expose raw phone values`);
  }
}

function extractAuditEvents(value) {
  if (Array.isArray(value?.audit_events)) {
    return value.audit_events;
  }
  if (Array.isArray(value?.items)) {
    return value.items;
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
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

async function fetchJson(fetchImpl, url, options) {
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${options.token}`
  };
  if (options.method !== 'GET') {
    headers['content-type'] = 'application/json';
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
    console.log(JSON.stringify(buildEvidenceProductionTrustHandoffPlan({ baseUrl }), null, 2));
    return;
  }

  const result = await runEvidenceProductionTrustHandoff({
    baseUrl,
    evidenceId: process.env.SWIMPAY_EVIDENCE_ID,
    requesterToken: process.env.SWIMPAY_REQUESTER_TOKEN ?? process.env.SWIMPAY_ADMIN_TOKEN ?? defaultAdminToken,
    approverToken: process.env.SWIMPAY_APPROVER_TOKEN,
    allowMutatingDrill: process.env.SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF === 'true'
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('evidence-production-trust-handoff.mjs')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
