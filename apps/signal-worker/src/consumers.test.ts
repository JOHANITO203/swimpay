import { describe, expect, it } from 'vitest';
import { EventTypes, isKnownEventType } from '@swimpay/events';

import { SIGNAL_WORKER_CONSUMERS, createSignalWorkerConsumers } from './consumers.js';

describe('signal worker durable consumers', () => {
  it('registers the expected signal runtime stub consumers', () => {
    expect(SIGNAL_WORKER_CONSUMERS.map((consumer) => consumer.eventType)).toEqual([
      EventTypes.SIGNAL_RECEIVED,
      EventTypes.SIGNAL_VERIFIED,
      EventTypes.SIGNAL_PARSED,
      EventTypes.MATCH_SCORED
    ]);
  });

  it('uses only known event names and stable durable names', () => {
    const consumers = createSignalWorkerConsumers('local');

    for (const consumer of consumers) {
      expect(isKnownEventType(consumer.eventType)).toBe(true);
      expect(consumer.durableName).toMatch(/^local_swimpay_signal_worker_/);
      expect(consumer.maxDeliver).toBe(5);
    }
  });
});
