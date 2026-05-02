import { describe, expect, test } from 'vitest';
import {
  buildApiServer,
  type OrderRepository,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from './server.js';

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
}

function buildTestServer(repository: InMemoryOrderRepository) {
  return buildApiServer({
    environment: 'test',
    orderRepository: repository,
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
  test('creates an order, payment session placeholder and audit event without storing raw phone', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

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
});
