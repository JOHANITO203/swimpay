import { describe, expect, it } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
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
    package_name: 'TO_VERIFY',
    package_cert_sha256: 'TO_VERIFY',
    notification_hash: 'a'.repeat(64),
    semantic_hash: 'b'.repeat(64),
    local_counter: 1,
    snapshot_count: 2,
    coalesced: true,
    observed_at: '2026-05-02T08:00:00.000Z',
    amount_minor: 13700,
    currency: 'RUB',
    sender_phone_hmac: 'hmac_phone',
    sender_phone_masked: '+7 *** *** **33',
    reference_hmac: 'hmac_ref',
    reference_code_masked: 'SWP-A***',
    direction_hint: 'incoming_customer_transfer',
    parser_hint: 'android-local-v1',
    signal_quality_hint: 80,
    redacted_title: 'Transfer <AMOUNT> <CURRENCY>',
    redacted_body: 'Transfer from <PHONE>. <REFERENCE>',
    raw_text_present: false,
    ...overrides
  };

  const signedSignal: Record<string, unknown> = {
    ...signal,
    signature: createReceiverSignalSignature(signal, publicKey)
  };

  if ('signature' in overrides && overrides.signature === undefined) {
    delete signedSignal.signature;
  }

  return signedSignal;
}

describe('receiver signal ingestion api', () => {
  it('stores a valid signed signal and emits signal.received', async () => {
    const repository = new FakeSignalRepository();
    const events = new FakeEventPublisher();
    const metrics = new InMemoryMetricsRegistry();
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: repository,
      eventPublisher: events,
      signalIdGenerator: () => 'sig_01',
      metrics
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal()
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      signal_id: 'sig_01',
      status: 'received',
      accepted: true,
      reason_codes: [],
      server_time: expect.any(String),
      next_action: 'backend_decision_pending'
    });
    expect(repository.storedSignals).toHaveLength(1);
    expect(repository.storedSignals[0]?.payloadRedacted).toEqual({
      title_redacted: 'Transfer <AMOUNT> <CURRENCY>',
      body_redacted: 'Transfer from <PHONE>. <REFERENCE>',
      snapshot_count: 2,
      coalesced: true,
      raw_text_present: false
    });
    expect(repository.storedSignals[0]?.signal.packageName).toBe('TO_VERIFY');
    expect(repository.storedSignals[0]?.signal.packageCertSha256).toBe('TO_VERIFY');
    expect(events.events).toHaveLength(1);
    expect(events.events[0]?.eventType).toBe(EventTypes.SIGNAL_RECEIVED);
    expect(events.events[0]?.data).toMatchObject({
      signal_id: 'sig_01',
      event_id: 'evt_01',
      notification_hash: 'a'.repeat(64)
    });
    expect(response.body).not.toContain('official_bank_confirmation');
    expect(metrics.counterValue(MetricNames.RECEIVER_SIGNALS_ACCEPTED_TOTAL)).toBe(1);
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
    const metrics = new InMemoryMetricsRegistry();
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: new FakeSignalRepository(),
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01',
      metrics
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: { ...createValidSignal(), signature: 'bad_signature' }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('invalid_signature');
    expect(metrics.counterValue(MetricNames.RECEIVER_SIGNATURE_INVALID_TOTAL)).toBe(1);
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

  it.each([
    ['raw phone', { raw_phone: '+79991234567' }, 'raw_phone_rejected'],
    ['raw notification text', { raw_notification_text: 'raw bank notification' }, 'raw_notification_rejected'],
    ['missing signature', { signature: undefined }, 'signature_missing'],
    ['invalid currency', { currency: 'USD' }, 'payload_invalid'],
    ['decimal amount', { amount_minor: 137.5 }, 'payload_invalid']
  ] as const)('rejects unsafe receiver signal contract: %s', async (_label, override, code) => {
    const metrics = new InMemoryMetricsRegistry();
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: new FakeSignalRepository(),
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01',
      metrics
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal(override)
    });

    expect(response.statusCode).toBe(code === 'signature_missing' ? 401 : 400);
    expect(response.json().error.code).toBe(code);
    expect(response.body).not.toContain('+79991234567');
    expect(metrics.counterValue(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL)).toBe(1);
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
