import { createHash, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  EventTypes,
  processJetStreamMessage,
  type EventEnvelope,
  type InternalEventEnvelope
} from '@swimpay/events';
import { hmacSha256 } from '@swimpay/security';
import {
  buildApiServer,
  type OrderRepository,
  type ReviewActionInput,
  type ReviewActionResult,
  type ReviewCreateInput,
  type ReviewListItem,
  type ReviewRepository,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from '../apps/api/src/server.js';
import {
  createReceiverSignalSignature,
  type ReceiverSignalDevice,
  type ReceiverSignalRepository,
  type SignalIngestionInput,
  type SignalIngestionResult
} from '../apps/api/src/signals.js';
import {
  InMemorySignalRuntimeRepository,
  SignalRuntimeProcessor,
  createSignalReceivedHandler,
  type SignalRuntimeSignal,
  type SignalRuntimeSessionCandidate,
  type SignalRuntimeTrustContext
} from '../apps/signal-worker/src/runtime.js';
import {
  InMemoryWebhookRepository,
  WebhookDeliveryWorker,
  verifyWebhookSignature,
  type PublicWebhookEvent,
  type WebhookEndpoint,
  type WebhookHttpClient
} from '../apps/job-worker/src/webhooks.js';
import { createWebhookDeliveryRequestedHandler } from '../apps/job-worker/src/webhook-runtime.js';

const now = '2026-05-02T10:00:00.000Z';
const receiverKeyPair = generateReceiverKeyPair();
const publicKey = receiverKeyPair.publicKeyPem;
const privateKey = receiverKeyPair.privateKeyPem;
const phoneHmacSecret = 'durable_e2e_phone_secret';
const rawBuyerPhone = '+7 (999) 123-45-67';
const buyerPhoneHmac = hmacSha256('+79991234567', phoneHmacSecret);
const referenceHmac = hmacSha256('SWP-E2E01', phoneHmacSecret);

const trustedContext: SignalRuntimeTrustContext = {
  bankProfileStatus: 'trusted',
  bankAppVerificationStatus: 'verified',
  templateStatus: 'trusted',
  deviceStatus: 'active',
  deviceTrustScore: 100,
  merchantTrusted: true
};

const toVerifyContext: SignalRuntimeTrustContext = {
  bankProfileStatus: 'learning',
  bankAppVerificationStatus: 'TO_VERIFY',
  templateStatus: 'learning',
  deviceStatus: 'active',
  deviceTrustScore: 100,
  merchantTrusted: true
};

describe('durable worker e2e tests', () => {
  it('routes an API-created TO_VERIFY bank signal to review without auto-confirming or exposing PII', async () => {
    const api = createApiHarness();

    const orderResponse = await api.server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: orderPayload()
    });
    expect(orderResponse.statusCode).toBe(201);

    const order = api.orders.orders.get('ord_e2e_01');
    const session = api.orders.paymentSessions[0];
    expect(order).toBeDefined();
    expect(session).toBeDefined();

    const signalResponse = await api.server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: signedSignalPayload({
        event_id: 'bank_evt_untrusted_01',
        notification_hash: 'a'.repeat(64),
        package_name: 'TO_VERIFY',
        package_cert_sha256: 'TO_VERIFY'
      })
    });
    expect(signalResponse.statusCode).toBe(201);
    expect(signalResponse.json()).toMatchObject({
      status: 'received',
      accepted: true,
      reason_codes: [],
      next_action: 'backend_decision_pending'
    });
    expect(signalResponse.body).not.toContain('official_bank_confirmation');

    const runtime = createRuntimeHarness({
      signal: signalFromApi(api.signals.storedSignals[0]!),
      sessions: [sessionFromApi(order!, session!)],
      trustContext: toVerifyContext
    });

    const message = buildJetStreamMessage({
      envelope: internalEventFromLegacy(api.events.events[0]!)
    });
    await processJetStreamMessage({
      message,
      expectedEventType: EventTypes.SIGNAL_RECEIVED,
      handler: createSignalReceivedHandler(runtime.processor)
    });

    expect(message.ack).toHaveBeenCalledOnce();
    expect(runtime.repository.matches[0]?.decision).toBe('needs_review');
    expect(runtime.repository.reviews).toHaveLength(1);
    expect(runtime.repository.reviews[0]?.reasonCodes).toEqual(
      expect.arrayContaining(['bank_profile_untrusted', 'bank_app_unverified'])
    );
    expect(runtime.repository.orders.get('ord_e2e_01')?.status).toBe('needs_review');
    expect(runtime.repository.webhookEvents).toEqual([]);
    expect(runtime.repository.publishedEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([EventTypes.DECISION_NEEDS_REVIEW, EventTypes.REVIEW_CREATED])
    );
    expectSafePayload(orderResponse.body);
    expectSafePayload(signalResponse.body);
    expectSafePayload(JSON.stringify(runtime.repository.auditEvents));
    expectSafePayload(JSON.stringify(runtime.repository.webhookEvents));
  });

  it('keeps amount-only and unsafe signal categories away from confirmation', async () => {
    const amountOnly = createRuntimeHarness({
      signal: runtimeSignal({
        id: 'sig_amount_only',
        eventId: 'bank_evt_amount_only',
        titleRedacted: 'Incoming transfer 137 RUB',
        bodyRedacted: '',
        senderPhoneHmac: undefined,
        referenceHmac: undefined
      }),
      sessions: [
        runtimeSession({
          buyerPhoneHmac: undefined,
          referenceHmac: undefined
        })
      ],
      trustContext: trustedContext
    });

    const amountOnlyResult = await amountOnly.processor.processSignalReceived({ signalId: 'sig_amount_only' });
    expect(amountOnlyResult.decision).toBe('needs_review');
    expect(amountOnly.repository.reviews[0]?.reasonCodes).toContain('amount_only_never_auto_confirm');
    expect(amountOnly.repository.orders.get('ord_e2e_01')?.status).toBe('needs_review');

    for (const [label, text, expectedDirection] of [
      ['cashback', 'cashback 137 RUB from store', 'incoming_cashback'],
      ['refund', 'refund 137 RUB from shop', 'incoming_refund'],
      ['outgoing', 'payment 137 RUB to shop', 'outgoing_payment'],
      ['promo', 'promo bonus 137 RUB', 'promo'],
      ['failed', 'failed transfer 137 RUB', 'failed_transfer']
    ] as const) {
      const runtime = createRuntimeHarness({
        signal: runtimeSignal({
          id: `sig_${label}`,
          eventId: `bank_evt_${label}`,
          titleRedacted: text,
          bodyRedacted: ''
        }),
        sessions: [runtimeSession()],
        trustContext: trustedContext
      });

      const result = await runtime.processor.processSignalReceived({ signalId: `sig_${label}` });

      expect(result.decision).toBe('rejected');
      expect(runtime.repository.signals[0]?.directionLabel).toBe(expectedDirection);
      expect(runtime.repository.orders.get('ord_e2e_01')?.status).toBe('awaiting_payment');
      expect(runtime.repository.webhookEvents.some((event) => event.type === 'payment.confirmed')).toBe(false);
      expect(runtime.repository.auditEvents.length).toBeGreaterThan(0);
      expectSafePayload(JSON.stringify(runtime.repository.auditEvents));
      expectSafePayload(JSON.stringify(runtime.repository.webhookEvents));
    }

    const unknown = createRuntimeHarness({
      signal: runtimeSignal({
        id: 'sig_unknown',
        eventId: 'bank_evt_unknown',
        titleRedacted: 'Account update 137 RUB',
        bodyRedacted: ''
      }),
      sessions: [runtimeSession()],
      trustContext: trustedContext
    });
    const unknownResult = await unknown.processor.processSignalReceived({ signalId: 'sig_unknown' });
    expect(unknownResult.decision).toBe('needs_review');
    expect(unknown.repository.reviews[0]?.reasonCodes).toContain('ambiguous_direction');
  });

  it('routes trusted synthetic signal to review and delivers a signed webhook only after manual confirmation', async () => {
    const runtime = createRuntimeHarness({
      signal: runtimeSignal({
        bankProfileId: 'synthetic_test_bank',
        titleRedacted: 'Incoming transfer 137 RUB',
        bodyRedacted: 'Transfer from <PHONE>. <REFERENCE>'
      }),
      sessions: [runtimeSession()],
      trustContext: trustedContext
    });

    const result = await runtime.processor.processSignalReceived({ signalId: 'sig_e2e_01' });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).toContain('manual_confirmation_required_v1');
    expect(runtime.repository.orders.get('ord_e2e_01')?.status).toBe('needs_review');
    expect(runtime.repository.paymentSessions.get('ps_e2e_01')?.status).toBe('needs_review');
    expect(runtime.repository.reviews).toHaveLength(1);
    expect(runtime.repository.webhookEvents).toEqual([]);

    const manualConfirmedWebhook = paymentWebhookEvent('evt_manual_confirmed_e2e', 'payment.confirmed', {
      order_id: 'ord_e2e_01',
      payment_session_id: 'ps_e2e_01',
      signal_id: 'sig_e2e_01',
      review_id: runtime.repository.reviews[0]?.id,
      decision: 'manual_confirmed'
    });

    const webhookRepository = new InMemoryWebhookRepository({ deliveryId: () => 'del_confirmed_01' });
    webhookRepository.endpoints.push(activeEndpoint(['payment.confirmed']));
    const httpClient = new CapturingWebhookHttpClient([{ status: 200 }]);
    const worker = new WebhookDeliveryWorker({ repository: webhookRepository, httpClient });
    const enqueueResult = await worker.enqueueEvent(manualConfirmedWebhook);
    expect(enqueueResult).toEqual({ created: 1, skippedDuplicates: 0 });

    const handler = createWebhookDeliveryRequestedHandler(worker, () => now);
    await handler({
      id: 'evt_delivery_requested_01',
      type: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      created_at: now,
      source: 'swimpay-signal-worker',
      data: { event_id: manualConfirmedWebhook.id }
    });

    expect(webhookRepository.deliveries[0]).toMatchObject({
      id: 'del_confirmed_01',
      status: 'delivered',
      attemptCount: 1
    });
    expect(httpClient.requests).toHaveLength(1);
    expect(httpClient.requests[0]?.headers).toMatchObject({
      'SwimPay-Event-Id': manualConfirmedWebhook.id,
      'SwimPay-Delivery-Id': 'del_confirmed_01',
      'SwimPay-Timestamp': now
    });
    expect(
      verifyWebhookSignature({
        secret: 'whsec_e2e',
        timestamp: now,
        payload: httpClient.requests[0]!.body,
        signature: httpClient.requests[0]!.headers['SwimPay-Signature']!
      })
    ).toBe(true);
    expectSafePayload(httpClient.requests[0]!.body);
  });

  it('creates review on collision and keeps duplicate signal processing idempotent', async () => {
    const collision = createRuntimeHarness({
      signal: runtimeSignal({
        senderPhoneHmac: undefined,
        referenceHmac: undefined
      }),
      sessions: [
        runtimeSession({
          orderId: 'ord_e2e_01',
          paymentSessionId: 'ps_e2e_01',
          buyerPhoneHmac: undefined,
          referenceHmac: undefined
        }),
        runtimeSession({
          orderId: 'ord_e2e_02',
          paymentSessionId: 'ps_e2e_02',
          buyerPhoneHmac: undefined,
          referenceHmac: undefined
        })
      ],
      trustContext: trustedContext
    });

    const result = await collision.processor.processSignalReceived({ signalId: 'sig_e2e_01' });

    expect(result.decision).toBe('needs_review');
    expect(result.collisionDetected).toBe(true);
    expect(collision.repository.reviews).toHaveLength(1);
    expect(collision.repository.reviews[0]?.reasonCodes).toContain('amount_collision');

    await collision.processor.processSignalReceived({ signalId: 'sig_e2e_01' });
    expect(collision.repository.reviews).toHaveLength(1);
    expect(collision.repository.webhookEvents).toEqual([]);
    expect(collision.repository.matches).toHaveLength(1);

    const duplicateApi = createApiHarness();
    const first = await duplicateApi.server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: signedSignalPayload({ event_id: 'bank_evt_duplicate_01', notification_hash: 'b'.repeat(64) })
    });
    const duplicate = await duplicateApi.server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: signedSignalPayload({ event_id: 'bank_evt_duplicate_01', notification_hash: 'c'.repeat(64), local_counter: 2 })
    });

    expect(first.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('duplicate_event_id');
  });

  it('keeps review rejection semantics safe through the API', async () => {
    const signalScoped = new E2EReviewRepository();
    signalScoped.items.set('rev_signal_01', openReviewItem({ id: 'rev_signal_01' }));
    signalScoped.orderStatuses.set('ord_e2e_01', 'awaiting_payment');
    signalScoped.paymentSessionStatuses.set('ps_e2e_01', 'awaiting_payment');
    const signalServer = buildReviewServer(signalScoped);

    const signalReject = await signalServer.inject({
      method: 'POST',
      url: '/v1/reviews/rev_signal_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { reason: 'false_positive' }
    });

    expect(signalReject.statusCode).toBe(200);
    expect(signalReject.json()).toMatchObject({
      rejection_scope: 'signal',
      order_status: 'awaiting_payment',
      payment_session_status: 'awaiting_payment'
    });
    expect(signalScoped.signalStatuses.get('sig_e2e_01')).toBe('rejected');
    expect(signalScoped.orderStatuses.get('ord_e2e_01')).toBe('awaiting_payment');
    expect(signalScoped.paymentSessionStatuses.get('ps_e2e_01')).toBe('awaiting_payment');
    expect(signalScoped.webhookEvents).toEqual([]);
    expectSafePayload(signalReject.body);

    const orderScoped = new E2EReviewRepository();
    orderScoped.items.set('rev_order_01', openReviewItem({ id: 'rev_order_01' }));
    orderScoped.orderStatuses.set('ord_e2e_01', 'awaiting_payment');
    orderScoped.paymentSessionStatuses.set('ps_e2e_01', 'awaiting_payment');
    const orderServer = buildReviewServer(orderScoped);

    const orderReject = await orderServer.inject({
      method: 'POST',
      url: '/v1/reviews/rev_order_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { scope: 'order', reason: 'merchant_cancelled' }
    });

    expect(orderReject.statusCode).toBe(200);
    expect(orderReject.json()).toMatchObject({
      rejection_scope: 'order',
      order_status: 'rejected',
      payment_session_status: 'rejected'
    });
    expect(orderScoped.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: EventTypes.REVIEW_REJECTED }),
        expect.objectContaining({ eventType: EventTypes.SIGNAL_REJECTED }),
        expect.objectContaining({ eventType: 'order.status_changed' })
      ])
    );
    expectSafePayload(JSON.stringify(orderScoped.auditEvents));
  });

  it('processes webhook delivery success, retry and dead states without external calls', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: (() => {
        let value = 0;
        return () => `del_retry_${++value}`;
      })()
    });
    repository.endpoints.push(activeEndpoint(['payment.rejected']));
    const httpClient = new CapturingWebhookHttpClient([
      { status: 503, body: 'temporarily unavailable' },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 200 }
    ]);
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const event = paymentWebhookEvent('evt_retry_e2e', 'payment.rejected', {
      order_id: 'ord_e2e_01',
      payment_session_id: 'ps_e2e_01',
      decision: 'manual_rejected',
      reason_codes: ['manual_review_rejected']
    });

    await worker.enqueueEvent(event);
    await worker.processDueDeliveries(now);
    expect(repository.deliveries[0]).toMatchObject({
      status: 'failed',
      attemptCount: 1,
      nextRetryAt: '2026-05-02T10:01:00.000Z'
    });

    await worker.processDueDeliveries('2026-05-02T10:01:00.000Z');
    await worker.processDueDeliveries('2026-05-02T10:06:00.000Z');
    await worker.processDueDeliveries('2026-05-02T10:21:00.000Z');
    await worker.processDueDeliveries('2026-05-02T11:21:00.000Z');
    await worker.processDueDeliveries('2026-05-02T17:21:00.000Z');
    await worker.processDueDeliveries('2026-05-03T17:21:00.000Z');
    expect(repository.deliveries[0]).toMatchObject({
      status: 'dead',
      attemptCount: 7
    });

    const successRepository = new InMemoryWebhookRepository({ deliveryId: () => 'del_success_01' });
    successRepository.endpoints.push(activeEndpoint(['payment.expired']));
    const successClient = new CapturingWebhookHttpClient([{ status: 200 }]);
    const successWorker = new WebhookDeliveryWorker({ repository: successRepository, httpClient: successClient });
    await successWorker.enqueueEvent(paymentWebhookEvent('evt_success_e2e', 'payment.expired', { order_id: 'ord_e2e_02' }));
    await successWorker.processDueDeliveries(now);

    expect(successRepository.deliveries[0]).toMatchObject({
      status: 'delivered',
      attemptCount: 1
    });
    expect(successClient.requests[0]?.headers).toEqual(
      expect.objectContaining({
        'SwimPay-Event-Id': 'evt_success_e2e',
        'SwimPay-Delivery-Id': 'del_success_01',
        'SwimPay-Timestamp': now,
        'SwimPay-Signature': expect.stringMatching(/^sha256=[a-f0-9]{64}$/)
      })
    );
    expectSafePayload(successClient.requests[0]!.body);
  });

  it('rejects invalid worker envelopes through consumer abstractions without swallowing errors', async () => {
    const runtime = createRuntimeHarness();
    const signalAck = vi.fn();
    const signalNack = vi.fn();
    const signalTerm = vi.fn();

    await expect(
      processJetStreamMessage({
        message: buildJetStreamMessage({
          envelope: {
            id: 'evt_invalid_signal',
            type: EventTypes.SIGNAL_RECEIVED,
            created_at: now,
            source: 'test',
            data: {}
          },
          ack: signalAck,
          nack: signalNack,
          term: signalTerm
        }),
        expectedEventType: EventTypes.SIGNAL_RECEIVED,
        handler: createSignalReceivedHandler(runtime.processor)
      })
    ).rejects.toThrow('signal.received requires signal_id or event_id');

    expect(signalAck).not.toHaveBeenCalled();
    expect(signalNack).toHaveBeenCalledOnce();
    expect(signalTerm).not.toHaveBeenCalled();

    const jobTerm = vi.fn();
    await expect(
      processJetStreamMessage({
        message: buildJetStreamMessage({
          envelope: {
            id: 'evt_invalid_job',
            type: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
            created_at: now,
            source: 'test',
            data: {
              raw_notification_text: 'raw text'
            }
          },
          term: jobTerm
        }),
        expectedEventType: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
        handler: createWebhookDeliveryRequestedHandler(new WebhookDeliveryWorker({
          repository: new InMemoryWebhookRepository(),
          httpClient: new CapturingWebhookHttpClient([{ status: 200 }])
        }))
      })
    ).rejects.toThrow('Invalid JetStream event payload: raw_pii_field_present');

    expect(jobTerm).toHaveBeenCalledOnce();
  });
});

