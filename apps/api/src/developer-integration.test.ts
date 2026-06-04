import { describe, expect, it } from 'vitest';
import { buildApiServer } from './server.js';
import {
  InMemoryMerchantIntegrationRepository,
  createDefaultMerchantIntegrationRepository,
  validateWebhookUrl
} from './developer-integration.js';
import { CSRF_HEADER_NAME, InMemoryAuthBffRepository } from './auth-bff.js';

const merchantHeaders = { authorization: 'Bearer test_merchant_9e' };

function buildDeveloperIntegrationServer() {
  const merchantIntegrationRepository = new InMemoryMerchantIntegrationRepository();
  const authBffRepository = new InMemoryAuthBffRepository();
  const server = buildApiServer({
    environment: 'test',
    merchantIntegrationRepository,
    authBffRepository,
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    clock: () => new Date('2026-05-06T10:00:00.000Z')
  });
  return { server, merchantIntegrationRepository };
}

function buildProductionDeveloperIntegrationServer() {
  const merchantIntegrationRepository = new InMemoryMerchantIntegrationRepository();
  const server = buildApiServer({
    environment: 'production',
    merchantIntegrationRepository,
    phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    adminAuth: {
      mode: 'signed_token',
      environment: 'production',
      tokenHmacSecret: 'production_admin_hmac_secret_for_tests'
    },
    clock: () => new Date('2026-05-06T10:00:00.000Z')
  });
  return { server, merchantIntegrationRepository };
}

async function bootstrapWebMerchant(server: ReturnType<typeof buildApiServer>) {
  const response = await server.inject({
    method: 'POST',
    url: '/auth/dev/bootstrap-session',
    payload: {
      user_id: '11111111-1111-4111-8111-111111111111',
      merchant_id: '22222222-2222-4222-8222-222222222222',
      email: 'owner@example.com',
      role: 'owner'
    }
  });
  const cookie = response.headers['set-cookie'];
  return {
    merchantId: '22222222-2222-4222-8222-222222222222',
    headers: {
      cookie: Array.isArray(cookie) ? cookie[0] : String(cookie),
      [CSRF_HEADER_NAME]: String(response.json().csrf_token)
    }
  };
}

