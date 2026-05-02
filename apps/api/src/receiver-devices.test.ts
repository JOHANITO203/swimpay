import { describe, expect, test } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import { buildApiServer } from './server.js';
import type {
  CreateReceiverDeviceInput,
  ReceiverDeviceRepository,
  StoredReceiverDeviceRecord,
  UpdateReceiverHeartbeatInput
} from './receiver-devices.js';

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
      status: input.notificationAccessStatus && input.listenerConnected ? 'active' : 'degraded',
      notificationAccessStatus: input.notificationAccessStatus,
      lastHeartbeatAt: input.heartbeatAt,
      updatedAt: input.heartbeatAt
    };

    this.devices.set(device.id, updated);
    return updated;
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

describe('receiver device api', () => {
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
        public_key: 'base64_public_key',
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
    expect(response.body).not.toContain('base64_public_key');

    expect(repository.devices.get('dev_test_01')).toMatchObject({
      id: 'dev_test_01',
      merchantId: 'mch_01',
      publicKey: 'base64_public_key',
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
        public_key: 'base64_public_key',
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
      device_status: 'degraded',
      status: 'degraded',
      notification_access: false,
      last_heartbeat_at: '2026-05-02T11:00:00.000Z',
      server_time: '2026-05-02T11:00:00.000Z',
      receiver_mode: 'attention_required',
      active_payment_sessions_count: 0,
      warnings: ['notification_access_disabled', 'queue_backlog_high'],
      required_actions: ['enable_notification_access', 'check_receiver_outbox']
    });

    expect(repository.devices.get('dev_test_01')).toMatchObject({
      appVersion: '1.0.1',
      status: 'degraded',
      notificationAccessStatus: false,
      lastHeartbeatAt: '2026-05-02T11:00:00.000Z'
    });
    expect(metrics.counterValue(MetricNames.RECEIVER_HEARTBEATS_TOTAL)).toBe(1);
  });
});
