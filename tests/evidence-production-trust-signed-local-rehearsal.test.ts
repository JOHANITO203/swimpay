import { describe, expect, test } from 'vitest';
import { signOperatorToken } from '@swimpay/security';
import { InMemoryAdminRepository } from '../apps/api/src/admin.js';
import {
  BankEvidenceSources,
  BankEvidenceStatuses,
  InMemoryBankEvidenceRepository,
  type BankEvidenceRecord
} from '../apps/api/src/bank-evidence.js';
import { buildApiServer } from '../apps/api/src/server.js';
import { runEvidenceProductionTrustHandoff } from '../scripts/evidence-production-trust-handoff.mjs';

const tokenSecret = 'local_signed_handoff_rehearsal_secret_for_tests';
const evidenceId = 'bev_signed_local_rehearsal';
const certHash = 'a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123';

describe('signed-token local evidence production trust handoff rehearsal', () => {
  test('executes request, same-actor block, second-actor approval, revocation and audit continuity', async () => {
    const bankEvidenceRepository = new InMemoryBankEvidenceRepository({
      devices: [{ merchantId: 'mch_01', deviceId: 'dev_01' }],
      bankProfileIds: ['sberbank_ru'],
      evidence: [reviewOnlyEvidence()]
    });
    const adminRepository = new InMemoryAdminRepository({
      auditEvents: bankEvidenceRepository.auditEvents
    });
    const server = buildApiServer({
      environment: 'test',
      healthChecks: {
        database: async () => 'skipped',
        nats: async () => 'skipped',
        valkey: async () => 'skipped'
      },
      bankEvidenceRepository,
      adminRepository,
      adminAuth: {
        mode: 'signed_token',
        environment: 'test',
        tokenHmacSecret: tokenSecret
      },
      idGenerator: {
        orderId: () => 'ord_unused',
        paymentSessionId: () => 'ps_unused',
        auditEventId: makeAuditId(),
        referenceCode: () => 'SWP-HANDOFF'
      },
      clock: makeClock()
    });

    const requesterToken = signOperatorToken({
      operatorId: 'ops_requester',
      role: 'admin',
      secret: tokenSecret
    });
    const approverToken = signOperatorToken({
      operatorId: 'ops_approver',
      role: 'owner',
      secret: tokenSecret
    });

    const result = await runEvidenceProductionTrustHandoff({
      baseUrl: 'http://local.test',
      evidenceId,
      requesterToken,
      approverToken,
      allowMutatingDrill: true,
      fetchImpl: fastifyFetch(server)
    });

    expect(result).toMatchObject({
      ok: true,
      mutated: true,
      mode: 'dual_operator_drill',
      failures: []
    });

    const evidence = await bankEvidenceRepository.getEvidence(evidenceId);
    expect(evidence).toMatchObject({
      status: BankEvidenceStatuses.PRODUCTION_TRUST_REVOKED,
      productionTrustRequestedBy: 'ops_requester',
      productionTrustApprovedBy: 'ops_approver',
      productionTrustRevokedBy: 'ops_approver'
    });
    expect(JSON.stringify(evidence)).not.toContain('auto_confirm_enabled":true');

    const auditTypes = bankEvidenceRepository.auditEvents.map((event) => event.eventType);
    expect(auditTypes).toContain('bank_evidence.production_trust_requested');
    expect(auditTypes).toContain('bank_evidence.production_trust_approved');
    expect(auditTypes).toContain('bank_evidence.production_trust_revoked');
    expect(JSON.stringify(bankEvidenceRepository.auditEvents)).not.toContain(certHash);
    expect(JSON.stringify(bankEvidenceRepository.auditEvents)).not.toMatch(/raw_notification|raw_phone|\+7999/iu);

    await server.close();
  });

  test('read-only signed operators cannot request production trust', async () => {
    const bankEvidenceRepository = new InMemoryBankEvidenceRepository({
      devices: [{ merchantId: 'mch_01', deviceId: 'dev_01' }],
      bankProfileIds: ['sberbank_ru'],
      evidence: [reviewOnlyEvidence()]
    });
    const server = buildApiServer({
      environment: 'test',
      healthChecks: {
        database: async () => 'skipped',
        nats: async () => 'skipped',
        valkey: async () => 'skipped'
      },
      bankEvidenceRepository,
      adminAuth: {
        mode: 'signed_token',
        environment: 'test',
        tokenHmacSecret: tokenSecret
      }
    });
    const readOnlyToken = signOperatorToken({
      operatorId: 'ops_readonly',
      role: 'read_only',
      secret: tokenSecret
    });

    const response = await server.inject({
      method: 'POST',
      url: `/v1/admin/bank-evidence/${evidenceId}/request-production-trust`,
      headers: {
        authorization: `Bearer ${readOnlyToken}`
      },
      payload: {
        reason_code: 'cert_matches_operator_expectation',
        notes: 'read-only request should be denied'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: 'operator_permission_denied'
      }
    });
    expect((await bankEvidenceRepository.getEvidence(evidenceId))?.status).toBe(BankEvidenceStatuses.APPROVED_FOR_REVIEW_ONLY);
    await server.close();
  });
});

function reviewOnlyEvidence(): BankEvidenceRecord {
  return {
    evidenceId,
    merchantId: 'mch_01',
    deviceId: 'dev_01',
    bankProfileId: 'sberbank_ru',
    packageName: 'ru.sberbankmobile',
    certSha256: certHash,
    appVersion: '16.0.0',
    installSource: 'com.android.vending',
    source: BankEvidenceSources.ANDROID_PACKAGEMANAGER,
    status: BankEvidenceStatuses.APPROVED_FOR_REVIEW_ONLY,
    createdAt: '2026-05-03T13:30:00.000Z',
    reviewedAt: '2026-05-03T13:35:00.000Z',
    reviewedBy: 'ops_review',
    reviewReason: 'package_verified_for_review_only: local signed-token rehearsal fixture'
  };
}

function fastifyFetch(server: ReturnType<typeof buildApiServer>) {
  return async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const parsed = new URL(url);
    const response = await server.inject({
      method: init?.method ?? 'GET',
      url: `${parsed.pathname}${parsed.search}`,
      headers: init?.headers,
      payload: init?.body
    });

    return {
      status: response.statusCode,
      ok: response.statusCode >= 200 && response.statusCode < 300,
      async json() {
        return response.json();
      }
    };
  };
}

function makeAuditId() {
  let next = 1;
  return () => `aud_signed_handoff_${String(next++).padStart(2, '0')}`;
}

function makeClock() {
  let next = 0;
  const timestamps = [
    '2026-05-03T13:40:00.000Z',
    '2026-05-03T13:41:00.000Z',
    '2026-05-03T13:42:00.000Z',
    '2026-05-03T13:43:00.000Z'
  ];
  return () => new Date(timestamps[Math.min(next++, timestamps.length - 1)]!);
}
