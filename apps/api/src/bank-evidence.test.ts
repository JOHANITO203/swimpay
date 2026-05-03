import { describe, expect, it } from 'vitest';

import { buildApiServer } from './server.js';
import {
  BankEvidenceAuditEventTypes,
  InMemoryBankEvidenceRepository,
  type BankEvidenceRecord
} from './bank-evidence.js';

const certHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('bank package evidence workflow', () => {
  it('accepts receiver evidence as pending operator review without trusting it', async () => {
    const repository = buildEvidenceRepository();
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/bank-evidence',
      headers: merchantHeaders(),
      payload: evidencePayload()
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      evidence_id: 'bev_01',
      status: 'pending_operator_review',
      next_action: 'operator_review_required',
      trusted: false,
      auto_confirm_enabled: false,
      message: 'evidence accepted for operator review; not trusted yet; no auto-confirm enabled'
    });
    expect(repository.evidence[0]).toMatchObject({
      status: 'pending_operator_review',
      bankProfileId: 'sberbank_ru',
      packageName: 'com.swimpay.syntheticbank.debug'
    });
    expect(repository.auditEvents[0]).toMatchObject({
      eventType: BankEvidenceAuditEventTypes.SUBMITTED,
      objectType: 'bank_package_evidence',
      objectId: 'bev_01',
      actorType: 'receiver_device',
      actorId: 'dev_01'
    });
    expect(response.body).not.toContain(certHash);
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('raw notification');
  });

  it('rejects duplicate evidence clearly and does not duplicate audit effects', async () => {
    const repository = buildEvidenceRepository();
    const server = buildTestServer(repository);

    await server.inject({
      method: 'POST',
      url: '/v1/bank-evidence',
      headers: merchantHeaders(),
      payload: evidencePayload()
    });
    const duplicate = await server.inject({
      method: 'POST',
      url: '/v1/bank-evidence',
      headers: merchantHeaders(),
      payload: evidencePayload()
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('duplicate_bank_evidence');
    expect(repository.evidence).toHaveLength(1);
    expect(repository.auditEvents.filter((event) => event.eventType === BankEvidenceAuditEventTypes.SUBMITTED)).toHaveLength(1);
  });

  it('lists and reads evidence through redacted admin APIs', async () => {
    const repository = buildEvidenceRepository({
      evidence: [pendingEvidence()]
    });
    const server = buildTestServer(repository, { role: 'operator' });

    const list = await server.inject({
      method: 'GET',
      url: '/v1/admin/bank-evidence',
      headers: adminHeaders()
    });
    const detail = await server.inject({
      method: 'GET',
      url: '/v1/admin/bank-evidence/bev_existing',
      headers: adminHeaders()
    });

    expect(list.statusCode).toBe(200);
    expect(list.json().bank_evidence[0]).toMatchObject({
      evidence_id: 'bev_existing',
      status: 'pending_operator_review',
      cert_sha256_masked: '012345...abcdef',
      trusted: false,
      auto_confirm_enabled: false
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({
      evidence_id: 'bev_existing',
      bank_profile_id: 'sberbank_ru',
      status: 'pending_operator_review',
      cert_sha256_masked: '012345...abcdef'
    });
    expect(`${list.body}\n${detail.body}`).not.toContain(certHash);
    expect(`${list.body}\n${detail.body}`).not.toContain('+79991234567');
    expect(`${list.body}\n${detail.body}`).not.toContain('raw notification');
  });

  it('approves evidence for review-only without enabling auto-confirm or bank trust', async () => {
    const repository = buildEvidenceRepository({
      evidence: [pendingEvidence()]
    });
    const server = buildTestServer(repository, { role: 'admin' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_existing/approve-review-only',
      headers: adminHeaders(),
      payload: {
        reason: 'operator reviewed PackageManager evidence for +7 999 123-45-67 reference 123456789012'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      evidence_id: 'bev_existing',
      status: 'approved_for_review_only',
      trusted: false,
      auto_confirm_enabled: false,
      audit_event_id: 'aud_bank_evidence_01'
    });
    expect(repository.evidence[0]).toMatchObject({
      status: 'approved_for_review_only',
      reviewedBy: 'ops_01',
      reviewReason: 'operator reviewed PackageManager evidence for <PHONE> reference <REFERENCE>'
    });
    expect(repository.verifiedBankAppProfiles.has('sberbank_ru')).toBe(false);
    expect(repository.auditEvents[0]).toMatchObject({
      eventType: BankEvidenceAuditEventTypes.APPROVED_REVIEW_ONLY,
      actorType: 'operator',
      actorId: 'ops_01',
      payloadRedacted: {
        status: 'approved_for_review_only',
        trusted: false,
        auto_confirm_enabled: false
      }
    });
  });

  it('rejects evidence with reason and audit without exposing raw values', async () => {
    const repository = buildEvidenceRepository({
      evidence: [pendingEvidence()]
    });
    const server = buildTestServer(repository, { role: 'admin' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_existing/reject',
      headers: adminHeaders(),
      payload: {
        reason: 'operator saw mismatch around +7 999 123-45-67'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      evidence_id: 'bev_existing',
      status: 'rejected',
      trusted: false,
      auto_confirm_enabled: false
    });
    expect(repository.evidence[0]).toMatchObject({
      status: 'rejected',
      reviewReason: 'operator saw mismatch around <PHONE>'
    });
    expect(repository.auditEvents[0]).toMatchObject({
      eventType: BankEvidenceAuditEventTypes.REJECTED,
      payloadRedacted: {
        reason: 'operator saw mismatch around <PHONE>'
      }
    });
    expect(response.body).not.toContain('+79991234567');
  });

  it('requires RBAC permissions for evidence review actions', async () => {
    const repository = buildEvidenceRepository({
      evidence: [pendingEvidence()]
    });
    const server = buildTestServer(repository, { role: 'read_only' });

    const view = await server.inject({
      method: 'GET',
      url: '/v1/admin/bank-evidence',
      headers: adminHeaders()
    });
    const approve = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_existing/approve-review-only',
      headers: adminHeaders(),
      payload: { reason: 'read only cannot approve' }
    });

    expect(view.statusCode).toBe(200);
    expect(approve.statusCode).toBe(403);
    expect(approve.json().error.details.required_permission).toBe('promote_bank_templates');
    expect(repository.evidence[0]?.status).toBe('pending_operator_review');
  });

  it('keeps synthetic debug evidence review-only and never production trust', async () => {
    const repository = buildEvidenceRepository();
    const server = buildTestServer(repository, { role: 'admin' });

    const submitted = await server.inject({
      method: 'POST',
      url: '/v1/bank-evidence',
      headers: merchantHeaders(),
      payload: {
        ...evidencePayload(),
        package_name: 'synthetic_debug_only.com.swimpay.syntheticbank',
        cert_sha256: 'synthetic_debug_only.cert_sha256'
      }
    });
    const approved = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_01/approve-review-only',
      headers: adminHeaders(),
      payload: { reason: 'synthetic fixture review' }
    });

    expect(submitted.statusCode).toBe(201);
    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({
      status: 'approved_for_review_only',
      trusted: false,
      auto_confirm_enabled: false
    });
    expect(repository.verifiedBankAppProfiles.has('sberbank_ru')).toBe(false);
    expect(`${submitted.body}\n${approved.body}`).not.toContain('official_bank_confirmation');
  });

  it('requests production trust only from approved review-only concrete PackageManager evidence', async () => {
    const repository = buildEvidenceRepository({
      evidence: [reviewOnlyEvidence()]
    });
    const server = buildTestServer(repository, { role: 'admin', operatorId: 'ops_requester' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_existing/request-production-trust',
      headers: adminHeaders(),
      payload: {
        reason: 'operator reviewed package and certificate evidence for future production metadata trust'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      evidence_id: 'bev_existing',
      status: 'production_trust_requested',
      production_trusted_app_metadata: false,
      auto_confirm_enabled: false,
      requested_by: 'ops_requester',
      audit_event_id: 'aud_bank_evidence_01'
    });
    expect(repository.evidence[0]).toMatchObject({
      status: 'production_trust_requested',
      productionTrustRequestedBy: 'ops_requester'
    });
    expect(repository.auditEvents[0]).toMatchObject({
      eventType: BankEvidenceAuditEventTypes.PRODUCTION_TRUST_REQUESTED,
      actorType: 'operator',
      actorId: 'ops_requester',
      payloadRedacted: {
        status: 'production_trust_requested',
        production_trusted_app_metadata: false,
        auto_confirm_enabled: false
      }
    });
  });

  it('blocks production trust request for TO_VERIFY, synthetic, rejected or pending evidence', async () => {
    const evidence = [
      reviewOnlyEvidence({
        evidenceId: 'bev_to_verify',
        packageName: 'TO_VERIFY',
        certSha256: certHash
      }),
      reviewOnlyEvidence({
        evidenceId: 'bev_synthetic',
        packageName: 'synthetic_debug_only.com.swimpay.syntheticbank',
        certSha256: 'synthetic_debug_only.cert_sha256',
        source: 'synthetic_debug_only'
      }),
      reviewOnlyEvidence({
        evidenceId: 'bev_rejected',
        status: 'rejected'
      }),
      pendingEvidence()
    ];
    const repository = buildEvidenceRepository({ evidence });
    const server = buildTestServer(repository, { role: 'admin' });

    const responses = await Promise.all(
      evidence.map((record) =>
        server.inject({
          method: 'POST',
          url: `/v1/admin/bank-evidence/${record.evidenceId}/request-production-trust`,
          headers: adminHeaders(),
          payload: { reason: 'unsafe trust request must be blocked' }
        })
      )
    );

    expect(responses.map((response) => response.statusCode)).toEqual([409, 409, 409, 409]);
    expect(responses.map((response) => response.json().error.code)).toEqual([
      'bank_evidence_to_verify_not_trustable',
      'bank_evidence_synthetic_not_trustable',
      'bank_evidence_not_review_only',
      'bank_evidence_not_review_only'
    ]);
    expect(repository.auditEvents.some((event) => event.eventType === BankEvidenceAuditEventTypes.PRODUCTION_TRUST_REQUESTED)).toBe(false);
  });

  it('blocks direct pending to production trust approval and requires dual-control', async () => {
    const repository = buildEvidenceRepository({
      evidence: [pendingEvidence(), trustRequestedEvidence({ productionTrustRequestedBy: 'ops_01' })]
    });
    const server = buildTestServer(repository, { role: 'admin', operatorId: 'ops_01' });

    const directPendingApproval = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_existing/approve-production-trust',
      headers: adminHeaders(),
      payload: { reason: 'direct approval must fail' }
    });
    const sameActorApproval = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_requested/approve-production-trust',
      headers: adminHeaders(),
      payload: { reason: 'same actor cannot approve own request' }
    });

    expect(directPendingApproval.statusCode).toBe(409);
    expect(directPendingApproval.json().error.code).toBe('bank_evidence_production_trust_not_requested');
    expect(sameActorApproval.statusCode).toBe(409);
    expect(sameActorApproval.json().error.code).toBe('bank_evidence_dual_control_required');
    expect(repository.evidence.find((evidence) => evidence.evidenceId === 'bev_requested')?.status).toBe('production_trust_requested');
  });

  it('approves and revokes production trust metadata without enabling auto-confirm', async () => {
    const repository = buildEvidenceRepository({
      evidence: [trustRequestedEvidence({ productionTrustRequestedBy: 'ops_requester' })]
    });
    const server = buildTestServer(repository, { role: 'admin', operatorId: 'ops_approver' });

    const approved = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_requested/approve-production-trust',
      headers: adminHeaders(),
      payload: {
        reason: 'second operator completed production metadata review'
      }
    });
    const revoked = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_requested/revoke-production-trust',
      headers: adminHeaders(),
      payload: {
        reason: 'operator revoked metadata trust after app update drift'
      }
    });

    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({
      evidence_id: 'bev_requested',
      status: 'production_trust_approved',
      production_trusted_app_metadata: true,
      auto_confirm_enabled: false,
      approved_by: 'ops_approver'
    });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json()).toMatchObject({
      evidence_id: 'bev_requested',
      status: 'production_trust_revoked',
      production_trusted_app_metadata: false,
      auto_confirm_enabled: false,
      revoked_by: 'ops_approver'
    });
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual([
      BankEvidenceAuditEventTypes.PRODUCTION_TRUST_REVOKED,
      BankEvidenceAuditEventTypes.PRODUCTION_TRUST_APPROVED
    ]);
    expect(`${approved.body}\n${revoked.body}`).not.toContain(certHash);
    expect(`${approved.body}\n${revoked.body}`).not.toContain('+79991234567');
  });

  it('restricts production trust transitions to explicit owner/admin permissions', async () => {
    const repository = buildEvidenceRepository({
      evidence: [reviewOnlyEvidence(), trustRequestedEvidence({ productionTrustRequestedBy: 'ops_requester' })]
    });
    const operatorServer = buildTestServer(repository, { role: 'operator', operatorId: 'ops_operator' });
    const readOnlyServer = buildTestServer(repository, { role: 'read_only', operatorId: 'ops_read' });

    const operatorRequest = await operatorServer.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_existing/request-production-trust',
      headers: adminHeaders(),
      payload: { reason: 'operator cannot request production trust' }
    });
    const readOnlyApprove = await readOnlyServer.inject({
      method: 'POST',
      url: '/v1/admin/bank-evidence/bev_requested/approve-production-trust',
      headers: adminHeaders(),
      payload: { reason: 'read only cannot approve production trust' }
    });

    expect(operatorRequest.statusCode).toBe(403);
    expect(operatorRequest.json().error.details.required_permission).toBe('request_bank_evidence_production_trust');
    expect(readOnlyApprove.statusCode).toBe(403);
    expect(readOnlyApprove.json().error.details.required_permission).toBe('approve_bank_evidence_production_trust');
    expect(repository.evidence.find((evidence) => evidence.evidenceId === 'bev_existing')?.status).toBe('approved_for_review_only');
    expect(repository.evidence.find((evidence) => evidence.evidenceId === 'bev_requested')?.status).toBe('production_trust_requested');
  });
});