function createApiHarness() {
  const orders = new E2EOrderRepository();
  const signals = new E2ESignalRepository();
  const events = new E2EEventPublisher();
  const server = buildApiServer({
    environment: 'test',
    healthChecks: skippedHealthChecks(),
    orderRepository: orders,
    signalRepository: signals,
    eventPublisher: events,
    phoneHmacSecret,
    checkoutBaseUrl: 'https://pay.test/checkout',
    idGenerator: {
      orderId: () => 'ord_e2e_01',
      paymentSessionId: () => 'ps_e2e_01',
      auditEventId: (() => {
        let value = 0;
        return () => `aud_order_${++value}`;
      })(),
      referenceCode: () => 'SWP-E2E01'
    },
    signalIdGenerator: () => 'sig_e2e_01',
    clock: () => new Date(now)
  });

  return { server, orders, signals, events };
}

function createRuntimeHarness(params: {
  signal?: SignalRuntimeSignal;
  sessions?: SignalRuntimeSessionCandidate[];
  trustContext?: SignalRuntimeTrustContext;
} = {}) {
  const repository = new InMemorySignalRuntimeRepository({
    signals: [params.signal ?? runtimeSignal()],
    sessions: params.sessions ?? [runtimeSession()],
    trustContext: params.trustContext ?? trustedContext
  });
  const processor = new SignalRuntimeProcessor({
    repository,
    now: () => now,
    idGenerator: {
      eventId: () => `evt_runtime_${repository.publishedEvents.length + 1}`,
      matchId: () => `match_${repository.matches.length + 1}`,
      reviewId: () => `review_${repository.reviews.length + 1}`,
      auditEventId: () => `audit_${repository.auditEvents.length + 1}`
    }
  });

  return { repository, processor };
}

