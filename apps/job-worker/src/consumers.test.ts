import { describe, expect, it } from 'vitest';
import { EventTypes, isKnownEventType } from '@swimpay/events';

import { JOB_WORKER_CONSUMERS, createJobWorkerConsumers } from './consumers.js';

describe('job worker durable consumers', () => {
  it('registers the expected job runtime stub consumers', () => {
    expect(JOB_WORKER_CONSUMERS.map((consumer) => consumer.eventType)).toEqual([
      EventTypes.REVIEW_CONFIRMED,
      EventTypes.REVIEW_REJECTED,
      EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      EventTypes.ORDER_EXPIRED,
      EventTypes.PAYMENT_SESSION_EXPIRED
    ]);
  });

  it('does not subscribe public delivery workers to pre-manual review events', () => {
    expect(JOB_WORKER_CONSUMERS.map((consumer) => consumer.eventType)).not.toContain(EventTypes.REVIEW_CREATED);
    expect(JOB_WORKER_CONSUMERS.map((consumer) => consumer.eventType)).not.toContain(EventTypes.DECISION_NEEDS_REVIEW);
  });

  it('uses only known event names and stable durable names', () => {
    const consumers = createJobWorkerConsumers('local');

    for (const consumer of consumers) {
      expect(isKnownEventType(consumer.eventType)).toBe(true);
      expect(consumer.durableName).toMatch(/^local_swimpay_job_worker_/);
      expect(consumer.maxDeliver).toBe(5);
    }
  });
});