describe('developer integration backend lifecycle', () => {
  it('returns a merchant-scoped credential read model without raw secrets', async () => {
    const { server } = buildDeveloperIntegrationServer();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: merchantHeaders
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.merchant_id).toBe('merchant_9e');
    expect(body.public_key).toMatch(/^pk_test_/u);
    expect(body.secret_key_masked).toBeNull();
    expect(body.webhook_secret_masked).toBeNull();
    expect(body.public_webhook_events).toEqual(['payment.confirmed', 'payment.rejected', 'payment.expired']);
    expect(body.official_bank_confirmation).toBe(false);
    expect(response.body).not.toMatch(/sk_test_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+/u);
  });

  it('shows secret keys once on creation and masks later reads', async () => {
    const { server } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/keys',
      headers: webMerchant.headers
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().secret_key_once).toMatch(/^sk_test_/u);
    expect(created.json().secret_key_masked).toMatch(/^sk_test_/u);

    const read = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: webMerchant.headers
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().secret_key_once).toBeUndefined();
    expect(read.body).not.toContain(created.json().secret_key_once);
  });

  it('generates webhook secret show-once and validates webhook URL safety', async () => {
    const { server } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);

    const unsafe = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: webMerchant.headers,
      payload: { webhook_url: 'javascript:alert(1)' }
    });
    expect(unsafe.statusCode).toBe(400);

    const updated = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: webMerchant.headers,
      payload: { webhook_url: 'https://merchant.example/webhooks/swimpay' }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().webhook_url).toBe('https://merchant.example/webhooks/swimpay');
    expect(updated.json().webhook_secret_once).toMatch(/^whsec_/u);

    const read = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: webMerchant.headers
    });
    expect(read.json().webhook_secret_once).toBeUndefined();
    expect(read.body).not.toContain(updated.json().webhook_secret_once);
  });

  it('rejects localhost, private and link-local webhook URL hosts without DNS lookups', () => {
    const unsafeUrls = [
      'https://localhost/hooks',
      'https://api.localhost/hooks',
      'https://127.0.0.1/hooks',
      'https://10.10.0.8/hooks',
      'https://172.16.0.8/hooks',
      'https://192.168.10.8/hooks',
      'https://169.254.10.8/hooks',
      'https://[::1]/hooks',
      'https://[fe80::1]/hooks',
      'https://internal/hooks'
    ];

    for (const webhookUrl of unsafeUrls) {
      expect(validateWebhookUrl(webhookUrl)).toEqual({
        valid: false,
        message: 'Webhook URL host is not allowed.'
      });
    }
  });

  it('fails fast when production webhook secret encryption key is missing', () => {
    expect(() =>
      createDefaultMerchantIntegrationRepository(
        {
          DATABASE_URL: 'postgres://swimpay:swimpay@localhost:5432/swimpay',
          WEBHOOK_SECRET_ENCRYPTION_KEY: ''
        },
        'production'
      )
    ).toThrow(/WEBHOOK_SECRET_ENCRYPTION_KEY/u);
  });

  it('queues a backend-owned safe test webhook that cannot trigger fulfillment', async () => {
    const { server } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);
    await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: webMerchant.headers,
      payload: { webhook_url: 'https://merchant.example/webhooks/swimpay' }
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/test-webhook',
      headers: webMerchant.headers
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      status: 'test_queued',
      testOnly: true,
      triggersFulfillment: false,
      officialBankConfirmation: false
    });
  });

  it('returns merchant-scoped public delivery history and retries without exposing payloads or secrets', async () => {
    const { server, merchantIntegrationRepository } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);
    merchantIntegrationRepository.seedDelivery(webMerchant.merchantId, {
      deliveryId: 'del_failed_01',
      eventId: 'evt_public_01',
      eventType: 'payment.rejected',
      safeErrorSummary: 'failed with whsec_super_secret +79991234567 4111111111111111'
    });

    const history = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration/webhook-deliveries',
      headers: webMerchant.headers
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().deliveries).toHaveLength(1);
    expect(history.body).toContain('payment.rejected');
    expect(history.body).not.toMatch(/whsec_super_secret|\+79991234567|4111111111111111|payload_json|raw notification/iu);

    const retry = await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/webhook-deliveries/del_failed_01/retry',
      headers: webMerchant.headers
    });
    expect(retry.statusCode).toBe(202);
    expect(retry.json()).toMatchObject({
      status: 'retry_queued',
      replayOfDeliveryId: 'del_failed_01'
    });
  });

  it('provisions the full integration atomically and computes integration_ready', async () => {
    const { server } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);

    const before = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: webMerchant.headers
    });
    expect(before.json().integration_ready).toBe(false);

    const invalid = await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/provision',
      headers: webMerchant.headers,
      payload: { webhook_url: 'javascript:alert(1)' }
    });
    expect(invalid.statusCode).toBe(400);

    const provisioned = await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/provision',
      headers: webMerchant.headers,
      payload: { webhook_url: 'https://merchant.example/webhooks/swimpay' }
    });
    expect(provisioned.statusCode).toBe(201);
    const body = provisioned.json();
    expect(body.secret_key_once).toMatch(/^sk_test_/u);
    expect(body.webhook_secret_once).toMatch(/^whsec_/u);
    expect(body.webhook_url).toBe('https://merchant.example/webhooks/swimpay');
    expect(body.webhook_status).toBe('active');
    expect(body.integration_ready).toBe(true);

    const after = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: webMerchant.headers
    });
    expect(after.json().integration_ready).toBe(true);
    expect(after.json().secret_key_once).toBeUndefined();
    expect(after.body).not.toContain(body.secret_key_once);
  });

  it('keeps integration_ready false while only half of the binding exists', async () => {
    const { server } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);

    await server.inject({ method: 'POST', url: '/v1/merchant/integration/keys', headers: webMerchant.headers });
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/webhook-secret/rotate',
      headers: webMerchant.headers
    });

    const read = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: webMerchant.headers
    });
    expect(read.json().webhook_status).toBe('not_configured');
    expect(read.json().integration_ready).toBe(false);
  });

  it('re-reveals stored secrets behind the reveal endpoint and records an audit trail', async () => {
    const { server, merchantIntegrationRepository } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);

    const provisioned = await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/provision',
      headers: webMerchant.headers,
      payload: { webhook_url: 'https://merchant.example/webhooks/swimpay' }
    });
    const onceKey = provisioned.json().secret_key_once;
    const onceWebhook = provisioned.json().webhook_secret_once;

    const reveal = await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/secrets/reveal',
      headers: webMerchant.headers
    });
    expect(reveal.statusCode).toBe(200);
    expect(reveal.json().secret_key).toBe(onceKey);
    expect(reveal.json().webhook_secret).toBe(onceWebhook);
    expect(reveal.json().webhook_url).toBe('https://merchant.example/webhooks/swimpay');
    expect(reveal.json().secret_key_requires_rotation).toBe(false);
    expect(reveal.json().webhook_secret_requires_rotation).toBe(false);
    expect(merchantIntegrationRepository.revealAudit).toHaveLength(1);
    expect(merchantIntegrationRepository.revealAudit[0]).toMatchObject({
      merchantId: webMerchant.merchantId,
      revealedFields: ['secret_key', 'webhook_secret'],
      source: 'bff_session'
    });

    const read = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: webMerchant.headers
    });
    expect(read.body).not.toContain(onceKey);
    expect(read.body).not.toContain(onceWebhook);
  });

  it('rate limits repeated secret reveal requests', async () => {
    const { server } = buildDeveloperIntegrationServer();
    const webMerchant = await bootstrapWebMerchant(server);
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/integration/provision',
      headers: webMerchant.headers,
      payload: { webhook_url: 'https://merchant.example/webhooks/swimpay' }
    });

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/merchant/integration/secrets/reveal',
        headers: webMerchant.headers
      });
      statuses.push(response.statusCode);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });

  it('keeps product truth guardrails on developer integration responses', async () => {
    const { server } = buildDeveloperIntegrationServer();
    const response = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: merchantHeaders
    });

    expect(response.body).not.toMatch(/payment\.signal_detected|payment\.needs_review|auto_confirm|autoConfirm/iu);
    expect(response.body).not.toMatch(/official_bank_confirmation["']?\s*:\s*true|bank_confirmed|guaranteed_payment/iu);
  });

  it('rejects local test merchant bearer tokens for developer integration routes in production', async () => {
    const { server } = buildProductionDeveloperIntegrationServer();
    const requests = [
      { method: 'GET', url: '/v1/merchant/integration' },
      { method: 'POST', url: '/v1/merchant/integration/keys' },
      { method: 'POST', url: '/v1/merchant/integration/keys/rotate' },
      { method: 'POST', url: '/v1/merchant/integration/webhook-secret/rotate' },
      { method: 'PUT', url: '/v1/merchant/integration/webhook-url', payload: { webhook_url: 'https://merchant.example/hooks' } },
      { method: 'POST', url: '/v1/merchant/integration/provision', payload: { webhook_url: 'https://merchant.example/hooks' } },
      { method: 'POST', url: '/v1/merchant/integration/secrets/reveal' },
      { method: 'POST', url: '/v1/merchant/integration/test-webhook' },
      { method: 'GET', url: '/v1/merchant/integration/webhook-deliveries' },
      { method: 'POST', url: '/v1/merchant/integration/webhook-deliveries/del_failed/retry' }
    ] as const;

    for (const request of requests) {
      const response = await server.inject({
        ...request,
        headers: merchantHeaders
      });
      expect(response.statusCode).toBe(401);
      expect(response.body).not.toMatch(/sk_test_|whsec_|Bearer test_|payload_json|\+7\d{10}|\b\d{16}\b/u);
    }
  });
});
