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
});

function buildTestServer(
  bankEvidenceRepository: InMemoryBankEvidenceRepository,
  options: {
    role?: 'owner' | 'admin' | 'operator' | 'support' | 'read_only';
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
      devOperatorId: 'ops_01',
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

function merchantHeaders() {
  return { authorization: 'Bearer test_mch_01' };
}

function adminHeaders() {
  return { authorization: 'Bearer local-admin-token' };
}
