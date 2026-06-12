import { createHash, generateKeyPairSync } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import { buildApiServer } from './server.js';
import {
  BFF_SESSION_COOKIE_NAME,
  CSRF_HEADER_NAME,
  InMemoryAuthBffRepository,
  MerchantRoles,
  buildSessionCookieOptions,
  createCsrfToken,
  createOpaqueSessionToken,
  hashBffSessionToken,
  hashCsrfToken,
  serializeSessionCookie
} from './auth-bff.js';
import { buildReceiverHeartbeatResponse, deriveReceiverDeviceOperationalStatus } from './receiver-devices.js';
import { createReceiverSignalSignature } from './signals.js';
import type {
  CreateReceiverDeviceInput,
  ReceiverDeviceRepository,
  StoredReceiverDeviceRecord,
  UpdateReceiverHeartbeatInput
} from './receiver-devices.js';
import type {
  ReceiverSignalDevice,
  ReceiverSignalRepository,
  SignalIngestionInput,
  SignalIngestionResult
} from './signals.js';

const receiverKeyPair = generateReceiverKeyPair();
const receiverPublicKey = receiverKeyPair.publicKeyPem;
const receiverPrivateKey = receiverKeyPair.privateKeyPem;

class InMemoryReceiverDeviceRepository implements ReceiverDeviceRepository {
  public readonly devices = new Map<string, StoredReceiverDeviceRecord>();
  public readonly auditEvents: Array<{ eventType: string; objectType: string; objectId: string }> = [];

  async createReceiverDevice(input: CreateReceiverDeviceInput) {
    this.devices.set(input.device.id, input.device);
    this.auditEvents.push({
      eventType: input.auditEvent.eventType,
      objectType: input.auditEvent.objectType,
      objectId: input.auditEvent.objectId
    });
    return input.device;
  }

  async updateHeartbeat(input: UpdateReceiverHeartbeatInput) {
    const device = this.devices.get(input.deviceId);
    if (!device || device.merchantId !== input.merchantId) {
      return null;
    }

    const updated: StoredReceiverDeviceRecord = {
      ...device,
      appVersion: input.appVersion ?? device.appVersion,
      status: deriveReceiverDeviceOperationalStatus({
        notificationAccessStatus: input.notificationAccessStatus,
        listenerConnected: input.listenerConnected,
        allowedBankProfileIds: input.allowedBankProfileIds,
        reportedStatus: input.reportedStatus
      }),
      notificationAccessStatus: input.notificationAccessStatus,
      lastHeartbeatAt: input.heartbeatAt,
      updatedAt: input.heartbeatAt
    };

    this.devices.set(device.id, updated);
    return updated;
  }
}

class ForeignKeyFailingReceiverDeviceRepository extends InMemoryReceiverDeviceRepository {
  async createReceiverDevice(): Promise<StoredReceiverDeviceRecord> {
    const error = new Error('insert or update on table "receiver_devices" violates foreign key constraint');
    (error as Error & { code?: string }).code = '23503';
    throw error;
  }
}

class ReceiverDeviceBackedSignalRepository implements ReceiverSignalRepository {
  public readonly storedSignals: SignalIngestionInput[] = [];
  private readonly eventIds = new Set<string>();
  private readonly notificationHashes = new Set<string>();

  constructor(private readonly receiverDevices: InMemoryReceiverDeviceRepository) {}

  async getReceiverDevice(params: { merchantId: string; deviceId: string }): Promise<ReceiverSignalDevice | null> {
    const device = this.receiverDevices.devices.get(params.deviceId);
    if (!device || device.merchantId !== params.merchantId) {
      return null;
    }

    return {
      id: device.id,
      merchantId: device.merchantId,
      publicKey: device.publicKey,
      lastLocalCounter: device.lastLocalCounter,
      status: device.status
    };
  }

