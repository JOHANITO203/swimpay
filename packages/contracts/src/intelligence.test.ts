import { describe, expect, it } from 'vitest';
import {
  buildIntentBoundLearningMetadata,
  buildUnknownShapeMonitoringRecord,
  IntelligenceNotificationCategories,
  V1StaticBankProfiles,
  validateAndroidReceiverSignalUploadRequest,
  validateIntelligenceFeedbackRequest
} from './index.js';

describe('SwimPay Intelligence V1 contracts', () => {
  it('defines controlled categories and static five-bank profiles without auto-confirm', () => {
    expect(IntelligenceNotificationCategories).toContain('incoming_customer_transfer');
    expect(IntelligenceNotificationCategories).toContain('incoming_card_transfer');
    expect(IntelligenceNotificationCategories).toContain('incoming_sbp_transfer');
    expect(IntelligenceNotificationCategories).toContain('system_notice');
    expect(V1StaticBankProfiles.map((profile) => profile.bank_profile_id)).toEqual([
      'sber_ru',
      'tbank_ru',
      'vtb_ru',
      'alfa_ru',
      'gazprombank_ru'
    ]);
    expect(V1StaticBankProfiles.every((profile) => profile.auto_confirm_enabled === false)).toBe(true);
  });

  it('accepts redacted intelligence signal metadata and rejects auto-confirm or raw text', () => {
    const safe = validateAndroidReceiverSignalUploadRequest({
      event_id: 'evt_01',
      merchant_id: 'm_01',
      device_id: 'dev_01',
      bank_profile_id: 'sber_ru',
      package_name: 'ru.sberbankmobile',
      package_cert_sha256: 'pending_verification',
      notification_hash: 'notification_v1:abc',
      shape_hash: 'shape_v1:def',
      profile_version: 'intelligence-v1',
      classification: 'incoming_customer_transfer',
      confidence: 90,
      reason_codes: ['review_first_notification_signal'],
      auto_confirm_allowed: false,
      observed_at: '2026-05-06T00:00:00.000Z',
      local_counter: 1,
      snapshot_count: 1,
      coalesced: false,
      payload_hash: 'f'.repeat(64),
      amount_minor: 50000,
      currency: 'RUB',
      raw_text_present: false,
      signature: 'abc'
    });
    const unsafeAutoConfirm = validateAndroidReceiverSignalUploadRequest({
      ...(safe.valid ? safe.value : {}),
      auto_confirm_allowed: true,
      signature: 'abc'
    });
    const unsafeRaw = validateAndroidReceiverSignalUploadRequest({
      ...(safe.valid ? safe.value : {}),
      raw_notification_text: 'Поступление 500 ₽ от Ivan',
      signature: 'abc'
    });

    expect(safe.valid).toBe(true);
    expect(safe.valid && safe.value.auto_confirm_allowed).toBe(false);
    expect(unsafeAutoConfirm.valid).toBe(false);
    expect(unsafeRaw.valid).toBe(false);
  });

  it('accepts passive feedback without raw notification text and without runtime mutation', () => {
    const safe = validateIntelligenceFeedbackRequest({
      shape_hash: 'shape_v1:abc',
      bank_profile_id: 'tbank_ru',
      package_name: 'com.idamob.tinkoff.android',
      profile_version: 'intelligence-v1',
      classification_guess: 'unknown',
      human_label: 'incoming_card_transfer',
      feedback: 'corrected',
      timestamp: '2026-05-06T00:00:00.000Z'
    });
    const unsafe = validateIntelligenceFeedbackRequest({
      shape_hash: 'shape_v1:abc',
      bank_profile_id: 'tbank_ru',
      package_name: 'com.idamob.tinkoff.android',
      profile_version: 'intelligence-v1',
      classification_guess: 'unknown',
      human_label: 'incoming_card_transfer',
      feedback: 'corrected',
      timestamp: '2026-05-06T00:00:00.000Z',
      raw_text: 'raw bank notification'
    });

    expect(safe.valid).toBe(true);
    expect(safe.valid && safe.value.mutates_runtime_rules).toBe(false);
    expect(unsafe.valid).toBe(false);
  });

  it('accepts intent-bound learning metadata without creating mutation authority', () => {
    const metadata = buildIntentBoundLearningMetadata({
      intent_relation: 'ambiguous_activity',
      active_payment_intent_present: true,
      collision_detected: true,
      payment_window_status: 'active',
      review_created: true,
      profile_version: 'intelligence-v1',
      shape_hash: 'shape_v1:intent_01'
    });
    const safe = validateIntelligenceFeedbackRequest({
      shape_hash: 'shape_v1:intent_01',
      bank_profile_id: 'sber_ru',
      package_name: 'ru.sberbankmobile',
      profile_version: 'intelligence-v1',
      classification_guess: 'unknown',
      human_label: 'incoming_customer_transfer',
      feedback: 'corrected',
      timestamp: '2026-05-06T00:00:00.000Z',
      learning_metadata: metadata
    });

    expect(safe.valid).toBe(true);
    expect(safe.valid && safe.value.learning_metadata.learning_context).toBe('intent_bound_feedback');
    expect(safe.valid && safe.value.official_bank_confirmation).toBe(false);
    expect(safe.valid && safe.value.mutates_runtime_rules).toBe(false);
    expect(safe.valid && safe.value.promotes_profile).toBe(false);
  });

  it('builds read-only unknown-shape monitoring records with safe flags', () => {
    const record = buildUnknownShapeMonitoringRecord({
      shape_hash: 'shape_v1:unknown_safe',
      bank_profile_id: 'tbank_ru',
      package_name: 'com.idamob.tinkoff.android',
      profile_version: 'intelligence-v1',
      seen_count: 2,
      first_seen_at: '2026-05-06T00:00:00.000Z',
      last_seen_at: '2026-05-06T00:01:00.000Z'
    });

    expect(record).toMatchObject({
      classification_guess: 'unknown',
      review_status: 'pending',
      read_only: true,
      learning_context: 'background_observation',
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false,
      creates_payment_review: false
    });
    expect(JSON.stringify(record)).not.toContain('raw');
  });

  it('rejects feedback payloads carrying raw card or bank credential fields', () => {
    const unsafe = validateIntelligenceFeedbackRequest({
      shape_hash: 'shape_v1:abc',
      bank_profile_id: 'sber_ru',
      package_name: 'ru.sberbankmobile',
      profile_version: 'intelligence-v1',
      classification_guess: 'unknown',
      human_label: 'incoming_customer_transfer',
      feedback: 'corrected',
      timestamp: '2026-05-06T00:00:00.000Z',
      buyer_source_card_number: '2202123412344821'
    });

    expect(unsafe.valid).toBe(false);
  });
});
