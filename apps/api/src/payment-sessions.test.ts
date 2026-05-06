import { describe, expect, test } from 'vitest';
import { getPayerBankLauncherOption, getReceiverBankOption } from '@swimpay/contracts';
import { buildApiServer, type OrderRepository, type StoredOrderRecord, type StoredPaymentSessionRecord } from './server.js';
import { decryptReceiverIdentifier } from './orders.js';
import { isPaymentSessionTransitionAllowed, resolvePaymentSessionStatusForRead } from './payment-sessions.js';

interface TestReceivingRoute {
  route_id: string;
  merchant_id: string;
  bank_profile_id: string;
  rail_type: 'phone_transfer' | 'card_transfer';
  receiver_identifier_type: 'phone' | 'card';
  receiver_identifier_encrypted: string;
  receiver_identifier_masked: string;
  route_code: string;
  display_label: string;
  enabled: boolean;
  recommended: boolean;
  review_policy: 'review_first' | 'eligible_low_risk_later';
  fees_hint?: string | undefined;
  created_at: string;
  updated_at: string;
}

class InMemoryPaymentSessionRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();
  public readonly paymentSessions = new Map<string, StoredPaymentSessionRecord>();
  public readonly receivingRoutes = new Map<string, TestReceivingRoute>();
  public readonly externalIds = new Set<string>();
  public readonly auditEvents: Array<{ eventType: string; objectId: string; payloadRedacted?: Record<string, unknown> }> = [];

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
    result.paymentSession.selectedReceivingRouteId = undefined;
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

  async createReceivingRoute(input: {
    route: TestReceivingRoute;
    auditEventId: string;
  }) {
    const duplicate = [...this.receivingRoutes.values()].find(
      (route) => route.merchant_id === input.route.merchant_id && route.route_code === input.route.route_code
    );
    if (duplicate) {
      return { kind: 'duplicate_route_code' as const };
    }
    this.receivingRoutes.set(input.route.route_id, input.route);
    this.auditEvents.push({ eventType: 'merchant_receiving_route.created', objectId: input.route.route_id });
    return { kind: 'created' as const, route: input.route };
  }

  async listReceivingRoutes(merchantId: string) {
    return [...this.receivingRoutes.values()].filter((route) => route.merchant_id === merchantId);
  }

  async updateReceivingRoute(input: {
    merchantId: string;
    routeId: string;
    patch: Partial<Pick<TestReceivingRoute, 'enabled' | 'recommended' | 'display_label' | 'fees_hint'>>;
    auditEventId: string;
    now: string;
  }) {
    const route = this.receivingRoutes.get(input.routeId);
    if (!route || route.merchant_id !== input.merchantId) {
      return { kind: 'not_found' as const };
    }
    Object.assign(route, input.patch, { updated_at: input.now });
    this.auditEvents.push({ eventType: 'merchant_receiving_route.updated', objectId: input.routeId });
    return { kind: 'updated' as const, route };
  }

  async listReceiverBanksForCheckout(merchantId: string, paymentSessionId: string) {
    void paymentSessionId;
    return [...this.receivingRoutes.values()].filter((route) => route.merchant_id === merchantId && route.enabled);
  }

  async listReceivingRoutesForCheckoutBank(merchantId: string, paymentSessionId: string, bankProfileId: string) {
    void paymentSessionId;
    return [...this.receivingRoutes.values()].filter(
      (route) => route.merchant_id === merchantId && route.bank_profile_id === bankProfileId && route.enabled
    );
  }

  async getSelectedReceivingRouteCopyDetails(input: {
    merchantId: string;
    paymentSessionId: string;
    encryptionSecret: string;
    now: string;
  }) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }
    if (!copyDetailsAllowedStatuses.has(result.paymentSession.status)) {
      return { kind: 'inactive' as const };
    }
    if (!result.paymentSession.selectedReceivingRouteId) {
      return { kind: 'not_selected' as const };
    }
    const route = this.receivingRoutes.get(result.paymentSession.selectedReceivingRouteId);
    if (!route || !route.enabled || route.merchant_id !== input.merchantId) {
      return { kind: 'not_found' as const };
    }

    return {
      kind: 'found' as const,
      order: result.order,
      paymentSession: result.paymentSession,
      route,
      receiverIdentifier: decryptReceiverIdentifier(route.receiver_identifier_encrypted, input.encryptionSecret)
    };
  }

  async recordCheckoutDestinationCopied(input: {
    merchantId: string;
    paymentSessionId: string;
    routeId: string;
    railType: string;
    receiverIdentifierMasked: string;
    auditEventId: string;
    now: string;
  }) {
    void input.now;
    this.auditEvents.push({
      eventType: 'checkout.destination_copied',
      objectId: input.paymentSessionId,
      payloadRedacted: {
        payment_session_id: input.paymentSessionId,
        receiving_route_id: input.routeId,
        rail_type: input.railType,
        receiver_identifier_masked: input.receiverIdentifierMasked,
        auto_confirm_enabled: false
      }
    });
  }

  async selectReceivingRoute(input: {
    merchantId: string;
    paymentSessionId: string;
    receivingRouteId: string;
    auditEventId: string;
    now: string;
  }) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }
    const route = this.receivingRoutes.get(input.receivingRouteId);
    if (!route || route.merchant_id !== input.merchantId || route.bank_profile_id !== result.paymentSession.selectedReceiverBankProfileId) {
      return { kind: 'not_found' as const };
    }

    result.paymentSession.selectedReceivingRouteId = input.receivingRouteId;
    result.paymentSession.selectedPayerBankLauncherId = undefined;
    result.paymentSession.paymentInstructionsShownAt = undefined;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.receiving_route_selected', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async saveBuyerSenderPhoneHint(input: {
    merchantId: string;
    paymentSessionId: string;
    buyerSenderPhoneHmac: string;
    buyerSenderPhoneMasked: string;
    auditEventId: string;
    now: string;
  }) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }
    result.paymentSession.buyerSenderPhoneHmac = input.buyerSenderPhoneHmac;
    result.paymentSession.buyerSenderPhoneMasked = input.buyerSenderPhoneMasked;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.buyer_sender_phone_hint_saved', objectId: input.paymentSessionId });
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

  async markReceiverArmed(input: Parameters<OrderRepository['markReceiverArmed']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.status = 'receiver_armed';
    result.paymentSession.updatedAt = input.now;
    result.order.status = 'receiver_armed';
    result.order.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.continue_to_bank', objectId: input.paymentSessionId });
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

const copyDetailsAllowedStatuses = new Set([
  'receiver_arming',
  'receiver_armed',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review'
]);

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
    receivingRouteIdGenerator: () => `route_${repository.receivingRoutes.size + 1}`,
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

async function createPhoneRoute(server: ReturnType<typeof buildApiServer>) {
  return server.inject({
    method: 'POST',
    url: '/v1/merchant/receiving-routes',
    headers: { authorization: 'Bearer test_mch_01' },
    payload: {
      bank_profile_id: 'sber_ru',
      rail_type: 'phone_transfer',
      receiver_identifier: '+7 (999) 123-45-67',
      route_code: 'SBER-PHONE',
      display_label: 'Sberbank telephone',
      recommended: true,
      fees_hint: 'Usually instant'
    }
  });
}

async function createCardRoute(server: ReturnType<typeof buildApiServer>) {
  return server.inject({
    method: 'POST',
    url: '/v1/merchant/receiving-routes',
    headers: { authorization: 'Bearer test_mch_01' },
    payload: {
      bank_profile_id: 'sber_ru',
      rail_type: 'card_transfer',
      receiver_identifier: '2202201234567890',
      route_code: 'SBER-CARD',
      display_label: 'Sberbank card',
      recommended: false
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
    await createPhoneRoute(server);

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
    expect(JSON.stringify(payload.receiver_banks)).not.toContain('+7 (999)');
    expect(payload.receiver_banks.find((bank: { receiver_bank_id: string }) => bank.receiver_bank_id === 'sber_ru')).toMatchObject({
      available_route_count: 1,
      rail_types: ['phone_transfer'],
      recommended_rail_type: 'phone_transfer'
    });
  });

  test('creates, lists and updates merchant receiving routes without exposing raw identifiers', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    const created = await createPhoneRoute(server);
    const listed = await server.inject({
      method: 'GET',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const updated = await server.inject({
      method: 'PATCH',
      url: '/v1/merchant/receiving-routes/route_1',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { enabled: false, recommended: false, display_label: 'Sberbank phone backup' }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      route: {
        route_id: 'route_1',
        bank_profile_id: 'sber_ru',
        rail_type: 'phone_transfer',
        receiver_identifier_type: 'phone',
        receiver_identifier_masked: '+7 *** *** **67',
        route_code: 'SBER-PHONE',
        review_policy: 'eligible_low_risk_later',
        official_bank_confirmation: false
      }
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().routes).toHaveLength(1);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().route).toMatchObject({ enabled: false, recommended: false });
    expect(JSON.stringify([created.json(), listed.json(), updated.json()])).not.toContain('+7 (999) 123-45-67');
    expect(JSON.stringify(repository.receivingRoutes)).not.toContain('+7 (999) 123-45-67');
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['merchant_receiving_route.created', 'merchant_receiving_route.updated'])
    );
  });

  test('reveals buyer-safe receiving routes only after bank selection and selects the actual route', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createCardRoute(server);

    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    const routesResponse = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks/sber_ru/routes',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const selectedRoute = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    const copyDetails = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiving-route/copy-details',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(routesResponse.statusCode).toBe(200);
    expect(routesResponse.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      bank_profile_id: 'sber_ru',
      routes: [
        expect.objectContaining({
          route_id: 'route_1',
          rail_type: 'phone_transfer',
          receiver_identifier_masked: '+7 *** *** **67',
          review_policy: 'eligible_low_risk_later'
        }),
        expect.objectContaining({
          route_id: 'route_2',
          rail_type: 'card_transfer',
          receiver_identifier_masked: '2202 **** **** 7890',
          review_policy: 'review_first'
        })
      ],
      official_bank_confirmation: false
    });
    expect(JSON.stringify(routesResponse.json())).not.toContain('2202201234567890');
    expect(selectedRoute.statusCode).toBe(200);
    expect(selectedRoute.json()).toMatchObject({
      selected_receiving_route: expect.objectContaining({
        route_id: 'route_1',
        rail_type: 'phone_transfer'
      }),
      checkout_state: 'payer_bank_launcher_selection',
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.selectedReceivingRouteId).toBe('route_1');
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('checkout.receiving_route_selected');
    expect(copyDetails.statusCode).toBe(200);
    expect(copyDetails.headers['cache-control']).toBe('no-store');
    expect(copyDetails.headers.pragma).toBe('no-cache');
    expect(copyDetails.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      receiving_route_id: 'route_1',
      rail_type: 'phone_transfer',
      masked_identifier: '+7 *** *** **67',
      receiver_identifier_masked: '+7 *** *** **67',
      destination_value: '+7 (999) 123-45-67',
      receiver_identifier_copy_value: '+7 (999) 123-45-67',
      copy_action: 'explicit_buyer_copy',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(Date.parse(copyDetails.json().reveal_expires_at)).toBeGreaterThan(Date.parse('2026-05-02T10:00:00.000Z'));
    expect(JSON.stringify(repository.auditEvents)).not.toContain('+7 (999) 123-45-67');
  });

  test('writes redacted audit and rate limits repeated copy-detail reveals', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });

    const requests = [];
    for (let index = 0; index < 4; index += 1) {
      requests.push(
        await server.inject({
          method: 'GET',
          url: '/v1/checkout/ps_session_01/receiving-route/copy-details',
          headers: {
            authorization: 'Bearer test_mch_01',
            'user-agent': 'copy-test-browser',
            'x-forwarded-for': '203.0.113.9'
          }
        })
      );
    }

    expect(requests.slice(0, 3).map((response) => response.statusCode)).toEqual([200, 200, 200]);
    expect(requests[3]?.statusCode).toBe(429);
    expect(requests[3]?.headers['retry-after']).toBe('300');
    expect(requests[3]?.json()).toMatchObject({
      error: {
        code: 'copy_details_rate_limited'
      }
    });
    const copyAudits = repository.auditEvents.filter((event) => event.eventType === 'checkout.destination_copied');
    expect(copyAudits).toHaveLength(3);
    expect(copyAudits[0]?.payloadRedacted).toMatchObject({
      payment_session_id: 'ps_session_01',
      receiving_route_id: 'route_1',
      rail_type: 'phone_transfer',
      receiver_identifier_masked: '+7 *** *** **67',
      auto_confirm_enabled: false
    });
    expect(JSON.stringify(copyAudits)).not.toContain('+7 (999) 123-45-67');
    expect(JSON.stringify(copyAudits)).not.toContain('2202201234567890');
  });

  test('rejects copy details for inactive sessions without revealing destination', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    const session = repository.paymentSessions.get('ps_session_01');
    if (!session) {
      throw new Error('test session missing');
    }
    session.status = 'rejected';

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiving-route/copy-details',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: 'checkout_session_inactive'
      }
    });
    expect(response.body).not.toContain('+7 (999) 123-45-67');
    expect(repository.auditEvents.some((event) => event.eventType === 'checkout.destination_copied')).toBe(false);
  });

  test('stores buyer sender phone hint as HMAC and masked value only', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/buyer-sender-phone',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { buyer_sender_phone: '+7 (999) 000-12-34' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      buyer_sender_phone_masked: '+7 *** *** **34',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.buyerSenderPhoneHmac).toMatch(/^hmac_sha256:/);
    expect(repository.paymentSessions.get('ps_session_01')?.buyerSenderPhoneMasked).toBe('+7 *** *** **34');
    expect(JSON.stringify(repository.paymentSessions)).not.toContain('+7 (999) 000-12-34');
    expect(JSON.stringify(response.json())).not.toContain('+7 (999) 000-12-34');
  });

  test('selects receiver bank and payer launcher without confirming payment', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);

    const receiverResponse = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    const routeResponse = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
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
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated',
      official_bank_confirmation: false
    });
    expect(routeResponse.json()).toMatchObject({
      selected_receiving_route: expect.objectContaining({ route_id: 'route_1' }),
      checkout_state: 'payer_bank_launcher_selection'
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
    await createPhoneRoute(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'tbank_ru' }
    });

    const continueToBank = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank',
      headers: { authorization: 'Bearer test_mch_01' }
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

    expect(continueToBank.statusCode).toBe(200);
    expect(continueToBank.json()).toMatchObject({
      status: 'receiver_armed',
      receiver_status: 'armed',
      buyer_safe_status: 'awaiting_payment',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
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
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('checkout.continue_to_bank');
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