function orderPayload() {
  return {
    external_id: 'order_e2e_01',
    amount: { value: '137.00', currency: 'RUB' },
    buyer: {
      bank_phone: rawBuyerPhone,
      name: 'Ivan'
    },
    product: {
      id: 'premium_pack',
      name: 'Premium Pack',
      risk_level: 'low'
    },
    expires_in_seconds: 900
  };
}

function signedSignalPayload(overrides: Partial<Record<string, unknown>> = {}) {
  const payload = {
    event_id: 'bank_evt_e2e_01',
    device_id: 'dev_e2e_01',
    merchant_id: 'mch_01',
    bank_profile_id: 'sber_ru',
    package_name: 'synthetic.test.bank',
    package_cert_sha256: 'synthetic_test_cert',
    notification_hash: '9'.repeat(64),
    semantic_hash: '8'.repeat(64),
    local_counter: 1,
    snapshot_count: 1,
    coalesced: true,
    observed_at: now,
    amount_minor: 13700,
    currency: 'RUB',
    sender_phone_hmac: buyerPhoneHmac,
    sender_phone_masked: '+7 *** *** **67',
    reference_hmac: referenceHmac,
    reference_code_masked: 'SWP-E***',
    direction_hint: 'incoming_customer_transfer',
    parser_hint: 'android-local-v1',
    signal_quality_hint: 80,
    redacted_title: 'Incoming transfer <AMOUNT> <CURRENCY>',
    redacted_body: 'Transfer from <PHONE>. <REFERENCE>',
    raw_text_present: false,
    ...overrides
  };

  const payloadWithHash = addPayloadHash(payload);
  return {
    ...payloadWithHash,
    signature: createReceiverSignalSignature(payloadWithHash, privateKey)
  };
}

