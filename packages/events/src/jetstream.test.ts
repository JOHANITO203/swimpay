import { describe, expect, it, vi } from 'vitest';

import {
  EventTypes,
  buildConsumerOptions,
  buildSwimPayStreamConfig,
  createDurableConsumerDefinition,
  isKnownEventType,
  parseNatsRuntimeConfig,
  processJetStreamMessage,
  validateInternalEventEnvelope
} from './index.js';

describe('nats jetstream foundations', () => {
  it('validates the internal event envelope without accepting raw PII marker fields', () => {
    expect(
      validateInternalEventEnvelope({
        id: 'evt_01',
        type: EventTypes.SIGNAL_RECEIVED,
        created_at: '2026-05-02T12:00:00.000Z',
        source: 'swimpay-api',
        data: {
          signal_id: 'sig_01',
          sender_phone_masked: '+7 *** *** **67'
        },
        metadata: {
          correlation_id: 'corr_01'
        }
      })
    ).toEqual({ valid: true });

    expect(
      validateInternalEventEnvelope({
        id: 'evt_02',
        type: EventTypes.SIGNAL_RECEIVED,
        created_at: '2026-05-02T12:00:00.000Z',
        source: 'swimpay-api',
        data: {
          raw_notification_text: 'raw bank text'
        }
      })
    ).toEqual({
      valid: false,
      reason: 'raw_pii_field_present'
    });
  });

  it('parses NATS config from env with safe defaults', () => {
    const config = parseNatsRuntimeConfig({
      NATS_URL: 'nats://nats:4222',
      NATS_STREAM_NAME: 'SWIMPAY_EVENTS',
      NATS_DURABLE_PREFIX: 'local',
      NATS_CONNECT_TIMEOUT_MS: '2500'
    });

    expect(config).toEqual({
      url: 'nats://nats:4222',
      streamName: 'SWIMPAY_EVENTS',
      durablePrefix: 'local',
      connectTimeoutMs: 2500
    });
  });

  it('defines the SwimPay stream over known catalog subjects only', () => {
    const stream = buildSwimPayStreamConfig('SWIMPAY_EVENTS');

    expect(stream).toMatchObject({
      name: 'SWIMPAY_EVENTS',
      subjects: [
        'order.*',
        'payment_session.*',
        'receiver.*',
        'signal.*',
        'template.*',
        'match.*',
        'decision.*',
        'review.*',
        'webhook.*'
      ],
      retention: 'limits',
      storage: 'file'
    });
  });

  it('creates durable consumer definitions only for known event names', () => {
    const definition = createDurableConsumerDefinition({
      serviceName: 'swimpay-signal-worker',
      durablePrefix: 'local',
      eventType: EventTypes.SIGNAL_RECEIVED,
      maxDeliver: 5
    });

    expect(definition).toEqual({
      serviceName: 'swimpay-signal-worker',
      durableName: 'local_swimpay_signal_worker_signal_received',
      subject: EventTypes.SIGNAL_RECEIVED,
      eventType: EventTypes.SIGNAL_RECEIVED,
      maxDeliver: 5,
      ackWaitMs: 30_000
    });
    expect(() =>
      createDurableConsumerDefinition({
        serviceName: 'swimpay-signal-worker',
        durablePrefix: 'local',
        eventType: 'unknown.event',
        maxDeliver: 5
      })
    ).toThrow('Unknown SwimPay event type');
  });

  it('builds explicit ack consumer options', () => {
    const definition = createDurableConsumerDefinition({
      serviceName: 'swimpay-job-worker',
      durablePrefix: 'local',
      eventType: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      maxDeliver: 4
    });

    expect(buildConsumerOptions(definition)).toEqual({
      durableName: 'local_swimpay_job_worker_webhook_delivery_requested',
      subject: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      ackPolicy: 'explicit',
      ackWaitMs: 30_000,
      maxDeliver: 4
    });
  });

  it('acks wrapped handler results on success', async () => {
    const ack = vi.fn();
    const nack = vi.fn();
    const term = vi.fn();

    await processJetStreamMessage({
      message: buildMessage({ ack, nack, term }),
      expectedEventType: EventTypes.SIGNAL_RECEIVED,
      handler: async () => ({ kind: 'ok' })
    });

    expect(ack).toHaveBeenCalledOnce();
    expect(nack).not.toHaveBeenCalled();
    expect(term).not.toHaveBeenCalled();
  });

  it('nacks and rethrows handler errors instead of swallowing them', async () => {
    const ack = vi.fn();
    const nack = vi.fn();
    const term = vi.fn();

    await expect(
      processJetStreamMessage({
        message: buildMessage({ ack, nack, term }),
        expectedEventType: EventTypes.SIGNAL_RECEIVED,
        handler: async () => {
          throw new Error('handler failed');
        }
      })
    ).rejects.toThrow('handler failed');

    expect(ack).not.toHaveBeenCalled();
    expect(nack).toHaveBeenCalledOnce();
    expect(term).not.toHaveBeenCalled();
  });

  it('terms malformed or unexpected event messages', async () => {
    const malformedTerm = vi.fn();
    await expect(
      processJetStreamMessage({
        message: buildMessage({
          data: Buffer.from('{'),
          ack: vi.fn(),
          nack: vi.fn(),
          term: malformedTerm
        }),
        expectedEventType: EventTypes.SIGNAL_RECEIVED,
        handler: async () => ({ kind: 'ok' })
      })
    ).rejects.toThrow('Invalid JetStream event payload');
    expect(malformedTerm).toHaveBeenCalledOnce();

    const unexpectedTerm = vi.fn();
    await expect(
      processJetStreamMessage({
        message: buildMessage({
          envelope: {
            id: 'evt_01',
            type: EventTypes.ORDER_CREATED,
            created_at: '2026-05-02T12:00:00.000Z',
            source: 'swimpay-api',
            data: {}
          },
          ack: vi.fn(),
          nack: vi.fn(),
          term: unexpectedTerm
        }),
        expectedEventType: EventTypes.SIGNAL_RECEIVED,
        handler: async () => ({ kind: 'ok' })
      })
    ).rejects.toThrow('Unexpected event type');
    expect(unexpectedTerm).toHaveBeenCalledOnce();
  });

  it('keeps consumer subjects aligned with the event catalog', () => {
    for (const eventType of Object.values(EventTypes)) {
      expect(isKnownEventType(eventType)).toBe(true);
    }
  });
});

function buildMessage(params: {
  envelope?: Record<string, unknown>;
  data?: Uint8Array;
  ack: () => void;
  nack: () => void;
  term: () => void;
}) {
  const envelope =
    params.envelope ??
    ({
      id: 'evt_01',
      type: EventTypes.SIGNAL_RECEIVED,
      created_at: '2026-05-02T12:00:00.000Z',
      source: 'swimpay-api',
      data: {}
    } satisfies Record<string, unknown>);

  return {
    data: params.data ?? Buffer.from(JSON.stringify(envelope)),
    ack: params.ack,
    nak: params.nack,
    term: params.term
  };
}
