import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSafeReceiverShadowFlags,
  evaluateRealNotificationShadowConsentGate,
  evaluateShadowAutoConfirmPrediction,
  validateRealNotificationRedactionPreflight
} from '../packages/contracts/src/index.js';

const root = process.cwd();
const fiveBankIds = ['sber_ru', 'tbank_ru', 'vtb_ru', 'alfa_ru', 'gazprombank_ru'] as const;

describe('Sprint 6E real notification shadow readiness gate', () => {
  test('creates Sprint 6E task files and closeout report', () => {
    const requiredFiles = [
      'tasks/324_real_notification_shadow_consent_gate.md',
      'tasks/325_real_notification_redaction_preflight.md',
      'tasks/326_five_bank_shadow_readiness_matrix.md',
      'tasks/327_receiver_real_notification_shadow_mode_flags.md',
      'tasks/328_real_notification_shadow_dry_run_commands.md',
      'tasks/329_shadow_prediction_non_mutating_policy.md',
      'tasks/330_beta_go_no_go_rehearsal.md',
      'tasks/331_sprint_6e_closeout_review.md',
      'docs/REAL_NOTIFICATION_SHADOW_DRY_RUN.md',
      '.swimpay-agent/SPRINT_6E_REPORT.md'
    ];

    for (const file of requiredFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_6E_REPORT.md'), 'utf8');
    expect(report).toMatch(/status:\s*(PASS|passed)/);
    expect(report).toContain('real notification shadow');
  });

  test('blocks real notification shadow by default until flags and consent are explicit', () => {
    const safeDefaults = buildSafeReceiverShadowFlags({});
    expect(safeDefaults).toEqual({
      realNotificationShadowEnabled: false,
      requireRealNotificationConsent: true,
      realBankAutoConfirm: false,
      shadowAutoConfirmPrediction: true,
      rawNotificationStorage: false
    });

    expect(
      evaluateRealNotificationShadowConsentGate({
        flags: safeDefaults,
        operatorConsent: true,
        merchantConsent: true,
        selectedBankProfileId: 'sber_ru',
        bankReviewOnlyReady: true,
        notificationListenerAccessEnabled: true,
        backendHealthy: true,
        outboxHealthy: true
      })
    ).toMatchObject({
      allowed: false,
      mode: 'blocked',
      requiredActions: ['enable_real_notification_shadow_flag']
    });

    expect(
      evaluateRealNotificationShadowConsentGate({
        flags: buildSafeReceiverShadowFlags({
          SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED: 'true',
          SWIMPAY_REAL_BANK_AUTO_CONFIRM: 'false',
          SWIMPAY_RAW_NOTIFICATION_STORAGE: 'false'
        }),
        operatorConsent: true,
        merchantConsent: true,
        selectedBankProfileId: 'sber_ru',
        bankReviewOnlyReady: true,
        notificationListenerAccessEnabled: true,
        backendHealthy: true,
        outboxHealthy: true
      })
    ).toEqual({
      allowed: true,
      mode: 'shadow_review_only_ready',
      requiredActions: [],
      warnings: ['real_notification_shadow_review_only']
    });
  });

  test('requires consent, selected bank, listener access, backend and outbox health', () => {
    const result = evaluateRealNotificationShadowConsentGate({
      flags: buildSafeReceiverShadowFlags({ SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED: 'true' }),
      operatorConsent: false,
      merchantConsent: false,
      selectedBankProfileId: undefined,
      bankReviewOnlyReady: false,
      notificationListenerAccessEnabled: false,
      backendHealthy: false,
      outboxHealthy: false
    });

    expect(result.allowed).toBe(false);
    expect(result.requiredActions).toEqual(
      expect.arrayContaining([
        'operator_consent_required',
        'merchant_consent_required',
        'bank_selection_required',
        'bank_review_only_status_required',
        'notification_listener_access_required',
        'backend_health_required',
        'outbox_health_required'
      ])
    );
  });

  test('rejects raw notification and customer data before shadow upload or storage', () => {
    expect(
      validateRealNotificationRedactionPreflight({
        redacted_title: 'Incoming <AMOUNT> <CURRENCY>',
        redacted_body: 'From <PERSON> <PHONE>. <REFERENCE>',
        amount_minor: 13700,
        currency: 'RUB',
        sender_phone_hmac: 'hmac_sha256:phone',
        reference_hmac: 'hmac_sha256:reference',
        reason_codes: ['review_only_bank_signal']
      })
    ).toMatchObject({ valid: true });

    for (const payload of [
      { raw_notification_text: 'real bank notification text' },
      { raw_title: 'Поступление 137 ₽' },
      { raw_body: 'Перевод от +79991234567' },
      { customer_name: 'Real Customer' },
      { redacted_body: 'Transfer from +79991234567' }
    ]) {
      expect(validateRealNotificationRedactionPreflight(payload), JSON.stringify(payload)).toMatchObject({
        valid: false
      });
    }
  });

  test('keeps shadow auto-confirm prediction non-mutating and separate from webhook confirmation', () => {
    const prediction = evaluateShadowAutoConfirmPrediction({
      amountExact: true,
      currencyExact: true,
      incomingCustomerTransfer: true,
      senderPhoneOrReferenceExact: true,
      noCollision: true,
      deviceTrusted: true,
      bankProfileTrusted: false,
      templateReliable: false,
      uniqueEventId: true,
      uniqueNotificationHash: true,
      signalUnused: true,
      activeOrderAndSession: true
    });

    expect(prediction).toEqual({
      would_auto_confirm: false,
      confidence_score: expect.any(Number),
      missing_gates: ['bank_profile_trusted', 'template_reliable'],
      reason_codes: expect.arrayContaining(['shadow_prediction_only', 'review_only_bank_signal']),
      mutates_order: false,
      emits_payment_confirmed_webhook: false,
      releases_fulfillment: false,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
  });

  test('documents five-bank readiness and beta no-go conditions without marking real shadow passed', () => {
    const matrix = readFileSync(join(root, 'docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md'), 'utf8');
    const dryRun = readFileSync(join(root, 'docs/REAL_NOTIFICATION_SHADOW_DRY_RUN.md'), 'utf8');
    const readiness = readFileSync(join(root, 'docs/PRIVATE_BETA_READINESS.md'), 'utf8');
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_6E_REPORT.md'), 'utf8');

    for (const bankId of fiveBankIds) {
      expect(matrix).toContain(bankId);
      expect(matrix).toContain('redaction_preflight_ready');
      expect(matrix).toContain('shadow_consent_ready');
      expect(matrix).toContain('real_notification_shadow_status');
    }

    for (const content of [matrix, dryRun, readiness, report]) {
      expect(content).toContain('SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=false');
      expect(content).toContain('SWIMPAY_REAL_BANK_AUTO_CONFIRM=false');
      expect(content).toContain('SWIMPAY_RAW_NOTIFICATION_STORAGE=false');
      expect(content).toContain('official_bank_confirmation=false');
      expect(content).toContain('confirmation_type=notification_signal');
      expect(content).not.toContain('official_bank_confirmation=true');
      expect(content).not.toContain('bank_confirmed');
      expect(content).not.toContain('guaranteed_payment');
      expect(content).not.toContain('real_notification_shadow_status=passed');
    }
  });
});
