import { describe, expect, test } from 'vitest';
import {
  buildEvidenceLifecycleRehearsalPlan,
  inspectEvidenceLifecycleRehearsal,
  runEvidenceLifecycleRehearsal
} from '../scripts/evidence-lifecycle-rehearsal.mjs';

describe('operator evidence lifecycle rehearsal', () => {
  test('builds a non-destructive API rehearsal plan with production trust guard checks', () => {
    const plan = buildEvidenceLifecycleRehearsalPlan({ baseUrl: 'http://localhost:8080' });

    expect(plan.requiresRealNotifications).toBe(false);
    expect(plan.requiresInstalledAppEnumeration).toBe(false);
    expect(plan.steps.map((step) => step.name)).toEqual([
      'fetch_review_dashboard',
      'fetch_evidence_audit_trace',
      'verify_review_only_safety_flags',
      'verify_production_trust_guardrails'
    ]);
    expect(JSON.stringify(plan)).not.toMatch(/official_bank_confirmation|auto_confirm_enabled":true|bank_confirmed/iu);
  });

  test('accepts redacted dashboard and audit responses while enforcing no auto-confirm or trust side effects', () => {
    const result = inspectEvidenceLifecycleRehearsal({
      dashboard: {
        total_count: 2,
        counts_by_status: {
          pending_operator_review: 1,
          approved_for_review_only: 1
        },
        review_queue: [
          {
            evidence_id: 'bev_pending',
            package_name: 'ru.sberbankmobile',
            cert_sha256_masked: 'fea43e...99a2ea',
            status: 'pending_operator_review',
            trusted: false,
            auto_confirm_enabled: false
          }
        ],
        safety: {
          trusted: false,
          production_trust_requested: false,
          auto_confirm_enabled: false
        }
      },
      auditEvents: {
        items: [
          {
            audit_event_id: 'aud_01',
            event_type: 'bank_evidence.approved_review_only',
            object_type: 'bank_package_evidence',
            object_id: 'bev_pending',
            actor_id: 'ops_01',
            payload_redacted: {
              cert_sha256_masked: 'fea43e...99a2ea',
              auto_confirm_enabled: false
            }
          }
        ]
      },
      productionTrustGuard: {
        requestStatus: 200,
        requestBody: {
          status: 'production_trust_requested',
          trusted: false,
          production_trusted_app_metadata: false,
          auto_confirm_enabled: false
        },
        sameActorApproveStatus: 409,
        sameActorApproveBody: {
          error: { code: 'bank_evidence_dual_control_required' }
        }
      }
    });

    expect(result).toEqual({
      ok: true,
      failures: [],
      checked: [
        'review_dashboard_redacted',
        'audit_trace_redacted',
        'review_only_safety_flags',
        'production_trust_dual_control_guard'
      ]
    });
  });

  test('rejects rehearsal output that exposes full cert hashes or enables trust side effects', () => {
    const result = inspectEvidenceLifecycleRehearsal({
      dashboard: {
        safety: {
          trusted: true,
          production_trust_requested: true,
          auto_confirm_enabled: true
        },
        review_queue: [
          {
            evidence_id: 'bev_leaky',
            cert_sha256: 'a'.repeat(64),
            phone: '+79991234567',
            raw_notification_text: 'raw notification'
          }
        ]
      },
      auditEvents: {
        items: [
          {
            payload_redacted: {
              cert_sha256: 'b'.repeat(64),
              raw_phone: '+79991234567'
            }
          }
        ]
      },
      productionTrustGuard: {
        requestStatus: 200,
        requestBody: { trusted: true, auto_confirm_enabled: true },
        sameActorApproveStatus: 200,
        sameActorApproveBody: { trusted: true }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('dashboard safety must keep trusted=false');
    expect(result.failures).toContain('dashboard must not expose full certificate hashes');
    expect(result.failures).toContain('audit trace must not expose raw phone values');
    expect(result.failures).toContain('same actor production trust approval must be blocked by dual-control');
  });

  test('does not treat UUIDs or timestamps in audit traces as raw phone values', () => {
    const result = inspectEvidenceLifecycleRehearsal({
      dashboard: {
        safety: { trusted: false, production_trust_requested: false, auto_confirm_enabled: false },
        review_queue: []
      },
      auditEvents: {
        audit_events: [
          {
            auditEventId: '6c1afbb9-20a3-4c53-b111-f67fcb0cafbe',
            merchantId: '00000000-0000-4000-8000-000000000001',
            actorId: 'aa0b8023-756a-4469-9802-ed8a93397bc9',
            createdAt: '2026-05-03T08:53:31.031Z',
            payloadRedacted: {
              cert_sha256_masked: 'fea43e...99a2ea',
              auto_confirm_enabled: false
            }
          }
        ]
      }
    });

    expect(result.ok).toBe(true);
    expect(result.failures).not.toContain('audit trace must not expose raw phone values');
  });

  test('runs rehearsal through an injected fetch implementation', async () => {
    const calls: Array<{ method: string; path: string }> = [];
    const fetchImpl = async (url: string, init?: { method?: string }) => {
      const parsed = new URL(url);
      calls.push({ method: init?.method ?? 'GET', path: parsed.pathname });
      return responseFor(parsed.pathname);
    };

    const result = await runEvidenceLifecycleRehearsal({
      baseUrl: 'http://localhost:8080',
      adminToken: 'local-token',
      evidenceId: 'bev_review_only',
      actorId: 'dev_operator',
      fetchImpl
    });

    expect(result.ok).toBe(true);
    expect(calls).toEqual([
      { method: 'GET', path: '/v1/admin/bank-evidence/review-dashboard' },
      { method: 'GET', path: '/v1/admin/audit-events' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_review_only/request-production-trust' },
      { method: 'POST', path: '/v1/admin/bank-evidence/bev_review_only/approve-production-trust' }
    ]);
  });
});

function responseFor(pathname: string) {
  if (pathname === '/v1/admin/bank-evidence/review-dashboard') {
    return jsonResponse(200, {
      safety: { trusted: false, production_trust_requested: false, auto_confirm_enabled: false },
      review_queue: [
        {
          evidence_id: 'bev_review_only',
          cert_sha256_masked: 'fea43e...99a2ea',
          trusted: false,
          auto_confirm_enabled: false
        }
      ]
    });
  }

  if (pathname === '/v1/admin/audit-events') {
    return jsonResponse(200, {
      items: [
        {
          event_type: 'bank_evidence.approved_review_only',
          payload_redacted: { cert_sha256_masked: 'fea43e...99a2ea', auto_confirm_enabled: false }
        }
      ]
    });
  }

  if (pathname.endsWith('/request-production-trust')) {
    return jsonResponse(200, {
      status: 'production_trust_requested',
      trusted: false,
      production_trusted_app_metadata: false,
      auto_confirm_enabled: false
    });
  }

  if (pathname.endsWith('/approve-production-trust')) {
    return jsonResponse(409, {
      error: { code: 'bank_evidence_dual_control_required' }
    });
  }

  return jsonResponse(404, { error: { code: 'not_found' } });
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
