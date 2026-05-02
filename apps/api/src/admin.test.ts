import { describe, expect, it } from 'vitest';

import { buildApiServer } from './server.js';
import { AdminAuditEventTypes, InMemoryAdminRepository, type AdminTemplateSummary } from './admin.js';

describe('minimal admin console api', () => {
  it('lists bank profiles, templates, incidents, receiver health, and redacted audit events for operators', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository);

    const [profiles, templates, drift, webhookFailures, receiverHealth, auditEvents] = await Promise.all([
      server.inject({
        method: 'GET',
        url: '/v1/admin/bank-profiles',
        headers: { authorization: 'Bearer admin_ops_01' }
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/templates',
        headers: { authorization: 'Bearer admin_ops_01' }
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/drift-events',
        headers: { authorization: 'Bearer admin_ops_01' }
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/webhook-failures',
        headers: { authorization: 'Bearer admin_ops_01' }
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/receiver-health',
        headers: { authorization: 'Bearer admin_ops_01' }
      }),
      server.inject({
        method: 'GET',
        url: '/v1/admin/audit-events?object_type=bank_template',
        headers: { authorization: 'Bearer admin_ops_01' }
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
    expect([profiles.body, templates.body, auditEvents.body].join('\n')).not.toContain('+79991234567');
    expect([profiles.body, templates.body, auditEvents.body].join('\n')).not.toContain('raw notification');
  });

  it('marks a template degraded and writes an operator audit event with redacted reason', async () => {
    const repository = buildAdminRepository();
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_01/degrade',
      headers: { authorization: 'Bearer admin_ops_01' },
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
    const server = buildTestServer(repository);

    const unauthorized = await server.inject({
      method: 'GET',
      url: '/v1/admin/bank-profiles',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const action = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_01/review-only',
      headers: { authorization: 'Bearer admin_ops_01' },
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
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_false_positive/promote',
      headers: { authorization: 'Bearer admin_ops_01' },
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
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/promote',
      headers: { authorization: 'Bearer admin_ops_01' },
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
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/promote',
      headers: { authorization: 'Bearer admin_ops_01' },
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
    const server = buildTestServer(repository);

    const falsePositive = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/false-positive',
      headers: { authorization: 'Bearer admin_ops_01' },
      payload: {
        reason: 'merchant reported a false positive'
      }
    });
    const disable = await server.inject({
      method: 'POST',
      url: '/v1/admin/templates/tpl_trusted/disable',
      headers: { authorization: 'Bearer admin_ops_01' },
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
});

function buildTestServer(repository: InMemoryAdminRepository) {
  return buildApiServer({
    environment: 'test',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    adminRepository: repository,
    idGenerator: {
      orderId: () => 'ord_unused',
      paymentSessionId: () => 'ps_unused',
      auditEventId: () => 'aud_admin_01',
      referenceCode: () => 'SWP-ADMIN'
    },
    clock: () => new Date('2026-05-02T11:15:00.000Z')
  });
}

function buildAdminRepository(
  overrides: {
    templates?: AdminTemplateSummary[] | undefined;
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
    auditEvents: [
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