  async ingestSignal(input: SignalIngestionInput): Promise<SignalIngestionResult> {
    const device = this.receiverDevices.devices.get(input.signal.deviceId);
    if (!device || device.merchantId !== input.signal.merchantId) {
      return { kind: 'device_not_found' };
    }

    if (input.signal.localCounter <= device.lastLocalCounter) {
      return { kind: 'local_counter_regression' };
    }

    if (this.eventIds.has(input.signal.eventId)) {
      return { kind: 'duplicate_event_id' };
    }

    if (this.notificationHashes.has(input.signal.notificationHash)) {
      return { kind: 'duplicate_notification_hash' };
    }

    this.eventIds.add(input.signal.eventId);
    this.notificationHashes.add(input.signal.notificationHash);
    this.receiverDevices.devices.set(device.id, {
      ...device,
      lastLocalCounter: input.signal.localCounter,
      updatedAt: input.signal.receivedAt
    });
    this.storedSignals.push(input);
    return { kind: 'stored', signalId: input.signal.id };
  }
}

function buildReceiverServer(repository: InMemoryReceiverDeviceRepository, metrics?: InMemoryMetricsRegistry) {
  return buildApiServer({
    environment: 'test',
    receiverDeviceRepository: repository,
    ...(metrics ? { metrics } : {}),
    idGenerator: {
      orderId: () => 'ord_unused',
      paymentSessionId: () => 'ps_unused',
      auditEventId: () => 'aud_receiver_01',
      referenceCode: () => 'SWP-UNUSED'
    },
    receiverDeviceIdGenerator: () => 'dev_test_01',
    clock: () => new Date('2026-05-02T11:00:00.000Z'),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  });
}

async function createProductionReceiverServerWithSession(repository: InMemoryReceiverDeviceRepository) {
  const authBffRepository = new InMemoryAuthBffRepository();
  const sessionToken = createOpaqueSessionToken();
  const csrfToken = createCsrfToken();
  const now = '2026-05-02T11:00:00.000Z';
  const userId = '11111111-1111-4111-8111-111111111111';
  const merchantId = '22222222-2222-4222-8222-222222222222';

  authBffRepository.seedUser({
    id: userId,
    googleSub: 'google-user-01',
    email: 'owner@example.com',
    name: 'Owner',
    avatarUrl: null,
    status: 'active',
    lastLoginAt: now
  });
  authBffRepository.seedMembership({
    id: 'membership-01',
    merchantId,
    userId,
    role: MerchantRoles.OWNER,
    status: 'active'
  });
  await authBffRepository.createSession({
    sessionIdHash: hashBffSessionToken(sessionToken),
    csrfSecretHash: hashCsrfToken(csrfToken),
    userId,
    activeMerchantId: merchantId,
    expiresAt: '2026-05-09T11:00:00.000Z',
    now
  });

  const server = buildApiServer({
    environment: 'production',
    authBffRepository,
    receiverDeviceRepository: repository,
    phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
    idGenerator: {
      orderId: () => 'ord_unused',
      paymentSessionId: () => 'ps_unused',
      auditEventId: () => 'aud_receiver_01',
      referenceCode: () => 'SWP-UNUSED'
    },
    receiverDeviceIdGenerator: () => 'prod_receiver_01',
    clock: () => new Date(now),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  });

  return {
    server,
    merchantId,
    csrfToken,
    cookie: serializeSessionCookie(sessionToken, buildSessionCookieOptions('production'))
  };
}

