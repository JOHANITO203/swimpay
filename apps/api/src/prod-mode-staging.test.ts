import { describe, expect, it } from 'vitest';
import { buildApiServer, type OrderRepository, type StoredOrderRecord } from './server.js';
import type { StoredMerchantReceivingRouteRecord } from './orders.js';
import { InMemoryAuthBffRepository, InMemoryMerchantApiKeyVerifier, buildSessionCookieOptions, createCsrfToken, createOpaqueSessionToken, hashBffSessionToken, hashCsrfToken, serializeSessionCookie } from './auth-bff.js';
import { InMemoryMerchantIntegrationRepository } from './developer-integration.js';
import { deriveReceiverDeviceOperationalStatus, type CreateReceiverDeviceInput, type ReceiverDeviceRepository, type StoredReceiverDeviceRecord, type UpdateReceiverHeartbeatInput } from './receiver-devices.js';

function checkoutReadyRoute(merchantId: string): StoredMerchantReceivingRouteRecord {
  return {
    route_id: 'route_prod_stage_ready_card',
    merchant_id: merchantId,
    bank_profile_id: 'sber_ru',
    rail_type: 'card_transfer',
    receiver_identifier_type: 'card',
    receiver_identifier_encrypted: 'encrypted',
    receiver_identifier_hmac: 'hmac',
    receiver_identifier_masked: '2202 **** **** 7890',
    receiver_identifier_last4: '7890',
    route_code: 'SBER-CARD',
    display_label: 'Sberbank card',
    enabled: true,
    recommended: true,
    review_policy: 'review_first',
    lifecycle_status: 'active',
    created_at: '2026-05-07T10:00:00.000Z',
    updated_at: '2026-05-07T10:00:00.000Z'
  };
}

class StagingOrderRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();

  async createOrderWithSession(input: Parameters<OrderRepository['createOrderWithSession']>[0]) {
    this.orders.set(input.order.id, input.order);
    return { kind: 'created' as const, order: input.order, paymentSession: input.paymentSession };
  }

  async getOrderById() { return null; }
  async getPaymentSessionById() { return null; }
  async getCheckoutSessionById() { return null; }
  async createReceivingRoute(input: Parameters<OrderRepository['createReceivingRoute']>[0]) { return { kind: 'created' as const, route: input.route }; }
  async listReceivingRoutes(merchantId: string) { return [checkoutReadyRoute(merchantId)]; }
  async updateReceivingRoute() { return { kind: 'not_found' as const }; }
  async deleteReceivingRoute() { return { kind: 'not_found' as const }; }
  async listReceiverBanksForCheckout(merchantId: string) { return [checkoutReadyRoute(merchantId)]; }
  async listReceivingRoutesForCheckoutBank(merchantId: string) { return [checkoutReadyRoute(merchantId)]; }
  async getSelectedReceivingRouteCopyDetails() { return { kind: 'not_found' as const }; }
  async recordCheckoutDestinationCopied() { return undefined; }
  async selectReceiverBank() { return { kind: 'not_found' as const }; }
  async selectReceivingRoute() { return { kind: 'not_found' as const }; }
  async selectPayerBankLauncher() { return { kind: 'not_found' as const }; }
  async saveExpectedPaymentProfile() { return { kind: 'not_found' as const }; }
  async saveBuyerSenderPhoneHint() { return { kind: 'not_found' as const }; }
  async markReceiverArmed() { return { kind: 'not_found' as const }; }
  async markPaymentInstructionsShown() { return { kind: 'not_found' as const }; }
  async markBuyerClaimedPaid() { return { kind: 'not_found' as const }; }
  async requestNoNotificationManualCheck() { return { kind: 'not_found' as const }; }
}

class StagingReceiverRepository implements ReceiverDeviceRepository {
  public readonly devices = new Map<string, StoredReceiverDeviceRecord>();

  async createReceiverDevice(input: CreateReceiverDeviceInput) {
    this.devices.set(input.device.id, input.device);
    return input.device;
  }

