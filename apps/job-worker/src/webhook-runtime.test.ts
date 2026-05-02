import { EventTypes, type InternalEventEnvelope } from '@swimpay/events';
import { describe, expect, it } from 'vitest';
import {
  createWebhookDeliveryRequestedHandler,
  parseWebhookWorkerConfig,
  WebhookPollingLoop,
  type WebhookDeliveryProcessor
} from './webhook-runtime.js';

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
