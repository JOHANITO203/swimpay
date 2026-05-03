import { describe, expect, it } from 'vitest';
import { EventTypes, PUBLIC_EVENT_SIGNAL_DISCLOSURE, type EventEnvelope } from '@swimpay/events';
import {
  buildApiServer,
  type CreateOrderWithSessionInput,
  type CreateOrderWithSessionResult,
  type OrderRepository,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from './server.js';
import type {
  CreateReceivingRouteInput,
  CreateReceivingRouteResult,
  PaymentSessionCheckoutMutationResult,
  ReceivingRouteCopyDetailsResult,
  ReceivingRouteMutationResult,
  SaveBuyerSenderPhoneHintInput,
  SelectPayerBankLauncherInput,
  SelectReceiverBankInput,
  SelectReceivingRouteInput,
  StoredMerchantReceivingRouteRecord,
  UpdateReceivingRouteInput
} from './orders.js';
import type {
  ReviewActionInput,
  ReviewActionResult,
  ReviewCreateInput,
  ReviewListItem,
  ReviewRepository
} from './reviews.js';

describe('android merchant mobile backend endpoints', () => {
  it('returns a merchant-safe dashboard summary from reviews and receiving routes', async () => {
    const { server } = buildAndroidMerchantServer();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/dashboard-summary',
      headers: merchantHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      payments_to_review_count: 1,
      confirmed_today_count: 0,
      notifications_sent_count: 0,
      receiver_status: {
        status: 'action_required',
        label: 'Téléphone',
        display: 'Action requise'
      },
      recent_detected_payments: [
        {
          review_id: 'rev_01',
          order_id: 'ord_01',
          payment_session_id: 'ps_01',
          amount: { value: '58.41', currency: 'RUB' },
          bank_display_name: 'Sberbank',
          status: 'to_review',
          status_label: 'À vérifier',
          created_at: '2026-05-03T10:00:00.000Z'
        }
      ],
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expectSafeAndroidMerchantBody(response.body);
  });

  it('returns safe payment detail with masked receiving method and merchant action set', async () => {
    const { server } = buildAndroidMerchantServer();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/payments/rev_01',
      headers: merchantHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      payment: {
        id: 'rev_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        status: 'to_review',
        status_label: 'À vérifier',
        amount_expected: { value: '58.41', currency: 'RUB' },
        amount_detected: { value: '58.41', currency: 'RUB' },
        bank_display_name: 'Sberbank',
        receiving_method_masked: 'Carte bancaire · •••• 4821',
        payment_reference: 'TANGO ALFA',
        signal_received_at: '2026-05-03T10:00:00.000Z',
        reason_labels: ['Validation manuelle en bêta', 'Référence non visible'],
        allowed_actions: ['confirm', 'reject_signal', 'reject_order']
      },
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expectSafeAndroidMerchantBody(response.body);
  });

  it('returns connected-site status without exposing webhook secrets and gates developer details explicitly', async () => {
    const { server } = buildAndroidMerchantServer({
      connectedSite: { url: 'https://merchant.example/swimpay/webhook', status: 'active' }
    });

    const merchantResponse = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/connected-site',
      headers: merchantHeaders()
    });
    const developerResponse = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/connected-site?developer_mode=true',
      headers: merchantHeaders()
    });

    expect(merchantResponse.statusCode).toBe(200);
    expect(merchantResponse.json()).toEqual({
      webhook_url_display: 'https://merchant.example/swimpay/webhook',
      status: 'active',
      status_label: 'Connexion active',
      last_delivery_status: 'none',
      last_delivery_at: null,
      latest_deliveries: [],
      developer_details: null,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expect(merchantResponse.body).not.toContain('payment.confirmed');
    expect(developerResponse.json().developer_details).toEqual({
      event_types_visible: true,
      signature_status_visible: true
    });
    expectSafeAndroidMerchantBody(merchantResponse.body);
    expectSafeAndroidMerchantBody(developerResponse.body);
  });

  it('queues a backend-owned connected-site test event without Android sending webhooks', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server } = buildAndroidMerchantServer({ eventPublisher });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/connected-site/test',
      headers: merchantHeaders()
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      status: 'test_queued',
      delivery_id: 'delivery_test_01',
      safe_status: 'Notification envoyée',
      android_sent_webhook_directly: false,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expect(eventPublisher.events).toHaveLength(1);
    expect(eventPublisher.events[0]).toMatchObject({
      eventType: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      merchantId: 'mch_01',
      data: {
        delivery_id: 'delivery_test_01',
        test_only: true,
        ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
      }
    });
    expectSafeAndroidMerchantBody(response.body);
  });

  it('runs a non-confirming configuration test with merchant checklist labels', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server } = buildAndroidMerchantServer({ eventPublisher });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/configuration-test',
      headers: merchantHeaders(),
      payload: {
        receiver_connected: true,
        notification_access_active: true,
        connected_site_configured: true
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      outcome: 'ready',
      confirms_real_payment: false,
      emits_payment_confirmed_webhook: false,
      checklist: [
        { label: 'Téléphone connecté', status: 'passed' },
        { label: 'Banque choisie', status: 'passed' },
        { label: 'Moyen de réception ajouté', status: 'passed' },
        { label: 'Site ou application connecté', status: 'passed' }
      ],
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expect(eventPublisher.events).toEqual([]);
    expect(response.body).not.toContain('payment.confirmed');
    expectSafeAndroidMerchantBody(response.body);
  });

  it('requires merchant auth for android merchant endpoints', async () => {
    const { server } = buildAndroidMerchantServer();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/dashboard-summary'
    });

    expect(response.statusCode).toBe(401);
  });
});

