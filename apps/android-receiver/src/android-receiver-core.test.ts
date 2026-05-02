import { describe, expect, it } from 'vitest';
import {
  AesGcmPayloadEncryptor,
  InMemoryEncryptedOutbox,
  NotificationAccessStatus,
  buildHeartbeatPayload,
  createHmacSignalSigner,
  processAndroidNotification,
  type AndroidNotificationInput
} from './index.js';

const allowedBank = {
  bankProfileId: 'bank_sber_v1',
  packageName: 'ru.sberbankmobile',
  packageCertSha256: 'cert_sha256_test_only',
  strictVerification: true
};

const notification: AndroidNotificationInput = {
  packageName: 'ru.sberbankmobile',
  packageCertSha256: 'cert_sha256_test_only',
  notificationId: 42,
  tag: 'transfer',
  key: '0|ru.sberbankmobile|42|transfer|1000',
  postTime: '2026-05-02T07:50:00.000Z',
  channelId: 'payments',
  groupKey: 'bank',
  sortKey: '001',
  extras: {
    title: 'Sberbank',
    titleBig: 'Incoming transfer',
    text: 'Transfer +7 999 111-22-33 137.00 RUB',
    bigText: 'Incoming transfer from +7 999 111-22-33 for 137.00 RUB',
    subText: 'Card *1234',
    summaryText: 'Transfer received',
    textLines: ['Incoming transfer', '+7 999 111-22-33', '137.00 RUB']
  },
  tickerText: 'Incoming transfer'
};

describe('android receiver core', () => {
  it('ignores non-allowlisted notification packages locally', async () => {
    const outbox = new InMemoryEncryptedOutbox();

    const result = await processAndroidNotification({
      notification: { ...notification, packageName: 'com.chat.example' },
      allowedBanks: [allowedBank],
      deviceId: 'dev_01',
      merchantId: 'merch_01',
      encryptor: new AesGcmPayloadEncryptor('0123456789abcdef0123456789abcdef'),
      outbox,
      signer: createHmacSignalSigner('device-secret'),
      now: () => new Date('2026-05-02T07:50:01.000Z')
    });

    expect(result.kind).toBe('ignored');
    if (result.kind !== 'ignored') {
      throw new Error('Expected notification to be ignored');
    }
    expect(result.reason).toBe('package_not_allowlisted');
    expect(outbox.records).toHaveLength(0);
  });

  it('extracts all bank notification snapshot fields', async () => {
    const outbox = new InMemoryEncryptedOutbox();

    const result = await processAndroidNotification({
      notification,
      allowedBanks: [allowedBank],
      deviceId: 'dev_01',
      merchantId: 'merch_01',
      encryptor: new AesGcmPayloadEncryptor('0123456789abcdef0123456789abcdef'),
      outbox,
      signer: createHmacSignalSigner('device-secret'),
      now: () => new Date('2026-05-02T07:50:01.000Z')
    });

    expect(result.kind).toBe('queued');
    if (result.kind !== 'queued') {
      throw new Error('Expected notification to be queued');
    }
    expect(result.snapshot.title).toBe('Sberbank');
    expect(result.snapshot.titleBig).toBe('Incoming transfer');
    expect(result.snapshot.body).toBe('Transfer +7 999 111-22-33 137.00 RUB');
    expect(result.snapshot.bigText).toContain('Incoming transfer');
    expect(result.snapshot.subText).toBe('Card *1234');
    expect(result.snapshot.textLines).toEqual(['Incoming transfer', '+7 999 111-22-33', '137.00 RUB']);
  });

  it('persists encrypted outbox before upload and builds a signed upload envelope', async () => {
    const outbox = new InMemoryEncryptedOutbox();

    const result = await processAndroidNotification({
      notification,
      allowedBanks: [allowedBank],
      deviceId: 'dev_01',
      merchantId: 'merch_01',
      encryptor: new AesGcmPayloadEncryptor('0123456789abcdef0123456789abcdef'),
      outbox,
      signer: createHmacSignalSigner('device-secret'),
      now: () => new Date('2026-05-02T07:50:01.000Z')
    });

    expect(result.kind).toBe('queued');
    if (result.kind !== 'queued') {
      throw new Error('Expected notification to be queued');
    }
    expect(outbox.records).toHaveLength(1);
    expect(outbox.records[0]?.state).toBe('pending_upload');
    expect(outbox.records[0]?.eventId).toBe(result.upload.event_id);
    expect(outbox.records[0]?.encryptedPayload).not.toContain('+7 999 111-22-33');
    expect(outbox.records[0]?.encryptedPayload).not.toContain(notification.extras.bigText ?? '');
    expect(result.upload.event_id).toMatch(/^evt_/);
    expect(result.upload.notification_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.upload.local_counter).toBe(1);
    expect(result.upload.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(result.upload.payload.redacted_text).toContain('<PHONE>');
    expect(result.upload.payload.redacted_text).toContain('<AMOUNT>');
  });

  it('builds heartbeat payload without payment decision data', () => {
    const heartbeat = buildHeartbeatPayload({
      deviceId: 'dev_01',
      notificationAccessStatus: NotificationAccessStatus.Enabled,
      listenerConnected: true,
      selectedBankProfileIds: ['bank_sber_v1'],
      queueLength: 2,
      lastSignalAt: '2026-05-02T07:50:01.000Z',
      appVersion: '0.1.0',
      androidVersion: '14',
      healthStatus: 'healthy'
    });

    expect(heartbeat).toEqual({
      device_id: 'dev_01',
      notification_access_status: 'enabled',
      listener_status: 'connected',
      selected_bank_profile_ids: ['bank_sber_v1'],
      queue_length: 2,
      last_signal_at: '2026-05-02T07:50:01.000Z',
      app_version: '0.1.0',
      android_version: '14',
      health_status: 'healthy'
    });
    expect(JSON.stringify(heartbeat)).not.toContain('confirmed');
  });
});
