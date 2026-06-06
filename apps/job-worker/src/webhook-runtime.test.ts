import { EventTypes, type InternalEventEnvelope } from '@swimpay/events';
import { describe, expect, it } from 'vitest';
import {
  createCurrencyMismatchWebhookHandler,
  createPaymentExpiredWebhookHandler,
  createReviewFinalWebhookHandler,
  createWebhookDeliveryRequestedHandler,
  parseWebhookWorkerConfig,
  WebhookPollingLoop,
  type PublicWebhookEnqueuer,
  type WebhookDeliveryProcessor
} from './webhook-runtime.js';
import {
  InMemoryWebhookRepository,
  WebhookDeliveryWorker,
  type PublicWebhookEvent,
  type WebhookEndpoint,
  type WebhookHttpClient
} from './webhooks.js';

describe('webhook runtime integration', () => {
  it('parses webhook worker config with safe defaults and env overrides', () => {
    expect(parseWebhookWorkerConfig({})).toEqual({
      enabled: false,
      pollIntervalMs: 30_000,
      batchSize: 10,
      maxAttempts: 7,
      requestTimeoutMs: 5_000,
      retryBaseDelayMs: 60_000,
      retryMaxDelayMs: 24 * 60 * 60_000
    });
    expect(
      parseWebhookWorkerConfig({
        WEBHOOK_WORKER_ENABLED: 'true',
        WEBHOOK_POLL_INTERVAL_MS: '15000',
        WEBHOOK_WORKER_BATCH_SIZE: '5',
        WEBHOOK_MAX_ATTEMPTS: '6',
        WEBHOOK_REQUEST_TIMEOUT_MS: '3000'
      })
    ).toMatchObject({
      enabled: true,
      pollIntervalMs: 15_000,
      batchSize: 5,
      maxAttempts: 6,
      requestTimeoutMs: 3_000
    });
  });

  it('webhook.delivery_requested handler invokes the delivery processor by delivery id', async () => {
    const processor = new FakeWebhookDeliveryProcessor();
    const handler = createWebhookDeliveryRequestedHandler(processor, () => '2026-05-02T10:00:00.000Z');

    await handler(
      deliveryRequestedEvent({
        delivery_id: 'del_01',
        event_id: 'evt_public_01'
      })
    );

    expect(processor.calls).toEqual([
      {
        kind: 'delivery',
        deliveryId: 'del_01',
        now: '2026-05-02T10:00:00.000Z'
      }
    ]);
  });

  it('webhook.delivery_requested handler can invoke the processor by event id', async () => {
    const processor = new FakeWebhookDeliveryProcessor();
    const handler = createWebhookDeliveryRequestedHandler(processor, () => '2026-05-02T10:00:00.000Z');

    await handler(
      deliveryRequestedEvent({
        event_id: 'evt_public_01'
      })
    );

    expect(processor.calls).toEqual([
      {
        kind: 'event',
        eventId: 'evt_public_01',
        now: '2026-05-02T10:00:00.000Z'
      }
    ]);
  });

  it('webhook.delivery_requested handler rejects invalid event data', async () => {
    const handler = createWebhookDeliveryRequestedHandler(new FakeWebhookDeliveryProcessor(), () => '2026-05-02T10:00:00.000Z');

    await expect(handler(deliveryRequestedEvent({}))).rejects.toThrow('webhook.delivery_requested requires delivery_id or event_id.');
  });

  it('review.confirmed handler enqueues a final payment.confirmed webhook delivery after manual decision', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createReviewFinalWebhookHandler(enqueuer);

    await handler(
      reviewEvent(EventTypes.REVIEW_CONFIRMED, {
        merchant_id: 'mch_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      })
    );

    expect(enqueuer.events).toEqual([
      {
        id: 'evt_review_01',
        type: 'payment.confirmed',
        created_at: '2026-05-02T10:00:00.000Z',
        merchant_id: 'mch_01',
        data: {
          review_id: 'rev_01',
          order_id: 'ord_01',
          external_id: 'ORDER_01',
          payment_session_id: 'ps_01',
          amount_minor: 13700,
          currency: 'RUB',
          status: 'confirmed',
          decision: 'manual_confirmed',
          confirmation_type: 'notification_signal',
          official_bank_confirmation: false
        }
      }
    ]);
  });

  it('review.confirmed handler threads currency_detection and receiving_route blocks into payload additively', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createReviewFinalWebhookHandler(enqueuer);

    await handler(
      reviewEvent(EventTypes.REVIEW_CONFIRMED, {
        merchant_id: 'mch_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false,
        currency_detection: {
          source: 'display_price_parsed',
          raw_input: '€9.99',
          original_currency: 'EUR',
          original_amount_minor: 999,
          fx_rate: '1.0852',
          fx_rate_timestamp: '2026-06-05T10:00:00Z'
        },
        receiving_route: {
          route_code: 'USD-WISE-MAIN',
          rail_type: 'wallet_transfer',
          bank_profile_id: 'wise_int',
          receiver_identifier_masked: 'j•••@•••.com'
        }
      })
    );

    expect(enqueuer.events).toHaveLength(1);
    const data = enqueuer.events[0]!.data;
    expect(data['currency_detection']).toEqual({
      source: 'display_price_parsed',
      raw_input: '€9.99',
      original_currency: 'EUR',
      original_amount_minor: 999,
      fx_rate: '1.0852',
      fx_rate_timestamp: '2026-06-05T10:00:00Z'
    });
    expect(data['receiving_route']).toEqual({
      route_code: 'USD-WISE-MAIN',
      rail_type: 'wallet_transfer',
      bank_profile_id: 'wise_int',
      receiver_identifier_masked: 'j•••@•••.com'
    });
  });

  it('review.confirmed handler omits currency_detection and receiving_route when absent — backward-compatible', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createReviewFinalWebhookHandler(enqueuer);

    await handler(
      reviewEvent(EventTypes.REVIEW_CONFIRMED, {
        merchant_id: 'mch_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      })
    );

    expect(enqueuer.events).toHaveLength(1);
    const data = enqueuer.events[0]!.data;
    expect('currency_detection' in data).toBe(false);
    expect('receiving_route' in data).toBe(false);
  });

  it('review.confirmed handler creates a public delivery request for active endpoints', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_01'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient();
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const handler = createReviewFinalWebhookHandler(worker);

    await handler(
      reviewEvent(EventTypes.REVIEW_CONFIRMED, {
        merchant_id: 'mch_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      })
    );

    expect(repository.deliveries).toHaveLength(1);
    expect(repository.deliveries[0]).toMatchObject({
      id: 'del_01',
      eventId: 'evt_review_01',
      eventType: 'payment.confirmed',
      status: 'pending'
    });
    expect(repository.deliveries[0]?.payload.data).toMatchObject({
      review_id: 'rev_01',
      order_id: 'ord_01',
      external_id: 'ORDER_01',
      payment_session_id: 'ps_01',
      amount_minor: 13700,
      currency: 'RUB',
      status: 'confirmed',
      decision: 'manual_confirmed',
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual(['webhook.delivery_requested']);
    expect(httpClient.requests).toHaveLength(0);
  });

  it('review.confirmed handler enqueues payment.confirmed for manual bank check after merchant decision', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createReviewFinalWebhookHandler(enqueuer);

    await handler(
      reviewEvent(EventTypes.REVIEW_CONFIRMED, {
        merchant_id: 'mch_01',
        review_id: 'rev_fallback_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        confirmation_type: 'manual_bank_check',
        reason_label: 'NO_NOTIFICATION_MANUAL_FALLBACK_CONFIRMED',
        official_bank_confirmation: false
      }, 'evt_review_fallback_confirmed')
    );

    expect(enqueuer.events).toEqual([
      {
        id: 'evt_review_fallback_confirmed',
        type: 'payment.confirmed',
        created_at: '2026-05-02T10:00:00.000Z',
        merchant_id: 'mch_01',
        data: {
          review_id: 'rev_fallback_01',
          order_id: 'ord_01',
          external_id: 'ORDER_01',
          payment_session_id: 'ps_01',
          amount_minor: 13700,
          currency: 'RUB',
          status: 'confirmed',
          decision: 'manual_confirmed',
          reason_label: 'NO_NOTIFICATION_MANUAL_FALLBACK_CONFIRMED',
          confirmation_type: 'notification_signal',
          official_bank_confirmation: false
        }
      }
    ]);
  });

  it('review.rejected handler enqueues payment.rejected only for terminal manual rejection', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createReviewFinalWebhookHandler(enqueuer);

    await handler(
      reviewEvent(EventTypes.REVIEW_REJECTED, {
        merchant_id: 'mch_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        rejection_scope: 'signal',
        reason: 'false_positive',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }, 'evt_review_signal')
    );
    await handler(
      reviewEvent(EventTypes.REVIEW_REJECTED, {
        merchant_id: 'mch_01',
        review_id: 'rev_02',
        order_id: 'ord_02',
        payment_session_id: 'ps_02',
        rejection_scope: 'order',
        reason: 'merchant_cancelled',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }, 'evt_review_order')
    );

    expect(enqueuer.events).toHaveLength(1);
    expect(enqueuer.events[0]).toMatchObject({
      id: 'evt_review_order',
      type: 'payment.rejected',
      merchant_id: 'mch_01',
      data: {
        review_id: 'rev_02',
        order_id: 'ord_02',
        external_id: 'ORDER_01',
        payment_session_id: 'ps_02',
        amount_minor: 13700,
        currency: 'RUB',
        status: 'rejected',
        decision: 'manual_rejected',
        rejection_scope: 'order',
        reason: 'merchant_cancelled',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }
    });
  });

  it('review.rejected handler emits final payment.rejected for no-notification manual bank check order rejection', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createReviewFinalWebhookHandler(enqueuer);

    await handler(
      reviewEvent(EventTypes.REVIEW_REJECTED, {
        merchant_id: 'mch_01',
        review_id: 'rev_fallback_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        rejection_scope: 'order',
        reason: 'merchant_cancelled',
        reason_label: 'NO_NOTIFICATION_MANUAL_FALLBACK_REJECTED',
        confirmation_type: 'manual_bank_check',
        official_bank_confirmation: false
      }, 'evt_review_fallback_rejected')
    );

    expect(enqueuer.events).toHaveLength(1);
    expect(enqueuer.events[0]).toMatchObject({
      id: 'evt_review_fallback_rejected',
      type: 'payment.rejected',
      data: {
        review_id: 'rev_fallback_01',
        order_id: 'ord_01',
        external_id: 'ORDER_01',
        payment_session_id: 'ps_01',
        amount_minor: 13700,
        currency: 'RUB',
        status: 'rejected',
        decision: 'manual_rejected',
        reason_label: 'NO_NOTIFICATION_MANUAL_FALLBACK_REJECTED',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }
    });
  });

  it('payment_session.expired handler enqueues a terminal payment.expired webhook delivery', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createPaymentExpiredWebhookHandler(enqueuer);

    await handler(
      expiredEvent(EventTypes.PAYMENT_SESSION_EXPIRED, {
        merchant_id: 'mch_01',
        order_id: 'ord_01',
        external_id: 'ORDER_01',
        payment_session_id: 'ps_01',
        amount_minor: 13700,
        currency: 'RUB',
        reason_label: 'PAYMENT_SESSION_EXPIRED'
      })
    );

    expect(enqueuer.events).toEqual([
      {
        id: 'evt_expired_01',
        type: 'payment.expired',
        created_at: '2026-05-02T10:00:00.000Z',
        merchant_id: 'mch_01',
        data: {
          order_id: 'ord_01',
          external_id: 'ORDER_01',
          payment_session_id: 'ps_01',
          amount_minor: 13700,
          currency: 'RUB',
          status: 'expired',
          decision: 'expired',
          reason_label: 'PAYMENT_SESSION_EXPIRED',
          confirmation_type: 'notification_signal',
          official_bank_confirmation: false
        }
      }
    ]);
  });

  it('signal.currency_mismatch handler enqueues a payment.currency_mismatch webhook', async () => {
    const enqueuer = new FakePublicWebhookEnqueuer();
    const handler = createCurrencyMismatchWebhookHandler(enqueuer);
    await handler({
      id: 'evt_cm_1',
      type: EventTypes.SIGNAL_CURRENCY_MISMATCH,
      created_at: '2026-06-06T10:00:00.000Z',
      source: 'signal-worker',
      data: {
        signal_id: 'sig_01',
        merchant_id: 'mch_01',
        order_id: 'ord_01',
        external_id: 'order_888',
        payment_session_id: 'ps_01',
        expected_currency: 'XOF',
        signal_currency: 'RUB',
        signal_amount_minor: 13700,
        expected_amount_minor: 1000,
        matched_on: 'reference'
      }
    });
    expect(enqueuer.events).toHaveLength(1);
    const event = enqueuer.events[0];
    expect(event!.type).toBe('payment.currency_mismatch');
    expect(event!.merchant_id).toBe('mch_01');
    expect(event!.data).toEqual({
      order_id: 'ord_01',
      external_id: 'order_888',
      payment_session_id: 'ps_01',
      expected_currency: 'XOF',
      signal_currency: 'RUB',
      expected_amount_minor: 1000,
      signal_amount_minor: 13700,
      matched_on: 'reference',
      official_bank_confirmation: false
    });
    expect('confirmation_type' in event!.data).toBe(false);
    expect('signal_id' in event!.data).toBe(false);
  });

  it('currency_mismatch handler rejects other event types', async () => {
    const handler = createCurrencyMismatchWebhookHandler(new FakePublicWebhookEnqueuer());
    await expect(
      handler({
        id: 'evt_review_01',
        type: EventTypes.REVIEW_CONFIRMED,
        created_at: '2026-05-02T10:00:00.000Z',
        source: 'swimpay-api',
        data: {}
      })
    ).rejects.toThrow();
  });

  it('polling loop processes pending deliveries only when enabled', async () => {
    const processor = new FakeWebhookDeliveryProcessor();
    const disabled = new WebhookPollingLoop({
      processor,
      config: parseWebhookWorkerConfig({ WEBHOOK_WORKER_ENABLED: 'false' }),
      now: () => '2026-05-02T10:00:00.000Z'
    });
    const enabled = new WebhookPollingLoop({
      processor,
      config: parseWebhookWorkerConfig({ WEBHOOK_WORKER_ENABLED: 'true', WEBHOOK_WORKER_BATCH_SIZE: '3' }),
      now: () => '2026-05-02T10:01:00.000Z'
    });

    await disabled.runOnce();
    await enabled.runOnce();

    expect(processor.calls).toEqual([
      {
        kind: 'due',
        now: '2026-05-02T10:01:00.000Z',
        limit: 3
      }
    ]);
  });
});