function buildAndroidMerchantServer(params: {
  eventPublisher?: FakeEventPublisher;
  connectedSite?: { url: string; status: 'active' | 'problem' };
} = {}) {
  const orderRepository = new FakeOrderRepository();
  const reviewRepository = new FakeReviewRepository();
  reviewRepository.items.set('rev_01', openReviewItem());

  const eventPublisher = params.eventPublisher ?? new FakeEventPublisher();
  const server = buildApiServer({
    environment: 'test',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    orderRepository,
    reviewRepository,
    eventPublisher,
    idGenerator: {
      orderId: () => 'ord_new',
      paymentSessionId: () => 'ps_new',
      auditEventId: () => 'aud_01',
      referenceCode: () => 'TANGO ALFA'
    },
    reviewIdGenerator: {
      reviewActionId: () => 'act_01',
      auditEventId: () => 'aud_review_01',
      eventId: () => 'evt_review_01'
    },
    androidMerchantDeliveryIdGenerator: () => 'delivery_test_01',
    clock: () => new Date('2026-05-03T10:05:00.000Z'),
    ...(params.connectedSite ? { androidMerchantConnectedSite: params.connectedSite } : {})
  });

  return { server, orderRepository, reviewRepository, eventPublisher };
}

function openReviewItem(): ReviewListItem {
  return {
    id: 'rev_01',
    merchantId: 'mch_01',
    orderId: 'ord_01',
    paymentSessionId: 'ps_01',
    signalId: 'sig_01',
    reasonCode: 'receiver_route_review_only',
    status: 'open',
    amountMinor: 5841,
    currency: 'RUB',
    bankProfileId: 'sber_ru',
    directionLabel: 'incoming_customer_transfer',
    signalQuality: 72,
    score: 68,
    positiveReasonCodes: ['amount_exact'],
    negativeReasonCodes: ['reference_not_observed'],
    senderPhoneMasked: '+7 *** *** **67',
    referenceCodeMasked: 'TANGO ALFA',
    createdAt: '2026-05-03T10:00:00.000Z'
  };
}

class FakeReviewRepository implements ReviewRepository {
  public readonly items = new Map<string, ReviewListItem>();

  public async createReview(input: ReviewCreateInput): Promise<{ kind: 'created'; reviewId: string }> {
    this.items.set(input.review.id, input.review);
    return { kind: 'created', reviewId: input.review.id };
  }

  public async listOpenReviews(merchantId: string): Promise<ReviewListItem[]> {
    return [...this.items.values()].filter((item) => item.merchantId === merchantId && item.status === 'open');
  }

  public async confirmReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    return {
      kind: 'updated',
      reviewId: input.reviewId,
      status: 'confirmed',
      orderId: 'ord_01',
      paymentSessionId: 'ps_01',
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed'
    };
  }

  public async rejectReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    return {
      kind: 'updated',
      reviewId: input.reviewId,
      status: 'rejected',
      orderId: 'ord_01',
      paymentSessionId: 'ps_01',
      orderStatus: input.scope === 'order' ? 'rejected' : 'needs_review',
      paymentSessionStatus: input.scope === 'order' ? 'rejected' : 'needs_review',
      rejectionScope: input.scope ?? 'signal',
      reason: input.reason as never
    };
  }
}