function signalFromApi(input: SignalIngestionInput): SignalRuntimeSignal {
  return {
    id: input.signal.id,
    merchantId: input.signal.merchantId,
    deviceId: input.signal.deviceId,
    bankProfileId: input.signal.bankProfileId,
    eventId: input.signal.eventId,
    notificationHash: input.signal.notificationHash,
    observedAt: input.signal.observedAt,
    receivedAt: input.signal.receivedAt,
    titleRedacted: String(input.payloadRedacted.title_redacted ?? ''),
    bodyRedacted: String(input.payloadRedacted.body_redacted ?? ''),
    amountMinor: input.signal.amountMinor,
    currency: input.signal.currency,
    senderPhoneHmac: input.signal.senderPhoneHmac,
    senderPhoneMasked: input.signal.senderPhoneMasked,
    referenceHmac: input.signal.referenceHmac,
    referenceCodeMasked: input.signal.referenceCodeMasked,
    directionLabel: input.signal.directionLabel as SignalRuntimeSignal['directionLabel'],
    signatureValid: input.signal.signatureValid,
    status: input.signal.status
  };
}

function generateReceiverKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey: generatedPublicKey, privateKey: generatedPrivateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  return {
    publicKeyPem: generatedPublicKey.export({ format: 'pem', type: 'spki' }).toString().trim(),
    privateKeyPem: generatedPrivateKey.export({ format: 'pem', type: 'pkcs8' }).toString().trim()
  };
}