describe('receiver device api', () => {
  test('marks receiver health degraded or offline when heartbeat is stale', () => {
    const baseDevice: StoredReceiverDeviceRecord = {
      id: 'dev_stale_01',
      merchantId: 'mch_01',
      deviceName: 'Merchant Phone',
      publicKey: receiverPublicKey,
      appVersion: '1.0.0',
      androidVersion: '15',
      status: 'active',
      trustScore: 0,
      notificationAccessStatus: true,
      lastLocalCounter: 0,
      lastHeartbeatAt: '2026-05-02T10:55:30.000Z',
      createdAt: '2026-05-02T10:00:00.000Z',
      updatedAt: '2026-05-02T10:55:30.000Z'
    };

    const degraded = buildReceiverHeartbeatResponse({
      device: baseDevice,
      serverTime: '2026-05-02T11:00:00.000Z',
      warnings: [],
      queueLength: 0,
      allowedBankProfileIds: ['sber_ru']
    });

    expect(degraded.receiver_health.status).toBe('degraded');
    expect(degraded.receiver_mode).toBe('attention_required');
    expect(degraded.required_actions).toContain('reconnect_notification_listener');

    const offline = buildReceiverHeartbeatResponse({
      device: {
        ...baseDevice,
        lastHeartbeatAt: '2026-05-02T10:44:00.000Z',
        updatedAt: '2026-05-02T10:44:00.000Z'
      },
      serverTime: '2026-05-02T11:00:00.000Z',
      warnings: [],
      queueLength: 0,
      allowedBankProfileIds: ['sber_ru']
    });

    expect(offline.receiver_health.status).toBe('offline');
    expect(offline.receiver_health.listener_connected_recently).toBe(false);
    expect(offline.receiver_mode).toBe('attention_required');
    expect(offline.required_actions).toContain('reconnect_notification_listener');
  });

  test('heartbeat response can carry backend-owned receiver runtime config', () => {
    const response = buildReceiverHeartbeatResponse({
      device: {
        id: 'dev_runtime_01',
        merchantId: 'mch_01',
        deviceName: 'Merchant Phone',
        publicKey: receiverPublicKey,
        appVersion: '1.0.0',
        androidVersion: '15',
        status: 'active',
        trustScore: 0,
        notificationAccessStatus: true,
        lastLocalCounter: 0,
        lastHeartbeatAt: '2026-05-02T10:59:30.000Z',
        createdAt: '2026-05-02T10:00:00.000Z',
        updatedAt: '2026-05-02T10:59:30.000Z'
      },
      serverTime: '2026-05-02T11:00:00.000Z',
      warnings: [],
      queueLength: 0,
      allowedBankProfileIds: ['sber_ru'],
      receiverRuntimeConfig: {
        merchant_id: 'mch_01',
        enabled_bank_profile_ids: ['sber_ru'],
        payment_intent_active: true,
        receiver_armed: true,
        expected_payment_profile_present: true,
        receiving_route_locked: true,
        active_payment_sessions_count: 1,
        active_until: '2026-05-02T11:20:00.000Z'
      }
    });

    expect(response.active_payment_sessions_count).toBe(1);
    expect(response.receiver_runtime_config).toEqual({
      merchant_id: 'mch_01',
      enabled_bank_profile_ids: ['sber_ru'],
      payment_intent_active: true,
      receiver_armed: true,
      expected_payment_profile_present: true,
      receiving_route_locked: true,
      active_payment_sessions_count: 1,
      active_until: '2026-05-02T11:20:00.000Z'
    });
    expect(JSON.stringify(response)).not.toContain('fingerprint');
  });

  test('rejects local test bearer receiver registration in production', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const server = buildApiServer({
      environment: 'production',
      receiverDeviceRepository: repository,
      phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
      idGenerator: {
        orderId: () => 'ord_unused',
        paymentSessionId: () => 'ps_unused',
        auditEventId: () => 'aud_receiver_01',
        referenceCode: () => 'SWP-UNUSED'
      },
      receiverDeviceIdGenerator: () => 'dev_test_01',
      healthChecks: {
        database: async () => 'skipped',
        nats: async () => 'skipped',
        valkey: async () => 'skipped'
      }
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_name: 'Merchant Phone',
        public_key: receiverPublicKey
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain('Bearer test_');
    expect(repository.devices.size).toBe(0);
  });

  test('registers and heartbeats a receiver through production BFF session with CSRF', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const { server, cookie, csrfToken, merchantId } = await createProductionReceiverServerWithSession(repository);

    expect(cookie).toContain(`${BFF_SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');

    const blocked = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { cookie },
      payload: {
        device_name: 'Merchant Phone',
        public_key: receiverPublicKey
      }
    });
    expect(blocked.statusCode).toBe(403);

    const registered = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { cookie, [CSRF_HEADER_NAME]: csrfToken },
      payload: {
        device_name: 'Merchant Phone',
        public_key: receiverPublicKey,
        app_version: '1.0.0',
        android_version: '15',
        selected_banks: ['sber_ru']
      }
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toMatchObject({
      device_id: 'prod_receiver_01',
      merchant_id: merchantId
    });
    expect(registered.body).not.toContain('BEGIN PUBLIC KEY');

    const heartbeat = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/heartbeat',
      headers: { cookie, [CSRF_HEADER_NAME]: csrfToken },
      payload: {
        device_id: 'prod_receiver_01',
        notification_access_enabled: true,
        listener_connected: true,
        allowed_bank_profile_ids: ['sber_ru'],
        queue_length: 0,
        last_signal_observed_at: null,
        app_version: '1.0.1',
        android_version: '15',
        timestamp: '2026-05-02T11:00:00.000Z',
        signature: 'heartbeat_signature'
      }
    });
    expect(heartbeat.statusCode).toBe(200);
    expect(heartbeat.json()).toMatchObject({
      device_id: 'prod_receiver_01',
      status: 'active',
      receiver_mode: 'active',
      receiver_health: {
        status: 'healthy',
        notification_access: true,
        listener_connected_recently: true,
        encrypted_outbox_depth: 0,
        supported_bank_routes_online: 1
      }
    });
  });

  test('registers and heartbeats a receiver through Android mobile session without dev bearer or CSRF', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const signalRepository = new ReceiverDeviceBackedSignalRepository(repository);
    const authBffRepository = new InMemoryAuthBffRepository();
    const server = buildApiServer({
      environment: 'production',
      authBffRepository,
      receiverDeviceRepository: repository,
      signalRepository,
      phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
      eventPublisher: { publish: async () => {} },
      signalIdGenerator: () => 'sig_mobile_runtime_01',
      idGenerator: {
        orderId: () => 'ord_unused',
        paymentSessionId: () => 'ps_unused',
        auditEventId: () => 'aud_receiver_mobile_01',
        referenceCode: () => 'SWP-UNUSED'
      },
      receiverDeviceIdGenerator: () => 'mobile_receiver_01',
      googleIdTokenVerifier: {
        verifyIdToken: async (idToken: string) =>
          idToken.trim() ? { googleSub: `google-sub-for:${idToken.trim()}` } : null
      },
      clock: () => new Date('2026-05-02T11:00:00.000Z'),
      healthChecks: {
        database: async () => 'skipped',
        nats: async () => 'skipped',
        valkey: async () => 'skipped'
      }
    });

    const account = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/auth/create-account',
      payload: {
        profile_type: 'personal',
        id_token: 'google-create-token-mobile-receiver',
        device_proof: {
          install_public_key: 'install_mobile_receiver',
          challenge_id: 'challenge_mobile_receiver',
          challenge_signature: 'signature_mobile_receiver'
        }
      }
    });
    expect(account.statusCode).toBe(201);
    const token = account.json().mobile_session.token as string;
    const merchantId = account.json().account.merchant_id as string;

    const registered = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        device_name: 'Android receiver',
        public_key: receiverPublicKey,
        app_version: '1.0.0',
        android_version: '15',
        selected_banks: ['sber_ru']
      }
    });

    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toMatchObject({
      device_id: 'mobile_receiver_01',
      merchant_id: merchantId,
      status: 'pending'
    });
    expect(registered.body).not.toContain('BEGIN PUBLIC KEY');
    expect(repository.devices.get('mobile_receiver_01')).toMatchObject({
      merchantId,
      publicKey: receiverPublicKey
    });

    const heartbeat = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/heartbeat',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        device_id: 'mobile_receiver_01',
        notification_access_enabled: true,
        listener_connected: true,
        allowed_bank_profile_ids: ['sber_ru'],
        queue_length: 0,
        last_signal_observed_at: null,
        app_version: '1.0.1',
        android_version: '15',
        timestamp: '2026-05-02T11:00:00.000Z',
        signature: 'heartbeat_signature'
      }
    });

    expect(heartbeat.statusCode).toBe(200);
    expect(heartbeat.json()).toMatchObject({
      device_id: 'mobile_receiver_01',
      status: 'active',
      receiver_mode: 'active'
    });

    const signal = {
      event_id: 'evt_mobile_runtime_01',
      device_id: 'mobile_receiver_01',
      merchant_id: merchantId,
      bank_profile_id: 'sber_ru',
      package_name: 'TO_VERIFY',
      package_cert_sha256: 'TO_VERIFY',
      notification_hash: 'a'.repeat(64),
      semantic_hash: 'b'.repeat(64),
      local_counter: 1,
      snapshot_count: 1,
      coalesced: true,
      observed_at: '2026-05-02T11:00:00.000Z',
      amount_minor: 13700,
      currency: 'RUB',
      sender_phone_hmac: 'hmac_phone',
      sender_phone_masked: '<PHONE>',
      reference_hmac: 'hmac_ref',
      reference_code_masked: '<REFERENCE>',
      direction_hint: 'incoming_customer_transfer',
      parser_hint: 'android-listener-runtime-redacted',
      signal_quality_hint: 50,
      redacted_title: 'Transfer <AMOUNT> <CURRENCY>',
      redacted_body: 'Transfer from <PHONE>. <REFERENCE>',
      raw_text_present: false
    };

    const signalWithPayloadHash = addPayloadHash(signal);
    const upload = await server.inject({
      method: 'POST',
      url: '/v1/receiver/signals',
      payload: {
        ...signalWithPayloadHash,
        signature: createReceiverSignalSignature(signalWithPayloadHash, receiverPrivateKey)
      }
    });

    expect(upload.statusCode).toBe(201);
    expect(upload.json()).toMatchObject({
      signal_id: 'sig_mobile_runtime_01',
      status: 'received',
      accepted: true,
      next_action: 'backend_decision_pending'
    });
    expect(upload.body).not.toContain('payment.confirmed');
    expect(signalRepository.storedSignals).toHaveLength(1);
    expect(signalRepository.storedSignals[0]?.payloadRedacted).toEqual({
      title_redacted: 'Transfer <AMOUNT> <CURRENCY>',
      body_redacted: 'Transfer from <PHONE>. <REFERENCE>',
      snapshot_count: 1,
      coalesced: true,
      raw_text_present: false
    });
  });

  test('maps unknown merchant receiver registration storage failures to authenticated merchant errors', async () => {
    const repository = new ForeignKeyFailingReceiverDeviceRepository();
    const server = buildReceiverServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_unknown_merchant' },
      payload: {
        device_name: 'Merchant Phone',
        public_key: receiverPublicKey
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'invalid_request',
        message: 'An authenticated merchant session is required for receiver device registration.',
        details: {}
      }
    });
    expect(response.body).not.toContain('foreign key');
    expect(response.body).not.toContain('receiver_devices');
    expect(repository.devices.size).toBe(0);
  });

  test('registers a receiver device and writes a redacted audit event', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const metrics = new InMemoryMetricsRegistry();
    const server = buildReceiverServer(repository, metrics);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_name: 'Merchant Phone',
        public_key: receiverPublicKey,
        device_install_id: 'install_01',
        app_version: '1.0.0',
        android_version: '15',
        supported_capabilities: ['notification_access', 'signed_signal_upload', 'local_redaction']
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      device_id: 'dev_test_01',
      merchant_id: 'mch_01',
      status: 'pending',
      trust_score: 0,
      server_time: '2026-05-02T11:00:00.000Z',
      required_capabilities: ['notification_access', 'signed_signal_upload', 'local_redaction']
    });
    expect(response.body).not.toContain('BEGIN PUBLIC KEY');

    expect(repository.devices.get('dev_test_01')).toMatchObject({
      id: 'dev_test_01',
      merchantId: 'mch_01',
      publicKey: receiverPublicKey,
      appVersion: '1.0.0',
      androidVersion: '15',
      notificationAccessStatus: false,
      lastHeartbeatAt: null
    });
    expect(repository.auditEvents).toEqual([
      {
        eventType: 'receiver_device.registered',
        objectType: 'receiver_device',
        objectId: 'dev_test_01'
      }
    ]);
    expect(metrics.counterValue(MetricNames.RECEIVER_REGISTRATIONS_TOTAL)).toBe(1);
  });

  test('rejects registration without required public key', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const server = buildReceiverServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_name: 'Merchant Phone'
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('payload_invalid');
    expect(repository.devices.size).toBe(0);
  });

  test('updates heartbeat health for a registered device', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const metrics = new InMemoryMetricsRegistry();
    const server = buildReceiverServer(repository, metrics);

    await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_name: 'Merchant Phone',
        public_key: receiverPublicKey,
        app_version: '1.0.0',
        android_version: '15',
        selected_banks: ['sber_ru']
      }
    });

    const heartbeat = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/heartbeat',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_id: 'dev_test_01',
        notification_access_enabled: false,
        listener_connected: true,
        allowed_bank_profile_ids: ['sber_ru'],
        queue_length: 75,
        last_signal_observed_at: '2026-05-02T10:59:00.000Z',
        app_version: '1.0.1',
        android_version: '15',
        timestamp: '2026-05-02T11:00:00.000Z',
        signature: 'heartbeat_signature'
      }
    });

    expect(heartbeat.statusCode).toBe(200);
    expect(heartbeat.json()).toEqual({
      device_id: 'dev_test_01',
      device_status: 'notification_access_missing',
      status: 'notification_access_missing',
      notification_access: false,
      last_heartbeat_at: '2026-05-02T11:00:00.000Z',
      server_time: '2026-05-02T11:00:00.000Z',
      receiver_mode: 'attention_required',
      active_payment_sessions_count: 0,
      receiver_runtime_config: null,
      receiver_health: {
        status: 'degraded',
        notification_access: false,
        listener_connected_recently: true,
        last_heartbeat_at: '2026-05-02T11:00:00.000Z',
        encrypted_outbox_depth: 75,
        supported_bank_routes_online: 1,
        device_key_attested: true,
        app_integrity_recent: true,
        clock_skew_ms: 0
      },
      warnings: ['notification_access_disabled', 'queue_backlog_high'],
      required_actions: ['enable_notification_access', 'check_receiver_outbox']
    });

    expect(repository.devices.get('dev_test_01')).toMatchObject({
      appVersion: '1.0.1',
      status: 'notification_access_missing',
      notificationAccessStatus: false,
      lastHeartbeatAt: '2026-05-02T11:00:00.000Z'
    });
    expect(metrics.counterValue(MetricNames.RECEIVER_HEARTBEATS_TOTAL)).toBe(1);
  });

  test('derives a bank-target action state when heartbeat has no enabled banks', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const server = buildReceiverServer(repository);

    await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_name: 'Merchant Phone',
        public_key: receiverPublicKey,
        app_version: '1.0.0',
        android_version: '15'
      }
    });

    const heartbeat = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/heartbeat',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_id: 'dev_test_01',
        notification_access_enabled: true,
        listener_connected: true,
        allowed_bank_profile_ids: [],
        queue_length: 0,
        last_signal_observed_at: null,
        app_version: '1.0.1',
        android_version: '15',
        timestamp: '2026-05-02T11:00:00.000Z',
        signature: 'heartbeat_signature'
      }
    });

    expect(heartbeat.statusCode).toBe(200);
    expect(heartbeat.json()).toMatchObject({
      device_status: 'bank_targets_missing',
      receiver_mode: 'attention_required',
      warnings: ['bank_targets_missing'],
      required_actions: ['configure_bank_targets']
    });
  });
});

function generateReceiverKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  return {
    publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString().trim(),
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString().trim()
  };
}

function addPayloadHash(signal: Record<string, unknown>): Record<string, unknown> {
  const withoutPayloadHash = { ...signal };
  delete withoutPayloadHash.payload_hash;
  delete withoutPayloadHash.signature;
  return {
    ...withoutPayloadHash,
    payload_hash: createHash('sha256').update(stableStringify(withoutPayloadHash)).digest('hex')
  };
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
