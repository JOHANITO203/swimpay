import { describe, expect, it } from 'vitest';

import { buildApiServer } from './server.js';
import { AdminAuditEventTypes, InMemoryAdminRepository, type AdminTemplateSummary } from './admin.js';

describe('minimal admin console api', () => {
  it('lists bank profiles, templates, incidents, receiver health, and redacted audit events for operators', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository, { role: 'operator' });

    const [profiles, templates, bankAppSignatures, drift, webhookFailures, receiverHealth, auditEvents] = await Promise.all([
      server.inject({
        method: 'GET',
        url: '/v1/admin/bank-profiles',
        headers: adminHeaders()
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/templates',
        headers: adminHeaders()
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/bank-app-signatures',
        headers: adminHeaders()
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/drift-events',
        headers: adminHeaders()
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/webhook-failures',
        headers: adminHeaders()
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/receiver-health',
        headers: adminHeaders()
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/audit-events?object_type=bank_template',
        headers: adminHeaders()
      })
    ]);

    expect(profiles.statusCode).toBe(200);
    expect(profiles.json().bank_profiles[0]).toMatchObject({
      bankProfileId: 'sberbank_ru',
      status: 'learning',
      autoConfirmStatus: 'disabled'
    });
    expect(templates.statusCode).toBe(200);
    expect(templates.json().templates[0]).toMatchObject({
      templateId: 'tpl_01',
      canonicalTitle: '<AMOUNT> <CURRENCY>',
      canonicalBody: '<PHONE> <REFERENCE>'
    });
    expect(bankAppSignatures.statusCode).toBe(200);
    expect(bankAppSignatures.json().bank_app_signatures[0]).toMatchObject({
      signatureId: 'bas_to_verify',
      bankProfileId: 'sberbank_ru',
      packageName: 'TO_VERIFY',
      certSha256Masked: 'TO_VERIFY',
      status: 'pending_verification'
    });
    expect(drift.statusCode).toBe(200);
    expect(drift.json().drift_events[0]).toMatchObject({
      bankProfileId: 'sberbank_ru',
      status: 'minor_drift'
    });
    expect(webhookFailures.statusCode).toBe(200);
    expect(webhookFailures.json().webhook_failures[0]).toMatchObject({
      deliveryId: 'del_01',
      status: 'failed'
    });
    expect(receiverHealth.statusCode).toBe(200);
    expect(receiverHealth.json().receiver_health[0]).toMatchObject({
      deviceId: 'dev_01',
      notificationAccess: true
    });
    expect(auditEvents.statusCode).toBe(200);
    expect(auditEvents.json().audit_events[0]).toMatchObject({
      objectType: 'bank_template',
      payloadRedacted: {
        template_id: 'tpl_01'
      }
    });
    expect([profiles.body, templates.body, bankAppSignatures.body, auditEvents.body].join('\n')).not.toContain('+79991234567');
    expect([profiles.body, templates.body, bankAppSignatures.body, auditEvents.body].join('\n')).not.toContain('raw notification');
  });

  it('filters bank evidence audit traces without exposing raw evidence values', async () => {
    const repository = buildAdminRepository({
      auditEvents: [
        {
          auditEventId: 'aud_evidence_approved',
          eventType: 'bank_evidence.approved_review_only',
          objectType: 'bank_package_evidence',
          objectId: 'bev_01',
          actorType: 'operator',
          actorId: 'ops_01',
          payloadRedacted: {
            evidence_id: 'bev_01',
            package_name: 'ru.sberbankmobile',
            cert_sha256_masked: 'fea43e...99a2ea',
            reason: 'package_verified_for_review_only: reviewed <PHONE> <REFERENCE>',
            trusted: false,
            auto_confirm_enabled: false
          },
          createdAt: '2026-05-03T12:00:00.000Z'
        },
        {
          auditEventId: 'aud_evidence_other',
          eventType: 'bank_evidence.approved_review_only',
          objectType: 'bank_package_evidence',
          objectId: 'bev_02',
          actorType: 'operator',
          actorId: 'ops_02',
          payloadRedacted: {
            evidence_id: 'bev_02',
            cert_sha256_masked: 'abcdef...123456',
            trusted: false,
            auto_confirm_enabled: false
          },
          createdAt: '2026-05-03T12:03:00.000Z'
        }
      ]
    });
    const server = buildTestServer(repository, { role: 'operator' });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/admin/audit-events?object_type=bank_package_evidence&object_id=bev_01&event_type=bank_evidence.approved_review_only&actor_id=ops_01&created_after=2026-05-03T11%3A59%3A00.000Z',
      headers: adminHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().audit_events).toHaveLength(1);
    expect(response.json().audit_events[0]).toMatchObject({
      auditEventId: 'aud_evidence_approved',
      eventType: 'bank_evidence.approved_review_only',
      objectType: 'bank_package_evidence',
      objectId: 'bev_01',
      actorId: 'ops_01',
      payloadRedacted: {
        cert_sha256_masked: 'fea43e...99a2ea',
        trusted: false,
        auto_confirm_enabled: false
      }
    });
    expect(response.body).not.toContain('fea43e01fea43e01fea43e01fea43e01fea43e01fea43e01fea43e01fea43e01');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('raw notification');
  });

  it('marks a template degraded and writes an operator audit event with redacted reason', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository, { role: 'operator' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_01/degrade',
      headers: adminHeaders(),
      payload: {
        reason: 'operator observed false positive around +7 999 123-45-67 and reference 123456789012'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      template_id: 'tpl_01',
      bank_profile_id: 'sberbank_ru',
      status: 'degraded',
      false_positive_count: 0,
      auto_confirm_allowed_by_template: false,
      audit_event_id: 'aud_admin_01'
    });
    expect(repository.templates[0]?.status).toBe('degraded');
    expect(repository.auditEvents[0]).toMatchObject({
      auditEventId: 'aud_admin_01',
      eventType: AdminAuditEventTypes.TEMPLATE_DEGRADED,
      objectType: 'bank_template',
      objectId: 'tpl_01',
      actorType: 'operator',
      actorId: 'ops_01',
      payloadRedacted: {
        status: 'degraded',
        reason: 'operator observed false positive around <PHONE> and reference <REFERENCE>'
      }
    });
  });

  it('marks a template review_only and rejects non-operator access', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository, { role: 'operator' });

    const unauthorized = await server.inject({
      method: 'GET',
      url: '/v1/admin/bank-profiles',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const action = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_01/review-only',
      headers: adminHeaders(),
      payload: {}
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(action.statusCode).toBe(200);
    expect(action.json()).toMatchObject({
      template_id: 'tpl_01',
      status: 'review_only',
      auto_confirm_allowed_by_template: false,
      audit_event_id: 'aud_admin_01'
    });
    expect(repository.auditEvents[0]?.eventType).toBe(AdminAuditEventTypes.TEMPLATE_REVIEW_ONLY);
  });

  it('blocks trusted promotion when false positives exist', async () => {
    const repository = buildAdminRepository({
      templates: [
        {
          ...trustedCandidateTemplate(),
          templateId: 'tpl_false_positive',
          falsePositiveCount: 1
        }
      ],
      verifiedBankAppProfiles: ['sberbank_ru']
    });
    const server = buildTestServer(repository, { role: 'admin' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_false_positive/promote',
      headers: adminHeaders(),
      payload: {
        target_status: 'trusted'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('template_false_positive_present');
    expect(repository.templates[0]?.status).toBe('learning');
  });

  it('blocks trusted promotion when package/cert metadata is still TO_VERIFY', async () => {
    const repository = buildAdminRepository({
      templates: [trustedCandidateTemplate()],
      verifiedBankAppProfiles: []
    });
    const server = buildTestServer(repository, { role: 'admin' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/promote',
      headers: adminHeaders(),
      payload: {
        target_status: 'trusted'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('verified_bank_app_required');
    expect(response.json().error.message).toContain('TO_VERIFY');
  });

  it('promotes only with evidence and verified bank app metadata', async () => {
    const repository = buildAdminRepository({
      templates: [trustedCandidateTemplate()],
      verifiedBankAppProfiles: ['sberbank_ru']
    });
    const server = buildTestServer(repository, { role: 'admin' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/promote',
      headers: adminHeaders(),
      payload: {
        target_status: 'trusted',
        reason: 'shadow evidence and operator review thresholds met'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      template_id: 'tpl_trusted',
      status: 'trusted',
      false_positive_count: 0,
      auto_confirm_allowed_by_template: true
    });
    expect(repository.auditEvents[0]).toMatchObject({
      eventType: AdminAuditEventTypes.TEMPLATE_PROMOTED,
      payloadRedacted: {
        auto_confirm_allowed_by_template: true
      }
    });
  });

  it('marks false positives review_only and disables template auto-confirm candidate status', async () => {
    const repository = buildAdminRepository({
      templates: [{ ...trustedCandidateTemplate(), status: 'trusted' }],
      verifiedBankAppProfiles: ['sberbank_ru']
    });
    const server = buildTestServer(repository, { role: 'admin' });

    const falsePositive = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/false-positive',
      headers: adminHeaders(),
      payload: {
        reason: 'merchant reported a false positive'
      }
    });
    const disable = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/disable',
      headers: adminHeaders(),
      payload: {
        reason: 'critical drift incident'
      }
    });

    expect(falsePositive.statusCode).toBe(200);
    expect(falsePositive.json()).toMatchObject({
      status: 'review_only',
      false_positive_count: 1,
      auto_confirm_allowed_by_template: false
    });
    expect(disable.statusCode).toBe(200);
    expect(disable.json()).toMatchObject({
      status: 'disabled',
      auto_confirm_allowed_by_template: false
    });
    expect(repository.templates[0]).toMatchObject({
      status: 'disabled',
      falsePositiveCount: 1
    });
  });

  it('rejects missing admin authentication', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository, { role: 'operator' });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/admin/templates'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('operator_auth_required');
  });

  it('dev admin auth works only when the dev token is configured', async () => {
    const repository = buildAdminRepository();
    const configuredServer = buildTestServer(repository, { role: 'read_only' });
    const unconfiguredServer = buildTestServer(repository, { role: 'read_only', devToken: undefined });

    const configured = await configuredServer.inject({
      method: 'GET',
      url: '/v1/admin/templates',
      headers: adminHeaders()
    });
    const unconfigured = await unconfiguredServer.inject({
      method: 'GET',
      url: '/v1/admin/templates',
      headers: adminHeaders()
    });

    expect(configured.statusCode).toBe(200);
    expect(unconfigured.statusCode).toBe(401);
    expect(unconfigured.json().error.code).toBe('operator_auth_rejected');
  });

  it('production mode rejects placeholder admin bearer tokens', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository, {
      environment: 'production',
      authMode: 'signed_token',
      tokenHmacSecret: 'production_test_secret'
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/admin/templates',
      headers: { authorization: 'Bearer admin_ops_01' }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.details.reason).toBe('placeholder_admin_token_rejected');
  });

  it('read_only operators cannot perform dangerous template actions', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository, { role: 'read_only' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_01/degrade',
      headers: adminHeaders(),
      payload: {
        reason: 'read only user should not mutate templates'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('operator_permission_denied');
    expect(repository.templates[0]?.status).toBe('learning');
    expect(repository.auditEvents[0]?.auditEventId).toBe('aud_existing_01');
  });

  it('operator role cannot promote bank templates without explicit permission', async () => {
    const repository = buildAdminRepository({
      templates: [trustedCandidateTemplate()],
      verifiedBankAppProfiles: ['sberbank_ru']
    });
    const server = buildTestServer(repository, { role: 'operator' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/promote',
      headers: adminHeaders(),
      payload: {
        target_status: 'trusted'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.details.required_permission).toBe('promote_bank_templates');
    expect(repository.templates[0]?.status).toBe('learning');
  });

  it('does not verify TO_VERIFY bank app metadata automatically', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository, { role: 'admin' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-app-signatures/bas_to_verify/verify',
      headers: adminHeaders(),
      payload: {
        reason: 'operator cannot verify placeholder metadata'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('bank_app_signature_to_verify');
    expect(repository.bankAppSignatures[0]?.status).toBe('pending_verification');
    expect(repository.verifiedBankAppProfiles.has('sberbank_ru')).toBe(false);
  });

  it('verifies only synthetic observed bank app metadata through an audited operator action', async () => {
    const repository = buildAdminRepository({
      bankAppSignatures: [
        {
          signatureId: 'bas_synthetic_01',
          bankProfileId: 'sberbank_ru',
          packageName: 'synthetic.receiver.bank',
          certSha256Masked: 'synthe...cert01',
          status: 'pending_verification',
          firstSeenAt: '2026-05-02T10:00:00.000Z'
        }
      ]
    });
    const server = buildTestServer(repository, { role: 'admin' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-app-signatures/bas_synthetic_01/verify',
      headers: adminHeaders(),
      payload: {
        reason: 'synthetic PackageManager review completed'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      signature_id: 'bas_synthetic_01',
      bank_profile_id: 'sberbank_ru',
      package_name: 'synthetic.receiver.bank',
      cert_sha256_masked: 'synthe...cert01',
      status: 'verified',
      audit_event_id: 'aud_admin_01'
    });
    expect(repository.verifiedBankAppProfiles.has('sberbank_ru')).toBe(true);
    expect(repository.auditEvents[0]).toMatchObject({
      eventType: AdminAuditEventTypes.BANK_APP_SIGNATURE_VERIFIED,
      objectType: 'bank_app_signature',
      objectId: 'bas_synthetic_01',
      payloadRedacted: {
        cert_sha256_masked: 'synthe...cert01',
        status: 'verified'
      }
    });
  });

  it('requires promote_bank_templates permission to verify bank app metadata', async () => {
    const repository = buildAdminRepository({
      bankAppSignatures: [
        {
          signatureId: 'bas_synthetic_01',
          bankProfileId: 'sberbank_ru',
          packageName: 'synthetic.receiver.bank',
          certSha256Masked: 'synthe...cert01',
          status: 'pending_verification',
          firstSeenAt: '2026-05-02T10:00:00.000Z'
        }
      ]
    });
    const server = buildTestServer(repository, { role: 'operator' });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/bank-app-signatures/bas_synthetic_01/verify',
      headers: adminHeaders(),
      payload: {}
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.details.required_permission).toBe('promote_bank_templates');
    expect(repository.bankAppSignatures[0]?.status).toBe('pending_verification');
  });
});

function buildTestServer(
  repository: InMemoryAdminRepository,
  options: {
    environment?: 'test' | 'production';
    authMode?: 'dev_token' | 'signed_token';
    role?: 'owner' | 'admin' | 'operator' | 'support' | 'read_only';
    devToken?: string | undefined;
    tokenHmacSecret?: string | undefined;
  } = {}
) {
  return buildApiServer({
    environment: options.environment ?? 'test',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    adminRepository: repository,
    adminAuth: {
      mode: options.authMode ?? 'dev_token',
      environment: options.environment ?? 'test',
      devToken: options.devToken === undefined && !('devToken' in options) ? 'local-admin-token' : options.devToken,
      devOperatorId: 'ops_01',
      devRole: options.role ?? 'admin',
      tokenHmacSecret: options.tokenHmacSecret
    },
    idGenerator: {
      orderId: () => 'ord_unused',
      paymentSessionId: () => 'ps_unused',
      auditEventId: () => 'aud_admin_01',
      referenceCode: () => 'SWP-ADMIN'
    },
    clock: () => new Date('2026-05-02T11:15:00.000Z')
  });
}

function adminHeaders() {
  return { authorization: 'Bearer local-admin-token' };
}

function buildAdminRepository(
  overrides: {
    templates?: AdminTemplateSummary[] | undefined;
    bankAppSignatures?: ConstructorParameters<typeof InMemoryAdminRepository>[0]['bankAppSignatures'] | undefined;
    auditEvents?: ConstructorParameters<typeof InMemoryAdminRepository>[0]['auditEvents'] | undefined;
    verifiedBankAppProfiles?: string[] | undefined;
  } = {}
): InMemoryAdminRepository {
  return new InMemoryAdminRepository({
    bankProfiles: [
      {
        bankProfileId: 'sberbank_ru',
        displayName: 'Sberbank',
        country: 'RU',
        status: 'learning',
        reliabilityIndex: 0,
        unknownRate24h: 0.04,
        driftRate7d: 0.02,
        autoConfirmStatus: 'disabled',
        updatedAt: '2026-05-02T10:00:00.000Z'
      }
    ],
    templates: overrides.templates ?? [template()],
    driftEvents: [
      {
        eventId: 'drift_01',
        bankProfileId: 'sberbank_ru',
        status: 'minor_drift',
        reasonCodes: ['new_template_candidate'],
        occurredAt: '2026-05-02T10:20:00.000Z'
      }
    ],
    webhookFailures: [
      {
        deliveryId: 'del_01',
        merchantId: 'mch_01',
        endpointId: 'we_01',
        eventId: 'evt_01',
        eventType: 'payment.needs_review',
        status: 'failed',
        attemptCount: 5,
        lastError: 'HTTP 500',
        createdAt: '2026-05-02T10:25:00.000Z'
      }
    ],
    receiverHealth: [
      {
        deviceId: 'dev_01',
        merchantId: 'mch_01',
        status: 'healthy',
        trustScore: 50,
        notificationAccess: true,
        lastHeartbeatAt: '2026-05-02T10:30:00.000Z',
        appVersion: '0.1.0',
        updatedAt: '2026-05-02T10:30:00.000Z'
      }
    ],
    bankAppSignatures: overrides.bankAppSignatures ?? [
      {
        signatureId: 'bas_to_verify',
        bankProfileId: 'sberbank_ru',
        packageName: 'TO_VERIFY',
        certSha256Masked: 'TO_VERIFY',
        status: 'pending_verification',
        firstSeenAt: '2026-05-02T10:00:00.000Z'
      }
    ],
    auditEvents: overrides.auditEvents ?? [
      {
        auditEventId: 'aud_existing_01',
        eventType: AdminAuditEventTypes.TEMPLATE_DEGRADED,
        objectType: 'bank_template',
        objectId: 'tpl_01',
        actorType: 'operator',
        actorId: 'ops_02',
        payloadRedacted: {
          template_id: 'tpl_01',
          reason: '<PHONE> <REFERENCE>'
        },
        createdAt: '2026-05-02T10:40:00.000Z'
      }
    ],
    verifiedBankAppProfiles: overrides.verifiedBankAppProfiles ?? []
  });
}

function template(): AdminTemplateSummary {
  return {
    templateId: 'tpl_01',
    bankProfileId: 'sberbank_ru',
    directionLabel: 'incoming_customer_transfer',
    canonicalTitle: '<AMOUNT> <CURRENCY>',
    canonicalBody: '<PHONE> <REFERENCE>',
    status: 'learning',
    seenCount: 12,
    humanVerifiedCount: 3,
    falsePositiveCount: 0,
    reliabilityScore: 0.65,
    lastSeenAt: '2026-05-02T10:10:00.000Z',
    updatedAt: '2026-05-02T10:10:00.000Z'
  };
}

function trustedCandidateTemplate(): AdminTemplateSummary {
  return {
    templateId: 'tpl_trusted',
    bankProfileId: 'sberbank_ru',
    directionLabel: 'incoming_customer_transfer',
    canonicalTitle: '<AMOUNT> <CURRENCY>',
    canonicalBody: '<PHONE> <REFERENCE>',
    status: 'learning',
    seenCount: 120,
    humanVerifiedCount: 50,
    falsePositiveCount: 0,
    reliabilityScore: 0.96,
    lastSeenAt: '2026-05-02T10:10:00.000Z',
    updatedAt: '2026-05-02T10:10:00.000Z'
  };
}
