import { describe, expect, test } from 'vitest';
import { buildApiServer, type OrderRepository, type StoredOrderRecord, type StoredPaymentSessionRecord } from './server.js';
import { isPaymentSessionTransitionAllowed, resolvePaymentSessionStatusForRead } from './payment-sessions.js';

class InMemoryPaymentSessionRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();
  public readonly paymentSessions = new Map<string, StoredPaymentSessionRecord>();
  public readonly externalIds = new Set<string>();
  public readonly auditEvents: Array<{ eventType: string; objectId: string }> = [];

  async createOrderWithSession(input: Parameters<OrderRepository['createOrderWithSession']>[0]) {
    const externalKey = `${input.merchantId}:${input.order.externalId}`;
    if (this.externalIds.has(externalKey)) {
      return { kind: 'duplicate_external_id' as const };
    }

    this.externalIds.add(externalKey);
    this.orders.set(input.order.id, input.order);
    this.paymentSessions.set(input.paymentSession.id, input.paymentSession);
    this.auditEvents.push(...input.auditEvents.map((event) => ({ eventType: event.eventType, objectId: event.objectId })));

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

    const paymentSession = [...this.paymentSessions.values()].find((session) => session.orderId === orderId) ?? null;
    return { order, paymentSession };
  }

  async getPaymentSessionById(merchantId: string, paymentSessionId: string) {
    const paymentSession = this.paymentSessions.get(paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== merchantId) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }
}

function buildServer(repository: InMemoryPaymentSessionRepository, now = '2026-05-02T10:00:00.000Z') {
  return buildApiServer({
    environment: 'test',
    orderRepository: repository,
    phoneHmacSecret: 'test_secret',
    checkoutBaseUrl: 'https://pay.test/checkout',
    idGenerator: {
      orderId: () => 'ord_session_01',
      paymentSessionId: () => 'ps_session_01',
      auditEventId: () => `aud_${repository.auditEvents.length + 1}`,
      referenceCode: () => 'SWP-SESSION'
    },
    clock: () => new Date(now),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  });
}

async function createOrder(server: ReturnType<typeof buildApiServer>) {
  return server.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: { authorization: 'Bearer test_mch_01' },
    payload: {
      external_id: 'order_session_01',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      buyer: {
        bank_phone: '+79991234567'
      },
      expires_in_seconds: 900
    }
  });
}

describe('payment session api', () => {
  test('returns checkout status for a payment session', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    await createOrder(server);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      payment_session_id: 'ps_session_01',
      order_id: 'ord_session_01',
      status: 'receiver_arming',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'SWP-SESSION',
      receiver_status: 'arming',
      expires_at: '2026-05-02T10:15:00.000Z'
    });
  });

  test('reports expired checkout status after valid_until', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const createServer = buildServer(repository, '2026-05-02T10:00:00.000Z');
    await createOrder(createServer);

    const readServer = buildServer(repository, '2026-05-02T10:16:00.000Z');
    const response = await readServer.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      status: 'expired',
      receiver_status: 'expired'
    });
  });

  test('records payment session audit events during order creation', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    await createOrder(server);

    expect(repository.auditEvents.map((event) => event.eventType)).toEqual([
      'order.created',
      'payment_session.created',
      'payment_session.receiver_arming_requested'
    ]);
  });

  test('does not allow direct created to auto_confirmed transition', () => {
    expect(isPaymentSessionTransitionAllowed('created', 'auto_confirmed')).toBe(false);
    expect(isPaymentSessionTransitionAllowed('created', 'receiver_arming')).toBe(true);
  });

  test('resolves active session status as expired when valid_until has passed', () => {
    expect(
      resolvePaymentSessionStatusForRead(
        {
          status: 'receiver_arming',
          validUntil: '2026-05-02T10:15:00.000Z'
        },
        new Date('2026-05-02T10:16:00.000Z')
      )
    ).toBe('expired');
  });
});
