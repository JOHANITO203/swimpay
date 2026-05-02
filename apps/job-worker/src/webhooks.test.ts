import { describe, expect, it } from 'vitest';
import {
  buildWebhookHeaders,
  createPaymentWebhookEvent,
  InMemoryWebhookRepository,
  signWebhookPayload,
  verifyWebhookSignature,
  WebhookDeliveryWorker,
  type WebhookEndpoint,
  type WebhookHttpClient
} from './webhooks.js';

describe('webhook worker foundation', () => {
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

  it('signs payloads with required SwimPay headers', () => {
    const payload = JSON.stringify({ id: 'evt_01', type: 'payment.needs_review' });
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
        timestamp,
        signature
      })
    ).toEqual({
      'Content-Type': 'application/json',
      'SwimPay-Event-Id': 'evt_01',
      'SwimPay-Timestamp': timestamp,
      'SwimPay-Signature': signature
    });
    expect(verifyWebhookSignature({ secret: 'whsec_test', timestamp, payload, signature })).toBe(true);
    expect(verifyWebhookSignature({ secret: 'whsec_test', timestamp, payload: '{"tampered":true}', signature })).toBe(false);
  });

  it('prevents duplicate endpoint/event deliveries and delivers signed webhooks', async () => {
    const repository = new InMemoryWebhookRepository({
      deliveryId: () => 'del_01'
    });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new FakeWebhookHttpClient([{ status: 200 }]);
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_01',
      type: 'payment.needs_review',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        reason_codes: ['amount_collision']
      }
    });

    const first = await worker.enqueueEvent(event);
    const duplicate = await worker.enqueueEvent(event);
    const delivered = await worker.deliverDue('2026-05-02T10:01:00.000Z');

    expect(first).toEqual({ created: 1, skippedDuplicates: 0 });
    expect(duplicate).toEqual({ created: 0, skippedDuplicates: 1 });
    expect(delivered).toEqual({ delivered: 1, retrying: 0, failed: 0 });
    expect(repository.deliveries).toHaveLength(1);
    expect(repository.deliveries[0]?.status).toBe('delivered');
    expect(httpClient.requests[0]).toMatchObject({
      url: 'https://merchant.example/swimpay',
      headers: {
        'SwimPay-Event-Id': 'evt_01'
      }
    });
    expect(httpClient.requests[0]?.body).toContain('"official_bank_confirmation":false');
  });

  it('schedules retries and marks failed after retry budget is exhausted', async () => {
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
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_retry',
      type: 'payment.needs_review',
      createdAt: '2026-05-02T10:00:00.000Z',
      merchantId: 'mch_01',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        reason_codes: ['requires_review']
      }
    });

    await worker.enqueueEvent(event);
    await worker.deliverDue('2026-05-02T10:00:00.000Z');

    expect(repository.deliveries[0]).toMatchObject({
      status: 'retrying',
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
      status: 'failed',
      attemptCount: 7
    });
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
  });
});

function activeEndpoint(): WebhookEndpoint {
  return {
    id: 'we_01',
    merchantId: 'mch_01',
    url: 'https://merchant.example/swimpay',
    secret: 'whsec_test',
    enabledEvents: ['payment.confirmed', 'payment.needs_review', 'payment.rejected'],
    status: 'active'
  };
}

class FakeWebhookHttpClient implements WebhookHttpClient {
  public readonly requests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

  public constructor(private readonly responses: Array<{ status: number; body?: string }>) {}

  public async postJson(params: { url: string; headers: Record<string, string>; body: string }) {
    this.requests.push(params);
    return this.responses.shift() ?? { status: 200 };
  }
}