class FakeOrderRepository implements OrderRepository {
  public readonly order: StoredOrderRecord = {
    id: 'ord_01',
    merchantId: 'mch_01',
    externalId: 'ext_01',
    productId: 'prod_01',
    productName: 'Synthetic product',
    productRiskLevel: 'standard',
    amountMinor: 5841,
    currency: 'RUB',
    status: 'needs_review',
    expiresAt: '2026-05-03T11:00:00.000Z',
    createdAt: '2026-05-03T09:55:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z'
  };
  public readonly paymentSession: StoredPaymentSessionRecord = {
    id: 'ps_01',
    orderId: 'ord_01',
    merchantId: 'mch_01',
    expectedAmountMinor: 5841,
    currency: 'RUB',
    buyerPhoneHmac: 'hmac_phone',
    buyerPhoneMasked: '+7 *** *** **67',
    referenceCode: 'TANGO ALFA',
    referenceHmac: 'hmac_ref',
    status: 'needs_review',
    selectedReceiverBankId: 'sber_ru',
    selectedReceiverBankProfileId: 'sber_ru',
    selectedReceivingRouteId: 'route_01',
    selectedPayerBankLauncherId: 'sber_launcher',
    validFrom: '2026-05-03T09:55:00.000Z',
    validUntil: '2026-05-03T11:00:00.000Z',
    createdAt: '2026-05-03T09:55:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z'
  };
  public readonly route: StoredMerchantReceivingRouteRecord = {
    route_id: 'route_01',
    merchant_id: 'mch_01',
    bank_profile_id: 'sber_ru',
    rail_type: 'card_transfer',
    receiver_identifier_type: 'card',
    receiver_identifier_encrypted: 'encrypted',
    receiver_identifier_masked: '•••• 4821',
    route_code: 'SBER-CARD',
    display_label: 'Sberbank',
    enabled: true,
    recommended: true,
    review_policy: 'review_first',
    fees_hint: undefined,
    created_at: '2026-05-03T09:50:00.000Z',
    updated_at: '2026-05-03T09:50:00.000Z'
  };

  public async createOrderWithSession(_input: CreateOrderWithSessionInput): Promise<CreateOrderWithSessionResult> {
    void _input;
    return { kind: 'created', order: this.order, paymentSession: this.paymentSession };
  }

  public async getOrderById(merchantId: string, orderId: string): Promise<{ order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord | null } | null> {
    return merchantId === this.order.merchantId && orderId === this.order.id
      ? { order: this.order, paymentSession: this.paymentSession }
      : null;
  }

  public async getPaymentSessionById(merchantId: string, paymentSessionId: string): Promise<{ order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord } | null> {
    return merchantId === this.paymentSession.merchantId && paymentSessionId === this.paymentSession.id
      ? { order: this.order, paymentSession: this.paymentSession }
      : null;
  }

  public async createReceivingRoute(_input: CreateReceivingRouteInput): Promise<CreateReceivingRouteResult> {
    void _input;
    return { kind: 'created', route: this.route };
  }

  public async listReceivingRoutes(merchantId: string): Promise<StoredMerchantReceivingRouteRecord[]> {
    return merchantId === this.route.merchant_id ? [this.route] : [];
  }

  public async updateReceivingRoute(_input: UpdateReceivingRouteInput): Promise<ReceivingRouteMutationResult> {
    void _input;
    return { kind: 'updated', route: this.route };
  }

  public async listReceiverBanksForCheckout(merchantId: string, _paymentSessionId: string): Promise<StoredMerchantReceivingRouteRecord[]> {
    void _paymentSessionId;
    return this.listReceivingRoutes(merchantId);
  }

  public async listReceivingRoutesForCheckoutBank(
    merchantId: string,
    _paymentSessionId: string,
    bankProfileId: string
  ): Promise<StoredMerchantReceivingRouteRecord[]> {
    void _paymentSessionId;
    return merchantId === this.route.merchant_id && bankProfileId === this.route.bank_profile_id ? [this.route] : [];
  }

  public async getSelectedReceivingRouteCopyDetails(): Promise<ReceivingRouteCopyDetailsResult> {
    return { kind: 'not_found' };
  }

  public async recordCheckoutDestinationCopied(): Promise<void> {}

  public async selectReceiverBank(_input: SelectReceiverBankInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async selectReceivingRoute(_input: SelectReceivingRouteInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async selectPayerBankLauncher(_input: SelectPayerBankLauncherInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async saveBuyerSenderPhoneHint(_input: SaveBuyerSenderPhoneHintInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async markPaymentInstructionsShown(): Promise<PaymentSessionCheckoutMutationResult> {
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async markBuyerClaimedPaid(): Promise<PaymentSessionCheckoutMutationResult> {
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }
}

class FakeEventPublisher {
  public readonly events: EventEnvelope[] = [];

  public async publish(event: EventEnvelope): Promise<void> {
    this.events.push(event);
  }
}

function merchantHeaders() {
  return { authorization: 'Bearer test_mch_01' };
}

function expectSafeAndroidMerchantBody(body: string): void {
  expect(body).not.toContain('2200123412344821');
  expect(body).not.toContain('+79991234567');
  expect(body).not.toContain('raw notification');
  expect(body).not.toContain('webhook_secret');
  expect(body).not.toContain('cert_sha256');
  expect(body).not.toContain('package_name');
  expect(body).not.toContain('HMAC');
  expect(body).not.toContain('official_bank_confirmation":true');
}
