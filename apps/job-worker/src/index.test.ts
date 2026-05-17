import { EventTypes, createDurableConsumerDefinition, type InternalEventEnvelope } from '@swimpay/events';
import { describe, expect, it } from 'vitest';
import { createJobWorkerHandler } from './index.js';
import type { PublicWebhookEvent } from './webhooks.js';

describe('job worker runtime wiring', () => {
  it('routes payment session expiry consumers to payment.expired public webhook enqueueing', async () => {
    const processor = new FakeWebhookRuntimeProcessor();
    const handler = createJobWorkerHandler(
      createDurableConsumerDefinition({
        serviceName: 'swimpay-job-worker',
        durablePrefix: 'test',
        eventType: EventTypes.PAYMENT_SESSION_EXPIRED
      }),
      processor
    );

    await handler(expiredEvent());

    expect(processor.events).toHaveLength(1);
    expect(processor.events[0]).toMatchObject({
      id: 'evt_expired_01',
      type: 'payment.expired',
      merchant_id: 'mch_01',
      data: {
        order_id: 'ord_01',
        external_id: 'ORDER_01',
        payment_session_id: 'ps_01',
        amount_minor: 13700,
        currency: 'RUB',
        status: 'expired',
        decision: 'expired',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }
    });
  });
});

function expiredEvent(): InternalEventEnvelope {
  return {
    id: 'evt_expired_01',
    type: EventTypes.PAYMENT_SESSION_EXPIRED,
    created_at: '2026-05-02T10:00:00.000Z',
    source: 'swimpay-api',
    data: {
      merchant_id: 'mch_01',
      order_id: 'ord_01',
      external_id: 'ORDER_01',
      payment_session_id: 'ps_01',
      amount_minor: 13700,
      currency: 'RUB'
    }
  };
}

class FakeWebhookRuntimeProcessor {
  public readonly events: PublicWebhookEvent[] = [];

  public async enqueueEvent(event: PublicWebhookEvent): Promise<{ created: number; skippedDuplicates: number }> {
    this.events.push(event);
    return { created: 1, skippedDuplicates: 0 };
  }

  public async processDeliveryById(): Promise<void> {}

  public async processEventDeliveries(): Promise<void> {}

  public async processDueDeliveries(): Promise<void> {}
}
