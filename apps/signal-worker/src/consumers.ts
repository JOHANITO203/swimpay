import { EventTypes, createDurableConsumerDefinition, type DurableConsumerDefinition } from '@swimpay/events';

const SIGNAL_WORKER_EVENT_TYPES = [
  EventTypes.SIGNAL_RECEIVED,
  EventTypes.SIGNAL_VERIFIED,
  EventTypes.SIGNAL_PARSED,
  EventTypes.MATCH_SCORED
] as const;

export const SIGNAL_WORKER_CONSUMERS: readonly DurableConsumerDefinition[] = createSignalWorkerConsumers('swimpay');

export function createSignalWorkerConsumers(durablePrefix: string): DurableConsumerDefinition[] {
  return SIGNAL_WORKER_EVENT_TYPES.map((eventType) =>
    createDurableConsumerDefinition({
      serviceName: 'swimpay-signal-worker',
      durablePrefix,
      eventType,
      maxDeliver: 5
    })
  );
}