function buildTestServer(
  bankEvidenceRepository: InMemoryBankEvidenceRepository,
  options: {
    role?: 'owner' | 'admin' | 'operator' | 'support' | 'read_only';
    operatorId?: string | undefined;
  } = {}
) {
  return buildApiServer({
    environment: 'test',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    bankEvidenceRepository,
    adminAuth: {
      mode: 'dev_token',
      environment: 'test',
      devToken: 'local-admin-token',
      devOperatorId: options.operatorId ?? 'ops_01',
      devRole: options.role ?? 'admin'
    },
    idGenerator: {
      orderId: () => 'ord_unused',
      paymentSessionId: () => 'ps_unused',
      auditEventId: () => 'aud_bank_evidence_01',
      referenceCode: () => 'SWP-EVIDENCE'
    },
    bankEvidenceIdGenerator: () => 'bev_01',
    clock: () => new Date('2026-05-03T02:00:00.000Z')
  });
}

function buildEvidenceRepository(overrides: { evidence?: BankEvidenceRecord[] | undefined } = {}) {
  return new InMemoryBankEvidenceRepository({
    devices: [{ merchantId: 'mch_01', deviceId: 'dev_01' }],
    bankProfileIds: ['sberbank_ru'],
    evidence: overrides.evidence ?? [],
    evidenceId: () => 'bev_01'
  });
}

