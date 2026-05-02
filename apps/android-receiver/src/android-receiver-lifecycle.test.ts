import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BankPackageVerificationStatuses,
  ReceiverOutboxStatuses,
  buildReceiverHealthStatus,
  buildSignedHeartbeatPayload,
  buildSignedSignalUploadPayload,
  createHmacSignalSigner,
  createReceiverApiClient,
  createReceiverLocalSmokePlan,
  createRetryingEncryptedOutbox,
  type AllowedBankProfile,
  type ReceiverHttpTransport
} from './index.js';

const syntheticBank: AllowedBankProfile = {
  bankProfileId: 'bank_synthetic_v1',
  packageName: 'test.bank.synthetic',
  packageCertSha256: 'synthetic_cert_sha256_v1',
  verificationStatus: BankPackageVerificationStatuses.Verified,
  strictVerification: true
};

describe('receiver lifecycle clients', () => {
  it('registers a device against a configured backend without exposing secrets', async () => {
    const transport = new RecordingTransport({
      status: 201,
      body: {
        device_id: 'dev_01',
        merchant_id: 'mch_01',
        status: 'pending',
        server_time: '2026-05-02T09:00:00.000Z',
        required_capabilities: ['notification_access', 'signed_signal_upload'],
        warnings: []
      }
    });
    const client = createReceiverApiClient({
      baseUrl: 'http://localhost:3000',
      merchantAuthToken: 'local_merchant_token',
      transport
    });

    const response = await client.registerDevice({
      deviceName: 'Counter phone',
      appVersion: '0.1.0',
      androidVersion: '14',
      publicKey: 'local_receiver_public_key',
      deviceInstallId: 'install_01',
      supportedCapabilities: ['notification_access', 'signed_signal_upload', 'local_redaction']
    });

    expect(response).toMatchObject({ deviceId: 'dev_01', status: 'pending' });
    expect(transport.requests[0]).toMatchObject({
      method: 'POST',
      url: 'http://localhost:3000/v1/receiver-devices/register'
    });
    expect(transport.requests[0]?.headers.authorization).toBe('Bearer local_merchant_token');
    expect(transport.requests[0]?.body).toMatchObject({
      device_name: 'Counter phone',
      app_version: '0.1.0',
      android_version: '14',
      public_key: 'local_receiver_public_key',
      device_install_id: 'install_01'
    });
    expect(JSON.stringify(response)).not.toContain('local_merchant_token');
    expect(JSON.stringify(transport.requests[0]?.body)).not.toContain('secret');
  });

  it('surfaces failed registration responses without swallowing errors', async () => {
    const client = createReceiverApiClient({
      baseUrl: 'http://localhost:3000',
      transport: new RecordingTransport({
        status: 400,
        body: { error: 'payload_invalid', message: 'public_key is required' }
      })
    });

    await expect(
      client.registerDevice({
        deviceName: 'Counter phone',
        appVersion: '0.1.0',
        androidVersion: '14',
        publicKey: 'local_receiver_public_key',
        deviceInstallId: 'install_01',
        supportedCapabilities: ['notification_access']
      })
    ).rejects.toThrow('Receiver API request failed: 400 payload_invalid');
  });

  it('builds and sends a signed heartbeat payload with parsed warnings and no PII', async () => {
    const signer = createHmacSignalSigner('heartbeat_secret');
    const heartbeat = buildSignedHeartbeatPayload(
      {
        deviceId: 'dev_01',
        appVersion: '0.1.0',
        androidVersion: '14',
        notificationAccessEnabled: false,
        listenerConnected: false,
        allowedBankProfileIds: ['bank_synthetic_v1'],
        queueLength: 55,
        lastSignalObservedAt: '2026-05-02T09:00:00.000Z',
        batteryOptimizationIgnored: false,
        timestamp: '2026-05-02T09:00:01.000Z'
      },
      signer
    );

    expect(heartbeat.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(heartbeat).toMatchObject({
      device_id: 'dev_01',
      notification_access_enabled: false,
      listener_connected: false,
      queue_length: 55
    });
    expect(JSON.stringify(heartbeat)).not.toContain('+7');

    const client = createReceiverApiClient({
      baseUrl: 'http://localhost:3000',
      transport: new RecordingTransport({
        status: 200,
        body: {
          device_status: 'degraded',
          server_time: '2026-05-02T09:00:02.000Z',
          receiver_mode: 'attention_required',
          active_payment_sessions_count: 1,
          warnings: ['notification_access_disabled', 'listener_disconnected', 'queue_backlog_high'],
          required_actions: ['enable_notification_access']
        }
      })
    });

    const response = await client.sendHeartbeat(heartbeat);

    expect(response.warnings).toEqual([
      'notification_access_disabled',
      'listener_disconnected',
      'queue_backlog_high'
    ]);
    expect(JSON.stringify(response)).not.toContain('confirmed');
  });

  it('builds a signed signal upload payload that rejects raw phone and notification text', () => {
    const signer = createHmacSignalSigner('signal_secret');

    expect(() =>
      buildSignedSignalUploadPayload(
        {
          eventId: 'evt_01',
          merchantId: 'mch_01',
          deviceId: 'dev_01',
          bankProfile: syntheticBank,
          observedAt: '2026-05-02T09:00:00.000Z',
          notificationHash: 'a'.repeat(64),
          semanticHash: 'b'.repeat(64),
          localCounter: 1,
          snapshotCount: 1,
          coalesced: true,
          amountMinor: 13700,
          currency: 'RUB',
          rawTextPresent: false,
          redactedTitle: 'Transfer <AMOUNT> <CURRENCY>',
          redactedBody: 'Transfer from <PHONE>',
          rawPhone: '+7 999 111-22-33'
        },
        signer
      )
    ).toThrow('raw phone fields are not allowed in receiver signal uploads');

    expect(() =>
      buildSignedSignalUploadPayload(
        {
          eventId: 'evt_02',
          merchantId: 'mch_01',
          deviceId: 'dev_01',
          bankProfile: syntheticBank,
          observedAt: '2026-05-02T09:00:00.000Z',
          notificationHash: 'c'.repeat(64),
          localCounter: 2,
          snapshotCount: 1,
          coalesced: false,
          rawTextPresent: true,
          rawNotificationText: 'Incoming transfer +7 999 111-22-33'
        },
        signer
      )
    ).toThrow('raw notification text is not allowed in receiver signal uploads');

    const payload = buildSignedSignalUploadPayload(
      {
        eventId: 'evt_03',
        merchantId: 'mch_01',
        deviceId: 'dev_01',
        bankProfile: {
          ...syntheticBank,
          packageCertSha256: 'TO_VERIFY',
          verificationStatus: BankPackageVerificationStatuses.ToVerify
        },
        observedAt: '2026-05-02T09:00:00.000Z',
        notificationHash: 'd'.repeat(64),
        localCounter: 3,
        snapshotCount: 1,
        coalesced: false,
        amountMinor: 13700,
        currency: 'RUB',
        senderPhoneHmac: 'hmac_phone',
        senderPhoneMasked: '+7 *** *** **33',
        directionHint: 'incoming_customer_transfer',
        parserHint: 'android-local-v1',
        signalQualityHint: 80,
        redactedTitle: 'Transfer <AMOUNT> <CURRENCY>',
        redactedBody: 'Transfer from <PHONE>',
        rawTextPresent: false
      },
      signer
    );

    expect(payload.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.raw_text_present).toBe(false);
    expect(payload.package_cert_sha256).toBe('TO_VERIFY');
    expect(payload.package_verification_trust).toBe('untrusted');
    expect(JSON.stringify(payload)).not.toContain('+7 999');
    expect(JSON.stringify(payload)).not.toContain('official_bank_confirmation');
  });

  it('uploads a signed signal and treats accepted as backend decision pending only', async () => {
    const transport = new RecordingTransport({
      status: 201,
      body: {
        signal_id: 'sig_01',
        status: 'received',
        accepted: true,
        reason_codes: [],
        server_time: '2026-05-02T09:00:03.000Z',
        next_action: 'backend_decision_pending'
      }
    });
    const client = createReceiverApiClient({ baseUrl: 'http://localhost:3000', transport });
    const payload = buildSignedSignalUploadPayload(
      {
        eventId: 'evt_04',
        merchantId: 'mch_01',
        deviceId: 'dev_01',
        bankProfile: syntheticBank,
        observedAt: '2026-05-02T09:00:00.000Z',
        notificationHash: 'e'.repeat(64),
        localCounter: 4,
        snapshotCount: 1,
        coalesced: true,
        rawTextPresent: false,
        redactedBody: 'Transfer <AMOUNT> <CURRENCY> from <PHONE>'
      },
      createHmacSignalSigner('signal_secret')
    );

    const response = await client.uploadSignal(payload);

    expect(response).toMatchObject({ accepted: true, nextAction: 'backend_decision_pending' });
    expect(JSON.stringify(response)).not.toContain('payment_confirmed');
    expect(JSON.stringify(response)).not.toContain('official_bank_confirmation');
    expect(transport.requests[0]?.url).toBe('http://localhost:3000/v1/receiver/signals');
    expect(JSON.stringify(transport.requests[0]?.body)).not.toContain('+7 999');
  });
});

describe('receiver encrypted outbox and health model', () => {
  it('dedupes, retries, acks and expires redacted signed payloads without raw PII', () => {
    const outbox = createRetryingEncryptedOutbox({
      now: () => new Date('2026-05-02T09:00:00.000Z'),
      ttlMs: 60_000,
      encryptor: { encrypt: (payload) => `encrypted:${JSON.stringify(payload)}` }
    });
    const payload = buildSignedSignalUploadPayload(
      {
        eventId: 'evt_outbox_01',
        merchantId: 'mch_01',
        deviceId: 'dev_01',
        bankProfile: syntheticBank,
        observedAt: '2026-05-02T09:00:00.000Z',
        notificationHash: 'f'.repeat(64),
        localCounter: 1,
        snapshotCount: 1,
        coalesced: false,
        rawTextPresent: false,
        redactedBody: 'Transfer from <PHONE>'
      },
      createHmacSignalSigner('signal_secret')
    );

    const first = outbox.enqueue(payload);
    const duplicate = outbox.enqueue(payload);

    expect(first.eventId).toBe(duplicate.eventId);
    expect(outbox.records).toHaveLength(1);
    expect(outbox.records[0]?.state).toBe(ReceiverOutboxStatuses.PendingUpload);
    expect(outbox.records[0]?.encryptedPayload).not.toContain('+7 999');

    outbox.markUploading(first.eventId, new Date('2026-05-02T09:00:01.000Z'));
    outbox.markFailedRetrying(first.eventId, new Date('2026-05-02T09:00:01.000Z'), 'network unavailable');

    expect(outbox.records[0]).toMatchObject({
      attemptCount: 1,
      state: ReceiverOutboxStatuses.FailedRetrying,
      nextRetryAt: '2026-05-02T09:00:31.000Z'
    });

    outbox.markAcked(first.eventId, new Date('2026-05-02T09:00:31.000Z'));
    expect(outbox.records[0]?.state).toBe(ReceiverOutboxStatuses.Acked);
    expect(outbox.records[0]?.ackReceivedAt).toBe('2026-05-02T09:00:31.000Z');

    const expired = outbox.enqueue({
      ...payload,
      event_id: 'evt_outbox_02',
      notification_hash: '1'.repeat(64),
      local_counter: 2
    });
    outbox.expireDue(new Date('2026-05-02T09:02:01.000Z'));
    expect(outbox.records.find((record) => record.eventId === expired.eventId)?.state).toBe(ReceiverOutboxStatuses.Expired);
  });

  it('derives safe receiver health warnings without sensitive values', () => {
    const health = buildReceiverHealthStatus({
      notificationAccessEnabled: false,
      listenerConnected: false,
      allowedBanks: [
        {
          ...syntheticBank,
          packageCertSha256: 'TO_VERIFY',
          verificationStatus: BankPackageVerificationStatuses.ToVerify
        }
      ],
      queueLength: 75,
      lastSignalObservedAt: '2026-05-02T09:00:00.000Z',
      lastUploadAt: undefined,
      appVersion: '0.1.0',
      deviceStatus: 'pending',
      backendReachable: false,
      batteryOptimizationIgnored: false
    });

    expect(health).toMatchObject({
      notification_access_enabled: false,
      listener_connected: false,
      allowed_banks_count: 1,
      trusted_banks_count: 0,
      queue_length: 75,
      device_status: 'pending'
    });
    expect(health.warnings).toEqual(
      expect.arrayContaining([
        'notification_access_disabled',
        'listener_disconnected',
        'all_banks_untrusted',
        'queue_backlog_high',
        'backend_unreachable',
        'battery_optimization_risk'
      ])
    );
    expect(JSON.stringify(health)).not.toContain('+7');
    expect(JSON.stringify(health)).not.toContain('secret');
  });

  it('defines a local backend smoke plan without requiring a real Android device', () => {
    const plan = createReceiverLocalSmokePlan('http://localhost:3000');

    expect(plan.requiresRealAndroidDevice).toBe(false);
    expect(plan.steps.map((step) => step.name)).toEqual([
      'register_receiver_device',
      'send_signed_heartbeat',
      'upload_synthetic_redacted_signal',
      'verify_backend_decision_pending',
      'verify_to_verify_routes_to_review'
    ]);
    expect(JSON.stringify(plan)).not.toContain('payment_confirmed');
    expect(JSON.stringify(plan)).not.toContain('bank_confirmed');
  });

  it('does not introduce SMS, scraping or local payment confirmation APIs', () => {
    const sourceFiles = [
      'apps/android-receiver/src/index.ts',
      'apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt',
      'apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt'
    ];
    const source = sourceFiles.map((file) => readFileSync(join(process.cwd(), file), 'utf8')).join('\n');

    expect(source).not.toMatch(/android\.provider\.Telephony|READ_SMS|SmsMessage/u);
    expect(source).not.toMatch(/AccessibilityService|getRootInActiveWindow|performGlobalAction/u);
    expect(source).not.toContain('bank_confirmed');
    expect(source).not.toContain('official_bank_confirmation');
  });
});

class RecordingTransport implements ReceiverHttpTransport {
  public readonly requests: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  }[] = [];

  public constructor(private readonly response: { status: number; body: unknown }) {}

  public async request(input: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  }): Promise<{ status: number; body: unknown }> {
    this.requests.push(input);
    return this.response;
  }
}
