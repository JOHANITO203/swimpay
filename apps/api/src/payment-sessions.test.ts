import { describe, expect, test } from 'vitest';
import { getPayerBankLauncherOption, getReceiverBankOption } from '@swimpay/contracts';
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

  async selectReceiverBank(input: Parameters<OrderRepository['selectReceiverBank']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.selectedReceiverBankId = input.receiverBankId;
    result.paymentSession.selectedReceiverBankProfileId = input.bankProfileId;
    result.paymentSession.selectedPayerBankLauncherId = undefined;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.receiver_bank_selected', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async selectPayerBankLauncher(input: Parameters<OrderRepository['selectPayerBankLauncher']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.selectedPayerBankLauncherId = input.payerBankLauncherId;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.payer_bank_launcher_selected', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async markPaymentInstructionsShown(input: Parameters<OrderRepository['markPaymentInstructionsShown']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.paymentInstructionsShownAt = input.now;
    result.paymentSession.status = 'awaiting_payment';
    result.paymentSession.updatedAt = input.now;
    result.order.status = 'awaiting_payment';
    result.order.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.payment_instructions_shown', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async markBuyerClaimedPaid(input: Parameters<OrderRepository['markBuyerClaimedPaid']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.buyerClaimedPaidAt = input.now;
    result.paymentSession.status = 'buyer_claimed_paid';
    result.paymentSession.updatedAt = input.now;
    result.order.status = 'buyer_claimed_paid';
    result.order.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.buyer_claimed_paid', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  private requireMutableSession(merchantId: string, paymentSessionId: string, now: string) {
    const paymentSession = this.paymentSessions.get(paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== merchantId) {
      return { kind: 'not_found' as const };
    }
    if (new Date(paymentSession.validUntil).getTime() <= new Date(now).getTime()) {
      return { kind: 'expired' as const };
    }
    const order = this.orders.get(paymentSession.orderId);
    if (!order) {
      return { kind: 'not_found' as const };
    }
    return { kind: 'ok' as const, order, paymentSession };
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
      checkout_state: 'receiver_bank_selection',
      buyer_safe_status: 'not_validated',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'SWP-SESSION',
      receiver_status: 'arming',
      expires_at: '2026-05-02T10:15:00.000Z',
      official_bank_confirmation: false
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

  test('exposes receiver bank options with review-only buyer-safe labels', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.payment_session_id).toBe('ps_session_01');
    expect(payload.receiver_banks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          receiver_bank_id: 'sber_ru',
          bank_profile_id: 'sber_ru',
          status: 'review_required_beta',
          review_only: true,
          detection_supported: true,
          auto_confirm_enabled: false,
          official_bank_confirmation: false
        })
      ])
    );
  });

  test('selects receiver bank and payer launcher without confirming payment', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);

    const receiverResponse = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    const launcherResponse = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'tbank_ru' }
    });
    const statusResponse = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/status',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(receiverResponse.statusCode).toBe(200);
    expect(receiverResponse.json()).toMatchObject({
      selected_receiver_bank: getReceiverBankOption('sber_ru'),
      checkout_state: 'payer_bank_launcher_selection',
      buyer_safe_status: 'not_validated',
      official_bank_confirmation: false
    });
    expect(launcherResponse.statusCode).toBe(200);
    expect(launcherResponse.json()).toMatchObject({
      selected_payer_bank_launcher: getPayerBankLauncherOption('tbank_ru'),
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(statusResponse.json()).toMatchObject({
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment',
      selected_receiver_bank_id: 'sber_ru',
      selected_payer_bank_launcher_id: 'tbank_ru',
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('receiver_arming');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('manual_confirmed');
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['checkout.receiver_bank_selected', 'checkout.payer_bank_launcher_selected'])
    );
  });

  test('marks instructions shown and buyer claimed paid without confirming payment', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'tbank_ru' }
    });

    const instructions = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const claimed = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/claimed-paid',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(instructions.statusCode).toBe(200);
    expect(instructions.json()).toMatchObject({
      checkout_state: 'awaiting_payment',
      buyer_safe_status: 'awaiting_payment'
    });
    expect(claimed.statusCode).toBe(202);
    expect(claimed.json()).toMatchObject({
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('buyer_claimed_paid');
    expect(repository.orders.get('ord_session_01')?.status).toBe('buyer_claimed_paid');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('manual_confirmed');
  });

  test('rejects checkout mutations after expiry', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const createServer = buildServer(repository, '2026-05-02T10:00:00.000Z');
    await createOrder(createServer);

    const readServer = buildServer(repository, '2026-05-02T10:16:00.000Z');
    const response = await readServer.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: 'checkout_session_expired'
      }
    });
  });
});