  async updateHeartbeat(input: UpdateReceiverHeartbeatInput) {
    const device = this.devices.get(input.deviceId);
    if (!device || device.merchantId !== input.merchantId) {
      return null;
    }
    const updated: StoredReceiverDeviceRecord = {
      ...device,
      status: deriveReceiverDeviceOperationalStatus({
        notificationAccessStatus: input.notificationAccessStatus,
        listenerConnected: input.listenerConnected,
        allowedBankProfileIds: input.allowedBankProfileIds,
        reportedStatus: input.reportedStatus
      }),
      notificationAccessStatus: input.notificationAccessStatus,
      lastHeartbeatAt: input.heartbeatAt,
      updatedAt: input.heartbeatAt
    };
    this.devices.set(device.id, updated);
    return updated;
  }
}

function buildProductionStagingServer() {
  const authBffRepository = new InMemoryAuthBffRepository();
  const merchantIntegrationRepository = new InMemoryMerchantIntegrationRepository();
  const merchantApiKeyVerifier = new InMemoryMerchantApiKeyVerifier();
  const orderRepository = new StagingOrderRepository();
  const receiverDeviceRepository = new StagingReceiverRepository();
  const server = buildApiServer({
    environment: 'production',
    authBffRepository,
    merchantIntegrationRepository,
    merchantApiKeyVerifier,
    orderRepository,
    receiverDeviceRepository,
    phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
    receiverDeviceIdGenerator: () => 'dev_prod_stage_01',
    idGenerator: {
      orderId: () => 'ord_prod_stage_01',
      paymentSessionId: () => 'ps_prod_stage_01',
      auditEventId: () => 'aud_prod_stage_01',
      referenceCode: () => 'SWP-PROD01'
    },
    clock: () => new Date('2026-05-07T12:00:00.000Z'),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  });
  return { server, authBffRepository, merchantApiKeyVerifier, orderRepository, receiverDeviceRepository };
}

async function createProductionSession(authBffRepository: InMemoryAuthBffRepository, role = 'owner') {
  const sessionToken = createOpaqueSessionToken();
  const csrfToken = createCsrfToken();
  await authBffRepository.bootstrapDevSession({
    userId: '11111111-1111-4111-8111-111111111111',
    merchantId: '22222222-2222-4222-8222-222222222222',
    email: 'stage-owner@example.com',
    name: 'Stage Owner',
    role: role as never,
    sessionIdHash: hashBffSessionToken(sessionToken),
    csrfSecretHash: hashCsrfToken(csrfToken),
    expiresAt: '2026-05-08T12:00:00.000Z',
    now: '2026-05-07T12:00:00.000Z'
  });
  return {
    cookie: serializeSessionCookie(sessionToken, buildSessionCookieOptions('production')),
    csrfToken
  };
}