function deliveryRequestedEvent(data: Record<string, unknown>): InternalEventEnvelope {
  return {
    id: 'evt_internal_01',
    type: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
    created_at: '2026-05-02T10:00:00.000Z',
    source: 'swimpay-api',
    data
  };
}

function reviewEvent(
  type: typeof EventTypes.REVIEW_CONFIRMED | typeof EventTypes.REVIEW_REJECTED,
  data: Record<string, unknown>,
  id = 'evt_review_01'
): InternalEventEnvelope {
  return {
    id,
    type,
    created_at: '2026-05-02T10:00:00.000Z',
    source: 'swimpay-api',
    data: {
      external_id: 'ORDER_01',
      amount_minor: 13700,
      currency: 'RUB',
      ...data
    }
  };
}

function expiredEvent(
  type: typeof EventTypes.ORDER_EXPIRED | typeof EventTypes.PAYMENT_SESSION_EXPIRED,
  data: Record<string, unknown>,
  id = 'evt_expired_01'
): InternalEventEnvelope {
  return {
    id,
    type,
    created_at: '2026-05-02T10:00:00.000Z',
    source: 'swimpay-api',
    data
  };
}

class FakePublicWebhookEnqueuer implements PublicWebhookEnqueuer {
  public readonly events: PublicWebhookEvent[] = [];

