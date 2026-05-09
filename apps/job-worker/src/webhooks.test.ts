import { describe, expect, it } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import {
  buildWebhookHeaders,
  createPaymentWebhookEvent,
  InMemoryWebhookRepository,
  retryDelayForAttempt,
  signWebhookPayload,
  verifyWebhookSignature,
  WebhookDeliveryWorker,
  WEBHOOK_DELIVERY_STATUSES,
  type WebhookEndpoint,
  type WebhookHttpClient
} from './webhooks.js';
import { InMemoryWorkerIdempotencyLedger } from './idempotency-ledger.js';

describe('webhook worker foundation', () => {
  it('defines explicit durable delivery statuses and retry schedule', () => {
    expect(WEBHOOK_DELIVERY_STATUSES).toEqual({
      PENDING: 'pending',
      DELIVERING: 'delivering',
      DELIVERED: 'delivered',
      FAILED: 'failed',
      DEAD: 'dead',
      CANCELLED: 'cancelled'
    });
    expect(retryDelayForAttempt(1)).toBe(0);
    expect(retryDelayForAttempt(2)).toBe(60_000);
    expect(retryDelayForAttempt(3)).toBe(5 * 60_000);
    expect(retryDelayForAttempt(7)).toBe(24 * 60 * 60_000);
    expect(retryDelayForAttempt(8)).toBeUndefined();
  });

  it('creates payment events with required notification-signal disclosure', () => {
    const event = createPaymentWebhookEvent({
      eventId: 'evt_01',
      type: 'payment.confirmed',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        decision: 'manual_confirmed',
        confidence_score: 100,
        reasons: ['manual_review_confirmed']
      }
    });

    expect(event).toEqual({
      id: 'evt_01',
      type: 'payment.confirmed',
      created_at: '2026-05-02T10:00:00.000Z',
      merchant_id: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        decision: 'manual_confirmed',
        confidence_score: 100,
        reasons: ['manual_review_confirmed'],
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }
    });
  });

  it('rejects internal signal and review events from the public webhook contract', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_internal'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([{ status: 200 }]);
    const worker = new WebhookDeliveryWorker({ repository, httpClient });

    for (const type of ['payment.signal_detected', 'payment.needs_review', 'order.expired'] as const) {
      const event = {
        id: `evt_${type.replace(/[._]/g, '_')}`,
        type,
        created_at: '2026-05-02T10:00:00.000Z',
        merchant_id: 'mch_01',
        data: {
          order_id: 'ord_01',
          payment_session_id: 'ps_01',
          confirmation_type: 'notification_signal',
          official_bank_confirmation: false
        }
      };

      await expect(worker.enqueueEvent(event as never)).rejects.toThrow('Unsupported public webhook event type.');
    }

    expect(repository.deliveries).toHaveLength(0);
    expect(httpClient.requests).toHaveLength(0);
  });

  it('does not allow endpoints to subscribe to internal fulfillment event names', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_confirmed'
    });
    repository.endpoints.push({
      ...activeEndpoint(),
      enabledEvents: ['payment.signal_detected', 'payment.needs_review', 'order.expired']
    } as unknown as WebhookEndpoint);
    const worker = new WebhookDeliveryWorker({
      repository,
      httpClient: new FakeWebhookHttpClient([{ status: 200 }])
    });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_confirmed',
      type: 'payment.confirmed',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        decision: 'manual_confirmed'
      }
    });

    await expect(repository.listActiveEndpoints('mch_01', 'payment.signal_detected' as never)).resolves.toEqual([]);
    await expect(repository.listActiveEndpoints('mch_01', 'payment.needs_review' as never)).resolves.toEqual([]);
    await expect(repository.listActiveEndpoints('mch_01', 'order.expired' as never)).resolves.toEqual([]);
    await expect(worker.enqueueEvent(event)).resolves.toEqual({ created: 0, skippedDuplicates: 0 });
    expect(repository.deliveries).toHaveLength(0);
  });

  it('signs payloads with required SwimPay headers', () => {
    const payload = JSON.stringify({ id: 'evt_01', type: 'payment.confirmed' });
    const timestamp = '2026-05-02T10:00:00.000Z';
    const signature = signWebhookPayload({
      secret: 'whsec_test',
      timestamp,
      payload
    });

    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(
      buildWebhookHeaders({
        eventId: 'evt_01',
        deliveryId: 'del_01',
        timestamp,
        signature
      })
    ).toEqual({
      'Content-Type': 'application/json',
      'SwimPay-Event-Id': 'evt_01',
      'SwimPay-Delivery-Id': 'del_01',
      'SwimPay-Timestamp': timestamp,
      'SwimPay-Signature': signature
    });
    expect(verifyWebhookSignature({ secret: 'whsec_test', timestamp, payload, signature })).toBe(true);
    expect(verifyWebhookSignature({ secret: 'whsec_test', timestamp, payload: '{"tampered":true}', signature })).toBe(false);
  });

  it('prevents duplicate endpoint/event deliveries, claims once, and delivers signed webhooks', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_01'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([{ status: 200 }]);
    const metrics = new InMemoryMetricsRegistry();
    const worker = new WebhookDeliveryWorker({ repository, httpClient, metrics });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_01',
      type: 'payment.confirmed',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        decision: 'manual_confirmed'
      }
    });

    const first = await worker.enqueueEvent(event);
    const duplicate = await worker.enqueueEvent(event);
    const firstClaim = await repository.claimDueDeliveries('2026-05-02T10:01:00.000Z', 10);
    const secondClaim = await repository.claimDueDeliveries('2026-05-02T10:01:00.000Z', 10);
    const delivered = await worker.deliverClaimed(firstClaim, '2026-05-02T10:01:00.000Z');

    expect(first).toEqual({ created: 1, skippedDuplicates: 0 });
    expect(duplicate).toEqual({ created: 0, skippedDuplicates: 1 });
    expect(firstClaim.map((delivery) => delivery.id)).toEqual(['del_01']);
    expect(secondClaim).toEqual([]);
    expect(delivered).toEqual({ delivered: 1, retrying: 0, failed: 0 });
    expect(repository.deliveries).toHaveLength(1);
    expect(repository.deliveries[0]?.status).toBe('delivered');
    expect(httpClient.requests[0]).toMatchObject({
      url: 'https://merchant.example/swimpay',
      headers: {
        'SwimPay-Event-Id': 'evt_01',
        'SwimPay-Delivery-Id': 'del_01'
      }
    });
    expect(httpClient.requests[0]?.body).toContain('"official_bank_confirmation":false');
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('webhook.delivery_attempted');
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('webhook.delivered');
    expect(metrics.counterValue(MetricNames.WEBHOOK_DELIVERY_ATTEMPTS_TOTAL)).toBe(1);
    expect(metrics.counterValue(MetricNames.WEBHOOK_DELIVERIES_DELIVERED_TOTAL)).toBe(1);
  });

  it('schedules bounded retries as failed and marks dead after retry budget is exhausted', async () => {
    let deliveryCounter = 0;
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => `del_${++deliveryCounter}`
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([
      { status: 500, body: 'server error' },
      { status: 503, body: 'still down' },
      { status: 504 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 }
    ]);
    const metrics = new InMemoryMetricsRegistry();
    const worker = new WebhookDeliveryWorker({ repository, httpClient, metrics });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_retry',
      type: 'payment.rejected',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        reason_codes: ['manual_review_rejected']
      }
    });

    await worker.enqueueEvent(event);
    await worker.deliverDue('2026-05-02T10:00:00.000Z');

    expect(repository.deliveries[0]).toMatchObject({
      status: 'failed',
      attemptCount: 1,
      nextRetryAt: '2026-05-02T10:01:00.000Z',
      lastError: 'HTTP 500: server error'
    });

    await worker.deliverDue('2026-05-02T10:01:00.000Z');
    await worker.deliverDue('2026-05-02T10:06:00.000Z');
    await worker.deliverDue('2026-05-02T10:21:00.000Z');
    await worker.deliverDue('2026-05-02T11:21:00.000Z');
    await worker.deliverDue('2026-05-02T17:21:00.000Z');
    await worker.deliverDue('2026-05-03T17:21:00.000Z');

    expect(repository.deliveries[0]).toMatchObject({
      status: 'dead',
      attemptCount: 7
    });
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('webhook.dead');
    expect(metrics.counterValue(MetricNames.WEBHOOK_DELIVERIES_FAILED_TOTAL)).toBe(6);
    expect(metrics.counterValue(MetricNames.WEBHOOK_DELIVERIES_DEAD_TOTAL)).toBe(1);
  });

  it('reclaims stale delivering rows so worker crashes do not strand retryable deliveries', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_stale_retry'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([{ status: 200 }]);
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_stale_retry',
      type: 'payment.confirmed',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        decision: 'manual_confirmed'
      }
    });

    await worker.enqueueEvent(event);
    const claimedBeforeCrash = await repository.claimDueDeliveries('2026-05-02T10:00:00.000Z', 10);

    expect(claimedBeforeCrash.map((delivery) => delivery.id)).toEqual(['del_stale_retry']);
    expect(repository.deliveries[0]).toMatchObject({
      status: 'delivering',
      attemptCount: 0,
      updatedAt: '2026-05-02T10:00:00.000Z'
    });

    const recovered = await worker.deliverDue('2026-05-02T10:10:00.000Z');

    expect(recovered).toEqual({ delivered: 1, retrying: 0, failed: 0 });
    expect(httpClient.requests).toHaveLength(1);
    expect(repository.deliveries[0]).toMatchObject({
      status: 'delivered',
      attemptCount: 2,
      deliveredAt: '2026-05-02T10:10:00.000Z'
    });
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual([
      'webhook.delivery_requested',
      'webhook.failed',
      'webhook.delivery_attempted',
      'webhook.delivered'
    ]);
  });

  it('uses the worker idempotency ledger to skip duplicate delivery side effects for the same attempt', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_once'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([{ status: 200 }, { status: 200 }]);
    const worker = new WebhookDeliveryWorker({
      repository,
      httpClient,
      idempotencyLedger: new InMemoryWorkerIdempotencyLedger()
    });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_once',
      type: 'payment.confirmed',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        decision: 'manual_confirmed'
      }
    });

    await worker.enqueueEvent(event);
    const [delivery] = await repository.claimDueDeliveries('2026-05-02T10:00:00.000Z', 10);
    const result = await worker.deliverClaimed([delivery!, delivery!], '2026-05-02T10:00:00.000Z');

    expect(result).toEqual({ delivered: 1, retrying: 0, failed: 0 });
    expect(httpClient.requests).toHaveLength(1);
    expect(repository.auditEvents.filter((item) => item.eventType === 'webhook.delivery_attempted')).toHaveLength(1);
  });

  it('marks stale delivering rows dead when the recovered attempt exhausts retries', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_stale_dead'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([{ status: 200 }]);
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_stale_dead',
      type: 'payment.rejected',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        reason_codes: ['manual_review_rejected']
      }
    });

    await worker.enqueueEvent(event);
    await repository.claimDueDeliveries('2026-05-02T10:00:00.000Z', 10);
    repository.deliveries[0]!.attemptCount = 6;
    repository.deliveries[0]!.maxAttempts = 7;

    const recovered = await worker.deliverDue('2026-05-02T10:10:00.000Z');

    expect(recovered).toEqual({ delivered: 0, retrying: 0, failed: 0 });
    expect(httpClient.requests).toHaveLength(0);
    expect(repository.deliveries[0]).toMatchObject({
      status: 'dead',
      attemptCount: 7,
      nextRetryAt: undefined,
      lastError: 'stale_delivery_recovered_after_worker_crash'
    });
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('webhook.dead');
  });

  it('records network errors as sanitized retryable failures', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_network'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([new Error('connect ECONNREFUSED secret=raw')]);
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_network',
      type: 'payment.expired',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        reason_codes: ['payment_session_expired']
      }
    });

    await worker.enqueueEvent(event);
    await worker.deliverDue('2026-05-02T10:00:00.000Z');

    expect(repository.deliveries[0]).toMatchObject({
      status: 'failed',
      attemptCount: 1,
      lastError: 'Network error: Error'
    });
  });

  it('rejects webhook payloads that include raw PII field markers', () => {
    expect(() =>
      createPaymentWebhookEvent({
        eventId: 'evt_raw',
        type: 'payment.rejected',
        createdAt: '2026-05-02T10:00:00.000Z',
        merchantId: 'mch_01',
        data: {
          order_id: 'ord_01',
          raw_notification_text: 'raw bank text'
        }
      })
    ).toThrow('Webhook event data must not contain raw PII fields.');
    expect(() =>
      createPaymentWebhookEvent({
        eventId: 'evt_raw_card',
        type: 'payment.rejected',
        createdAt: '2026-05-02T10:00:00.000Z',
        merchantId: 'mch_01',
        data: {
          order_id: 'ord_01',
          receiver_card: '2202201234567890'
        }
      })
    ).toThrow('Webhook event data must not contain raw PII fields.');
    for (const field of ['pan', 'cardPan', 'full_card', 'cvv', 'expiry', 'pin', 'sms_code'] as const) {
      expect(() =>
        createPaymentWebhookEvent({
          eventId: `evt_${field}`,
          type: 'payment.rejected',
          createdAt: '2026-05-02T10:00:00.000Z',
          merchantId: 'mch_01',
          data: {
            order_id: 'ord_01',
            [field]: field === 'sms_code' ? '111111' : '2202201234567890'
          }
        })
      ).toThrow('Webhook event data must not contain raw PII fields.');
    }
  });

  it('replays a delivery with the original event id and a new delivery id', async () => {
    let deliveryCounter = 0;
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => `del_${++deliveryCounter}`
    });
    repository.endpoints.push(activeEndpoint());
    const worker = new WebhookDeliveryWorker({
      repository,
      httpClient: new FakeWebhookHttpClient([{ status: 200 }])
    });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_replay',
      type: 'payment.rejected',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        reason_codes: ['negative_direction']
      }
    });

    await worker.enqueueEvent(event);
    const replay = await worker.replayDelivery('del_1', '2026-05-02T10:05:00.000Z');

    expect(replay).toEqual({ kind: 'created', deliveryId: 'del_2' });
    expect(repository.deliveries).toHaveLength(2);
    expect(repository.deliveries[1]).toMatchObject({
      id: 'del_2',
      eventId: 'evt_replay',
      status: 'pending',
      attemptCount: 0
    });
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('webhook.replayed');
  });
});

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

  public constructor(private readonly responses: Array<{ status: number; body?: string } | Error>) {}

  public async postJson(params: { url: string; headers: Record<string, string>; body: string }) {
    this.requests.push(params);
    const response = this.responses.shift() ?? { status: 200 };
    if (response instanceof Error) {
      throw response;
    }

    return response;
  }
}
