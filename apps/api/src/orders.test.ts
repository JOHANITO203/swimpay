import { afterEach, describe, expect, test, vi } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import { InMemoryMerchantApiKeyVerifier } from './auth-bff.js';
import { InMemoryMerchantIntegrationRepository } from './developer-integration.js';
import { parseMerchantId } from './orders.js';
import {
  buildApiServer,
  type OrderRepository,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from './server.js';
import type { StoredMerchantReceivingRouteRecord } from './orders.js';

function checkoutReadyRoute(merchantId: string): StoredMerchantReceivingRouteRecord {
  return {
    route_id: 'route_ready_card',
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
    created_at: '2026-05-02T10:00:00.000Z',
    updated_at: '2026-05-02T10:00:00.000Z'
  };
}

class InMemoryOrderRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();
  public readonly orderExternalIds = new Set<string>();
  public readonly paymentSessions: StoredPaymentSessionRecord[] = [];
  public readonly auditEvents: Array<{
    merchantId: string;
    eventType: string;
    objectType: string;
    objectId: string;
    payloadRedacted: Record<string, unknown>;
  }> = [];

  async createOrderWithSession(input: Parameters<OrderRepository['createOrderWithSession']>[0]) {
    const dedupeKey = `${input.merchantId}:${input.order.externalId}`;
    if (this.orderExternalIds.has(dedupeKey)) {
      return { kind: 'duplicate_external_id' as const };
    }

    this.orderExternalIds.add(dedupeKey);
    this.orders.set(input.order.id, input.order);
    this.paymentSessions.push(input.paymentSession);
    this.auditEvents.push(...input.auditEvents);

    return {
      kind: 'created' as const,
      order: input.order,
      paymentSession: input.paymentSession
    };
  }

  async getOrderById(merchantId: string, orderId: string) {
    const order = this.orders.get(orderId);
    if (!order || order.merchantId !== merchantId) {
      return null;
    }

    const paymentSession = this.paymentSessions.find((session) => session.orderId === orderId) ?? null;
    return { order, paymentSession };
  }

  async getPaymentSessionById(merchantId: string, paymentSessionId: string) {
    const paymentSession = this.paymentSessions.find((session) => session.id === paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== merchantId) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  async getCheckoutSessionById(paymentSessionId: string) {
    const paymentSession = this.paymentSessions.find((session) => session.id === paymentSessionId);
    if (!paymentSession) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  async createReceivingRoute(input: Parameters<OrderRepository['createReceivingRoute']>[0]) {
    return { kind: 'created' as const, route: input.route };
  }

  async listReceivingRoutes(merchantId: string) {
    return [checkoutReadyRoute(merchantId)];
  }

  async updateReceivingRoute() {
    return { kind: 'not_found' as const };
  }

  async deleteReceivingRoute() {
    return { kind: 'not_found' as const };
  }

  async listReceiverBanksForCheckout(merchantId: string) {
    return [checkoutReadyRoute(merchantId)];
  }

  async listReceivingRoutesForCheckoutBank(merchantId: string) {
    return [checkoutReadyRoute(merchantId)];
  }

  async getSelectedReceivingRouteCopyDetails() {
    return { kind: 'not_found' as const };
  }

  async recordCheckoutDestinationCopied(input: Parameters<OrderRepository['recordCheckoutDestinationCopied']>[0]) {
    this.auditEvents.push({
      merchantId: input.merchantId,
      eventType: 'checkout.destination_copied',
      objectType: 'payment_session',
      objectId: input.paymentSessionId,
      payloadRedacted: {
        receiving_route_id: input.routeId,
        rail_type: input.railType,
        receiver_identifier_masked: input.receiverIdentifierMasked,
        official_bank_confirmation: false
      }
    });
  }

  async selectReceiverBank(input: Parameters<OrderRepository['selectReceiverBank']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.selectedReceiverBankId = input.receiverBankId;
    found.paymentSession.selectedReceiverBankProfileId = input.bankProfileId;
    found.paymentSession.selectedPayerBankLauncherId = undefined;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async selectReceivingRoute(input: Parameters<OrderRepository['selectReceivingRoute']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.selectedReceivingRouteId = input.receivingRouteId;
    found.paymentSession.selectedPayerBankLauncherId = undefined;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async selectPayerBankLauncher(input: Parameters<OrderRepository['selectPayerBankLauncher']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.selectedPayerBankLauncherId = input.payerBankLauncherId;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async saveExpectedPaymentProfile(input: Parameters<OrderRepository['saveExpectedPaymentProfile']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.paymentMethod = input.profile.payment_method;
    found.paymentSession.senderBankId = input.profile.sender_bank_id;
    found.paymentSession.senderCardLast4 = input.profile.sender_card_last4;
    found.paymentSession.senderCardMasked = input.profile.sender_card_masked;
    found.paymentSession.senderCardHmac = input.profile.sender_card_hmac;
    found.paymentSession.senderPhoneMasked = input.profile.sender_phone_masked;
    found.paymentSession.senderPhoneHmac = input.profile.sender_phone_hmac;
    found.paymentSession.buyerFirstNameRaw = input.profile.buyer_first_name_raw;
    found.paymentSession.buyerLastNameRaw = input.profile.buyer_last_name_raw;
    found.paymentSession.buyerNameScriptDetected = input.profile.buyer_name_script_detected;
    found.paymentSession.buyerNameNormalized = input.profile.buyer_name_normalized;
    found.paymentSession.buyerNameFingerprint = input.profile.buyer_name_fingerprint;
    found.paymentSession.displayAmountMinor = input.profile.display_amount_minor;
    found.paymentSession.payableAmountMinor = input.profile.payable_amount_minor;
    found.paymentSession.reconciliationDeltaMinor = input.profile.reconciliation_delta_minor;
    found.paymentSession.expectedPaymentFingerprint = input.profile.expected_payment_fingerprint;
    found.paymentSession.expectedAmountMinor = input.profile.payable_amount_minor;
    found.paymentSession.selectedReceiverBankId = input.receiverBankId;
    found.paymentSession.selectedReceiverBankProfileId = input.bankProfileId;
    found.paymentSession.selectedReceivingRouteId = input.receivingRouteId;
    found.paymentSession.selectedPayerBankLauncherId = input.payerBankLauncherId;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async saveBuyerSenderPhoneHint(input: Parameters<OrderRepository['saveBuyerSenderPhoneHint']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.buyerSenderPhoneHmac = input.buyerSenderPhoneHmac;
    found.paymentSession.buyerSenderPhoneMasked = input.buyerSenderPhoneMasked;
    return { kind: 'updated' as const, ...found };
  }

  async markPaymentInstructionsShown(input: Parameters<OrderRepository['markPaymentInstructionsShown']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.status = 'awaiting_payment';
    found.paymentSession.paymentInstructionsShownAt = input.now;
    return { kind: 'updated' as const, ...found };
  }

  async markReceiverArmed(input: Parameters<OrderRepository['markReceiverArmed']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.status = 'receiver_armed';
    found.order.status = 'receiver_armed';
    return { kind: 'updated' as const, ...found };
  }

  async markBuyerClaimedPaid(input: Parameters<OrderRepository['markBuyerClaimedPaid']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.status = 'buyer_claimed_paid';
    found.paymentSession.buyerClaimedPaidAt = input.now;
    return { kind: 'updated' as const, ...found };
  }

  async requestNoNotificationManualCheck() {
    return { kind: 'not_found' as const };
  }

  private async requireMutablePaymentSession(merchantId: string, paymentSessionId: string) {
    const found = await this.getPaymentSessionById(merchantId, paymentSessionId);
    if (!found) {
      return { kind: 'not_found' as const };
    }
    if (found.paymentSession.status === 'expired') {
      return { kind: 'expired' as const };
    }
    return found;
  }
}

function buildTestServer(repository: InMemoryOrderRepository, metrics?: InMemoryMetricsRegistry) {
  return buildApiServer({
    environment: 'test',
    orderRepository: repository,
    ...(metrics ? { metrics } : {}),
    phoneHmacSecret: 'test_secret',
    checkoutBaseUrl: 'https://pay.test/checkout',
    idGenerator: {
      orderId: () => 'ord_test_01',
      paymentSessionId: () => 'ps_test_01',
      auditEventId: () => 'aud_test_01',
      referenceCode: () => 'SWP-TEST1'
    },
    clock: () => new Date('2026-05-02T10:00:00.000Z'),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  });
}

function buildProductionOrderServer(repository: InMemoryOrderRepository) {
  const merchantApiKeyVerifier = new InMemoryMerchantApiKeyVerifier();
  const server = buildApiServer({
    environment: 'production',
    orderRepository: repository,
    merchantIntegrationRepository: new InMemoryMerchantIntegrationRepository(),
    merchantApiKeyVerifier,
    phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
    checkoutBaseUrl: 'https://pay.swimpay.example/checkout',
    idGenerator: {
      orderId: () => 'ord_prod_01',
      paymentSessionId: () => 'ps_prod_01',
      auditEventId: () => 'aud_prod_01',
      referenceCode: () => 'SWP-PROD1'
    },
    clock: () => new Date('2026-05-02T10:00:00.000Z'),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    adminAuth: {
      mode: 'signed_token',
      environment: 'production',
      tokenHmacSecret: 'production_admin_hmac_secret_for_tests'
    }
  });
  return { server, merchantApiKeyVerifier };
}

const validOrderPayload = {
  external_id: 'order_888',
  amount: {
    value: '137.00',
    currency: 'RUB'
  },
  buyer: {
    bank_phone: '+7 (999) 123-45-67',
    name: 'Ivan'
  },
  product: {
    id: 'premium_pack',
    name: 'Premium Pack',
    risk_level: 'low'
  },
  expires_in_seconds: 900
};

describe('order api', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('does not parse development test merchant bearers unless explicitly allowed', () => {
    expect(parseMerchantId('Bearer test_mch_01')).toBeNull();
    expect(parseMerchantId('Bearer test_mch_01', { allowTestBearer: true })).toBe('mch_01');
  });

  test('creates an order, payment session placeholder and audit event without storing raw phone', async () => {
    const repository = new InMemoryOrderRepository();
    const metrics = new InMemoryMetricsRegistry();
    const server = buildTestServer(repository, metrics);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: {
        authorization: 'Bearer test_mch_01'
      },
      payload: validOrderPayload
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      order_id: 'ord_test_01',
      payment_session_id: 'ps_test_01',
      status: 'receiver_arming',
      checkout_url: 'https://pay.test/checkout/ps_test_01',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'SWP-TEST1',
      expires_at: '2026-05-02T10:15:00.000Z'
    });

    expect(repository.orders.get('ord_test_01')).toMatchObject({
      merchantId: 'mch_01',
      externalId: 'order_888',
      amountMinor: 13700,
      currency: 'RUB',
      status: 'receiver_arming'
    });
    expect(repository.paymentSessions[0]).toMatchObject({
      orderId: 'ord_test_01',
      buyerPhoneMasked: '+7 *** *** **67',
      status: 'receiver_arming'
    });
    expect(repository.paymentSessions[0]?.buyerPhoneHmac).toMatch(/^hmac_sha256:/);
    expect(JSON.stringify(repository.orders)).not.toContain('+7 (999) 123-45-67');
    expect(JSON.stringify(repository.paymentSessions)).not.toContain('+7 (999) 123-45-67');
    expect(repository.auditEvents).toHaveLength(3);
    expect(repository.auditEvents[0]).toMatchObject({
      merchantId: 'mch_01',
      eventType: 'order.created',
      objectType: 'order',
      objectId: 'ord_test_01'
    });
    expect(repository.auditEvents[1]).toMatchObject({
      eventType: 'payment_session.created',
      objectType: 'payment_session',
      objectId: 'ps_test_01'
    });
    expect(repository.auditEvents[2]).toMatchObject({
      eventType: 'payment_session.receiver_arming_requested',
      objectType: 'payment_session',
      objectId: 'ps_test_01'
    });
    expect(metrics.counterValue(MetricNames.ORDERS_CREATED_TOTAL)).toBe(1);
    expect(metrics.counterValue(MetricNames.PAYMENT_SESSIONS_CREATED_TOTAL)).toBe(1);
  });

  test('rejects duplicate external id for a merchant', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });

    const duplicate = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({
      error: {
        code: 'duplicate_external_id',
        message: 'Order external_id already exists for this merchant.',
        details: {
          external_id: 'order_888'
        }
      }
    });
  });

  test('validates amount and currency', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        ...validOrderPayload,
        amount: {
          value: '0.00',
          currency: 'USD'
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'invalid_request',
        message: 'Order amount must be positive and currency must be RUB.',
        details: {
          amount: '0.00',
          currency: 'USD'
        }
      }
    });
  });

  test('retrieves an order by id for the authenticated merchant', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_test_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      order_id: 'ord_test_01',
      external_id: 'order_888',
      status: 'receiver_arming',
      payment_session_id: 'ps_test_01',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      expires_at: '2026-05-02T10:15:00.000Z',
      latest_event: 'payment_session.receiver_arming_requested'
    });
  });

  test('rejects production test bearer tokens on SDK order routes', async () => {
    const repository = new InMemoryOrderRepository();
    const { server } = buildProductionOrderServer(repository);

    const create = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });
    expect(create.statusCode).toBe(401);

    const read = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_prod_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    expect(read.statusCode).toBe(401);
  });

  test('enforces API key scopes for SDK order creation and reads', async () => {
    const repository = new InMemoryOrderRepository();
    const { server, merchantApiKeyVerifier } = buildProductionOrderServer(repository);
    merchantApiKeyVerifier.seedRawKey('sk_live_read_only', {
      merchantId: 'merchant_prod_01',
      apiKeyId: 'key_read_only',
      scopes: ['orders.read']
    });
    merchantApiKeyVerifier.seedRawKey('sk_live_write_only', {
      merchantId: 'merchant_prod_01',
      apiKeyId: 'key_write_only',
      scopes: ['orders.write']
    });

    const forbiddenCreate = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_read_only' },
      payload: validOrderPayload
    });
    expect(forbiddenCreate.statusCode).toBe(403);
    expect(repository.orders.size).toBe(0);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_write_only' },
      payload: validOrderPayload
    });
    expect(created.statusCode).toBe(201);

    const forbiddenRead = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_prod_01',
      headers: { authorization: 'Bearer sk_live_write_only' }
    });
    expect(forbiddenRead.statusCode).toBe(403);

    const read = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_prod_01',
      headers: { authorization: 'Bearer sk_live_read_only' }
    });
    expect(read.statusCode).toBe(200);
  });

  test('fails fast when production phone HMAC secret is missing', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('PHONE_HMAC_SECRET', '');

    expect(() =>
      buildApiServer({
        environment: 'production',
        orderRepository: new InMemoryOrderRepository(),
        healthChecks: {
          database: async () => 'skipped',
          nats: async () => 'skipped',
          valkey: async () => 'skipped'
        },
        adminAuth: {
          mode: 'signed_token',
          environment: 'production',
          tokenHmacSecret: 'production_admin_hmac_secret_for_tests'
        }
      })
    ).toThrow(/PHONE_HMAC_SECRET/u);
  });
});
