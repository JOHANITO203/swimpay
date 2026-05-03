import { describe, expect, test } from 'vitest';
import {
  buildSignedComposeHandoffPlan,
  runSignedComposeHandoff,
  validateSignedComposeHandoffEnvironment
} from '../scripts/evidence-production-trust-compose-signed-rehearsal.mjs';

describe('signed-token Compose production trust handoff rehearsal guard', () => {
  test('builds a local-only Compose handoff plan with signed-token override instructions', () => {
    const plan = buildSignedComposeHandoffPlan({ baseUrl: 'http://localhost:8080' });

    expect(plan.scope).toBe('local_compose_only');
    expect(plan.requiresProductionDeployment).toBe(false);
    expect(plan.requiresRealNotifications).toBe(false);
    expect(plan.compose.overrideFile).toBe('infra/docker-compose.signed-admin.override.yml');
    expect(plan.compose.upCommand).toContain('docker compose --env-file .env.example -f infra/docker-compose.yml -f infra/docker-compose.signed-admin.override.yml up -d --build swimpay-api swimpay-web proxy');
    expect(plan.requiredEnv).toContain('ADMIN_TOKEN_HMAC_SECRET');
    expect(plan.requiredEnv).toContain('SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true');
    expect(JSON.stringify(plan)).not.toMatch(/official_bank_confirmation|auto_confirm_enabled":true|bank_confirmed/iu);
  });

  test('does not mutate unless the signed Compose handoff guard is explicit and complete', () => {
    expect(
      validateSignedComposeHandoffEnvironment({
        SWIMPAY_EVIDENCE_ID: 'bev_local',
        SWIMPAY_REQUESTER_TOKEN: 'requester',
        SWIMPAY_APPROVER_TOKEN: 'approver',
        ADMIN_TOKEN_HMAC_SECRET: 'local_signed_secret'
      })
    ).toEqual({
      ok: false,
      canMutate: false,
      failures: [
        'SWIMPAY_SIGNED_COMPOSE_HANDOFF=true is required for signed Compose handoff rehearsal',
        'SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true is required before mutating production trust metadata'
      ],
      mode: 'guarded'
    });

    expect(
      validateSignedComposeHandoffEnvironment({
        SWIMPAY_SIGNED_COMPOSE_HANDOFF: 'true',
        SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF: 'true',
        SWIMPAY_EVIDENCE_ID: 'bev_local',
        SWIMPAY_REQUESTER_TOKEN: 'requester',
        SWIMPAY_APPROVER_TOKEN: 'approver',
        ADMIN_TOKEN_HMAC_SECRET: 'local_signed_secret'
      })
    ).toEqual({
      ok: true,
      canMutate: true,
      failures: [],
      mode: 'signed_compose_mutating_drill'
    });
  });

  test('runs health check and delegated handoff only when local signed Compose mutation is allowed', async () => {
    responseFor.sameActorApprovalSeen = false;
    const calls: Array<{ method: string; path: string; token?: string | undefined }> = [];
    const result = await runSignedComposeHandoff({
      baseUrl: 'http://localhost:8080',
      env: {
        SWIMPAY_SIGNED_COMPOSE_HANDOFF: 'true',
        SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF: 'true',
        SWIMPAY_EVIDENCE_ID: 'bev_compose_signed',
        SWIMPAY_REQUESTER_TOKEN: 'requester-token',
        SWIMPAY_APPROVER_TOKEN: 'approver-token',
        ADMIN_TOKEN_HMAC_SECRET: 'local_signed_secret'
      },
      fetchImpl: async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
        const parsed = new URL(url);
        calls.push({
          method: init?.method ?? 'GET',
          path: parsed.pathname,
          token: init?.headers?.authorization
        });
        return responseFor(parsed.pathname, init?.method ?? 'GET');
      }
    });

    expect(result).toMatchObject({
      ok: true,
      mode: 'signed_compose_dual_operator_drill',
      mutated: true,
      health: { ok: true, status: 200 }
    });
    expect(calls).toEqual([
      { method: 'GET', path: '/api-health', token: undefined },
      { method: 'GET', path: '/v1/admin/bank-evidence/review-dashboard', token: 'Bearer requester-token' },
      { method: 'GET', path: '/v1/admin/audit-events', token: 'Bearer requester-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_compose_signed/request-production-trust', token: 'Bearer requester-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_compose_signed/approve-production-trust', token: 'Bearer requester-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_compose_signed/approve-production-trust', token: 'Bearer approver-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_compose_signed/revoke-production-trust', token: 'Bearer approver-token' },
      { method: 'GET', path: '/v1/admin/audit-events', token: 'Bearer requester-token' }
    ]);
  });
});

function responseFor(pathname: string, method: string) {
  if (pathname === '/api-health') {
    return jsonResponse(200, { service: 'swimpay-api', dependencies: { database: 'ok', nats: 'ok', valkey: 'ok' } });
  }
  if (pathname.endsWith('/review-dashboard')) {
    return jsonResponse(200, { safety: { trusted: false, production_trust_requested: false, auto_confirm_enabled: false } });
  }
  if (pathname === '/v1/admin/audit-events') {
    return jsonResponse(200, {
      audit_events: [
        audit('bank_evidence.production_trust_requested', 'ops_requester'),
        audit('bank_evidence.production_trust_approved', 'ops_approver'),
        audit('bank_evidence.production_trust_revoked', 'ops_approver')
      ]
    });
  }
  if (method === 'POST' && pathname.endsWith('/request-production-trust')) {
    return jsonResponse(200, {
      status: 'production_trust_requested',
      trusted: false,
      production_trusted_app_metadata: false,
      auto_confirm_enabled: false
    });
  }
  if (method === 'POST' && pathname.endsWith('/approve-production-trust')) {
    if (responseFor.sameActorApprovalSeen) {
      return jsonResponse(200, {
        status: 'production_trust_approved',
        trusted: false,
        production_trusted_app_metadata: true,
        auto_confirm_enabled: false
      });
    }
    responseFor.sameActorApprovalSeen = true;
    return jsonResponse(409, {
      error: { code: 'bank_evidence_dual_control_required' }
    });
  }
  if (method === 'POST' && pathname.endsWith('/revoke-production-trust')) {
    return jsonResponse(200, {
      status: 'production_trust_revoked',
      trusted: false,
      production_trusted_app_metadata: false,
      auto_confirm_enabled: false
    });
  }
  return jsonResponse(404, { error: { code: 'not_found' } });
}
responseFor.sameActorApprovalSeen = false;

function audit(eventType: string, actorId: string) {
  return {
    auditEventId: `aud_${eventType}`,
    eventType,
    objectType: 'bank_package_evidence',
    objectId: 'bev_compose_signed',
    actorId,
    payloadRedacted: {
      cert_sha256_masked: 'fea43e...99a2ea',
      trusted: false,
      auto_confirm_enabled: false
    },
    createdAt: '2026-05-03T13:50:00.000Z'
  };
}

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      return body;
    }
  };
}