function addPayloadHash(payload: Record<string, unknown>): Record<string, unknown> {
  const withoutPayloadHash = { ...payload };
  delete withoutPayloadHash.payload_hash;
  delete withoutPayloadHash.signature;
  return {
    ...withoutPayloadHash,
    payload_hash: createHash('sha256').update(stableStringify(withoutPayloadHash)).digest('hex')
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function sessionFromApi(order: StoredOrderRecord, session: StoredPaymentSessionRecord): SignalRuntimeSessionCandidate {
  return runtimeSession({
    orderId: order.id,
    paymentSessionId: session.id,
    merchantId: session.merchantId,
    expectedAmountMinor: session.expectedAmountMinor,
    currency: session.currency,
    buyerPhoneHmac: session.buyerPhoneHmac,
    referenceHmac: session.referenceHmac,
    status: 'awaiting_payment',
    orderStatus: 'awaiting_payment',
    paymentSessionStatus: 'awaiting_payment',
    validFrom: session.validFrom,
    validUntil: session.validUntil
  });
}

function runtimeSignal(overrides: Partial<SignalRuntimeSignal> = {}): SignalRuntimeSignal {
  return {
    id: 'sig_e2e_01',
    merchantId: 'mch_01',
    deviceId: 'dev_e2e_01',
    bankProfileId: 'synthetic_test_bank',
    eventId: 'bank_evt_e2e_01',
    notificationHash: 'hash_e2e_01',
    observedAt: now,
    receivedAt: now,
    titleRedacted: 'Incoming transfer 137 RUB',
    bodyRedacted: 'Transfer from <PHONE>. <REFERENCE>',
    amountMinor: 13700,
    currency: 'RUB',
    senderPhoneHmac: buyerPhoneHmac,
    senderPhoneMasked: '+7 *** *** **67',
    referenceHmac,
    referenceCodeMasked: 'SWP-E***',
    directionLabel: 'incoming_customer_transfer',
    signatureValid: true,
    status: 'received',
    ...overrides
  };
}

function runtimeSession(overrides: Partial<SignalRuntimeSessionCandidate> = {}): SignalRuntimeSessionCandidate {
  return {
    orderId: 'ord_e2e_01',
    paymentSessionId: 'ps_e2e_01',
    merchantId: 'mch_01',
    expectedAmountMinor: 13700,
    currency: 'RUB',
    buyerPhoneHmac,
    buyerSenderPhoneHmac: buyerPhoneHmac,
    referenceHmac,
    selectedReceiverBankId: 'synthetic_test_bank',
    selectedReceiverBankProfileId: 'synthetic_test_bank',
    selectedReceivingRouteId: 'route_e2e_phone',
    receiverRouteCode: 'SYN-PHONE',
    railType: 'phone_transfer',
    paymentReference: 'TANGO ALFA',
    status: 'awaiting_payment',
    orderStatus: 'awaiting_payment',
    paymentSessionStatus: 'awaiting_payment',
    validFrom: '2026-05-02T09:55:00.000Z',
    validUntil: '2026-05-02T10:15:00.000Z',
    orderAlreadyConfirmed: false,
    ...overrides
  };
}

function openReviewItem(overrides: Partial<ReviewListItem> = {}): ReviewListItem {
  return {
    id: 'rev_e2e_01',
    merchantId: 'mch_01',
    orderId: 'ord_e2e_01',
    paymentSessionId: 'ps_e2e_01',
    signalId: 'sig_e2e_01',
    reasonCode: 'amount_collision',
    status: 'open',
    amountMinor: 13700,
    currency: 'RUB',
    bankProfileId: 'synthetic_test_bank',
    directionLabel: 'incoming_customer_transfer',
    signalQuality: 72,
    score: 68,
    positiveReasonCodes: ['amount_exact'],
    negativeReasonCodes: ['amount_collision'],
    senderPhoneMasked: '+7 *** *** **67',
    referenceCodeMasked: 'SWP-E***',
    createdAt: now,
    ...overrides
  };
}

function buildReviewServer(repository: ReviewRepository) {
  return buildApiServer({
    environment: 'test',
    healthChecks: skippedHealthChecks(),
    reviewRepository: repository,
    eventPublisher: new E2EEventPublisher(),
    clock: () => new Date(now)
  });
}

function paymentWebhookEvent(
  eventId: string,
  type: PublicWebhookEvent['type'],
  data: Record<string, unknown>
): PublicWebhookEvent {
  return {
    id: eventId,
    type,
    created_at: now,
    merchant_id: 'mch_01',
    data: {
      ...data,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    }
  };
}

function activeEndpoint(enabledEvents: PublicWebhookEvent['type'][]): WebhookEndpoint {
  return {
    id: 'we_e2e_01',
    merchantId: 'mch_01',
    url: 'https://merchant.invalid/swimpay',
    secret: 'whsec_e2e',
    enabledEvents,
    status: 'active'
  };
}

function internalEventFromLegacy(event: EventEnvelope): InternalEventEnvelope {
  return {
    id: event.eventId,
    type: event.eventType,
    created_at: event.occurredAt,
    source: 'swimpay-api',
    data: event.data,
    metadata: {
      correlation_id: event.idempotencyKey
    }
  };
}

function buildJetStreamMessage(params: {
  envelope: InternalEventEnvelope;
  ack?: () => void;
  nack?: () => void;
  term?: () => void;
}) {
  return {
    data: Buffer.from(JSON.stringify(params.envelope)),
    ack: params.ack ?? vi.fn(),
    nak: params.nack ?? vi.fn(),
    term: params.term ?? vi.fn()
  };
}

function skippedHealthChecks() {
  return {
    database: async () => 'skipped' as const,
    nats: async () => 'skipped' as const,
    valkey: async () => 'skipped' as const
  };
}

function expectSafePayload(payload: string): void {
  expect(payload).not.toContain(rawBuyerPhone);
  expect(payload).not.toContain('+79991234567');
  expect(payload).not.toContain('raw_notification_text');
  expect(payload).not.toContain('raw bank');
  expect(payload).not.toContain('sk_live');
  expect(payload).not.toContain('bank_confirmed');
  expect(payload).not.toContain('guaranteed_payment');
  expect(payload).not.toContain('psp_confirmed');
  expect(payload).not.toContain('"official_bank_confirmation":true');
}

class E2EOrderRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();
  public readonly paymentSessions: StoredPaymentSessionRecord[] = [];
  public readonly auditEvents: Array<Record<string, unknown>> = [];
  private readonly externalIds = new Set<string>();

  public async createOrderWithSession(input: Parameters<OrderRepository['createOrderWithSession']>[0]) {
    const key = `${input.merchantId}:${input.order.externalId}`;
    if (this.externalIds.has(key)) {
      return { kind: 'duplicate_external_id' as const };
    }

    this.externalIds.add(key);
    this.orders.set(input.order.id, input.order);
    this.paymentSessions.push(input.paymentSession);
    this.auditEvents.push(...input.auditEvents);
    return {
      kind: 'created' as const,
      order: input.order,
      paymentSession: input.paymentSession
    };
  }

  public async getOrderById(merchantId: string, orderId: string) {
    const order = this.orders.get(orderId);
    if (!order || order.merchantId !== merchantId) {
      return null;
    }

    return {
      order,
      paymentSession: this.paymentSessions.find((session) => session.orderId === orderId) ?? null
    };
  }

  public async getPaymentSessionById(merchantId: string, paymentSessionId: string) {
    const paymentSession = this.paymentSessions.find((session) => session.id === paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== merchantId) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  public async getCheckoutSessionById(paymentSessionId: string) {
    const paymentSession = this.paymentSessions.find((session) => session.id === paymentSessionId);
    if (!paymentSession) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  public async getSelectedReceivingRouteCopyDetails() {
    return { kind: 'not_found' as const };
  }

  public async recordCheckoutDestinationCopied() {
    // Durable worker E2E tests do not exercise buyer copy-details reveals.
  }
}

class E2ESignalRepository implements ReceiverSignalRepository {
  public readonly storedSignals: SignalIngestionInput[] = [];
  public readonly device: ReceiverSignalDevice = {
    id: 'dev_e2e_01',
    merchantId: 'mch_01',
    publicKey,
    lastLocalCounter: 0,
    status: 'active'
  };
  private readonly eventIds = new Set<string>();
  private readonly notificationHashes = new Set<string>();

  public async getReceiverDevice(params: { merchantId: string; deviceId: string }): Promise<ReceiverSignalDevice | null> {
    return params.merchantId === this.device.merchantId && params.deviceId === this.device.id ? this.device : null;
  }

  public async ingestSignal(input: SignalIngestionInput): Promise<SignalIngestionResult> {
    if (this.eventIds.has(input.signal.eventId)) {
      return { kind: 'duplicate_event_id' };
    }
    if (this.notificationHashes.has(input.signal.notificationHash)) {
      return { kind: 'duplicate_notification_hash' };
    }
    if (input.signal.localCounter <= this.device.lastLocalCounter) {
      return { kind: 'local_counter_regression' };
    }

    this.eventIds.add(input.signal.eventId);
    this.notificationHashes.add(input.signal.notificationHash);
    this.device.lastLocalCounter = input.signal.localCounter;
    this.storedSignals.push(input);
    return { kind: 'stored', signalId: input.signal.id };
  }
}

class E2EEventPublisher {
  public readonly events: EventEnvelope[] = [];

  public async publish(event: EventEnvelope): Promise<void> {
    this.events.push(event);
  }
}

class E2EReviewRepository implements ReviewRepository {
  public readonly items = new Map<string, ReviewListItem>();
  public readonly actions: ReviewActionInput[] = [];
  public readonly auditEvents: Array<{ eventType: string; objectType: string; objectId: string }> = [];
  public readonly orderStatuses = new Map<string, string>();
  public readonly paymentSessionStatuses = new Map<string, string>();
  public readonly signalStatuses = new Map<string, string>();
  public readonly webhookEvents: PublicWebhookEvent[] = [];

  public async createReview(input: ReviewCreateInput): Promise<{ kind: 'created'; reviewId: string }> {
    this.items.set(input.review.id, input.review);
    this.auditEvents.push(input.auditEvent);
    return { kind: 'created', reviewId: input.review.id };
  }

  public async listOpenReviews(merchantId: string): Promise<ReviewListItem[]> {
    return [...this.items.values()].filter((item) => item.merchantId === merchantId && item.status === 'open');
  }

  public async confirmReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    const review = this.items.get(input.reviewId);
    if (!review || review.merchantId !== input.merchantId) {
      return { kind: 'not_found' };
    }
    if (review.status !== 'open') {
      return { kind: 'not_open' };
    }

    review.status = 'confirmed';
    this.actions.push(input);
    this.orderStatuses.set(review.orderId, 'manual_confirmed');
    this.paymentSessionStatuses.set(review.paymentSessionId, 'manual_confirmed');
    return {
      kind: 'updated',
      reviewId: review.id,
      status: 'confirmed',
      orderId: review.orderId,
      paymentSessionId: review.paymentSessionId,
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed'
    };
  }

  public async rejectReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    const review = this.items.get(input.reviewId);
    if (!review || review.merchantId !== input.merchantId) {
      return { kind: 'not_found' };
    }

    const scope = input.scope ?? 'signal';
    if (review.status !== 'open') {
      const previous = this.actions.find((action) => action.reviewId === review.id && action.action === 'rejected');
      if (review.status === 'rejected' && previous?.scope === scope) {
        return {
          kind: 'updated',
          reviewId: review.id,
          status: 'rejected',
          orderId: review.orderId,
          paymentSessionId: review.paymentSessionId,
          orderStatus: this.orderStatuses.get(review.orderId) ?? 'awaiting_payment',
          paymentSessionStatus: this.paymentSessionStatuses.get(review.paymentSessionId) ?? 'awaiting_payment',
          rejectionScope: scope,
          reason: previous.reason,
          idempotent: true
        };
      }
      if (review.status === 'rejected') {
        return { kind: 'rejection_scope_conflict', existingScope: previous?.scope ?? 'signal', requestedScope: scope };
      }
      return { kind: 'not_open' };
    }

    review.status = 'rejected';
    review.resolvedAt = input.createdAt;
    this.actions.push({ ...input, scope });
    this.signalStatuses.set(review.signalId, 'rejected');
    if (scope === 'payment_session' || scope === 'order') {
      this.paymentSessionStatuses.set(review.paymentSessionId, 'rejected');
    }
    if (scope === 'order') {
      this.orderStatuses.set(review.orderId, 'rejected');
    }

    this.auditEvents.push({ eventType: EventTypes.REVIEW_REJECTED, objectType: 'review', objectId: review.id });
    this.auditEvents.push({ eventType: EventTypes.SIGNAL_REJECTED, objectType: 'notification_signal', objectId: review.signalId });
    if (scope === 'payment_session' || scope === 'order') {
      this.auditEvents.push({
        eventType: 'payment_session.status_changed',
        objectType: 'payment_session',
        objectId: review.paymentSessionId
      });
    }
    if (scope === 'order') {
      this.auditEvents.push({ eventType: 'order.status_changed', objectType: 'order', objectId: review.orderId });
    }

    return {
      kind: 'updated',
      reviewId: review.id,
      status: 'rejected',
      orderId: review.orderId,
      paymentSessionId: review.paymentSessionId,
      orderStatus: this.orderStatuses.get(review.orderId) ?? 'awaiting_payment',
      paymentSessionStatus: this.paymentSessionStatuses.get(review.paymentSessionId) ?? 'awaiting_payment',
      rejectionScope: scope,
      reason: input.reason
    };
  }
}

class CapturingWebhookHttpClient implements WebhookHttpClient {
  public readonly requests: Array<{ url: string; headers: Record<string, string>; body: string; timeoutMs: number }> = [];

  public constructor(private readonly responses: Array<{ status: number; body?: string } | Error>) {}

  public async postJson(params: { url: string; headers: Record<string, string>; body: string; timeoutMs: number }) {
    this.requests.push(params);
    const response = this.responses.shift() ?? { status: 200 };
    if (response instanceof Error) {
      throw response;
    }

    return response;
  }
}
