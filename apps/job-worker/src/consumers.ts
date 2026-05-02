import { EventTypes, createDurableConsumerDefinition, type DurableConsumerDefinition } from '@swimpay/events';

const JOB_WORKER_EVENT_TYPES = [
  EventTypes.WEBHOOK_DELIVERY_REQUESTED,
  EventTypes.ORDER_EXPIRED,
  EventTypes.PAYMENT_SESSION_EXPIRED
] as const;

export const JOB_WORKER_CONSUMERS: readonly DurableConsumerDefinition[] = createJobWorkerConsumers('swimpay');

export function createJobWorkerConsumers(durablePrefix: string): DurableConsumerDefinition[] {
  return JOB_WORKER_EVENT_TYPES.map((eventType) =>
    createDurableConsumerDefinition({
      serviceName: 'swimpay-job-worker',
      durablePrefix,
      eventType,
      maxDeliver: 5
    })
  );
}
