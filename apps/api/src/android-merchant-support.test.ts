import { describe, expect, it } from 'vitest';
import { buildApiServer, type AndroidMerchantSupportTicketCreateInput, type AndroidMerchantSupportTicketRepository } from './server.js';
import { createAndroidMerchantMobileSessionToken, hashAndroidMerchantMobileSessionToken, type AuthBffRepository } from './auth-bff.js';

describe('android merchant support/settings contracts', () => {
  it('requires Android merchant session for support tickets', async () => {
    const server = buildApiServer({
      environment: 'production',
      authBffRepository: null,
      eventPublisher: { publish: async () => undefined }
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/support-tickets',
      payload: { category: 'receiver_issue', subject: 'Receiver', message: 'Help' }
    });

    expect(response.statusCode).toBe(401);
    await server.close();
  });

  it('rejects raw secrets and client controlled merchant id in support payload', async () => {
    const token = createAndroidMerchantMobileSessionToken();
    const authBffRepository = fakeAuthRepository({
      token,
      merchantId: 'mch_real',
      userId: 'usr_real'
    });
    const server = buildApiServer({
      environment: 'production',
      authBffRepository,
      eventPublisher: { publish: async () => undefined }
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/support-tickets',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        merchant_id: 'mch_other',
        category: 'receiver_issue',
        subject: 'Receiver',
        message: 'My raw phone +79991234567 and secret sk_test_secret',
        safe_context: { webhook_secret: 'whsec_secret', app_version: '0.1.0' }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_request');
    await server.close();
  });

  it('creates a durable support ticket from the Android session merchant context', async () => {
    const token = createAndroidMerchantMobileSessionToken();
    const authBffRepository = fakeAuthRepository({
      token,
      merchantId: 'mch_real',
      userId: 'usr_real'
    });
    const supportTicketRepository = fakeSupportTicketRepository();
    const server = buildApiServer({
      environment: 'production',
      authBffRepository,
      supportTicketRepository,
      supportTicketIdGenerator: () => 'sup_test_01',
      eventPublisher: { publish: async () => undefined },
      clock: () => new Date('2026-05-08T20:00:00.000Z')
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/support-tickets',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        category: 'integration_webhook_issue',
        subject: 'Webhook test',
        message: 'Le webhook de test echoue avec une erreur reseau.',
        safe_context: { app_version: '0.1.0', receiver_health: 'active' }
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      ticket_id: 'sup_test_01',
      merchant_id: 'mch_real',
      status: 'created',
      category: 'integration_webhook_issue',
      official_bank_confirmation: false
    });
    expect(supportTicketRepository.created[0]).toMatchObject({
      id: 'sup_test_01',
      merchantId: 'mch_real',
      userId: 'usr_real',
      category: 'integration_webhook_issue',
      subject: 'Webhook test'
    });
    await server.close();
  });

  it('returns manual-only confirmation settings for Android merchant', async () => {
    const token = createAndroidMerchantMobileSessionToken();
    const authBffRepository = fakeAuthRepository({
      token,
      merchantId: 'mch_real',
      userId: 'usr_real'
    });
    const server = buildApiServer({
      environment: 'production',
      authBffRepository,
      eventPublisher: { publish: async () => undefined }
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/confirmation-settings',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'manual_review_required',
      allow_auto_confirmation: false,
      android_can_confirm_payments: false,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    await server.close();
  });
});

function fakeAuthRepository(input: {
  token: string;
  merchantId: string;
  userId: string;
}): AuthBffRepository {
  return {
    getAndroidMerchantMobileSessionByHash: async (hash: string) => {
      if (hash !== hashAndroidMerchantMobileSessionToken(input.token)) {
        return null;
      }
      return {
        id: 'ams_test',
        userId: input.userId,
        merchantId: input.merchantId,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        createdAt: new Date().toISOString(),
        revokedAt: null
      };
    }
  } as unknown as AuthBffRepository;
}

function fakeSupportTicketRepository(): AndroidMerchantSupportTicketRepository & {
  created: AndroidMerchantSupportTicketCreateInput[];
} {
  const created: AndroidMerchantSupportTicketCreateInput[] = [];
  return {
    created,
    create: async (input) => {
      created.push(input);
      return {
        ...input,
        status: 'created',
        updatedAt: input.createdAt
      };
    }
  };
}