function evidencePayload() {
  return {
    device_id: 'dev_01',
    bank_profile_id: 'sberbank_ru',
    package_name: 'com.swimpay.syntheticbank.debug',
    cert_sha256: certHash,
    app_version: '0.1.0-debug',
    install_source: 'debug_manual_entry',
    source: 'android_packagemanager'
  };
}

function pendingEvidence(): BankEvidenceRecord {
  return {
    evidenceId: 'bev_existing',
    merchantId: 'mch_01',
    deviceId: 'dev_01',
    bankProfileId: 'sberbank_ru',
    packageName: 'com.swimpay.syntheticbank.debug',
    certSha256: certHash,
    appVersion: '0.1.0-debug',
    installSource: 'debug_manual_entry',
    source: 'android_packagemanager',
    status: 'pending_operator_review',
    createdAt: '2026-05-03T01:58:00.000Z'
  };
}

function reviewOnlyEvidence(overrides: Partial<BankEvidenceRecord> = {}): BankEvidenceRecord {
  return {
    ...pendingEvidence(),
    status: 'approved_for_review_only',
    reviewedAt: '2026-05-03T02:00:00.000Z',
    reviewedBy: 'ops_review',
    reviewReason: 'review-only approval',
    ...overrides
  };
}

function trustRequestedEvidence(
  overrides: Partial<BankEvidenceRecord> & { productionTrustRequestedBy?: string | undefined } = {}
): BankEvidenceRecord {
  return {
    ...reviewOnlyEvidence({
      evidenceId: 'bev_requested'
    }),
    status: 'production_trust_requested' as BankEvidenceRecord['status'],
    productionTrustRequestedAt: '2026-05-03T02:10:00.000Z',
    productionTrustRequestedBy: overrides.productionTrustRequestedBy ?? 'ops_requester',
    productionTrustReason: 'production metadata trust requested',
    ...overrides
  };
}

function merchantHeaders() {
  return { authorization: 'Bearer test_mch_01' };
}

function adminHeaders() {
  return { authorization: 'Bearer local-admin-token' };
}
