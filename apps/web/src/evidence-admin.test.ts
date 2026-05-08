import { describe, expect, it } from 'vitest';
import { buildWebServer } from './index.js';

describe('operator evidence review web surface', () => {
  it('renders redacted evidence dashboard and audit trace without trust side effects', async () => {
    const server = buildWebServer({
      environment: 'test',
      adminEvidenceClient: new FakeAdminEvidenceClient()
    });

    const response = await server.inject({
      method: 'GET',
      url: '/admin/evidence-review'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Revue des signaux');
    expect(response.body).toContain('pending_operator_review');
    expect(response.body).toContain('approved_for_review_only');
    expect(response.body).toContain('production_trust_requested');
    expect(response.body).toContain('fea43e...99a2ea');
    expect(response.body).toContain('confiance production');
    expect(response.body).toContain('confirmation marchand reste manuelle');
    expect(response.body).toContain('double controle');
    expect(response.body).toContain('bank_evidence.approved_review_only');
    expect(response.body).toContain('bank_evidence.production_trust_requested');
    expect(response.body).toContain('trusted=false');
    expect(response.body).toContain('manual_review_only=true');
    expect(response.body).not.toContain(fullCertHash);
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('raw notification');
    expect(response.body).not.toContain('raw title');
    expect(response.body).not.toContain('api_secret');
    expect(response.body).not.toContain('official_bank_confirmation');
    expect(response.body).not.toContain('bank_confirmed');
    expect(response.body).not.toMatch(/auto_confirm|autoConfirm|auto-confirm/iu);
  });

  it('renders a safe unavailable state when evidence APIs cannot be reached', async () => {
    const server = buildWebServer({
      environment: 'test',
      adminEvidenceClient: {
        async getDashboard() {
          throw new Error('API token leaked: api_secret_123');
        },
        async getAuditEvents() {
          throw new Error('not reached');
        }
      }
    });

    const response = await server.inject({
      method: 'GET',
      url: '/admin/evidence-review'
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).toContain('Admin indisponible');
    expect(response.body).toContain('backend local');
    expect(response.body).not.toContain('api_secret_123');
    expect(response.body).not.toContain(fullCertHash);
    expect(response.body).not.toContain('+79991234567');
  });
});

const fullCertHash = 'fea43e01fea43e01fea43e01fea43e01fea43e01fea43e01fea43e01fea43e01';

class FakeAdminEvidenceClient {
  public async getDashboard() {
    return {
      total_count: 3,
      counts_by_status: {
        pending_operator_review: 1,
        approved_for_review_only: 1,
        production_trust_requested: 1,
        production_trust_approved: 0
      },
      review_queue: [
        {
          evidence_id: 'bev_pending_01',
          bank_profile_id: 'sberbank_ru',
          package_name: 'ru.sberbankmobile',
          cert_sha256_masked: 'fea43e...99a2ea',
          app_version: 'debug-visible',
          install_source: 'com.android.vending',
          source: 'android_packagemanager',
          status: 'pending_operator_review',
          production_trust_status: 'not_requested',
          trusted: false,
          auto_confirm_enabled: false,
          submitted_at: '2026-05-03T10:00:00.000Z'
        }
      ],
      recent_evidence: [
        {
          evidence_id: 'bev_review_only_01',
          bank_profile_id: 'sberbank_ru',
          package_name: 'ru.sberbankmobile',
          cert_sha256: fullCertHash,
          cert_sha256_masked: 'fea43e...99a2ea',
          source: 'android_packagemanager',
          status: 'approved_for_review_only',
          production_trust_status: 'not_requested',
          trusted: false,
          auto_confirm_enabled: false,
          submitted_at: '2026-05-03T09:00:00.000Z',
          reviewed_at: '2026-05-03T09:05:00.000Z',
          reviewed_by: 'ops_01'
        },
        {
          evidence_id: 'bev_requested_01',
          bank_profile_id: 'sberbank_ru',
          package_name: 'ru.sberbankmobile',
          cert_sha256_masked: 'fea43e...99a2ea',
          source: 'android_packagemanager',
          status: 'production_trust_requested',
          production_trust_status: 'requested',
          trusted: false,
          auto_confirm_enabled: false,
          submitted_at: '2026-05-03T09:10:00.000Z',
          requested_by: 'ops_01',
          requested_at: '2026-05-03T09:12:00.000Z'
        }
      ],
      next_actions: ['review_pending_evidence', 'production_trust_requires_second_actor'],
      safety: {
        trusted: false,
        production_trust_requested: false,
        auto_confirm_enabled: false
      }
    };
  }

  public async getAuditEvents() {
    return [
      {
        auditEventId: 'aud_review_only',
        eventType: 'bank_evidence.approved_review_only',
        objectType: 'bank_package_evidence',
        objectId: 'bev_review_only_01',
        actorId: 'ops_01',
        payloadRedacted: {
          cert_sha256_masked: 'fea43e...99a2ea',
          trusted: false,
          auto_confirm_enabled: false,
          phone: '+79991234567',
          raw_body: 'raw notification'
        },
        createdAt: '2026-05-03T09:05:00.000Z'
      },
      {
        auditEventId: 'aud_trust_request',
        eventType: 'bank_evidence.production_trust_requested',
        objectType: 'bank_package_evidence',
        objectId: 'bev_requested_01',
        actorId: 'ops_01',
        payloadRedacted: {
          cert_sha256_masked: 'fea43e...99a2ea',
          trusted: false,
          auto_confirm_enabled: false
        },
        createdAt: '2026-05-03T09:12:00.000Z'
      }
    ];
  }
}