  public async enqueueEvent(event: PublicWebhookEvent): Promise<{ created: number; skippedDuplicates: number }> {
    this.events.push(event);
    return { created: 1, skippedDuplicates: 0 };
  }
}

function activeEndpoint(): WebhookEndpoint {
  return {
    id: 'we_01',
    merchantId: 'mch_01',
    url: 'https://merchant.example/swimpay',
    secret: 'whsec_test',
    enabledEvents: ['payment.confirmed', 'payment.rejected', 'payment.expired'],
    status: 'active'
  };
}

class FakeWebhookHttpClient implements WebhookHttpClient {
  public readonly requests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

  public async postJson(params: { url: string; headers: Record<string, string>; body: string }) {
    this.requests.push(params);
    return { status: 200 };
  }
}

class FakeWebhookDeliveryProcessor implements WebhookDeliveryProcessor {
  public readonly calls: Array<Record<string, unknown>> = [];

  public async processDeliveryById(deliveryId: string, now: string): Promise<void> {
    this.calls.push({ kind: 'delivery', deliveryId, now });
  }

  public async processEventDeliveries(eventId: string, now: string): Promise<void> {
    this.calls.push({ kind: 'event', eventId, now });
  }

  public async processDueDeliveries(now: string, limit: number): Promise<void> {
    this.calls.push({ kind: 'due', now, limit });
  }
}
