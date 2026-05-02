import { describe, expect, it } from 'vitest';
import { EventTypes, type EventEnvelope } from '@swimpay/events';
import { buildApiServer } from './server.js';
import {
  createReceiverSignalSignature,
  type ReceiverSignalDevice,
  type ReceiverSignalRepository,
  type SignalIngestionInput,
  type SignalIngestionResult
} from './signals.js';

const publicKey = 'test-device-verification-key';

function createValidSignal(overrides: Partial<Record<string, unknown>> = {}) {
  const signal = {
    event_id: 'evt_01',
    device_id: 'dev_01',
    merchant_id: 'mch_01',
    bank_profile_id: 'sber_ru',
    package_name: 'ru.sberbankmobile',
    package_cert_sha256: 'cert_sha256_pending',
    notification_hash: 'a'.repeat(64),
    local_counter: 1,
    observed_at: '2026-05-02T08:00:00.000Z',
    payload: {
      title_redacted: 'Transfer <AMOUNT> <CURRENCY>',
      body_redacted: 'Transfer from <PHONE>. <REFERENCE>',
      amount_minor: 13700,
      currency: 'RUB',
      sender_phone_hmac: 'hmac_phone',
      sender_phone_masked: '+7 *** *** **33',
      reference_hmac: 'hmac_ref',
      reference_code_masked: 'SWP-A***',
      direction_label: 'incoming_customer_transfer'
    },
    ...overrides
  };

  return {
    ...signal,
    signature: createReceiverSignalSignature(signal, publicKey)
  };
}

describe('receiver signal ingestion api', () => {
  it('stores a valid signed signal and emits signal.received', async () => {
    const repository = new FakeSignalRepository();
    const events = new FakeEventPublisher();
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: repository,
      eventPublisher: events,
      signalIdGenerator: () => 'sig_01'
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal()
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      signal_id: 'sig_01',
      status: 'received'
    });
    expect(repository.storedSignals).toHaveLength(1);
    expect(repository.storedSignals[0]?.payloadRedacted).toEqual({
      title_redacted: 'Transfer <AMOUNT> <CURRENCY>',
      body_redacted: 'Transfer from <PHONE>. <REFERENCE>'
    });
    expect(events.events).toHaveLength(1);
    expect(events.events[0]?.eventType).toBe(EventTypes.SIGNAL_RECEIVED);
    expect(events.events[0]?.data).toMatchObject({
      signal_id: 'sig_01',
      event_id: 'evt_01',
      notification_hash: 'a'.repeat(64)
    });
  });

  it('rejects duplicate event ids', async () => {
    const repository = new FakeSignalRepository();
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: repository,
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01'
    });

    await server.inject({ method: 'POST', url: '/v1/receiver/signals', payload: createValidSignal() });
    const duplicate = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal({ notification_hash: 'b'.repeat(64), local_counter: 2 })
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('duplicate_event_id');
  });

  it('rejects duplicate notification hashes', async () => {
    const repository = new FakeSignalRepository();
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: repository,
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01'
    });

    await server.inject({ method: 'POST', url: '/v1/receiver/signals', payload: createValidSignal() });
    const duplicate = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal({ event_id: 'evt_02', local_counter: 2 })
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('duplicate_notification_hash');
  });

  it('rejects invalid signatures', async () => {
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: new FakeSignalRepository(),
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01'
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: { ...createValidSignal(), signature: 'bad_signature' }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('invalid_signature');
  });

  it('rejects local counter regressions', async () => {
    const repository = new FakeSignalRepository();
    repository.device.lastLocalCounter = 10;
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: repository,
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01'
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal({ local_counter: 9 })
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('local_counter_regression');
  });
});

function skippedHealthChecks() {
  return {
    database: async () => 'skipped' as const,
    nats: async () => 'skipped' as const,
    valkey: async () => 'skipped' as const
  };
}

class FakeEventPublisher {
  public readonly events: EventEnvelope[] = [];

  public async publish(event: EventEnvelope): Promise<void> {
    this.events.push(event);
  }
}

class FakeSignalRepository implements ReceiverSignalRepository {
  public readonly storedSignals: SignalIngestionInput[] = [];
  public readonly device: ReceiverSignalDevice = {
    id: 'dev_01',
    merchantId: 'mch_01',
    publicKey,
    lastLocalCounter: 0,
    status: 'active'
  };
  private readonly eventIds = new Set<string>();
  private readonly notificationHashes = new Set<string>();

  public async getReceiverDevice(params: {
    merchantId: string;
    deviceId: string;
  }): Promise<ReceiverSignalDevice | null> {
    if (params.merchantId !== this.device.merchantId || params.deviceId !== this.device.id) {
      return null;
    }

    return this.device;
  }

  public async ingestSignal(input: SignalIngestionInput): Promise<SignalIngestionResult> {
    if (this.eventIds.has(input.signal.eventId)) {
      return { kind: 'duplicate_event_id' };
    }

    if (this.notificationHashes.has(input.signal.notificationHash)) {
      return { kind: 'duplicate_notification_hash' };
    }

    if (input.signal.localCounter <= this.device.lastLocalCounter) {
      return { kind: 'local_counter_regression' };
    }

    this.eventIds.add(input.signal.eventId);
    this.notificationHashes.add(input.signal.notificationHash);
    this.device.lastLocalCounter = input.signal.localCounter;
    this.storedSignals.push(input);
    return { kind: 'stored', signalId: input.signal.id };
  }
}