describe('production-mode staging boundaries', () => {
  it('keeps dev bootstrap and local test bearers disabled while accepting a secure BFF session with CSRF', async () => {
    const { server, authBffRepository } = buildProductionStagingServer();
    const { cookie, csrfToken } = await createProductionSession(authBffRepository);

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');

    const devBootstrap = await server.inject({ method: 'POST', url: '/auth/dev/bootstrap-session' });
    expect(devBootstrap.statusCode).toBe(404);

    const testBearerRead = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: { authorization: 'Bearer test_stage_merchant' }
    });
    expect(testBearerRead.statusCode).toBe(401);

    const me = await server.inject({ method: 'GET', url: '/v1/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().active_membership.permissions).toContain('integration.webhook.update');

    const blockedMutation = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: { cookie },
      payload: { webhook_url: 'https://merchant.example/swimpay' }
    });
    expect(blockedMutation.statusCode).toBe(403);

    const mutation = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { webhook_url: 'https://merchant.example/swimpay' }
    });
    expect(mutation.statusCode).toBe(200);
    expect(mutation.json().webhook_url).toBe('https://merchant.example/swimpay');
    expect(mutation.json().webhook_secret_once).toMatch(/^whsec_/u);
    expect(mutation.body).not.toMatch(/sk_live_|raw notification|\+7\d{10}/u);

    const normalRead = await server.inject({
      method: 'GET',
      url: '/v1/merchant/integration',
      headers: { cookie }
    });
    expect(normalRead.statusCode).toBe(200);
    expect(normalRead.json().webhook_secret_once).toBeUndefined();
    expect(normalRead.body).not.toContain(mutation.json().webhook_secret_once);
  });

  it('validates production SDK API key order creation and rejects unsafe order fields', async () => {
    const { server, merchantApiKeyVerifier, orderRepository } = buildProductionStagingServer();
    merchantApiKeyVerifier.seedRawKey('sk_live_stage_server_only', {
      merchantId: '22222222-2222-4222-8222-222222222222',
      apiKeyId: 'key_stage_01',
      scopes: ['orders.write']
    });

    const testBearer = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_stage_merchant' },
      payload: validOrderPayload()
    });
    expect(testBearer.statusCode).toBe(401);

    const invalidKey = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_invalid' },
      payload: validOrderPayload()
    });
    expect(invalidKey.statusCode).toBe(401);

    const unsafe = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_stage_server_only' },
      payload: { ...validOrderPayload(), auto_confirm: true }
    });
    expect(unsafe.statusCode).toBe(400);
    expect(unsafe.json().error.message).toContain('auto_confirm');

    const created = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_stage_server_only' },
      payload: validOrderPayload()
    });
    expect(created.statusCode).toBe(201);
    expect(orderRepository.orders.get('ord_prod_stage_01')?.merchantId).toBe('22222222-2222-4222-8222-222222222222');
    expect(created.json().status).toBe('receiver_arming');
    expect(created.body).not.toContain('manual_confirmed');
  });

  it('allows production receiver registration through BFF merchant context and keeps local test bearer rejected', async () => {
    const { server, authBffRepository, receiverDeviceRepository } = buildProductionStagingServer();
    const { cookie, csrfToken } = await createProductionSession(authBffRepository);

    const testBearer = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_stage_merchant' },
      payload: { device_name: 'Stage Phone', public_key: receiverPublicKeyPem() }
    });
    expect(testBearer.statusCode).toBe(401);

    const registered = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: {
        device_name: 'Stage Phone',
        public_key: receiverPublicKeyPem(),
        supported_capabilities: ['notification_access', 'signed_signal_upload', 'local_redaction']
      }
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toMatchObject({
      device_id: 'dev_prod_stage_01',
      merchant_id: '22222222-2222-4222-8222-222222222222',
      status: 'pending'
    });
    expect(registered.body).not.toContain('BEGIN PUBLIC KEY');
    expect(receiverDeviceRepository.devices.get('dev_prod_stage_01')?.publicKey).toBe(receiverPublicKeyPem());

    const heartbeat = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/heartbeat',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: {
        device_id: 'dev_prod_stage_01',
        notification_access: true,
        listener_connected: true,
        allowed_bank_profile_ids: [],
        outbox_pending_count: 0,
        signature: 'synthetic_heartbeat_signature'
      }
    });
    expect(heartbeat.statusCode).toBe(200);
    expect(heartbeat.json().status).toBe('bank_targets_missing');
    expect(heartbeat.json().required_actions).toContain('configure_bank_targets');
  });
});

function receiverPublicKeyPem(): string {
  return [
    '-----BEGIN PUBLIC KEY-----',
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiY7GDh0qtB+VSl73IXZdMEaM',
    'C6/8oH3Iv0uJ9+QWm2YyPTrTjBznXLa3HoRrP6+uG81Svu0OJEhS1m3jIw==',
    '-----END PUBLIC KEY-----'
  ].join('\n');
}

function validOrderPayload() {
  return {
    external_id: 'ORDER_PROD_STAGE_01',
    amount: {
      value: '1390.00',
      currency: 'RUB'
    },
    buyer: {
      bank_phone: '+79991234567'
    },
    expires_in_seconds: 900
  };
}
