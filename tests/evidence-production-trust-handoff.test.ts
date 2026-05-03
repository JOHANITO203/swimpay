import { describe, expect, test } from 'vitest';
import {
  buildEvidenceProductionTrustHandoffPlan,
  inspectEvidenceProductionTrustHandoff,
  runEvidenceProductionTrustHandoff
} from '../scripts/evidence-production-trust-handoff.mjs';

describe('evidence production trust dual-operator handoff rehearsal', () => {
  test('builds a non-mutating handoff plan with explicit dual-operator boundaries', () => {
    const plan = buildEvidenceProductionTrustHandoffPlan({ baseUrl: 'http://localhost:8080' });

    expect(plan.requiresRealNotifications).toBe(false);
    expect(plan.requiresInstalledAppEnumeration).toBe(false);
    expect(plan.mutatesOnlyWithExplicitApproval).toBe(true);
    expect(plan.requiredOperatorRoles).toEqual(['requester', 'approver']);
    expect(plan.steps.map((step) => step.name)).toEqual([
      'fetch_review_dashboard',
      'select_approved_review_only_evidence',
      'request_production_trust_as_requester',
      'verify_same_actor_approval_blocked',
      'approve_production_trust_as_second_operator',
      'revoke_after_drill',
      'verify_redacted_audit_continuity'
    ]);
    expect(JSON.stringify(plan)).not.toMatch(/official_bank_confirmation|bank_confirmed|auto_confirm_enabled":true/iu);
  });

  test('accepts a complete dual-operator trust drill while keeping auto-confirm disabled', () => {
    const result = inspectEvidenceProductionTrustHandoff({
      request: {
        status: 200,
        body: {
          evidence_id: 'bev_review_only',
          status: 'production_trust_requested',
          trusted: false,
          production_trusted_app_metadata: false,
          auto_confirm_enabled: false,
          requested_by: 'ops_requester'
        }
      },
      sameActorApproval: {
        status: 409,
        body: {
          error: { code: 'bank_evidence_dual_control_required' }
        }
      },
      secondActorApproval: {
        status: 200,
        body: {
          evidence_id: 'bev_review_only',
          status: 'production_trust_approved',
          trusted: false,
          production_trusted_app_metadata: true,
          auto_confirm_enabled: false,
          requested_by: 'ops_requester',
          approved_by: 'ops_approver'
        }
      },
      revocation: {
        status: 200,
        body: {
          evidence_id: 'bev_review_only',
          status: 'production_trust_revoked',
          trusted: false,
          production_trusted_app_metadata: false,
          auto_confirm_enabled: false,
          revoked_by: 'ops_approver'
        }
      },
      auditEvents: {
        audit_events: [
          audit('bank_evidence.production_trust_requested', 'ops_requester'),
          audit('bank_evidence.production_trust_approved', 'ops_approver'),
          audit('bank_evidence.production_trust_revoked', 'ops_approver')
        ]
      }
    });

    expect(result).toEqual({
      ok: true,
      failures: [],
      checked: [
        'production_trust_request_guard',
        'same_actor_blocked',
        'second_actor_approval_guard',
        'revocation_guard',
        'audit_continuity_redacted'
      ]
    });
  });

  test('rejects handoff output that skips dual-control or exposes raw data', () => {
    const result = inspectEvidenceProductionTrustHandoff({
      request: {
        status: 200,
        body: {
          status: 'production_trust_approved',
          trusted: true,
          auto_confirm_enabled: true,
          cert_sha256: 'a'.repeat(64)
        }
      },
      sameActorApproval: {
        status: 200,
        body: {
          status: 'production_trust_approved',
          trusted: true,
          auto_confirm_enabled: true
        }
      },
      secondActorApproval: {
        status: 200,
        body: {
          status: 'production_trust_approved',
          trusted: true,
          auto_confirm_enabled: true
        }
      },
      auditEvents: {
        audit_events: [
          {
            eventType: 'bank_evidence.production_trust_approved',
            actorId: 'ops_requester',
            payloadRedacted: {
              phone: '+79991234567',
              raw_notification_text: 'raw notification'
            }
          }
        ]
      }
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('production trust request must not approve directly');
    expect(result.failures).toContain('same actor approval must be blocked by dual-control');
    expect(result.failures).toContain('second actor approval must keep trusted=false');
    expect(result.failures).toContain('handoff drill must include revocation response');
    expect(result.failures).toContain('audit trace must include production trust request, approval and revocation events');
    expect(result.failures).toContain('audit trace must not expose raw phone values');
  });

  test('does not mutate when explicit approval flag or evidence id is missing', async () => {
    const calls: Array<{ method: string; path: string }> = [];
    const fetchImpl = async (url: string, init?: { method?: string }) => {
      const parsed = new URL(url);
      calls.push({ method: init?.method ?? 'GET', path: parsed.pathname });
      return jsonResponse(200, parsed.pathname.endsWith('/review-dashboard') ? { safety: safeFlags } : { audit_events: [] });
    };

    const result = await runEvidenceProductionTrustHandoff({
      baseUrl: 'http://localhost:8080',
      requesterToken: 'requester-token',
      approverToken: 'approver-token',
      fetchImpl
    });

    expect(result.ok).toBe(true);
    expect(result.mutated).toBe(false);
    expect(result.mode).toBe('plan_only');
    expect(calls).toEqual([
      { method: 'GET', path: '/v1/admin/bank-evidence/review-dashboard' },
      { method: 'GET', path: '/v1/admin/audit-events' }
    ]);
  });

  test('runs full handoff through injected fetch only when explicitly allowed', async () => {
    responseFor.sameActorApprovalSeen = false;
    const calls: Array<{ method: string; path: string; token: string | undefined }> = [];
    const fetchImpl = async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
      const parsed = new URL(url);
      calls.push({ method: init?.method ?? 'GET', path: parsed.pathname, token: init?.headers?.authorization });
      return responseFor(parsed.pathname, init?.method ?? 'GET');
    };

    const result = await runEvidenceProductionTrustHandoff({
      baseUrl: 'http://localhost:8080',
      evidenceId: 'bev_review_only',
      requesterToken: 'requester-token',
      approverToken: 'approver-token',
      allowMutatingDrill: true,
      fetchImpl
    });

    expect(result.ok).toBe(true);
    expect(result.mutated).toBe(true);
    expect(calls).toEqual([
      { method: 'GET', path: '/v1/admin/bank-evidence/review-dashboard', token: 'Bearer requester-token' },
      { method: 'GET', path: '/v1/admin/audit-events', token: 'Bearer requester-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_review_only/request-production-trust', token: 'Bearer requester-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_review_only/approve-production-trust', token: 'Bearer requester-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_review_only/approve-production-trust', token: 'Bearer approver-token' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_review_only/revoke-production-trust', token: 'Bearer approver-token' },
      { method: 'GET', path: '/v1/admin/audit-events', token: 'Bearer requester-token' }
    ]);
  });
});

const safeFlags = {
  trusted: false,
  production_trust_requested: false,
  auto_confirm_enabled: false
};

function audit(eventType: string, actorId: string) {
  return {
    auditEventId: `aud_${eventType}`,
    eventType,
    objectType: 'bank_package_evidence',
    objectId: 'bev_review_only',
    actorId,
    payloadRedacted: {
      cert_sha256_masked: 'fea43e...99a2ea',
      trusted: false,
      auto_confirm_enabled: false
    },
    createdAt: '2026-05-03T13:10:00.000Z'
  };
}

function responseFor(pathname: string, method: string) {
  if (pathname.endsWith('/review-dashboard')) {
    return jsonResponse(200, { safety: safeFlags });
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
      auto_confirm_enabled: false,
      requested_by: 'ops_requester'
    });
  }
  if (method === 'POST' && pathname.endsWith('/approve-production-trust')) {
    if (responseFor.sameActorApprovalSeen) {
      return jsonResponse(200, {
        status: 'production_trust_approved',
        trusted: false,
        production_trusted_app_metadata: true,
        auto_confirm_enabled: false,
        requested_by: 'ops_requester',
        approved_by: 'ops_approver'
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
      auto_confirm_enabled: false,
      revoked_by: 'ops_approver'
    });
  }
  return jsonResponse(404, { error: { code: 'not_found' } });
}
responseFor.sameActorApprovalSeen = false;

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      return body;
    }
  };
}
