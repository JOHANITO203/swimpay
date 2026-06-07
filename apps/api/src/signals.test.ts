import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import { EventTypes, type EventEnvelope } from '@swimpay/events';
import { buildApiServer } from './server.js';
import {
  ReceiverSignatureAlgorithms,
  verifyReceiverSignalSignature,
  type BankNotificationChannelRow,
  type ReceiverSignalDevice,
  type ReceiverSignalRepository,
  type SignalIngestionInput,
  type SignalIngestionResult
} from './signals.js';
import { buildCanonicalReceiverSignalPayload } from '@swimpay/contracts';

const receiverKeyPair = generateReceiverKeyPair();
const publicKey = receiverKeyPair.publicKeyPem;

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
    shape_hash: 'shape_sber_incoming_v1',
    profile_version: 'sber_v1',
    classification: 'incoming_customer_transfer',
    confidence: 81,
    parser_hint: 'android-local-v1',
    signal_quality_hint: 80,
    redacted_title: 'Transfer <AMOUNT> <CURRENCY>',
    redacted_body: 'Transfer from <PHONE>. <REFERENCE>',
    raw_text_present: false,
    ...overrides
  };

  const signalWithPayloadHash = addPayloadHash(signal);
  const signedSignal: Record<string, unknown> = {
    ...signalWithPayloadHash,
    signature: signReceiverPayload(signalWithPayloadHash)
  };

  if ('signature' in overrides) {
    if (overrides.signature === undefined) {
      delete signedSignal.signature;
    } else {
      signedSignal.signature = overrides.signature;
    }
  }

  return signedSignal;
}

