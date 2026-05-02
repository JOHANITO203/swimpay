import { describe, expect, test } from 'vitest';
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

function buildReceiverServer(repository: InMemoryReceiverDeviceRepository) {
  return buildApiServer({
    environment: 'test',
    receiverDeviceRepository: repository,
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
    const server = buildReceiverServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/receiver-devices/register',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        device_name: 'Merchant Phone',
        public_key: 'base64_public_key',
        app_version: '1.0.0',
        android_version: '15',
        selected_banks: ['sber_ru', 'tbank_ru']
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      device_id: 'dev_test_01',
      status: 'pending',
      trust_score: 0
    });

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
  });

  test('updates heartbeat health for a registered device', async () => {
    const repository = new InMemoryReceiverDeviceRepository();
    const server = buildReceiverServer(repository);

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
        notification_access: true,
        listener_connected: true,
        allowed_banks: ['sber_ru'],
        queue_length: 0,
        last_signal_at: null,
        app_version: '1.0.1',
        status: 'healthy'
      }
    });

    expect(heartbeat.statusCode).toBe(200);
    expect(heartbeat.json()).toEqual({
      device_id: 'dev_test_01',
      status: 'active',
      notification_access: true,
      last_heartbeat_at: '2026-05-02T11:00:00.000Z'
    });

    expect(repository.devices.get('dev_test_01')).toMatchObject({
      appVersion: '1.0.1',
      status: 'active',
      notificationAccessStatus: true,
      lastHeartbeatAt: '2026-05-02T11:00:00.000Z'
    });
  });
});
