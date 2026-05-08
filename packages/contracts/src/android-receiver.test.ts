import { describe, expect, it } from 'vitest';
import {
  AndroidReceiverErrorCodes,
  ReceiverSignatureAlgorithms,
  buildCanonicalReceiverSignalPayload,
  validateAndroidNotificationSnapshot,
  validateAndroidReceiverHeartbeatRequest,
  validateAndroidReceiverRegistrationRequest,
  validateAndroidReceiverSignalUploadRequest
} from './index.js';

describe('android receiver contracts', () => {
  it('validates receiver registration without exposing secrets', () => {
    const result = validateAndroidReceiverRegistrationRequest({
      device_name: 'Merchant phone',
      app_version: '0.1.0',
      android_version: '15',
      public_key: receiverPublicKeyPem(),
      device_install_id: 'install_01',
      supported_capabilities: ['notification_access', 'signed_signal_upload', 'local_redaction']
    });

    expect(result).toEqual({
      valid: true,
      value: {
        device_name: 'Merchant phone',
        app_version: '0.1.0',
        android_version: '15',
        public_key: receiverPublicKeyPem(),
        device_install_id: 'install_01',
        supported_capabilities: ['notification_access', 'signed_signal_upload', 'local_redaction']
      }
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('rejects registration without a public key', () => {
    expect(validateAndroidReceiverRegistrationRequest({ device_name: 'Merchant phone' })).toEqual({
      valid: false,
      code: AndroidReceiverErrorCodes.PAYLOAD_INVALID,
      field: 'public_key'
    });
  });

  it('rejects shared HMAC-looking receiver registration keys', () => {
    expect(
      validateAndroidReceiverRegistrationRequest({
        device_name: 'Merchant phone',
        public_key: 'spk_runtime_shared_secret'
      })
    ).toEqual({
      valid: false,
      code: AndroidReceiverErrorCodes.PAYLOAD_INVALID,
      field: 'public_key'
    });
  });

  it('validates heartbeat and derives warnings from receiver health inputs', () => {
    const result = validateAndroidReceiverHeartbeatRequest({
      device_id: 'dev_01',
      app_version: '0.1.0',
      android_version: '15',
      notification_access_enabled: false,
      listener_connected: false,
      allowed_bank_profile_ids: ['sber_ru'],
      queue_length: 75,
      last_signal_observed_at: '2026-05-02T12:00:00.000Z',
      battery_optimization_ignored: false,
      timestamp: '2026-05-02T12:01:00.000Z',
      signature: 'abcdef'
    });

    expect(result).toEqual({
      valid: true,
      value: {
        device_id: 'dev_01',
        app_version: '0.1.0',
        android_version: '15',
        notification_access_enabled: false,
        listener_connected: false,
        allowed_bank_profile_ids: ['sber_ru'],
        queue_length: 75,
        last_signal_observed_at: '2026-05-02T12:00:00.000Z',
        battery_optimization_ignored: false,
        timestamp: '2026-05-02T12:01:00.000Z',
        signature: 'abcdef'
      },
      warnings: ['notification_access_disabled', 'listener_disconnected', 'queue_backlog_high', 'battery_optimization_risk']
    });
  });

  it('marks heartbeat as action-required when no bank targets are enabled', () => {
    const result = validateAndroidReceiverHeartbeatRequest({
      device_id: 'dev_01',
      app_version: '0.1.0',
      android_version: '15',
      notification_access_enabled: true,
      listener_connected: true,
      allowed_bank_profile_ids: [],
      queue_length: 0,
      last_signal_observed_at: null,
      battery_optimization_ignored: true,
      timestamp: '2026-05-02T12:01:00.000Z',
      signature: 'abcdef'
    });

    expect(result).toMatchObject({
      valid: true,
      warnings: ['bank_targets_missing']
    });
  });

  it('validates a redacted signed signal upload contract', () => {
    const result = validateAndroidReceiverSignalUploadRequest(validSignalUpload());

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected signal upload contract to validate.');
    }
    expect(result.value).toMatchObject({
      event_id: 'evt_01',
      merchant_id: 'mch_01',
      device_id: 'dev_01',
      bank_profile_id: 'sber_ru',
      package_name: 'TO_VERIFY',
      package_cert_sha256: 'TO_VERIFY',
      snapshot_count: 2,
      coalesced: true,
      payload_hash: 'f'.repeat(64),
      amount_minor: 13700,
      currency: 'RUB',
      raw_text_present: false
    });
    expect(result.package_verification_trust).toBe('untrusted');
  });

  it.each([
    ['missing event_id', { event_id: undefined }, AndroidReceiverErrorCodes.PAYLOAD_INVALID],
    ['missing signature', { signature: undefined }, AndroidReceiverErrorCodes.SIGNATURE_MISSING],
    ['missing payload_hash', { payload_hash: undefined }, AndroidReceiverErrorCodes.PAYLOAD_INVALID],
    ['raw phone', { raw_phone: '+79991234567' }, AndroidReceiverErrorCodes.RAW_PHONE_REJECTED],
    ['raw notification flag', { raw_text_present: true }, AndroidReceiverErrorCodes.RAW_NOTIFICATION_REJECTED],
    ['raw notification body', { raw_notification_text: 'raw bank text' }, AndroidReceiverErrorCodes.RAW_NOTIFICATION_REJECTED],
    ['invalid currency', { currency: 'USD' }, AndroidReceiverErrorCodes.PAYLOAD_INVALID],
    ['decimal amount', { amount_minor: 137.5 }, AndroidReceiverErrorCodes.PAYLOAD_INVALID],
    ['counter replay', { local_counter: 0 }, AndroidReceiverErrorCodes.LOCAL_COUNTER_REPLAY],
    ['timestamp invalid', { observed_at: 'not-a-date' }, AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE]
  ] as const)('rejects invalid signal upload: %s', (_label, override, code) => {
    expect(validateAndroidReceiverSignalUploadRequest({ ...validSignalUpload(), ...override })).toMatchObject({
      valid: false,
      code
    });
  });

  it('builds deterministic canonical signed payload without the signature', () => {
    const payload = validSignalUpload();
    const withDifferentSignature = { ...payload, signature: 'different' };

    expect(buildCanonicalReceiverSignalPayload(payload)).toBe(buildCanonicalReceiverSignalPayload(withDifferentSignature));
    expect(buildCanonicalReceiverSignalPayload(payload)).not.toContain('signature');
  });

  it('declares the supported receiver signature algorithm explicitly', () => {
    expect(ReceiverSignatureAlgorithms.ECDSA_P256_SHA256_DER_V1).toBe('ecdsa_p256_sha256_der_v1');
  });

  it('validates redacted notification snapshot and rejects non-bank package markers', () => {
    expect(
      validateAndroidNotificationSnapshot({
        package_name: 'TO_VERIFY',
        notification_id: 42,
        post_time: '2026-05-02T12:00:00.000Z',
        title: '<AMOUNT> <CURRENCY>',
        text: '<PHONE> <REFERENCE>',
        text_lines: ['<PHONE>', '<AMOUNT> <CURRENCY>']
      })
    ).toMatchObject({ valid: true });

    expect(
      validateAndroidNotificationSnapshot({
        package_name: 'com.chat.example',
        notification_id: 42,
        post_time: '2026-05-02T12:00:00.000Z',
        title: 'chat message'
      })
    ).toEqual({
      valid: false,
      code: AndroidReceiverErrorCodes.PACKAGE_NOT_ALLOWED,
      field: 'package_name'
    });
  });
});

function validSignalUpload() {
  return {
    event_id: 'evt_01',
    merchant_id: 'mch_01',
    device_id: 'dev_01',
    bank_profile_id: 'sber_ru',
    package_name: 'TO_VERIFY',
    package_cert_sha256: 'TO_VERIFY',
    observed_at: '2026-05-02T12:00:00.000Z',
    received_at: '2026-05-02T12:00:01.000Z',
    notification_hash: 'a'.repeat(64),
    semantic_hash: 'b'.repeat(64),
    payload_hash: 'f'.repeat(64),
    local_counter: 11,
    snapshot_count: 2,
    coalesced: true,
    coalescing_window_ms: 750,
    first_snapshot_at: '2026-05-02T12:00:00.000Z',
    last_snapshot_at: '2026-05-02T12:00:00.500Z',
    coalesced_hash: 'c'.repeat(64),
    amount_minor: 13700,
    currency: 'RUB',
    sender_phone_hmac: 'hmac_sha256:phone',
    sender_phone_masked: '+7 *** *** **67',
    reference_hmac: 'hmac_sha256:reference',
    reference_code_masked: 'SWP-A***',
    direction_hint: 'incoming_customer_transfer',
    parser_hint: 'android-local-v1',
    signal_quality_hint: 80,
    redacted_title: '<AMOUNT> <CURRENCY>',
    redacted_body: '<PHONE> <REFERENCE>',
    raw_text_present: false,
    signature: 'abcdef'
  };
}

function receiverPublicKeyPem(): string {
  return [
    '-----BEGIN PUBLIC KEY-----',
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiY7GDh0qtB+VSl73IXZdMEaM',
    'C6/8oH3Iv0uJ9+QWm2YyPTrTjBznXLa3HoRrP6+uG81Svu0OJEhS1m3jIw==',
    '-----END PUBLIC KEY-----'
  ].join('\n');
}