function createLegacySignal(overrides: Partial<Record<string, unknown>> = {}) {
  const signal: Record<string, unknown> = {
    event_id: 'evt_legacy_01',
    device_id: 'dev_01',
    merchant_id: 'mch_01',
    bank_profile_id: 'sber_ru',
    package_name: 'TO_VERIFY',
    package_cert_sha256: 'TO_VERIFY',
    notification_hash: 'c'.repeat(64),
    local_counter: 2,
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
      direction_label: 'incoming_customer_transfer',
      snapshot_count: 1,
      coalesced: false,
      raw_text_present: false
    },
    ...overrides
  };
  const payload = signal.payload as Record<string, unknown>;
  const signaturePayloadWithoutHash: Record<string, unknown> = {
    event_id: signal.event_id,
    device_id: signal.device_id,
    merchant_id: signal.merchant_id,
    bank_profile_id: signal.bank_profile_id,
    package_name: signal.package_name,
    package_cert_sha256: signal.package_cert_sha256,
    notification_hash: signal.notification_hash,
    local_counter: signal.local_counter,
    observed_at: new Date(String(signal.observed_at)).toISOString(),
    payload: {
      title_redacted: payload.title_redacted,
      body_redacted: payload.body_redacted,
      amount_minor: Number.isInteger(payload.amount_minor) ? payload.amount_minor : undefined,
      currency: payload.currency,
      sender_phone_hmac: payload.sender_phone_hmac,
      sender_phone_masked: payload.sender_phone_masked,
      reference_hmac: payload.reference_hmac,
      reference_code_masked: payload.reference_code_masked,
      direction_label: payload.direction_label,
      snapshot_count: payload.snapshot_count,
      coalesced: payload.coalesced,
      raw_text_present: payload.raw_text_present
    }
  };
  const signaturePayload = addPayloadHash(signaturePayloadWithoutHash);

  return {
    ...signal,
    payload_hash: signaturePayload.payload_hash,
    signature: signReceiverPayload(signaturePayload)
  };
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
    expect(repository.storedSignals[0]?.signal.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(repository.storedSignals[0]?.signal.shapeHash).toBe('shape_sber_incoming_v1');
    expect(repository.storedSignals[0]?.signal.profileVersion).toBe('sber_v1');
    expect(repository.storedSignals[0]?.signal.classification).toBe('incoming_customer_transfer');
    expect(repository.storedSignals[0]?.signal.receiverConfidence).toBe(81);
    expect(repository.storedSignals[0]?.signal.evidenceEnvelope).toMatchObject({
      envelope_version: 1,
      official_bank_confirmation: false,
      merchant_id: 'mch_01',
      receiver_device_id: 'dev_01',
      signal_id: 'sig_01',
      bank_package: 'TO_VERIFY',
      bank_cert_fingerprint: 'TO_VERIFY',
      parser_version: 'android-local-v1',
      shape_hash: 'shape_sber_incoming_v1',
      semantic_hash: 'b'.repeat(64),
      redacted_fields: {
        amount_minor: 13700,
        currency: 'RUB',
        direction: 'incoming'
      }
    });
    expect(JSON.stringify(repository.storedSignals[0]?.signal.evidenceEnvelope)).not.toContain('raw bank');
    expect(JSON.stringify(repository.storedSignals[0]?.signal.evidenceEnvelope)).not.toContain('220220');
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

  it('rejects unknown receiver devices before signature verification', async () => {
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
      payload: createValidSignal({ device_id: 'dev_unknown' })
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('receiver_device_not_found');
    expect(metrics.counterValue(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL)).toBe(1);
  });

  it.each([
    'inactive',
    'suspended',
    'revoked',
    'needs_reconnect',
    'notification_access_missing',
    'bank_targets_missing'
  ] as const)('rejects %s receiver devices', async (status) => {
    const repository = new FakeSignalRepository();
    repository.device.status = status;
    const metrics = new InMemoryMetricsRegistry();
    const server = buildApiServer({
      environment: 'test',
      healthChecks: skippedHealthChecks(),
      signalRepository: repository,
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01',
      metrics
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal()
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('receiver_device_disabled');
    expect(repository.storedSignals).toEqual([]);
    expect(metrics.counterValue(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL)).toBe(1);
  });

  it('rejects stale receiver signal envelopes before ingestion', async () => {
    const repository = new FakeSignalRepository();
    const metrics = new InMemoryMetricsRegistry();
    const server = buildApiServer({
      environment: 'production',
      healthChecks: skippedHealthChecks(),
      signalRepository: repository,
      eventPublisher: new FakeEventPublisher(),
      signalIdGenerator: () => 'sig_01',
      phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
      clock: () => new Date('2026-05-02T11:00:00.000Z'),
      metrics
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: createValidSignal({ observed_at: '2026-05-02T09:00:00.000Z' })
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('timestamp_out_of_range');
    expect(repository.storedSignals).toEqual([]);
    expect(metrics.counterValue(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL)).toBe(1);
  });

  it('verifies signatures with the declared asymmetric public-key algorithm', () => {
    const body = createValidSignal();
    expect(ReceiverSignatureAlgorithms.ECDSA_P256_SHA256_DER_V1).toBe('ecdsa_p256_sha256_der_v1');
    expect(verifyReceiverSignalSignature(body, publicKey)).toEqual({
      valid: true,
      algorithm: ReceiverSignatureAlgorithms.ECDSA_P256_SHA256_DER_V1
    });
  });

  it('rejects shared HMAC verification keys for receiver uploads', () => {
    const body = createValidSignal();

    expect(verifyReceiverSignalSignature(body, 'spk_legacy_shared_key')).toEqual({
      valid: false,
      algorithm: ReceiverSignatureAlgorithms.ECDSA_P256_SHA256_DER_V1,
      reason: 'invalid_public_key'
    });
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

  it('rejects legacy receiver signal payloads that carry raw notification fields', async () => {
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
      payload: createLegacySignal({
        payload: {
          title_redacted: 'Transfer <AMOUNT> <CURRENCY>',
          body_redacted: 'Transfer from <PHONE>. <REFERENCE>',
          raw_text_present: false,
          raw_notification_text: 'raw bank notification'
        }
      })
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('raw_notification_rejected');
    expect(response.body).not.toContain('raw bank notification');
    expect(metrics.counterValue(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL)).toBe(1);
  });

  describe('channel-id capture and learning', () => {
    it('marks channel_recognized when channel_id matches a confirmed bank_notification_channels row', async () => {
      const repository = new FakeSignalRepository();
      // Seed a confirmed channel row
      repository.seedChannel('sber_ru', 'sber_push_channel', 'confirmed');

      const server = buildApiServer({
        environment: 'test',
        healthChecks: skippedHealthChecks(),
        signalRepository: repository,
        eventPublisher: new FakeEventPublisher(),
        signalIdGenerator: () => 'sig_ch_01'
      });

      const response = await server.inject({
        method: 'POST',
        url: '/v1/receiver/signals',
        payload: createValidSignal({ channel_id: 'sber_push_channel', event_id: 'evt_ch_01', notification_hash: 'd'.repeat(64) })
      });

      expect(response.statusCode).toBe(201);
      expect(repository.storedSignals).toHaveLength(1);
      expect(repository.storedSignals[0]?.signal.channelId).toBe('sber_push_channel');
      expect(repository.storedSignals[0]?.signal.channelRecognized).toBe(true);
    });

    it('keeps a confirmed channel recognized and still counts the sighting (unified upsert, no branch no-op)', async () => {
      const repository = new FakeSignalRepository();
      repository.seedChannel('sber_ru', 'sber_push_channel', 'confirmed');

      const server = buildApiServer({
        environment: 'test',
        healthChecks: skippedHealthChecks(),
        signalRepository: repository,
        eventPublisher: new FakeEventPublisher(),
        signalIdGenerator: () => 'sig_ch_cfm'
      });

      const response = await server.inject({
        method: 'POST',
        url: '/v1/receiver/signals',
        payload: createValidSignal({ channel_id: 'sber_push_channel', event_id: 'evt_ch_cfm', notification_hash: 'a'.repeat(64) })
      });

      expect(response.statusCode).toBe(201);
      expect(repository.storedSignals[0]?.signal.channelRecognized).toBe(true);
      // A re-sighting of a confirmed channel increments sample_count (atomic upsert),
      // guarding against a regression to the old "confirmed -> do nothing" branch.
      const row = repository.getChannel('sber_ru', 'sber_push_channel');
      expect(row?.status).toBe('confirmed');
      expect(row?.sample_count).toBe(2);
    });

    it('upserts a pending bank_notification_channels row for an unknown channel_id and still ingests the signal', async () => {
      const repository = new FakeSignalRepository();
      const server = buildApiServer({
        environment: 'test',
        healthChecks: skippedHealthChecks(),
        signalRepository: repository,
        eventPublisher: new FakeEventPublisher(),
        signalIdGenerator: () => 'sig_ch_02'
      });

      // First occurrence — should create a pending row with sample_count = 1
      const response1 = await server.inject({
        method: 'POST',
        url: '/v1/receiver/signals',
        payload: createValidSignal({ channel_id: 'unknown_channel', event_id: 'evt_ch_02', notification_hash: 'e'.repeat(64) })
      });

      expect(response1.statusCode).toBe(201);
      expect(repository.storedSignals).toHaveLength(1);
      expect(repository.storedSignals[0]?.signal.channelId).toBe('unknown_channel');
      expect(repository.storedSignals[0]?.signal.channelRecognized).toBe(false);

      const row1 = repository.getChannel('sber_ru', 'unknown_channel');
      expect(row1).toBeDefined();
      expect(row1?.status).toBe('pending');
      expect(row1?.sample_count).toBe(1);

      // Second occurrence — sample_count should increment to 2
      const response2 = await server.inject({
        method: 'POST',
        url: '/v1/receiver/signals',
        payload: createValidSignal({ channel_id: 'unknown_channel', event_id: 'evt_ch_03', notification_hash: 'f'.repeat(64), local_counter: 2 })
      });

      expect(response2.statusCode).toBe(201);
      const row2 = repository.getChannel('sber_ru', 'unknown_channel');
      expect(row2?.sample_count).toBe(2);
    });

    it('ingests normally when no channel_id is provided (unchanged behavior)', async () => {
      const repository = new FakeSignalRepository();
      const server = buildApiServer({
        environment: 'test',
        healthChecks: skippedHealthChecks(),
        signalRepository: repository,
        eventPublisher: new FakeEventPublisher(),
        signalIdGenerator: () => 'sig_ch_04'
      });

      const response = await server.inject({
        method: 'POST',
        url: '/v1/receiver/signals',
        payload: createValidSignal({ event_id: 'evt_ch_04', notification_hash: 'g'.repeat(64) })
        // no channel_id
      });

      expect(response.statusCode).toBe(201);
      expect(repository.storedSignals).toHaveLength(1);
      expect(repository.storedSignals[0]?.signal.channelId).toBeUndefined();
      expect(repository.storedSignals[0]?.signal.channelRecognized).toBeUndefined();
    });
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
  private readonly channels = new Map<string, BankNotificationChannelRow>();

  public seedChannel(bankProfileId: string, channelId: string, status: 'pending' | 'confirmed' | 'rejected'): void {
    const key = `${bankProfileId}:${channelId}`;
    this.channels.set(key, { bank_profile_id: bankProfileId, channel_id: channelId, status, sample_count: 1 });
  }

  public getChannel(bankProfileId: string, channelId: string): BankNotificationChannelRow | undefined {
    return this.channels.get(`${bankProfileId}:${channelId}`);
  }

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

    // Channel learning logic (mirrors PgSignalRepository's atomic upsert:
    // every re-sighting increments sample_count; channel_recognized reflects
    // the post-upsert status, so only a confirmed channel marks it true).
    if (input.signal.channelId) {
      const key = `${input.signal.bankProfileId}:${input.signal.channelId}`;
      const existing = this.channels.get(key);
      if (existing) {
        existing.sample_count += 1;
        input.signal.channelRecognized = existing.status === 'confirmed';
      } else {
        this.channels.set(key, {
          bank_profile_id: input.signal.bankProfileId,
          channel_id: input.signal.channelId,
          status: 'pending',
          sample_count: 1
        });
        input.signal.channelRecognized = false;
      }
    }

    this.eventIds.add(input.signal.eventId);
    this.notificationHashes.add(input.signal.notificationHash);
    this.device.lastLocalCounter = input.signal.localCounter;
    this.storedSignals.push(input);
    return { kind: 'stored', signalId: input.signal.id };
  }
}

function generateReceiverKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey: generatedPublicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  return {
    publicKeyPem: generatedPublicKey.export({ format: 'pem', type: 'spki' }).toString().trim(),
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString().trim()
  };
}

function addPayloadHash(signal: Record<string, unknown>): Record<string, unknown> {
  const withoutSignatureAndHash = { ...signal };
  delete withoutSignatureAndHash.signature;
  delete withoutSignatureAndHash.payload_hash;
  return {
    ...withoutSignatureAndHash,
    payload_hash: createHash('sha256').update(stableStringify(withoutSignatureAndHash)).digest('hex')
  };
}

function signReceiverPayload(signalWithPayloadHash: Record<string, unknown>): string {
  const signer = createSign('SHA256');
  signer.update(buildCanonicalReceiverSignalPayload(signalWithPayloadHash));
  signer.end();
  return signer.sign(receiverKeyPair.privateKeyPem, 'base64');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}
