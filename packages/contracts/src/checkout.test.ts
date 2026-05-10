import { describe, expect, it } from 'vitest';
import {
  BuyerSafeCheckoutStatuses,
  CheckoutSessionStates,
  PayerBankLauncherRegistry,
  ReceivingRouteReviewPolicies,
  ReceivingRouteRiskReasonCodes,
  ReceivingRouteRailTypes,
  ReceiverIdentifierTypes,
  V1ReceiverBankOptions,
  generateHumanReadablePaymentReference,
  getPayerBankLauncherOption,
  getReceiverBankOption,
  isCheckoutStatePaymentConfirming,
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState,
  maskReceiverIdentifier,
  toBuyerSafeReceivingRoute
} from './index.js';

describe('checkout bank selection contracts', () => {
  it('declares five review-only receiver bank options without auto-confirm implications', () => {
    expect(V1ReceiverBankOptions.map((bank) => bank.bank_profile_id)).toEqual([
      'sber_ru',
      'tbank_ru',
      'vtb_ru',
      'alfa_ru',
      'gazprombank_ru'
    ]);

    for (const option of V1ReceiverBankOptions) {
      expect(option.status).toBe('review_required_beta');
      expect(option.review_only).toBe(true);
      expect(option.detection_supported).toBe(true);
      expect(option.beta_ready).toBe(true);
      expect(option.auto_confirm_enabled).toBe(false);
      expect(option.official_bank_confirmation).toBe(false);
    }

    expect(getReceiverBankOption('sber_ru')?.display_name).toBe('Sberbank');
    expect(getReceiverBankOption('unknown')).toBeNull();
  });

  it('declares observed payer bank launchers as UX-only package launch options', () => {
    expect(PayerBankLauncherRegistry.map((launcher) => launcher.payer_bank_launcher_id)).toEqual([
      'sber_ru',
      'tbank_ru',
      'vtb_ru',
      'alfa_ru',
      'gazprombank_ru',
      'ozon_bank'
    ]);

    for (const launcher of PayerBankLauncherRegistry) {
      expect(launcher.bank_id).toBe(launcher.payer_bank_launcher_id);
      expect(launcher.android_package_candidates.length).toBeGreaterThan(0);
      expect(launcher.deeplink_uri_template).toBeNull();
      expect(launcher.launch_url).toBe(`intent://#Intent;package=${launcher.android_package_hint};end`);
      expect(launcher.fallback_strategy).toBe('copy_details_manual_transfer');
      expect(launcher.can_prefill_receiver_card).toBe(false);
      expect(launcher.can_prefill_receiver_phone).toBe(false);
      expect(launcher.can_prefill_amount).toBe(false);
      expect(launcher.can_prefill_reference).toBe(false);
      expect(launcher.tested_status).toBe('not_validated');
      expect(launcher.does_not_confirm_payment).toBe(true);
      expect(launcher.official_bank_confirmation).toBe(false);
      expect(launcher.detection_supported).toBe(false);
    }

    expect(getPayerBankLauncherOption('sber_ru')?.android_package_hint).toBe('ru.sberbankmobile');
    expect(getPayerBankLauncherOption('ozon_bank')).toMatchObject({
      android_package_hint: 'ru.ozon.fintech.finance',
      detection_supported: false,
      tested_status: 'not_validated'
    });
    expect(getReceiverBankOption('ozon_bank')).toBeNull();
    expect(getPayerBankLauncherOption('tbank_ru')?.deeplink_schemes).toContain('tbank');
    expect(getPayerBankLauncherOption('vtb_ru')?.deeplink_schemes).toContain('vtb');
    expect(getPayerBankLauncherOption('gazprombank_ru')?.deeplink_schemes).toContain('gpbapp');
    expect(getPayerBankLauncherOption('unknown')).toBeNull();
  });

  it('maps checkout states to buyer-safe statuses without confirming early states', () => {
    expect(CheckoutSessionStates).toContain('buyer_identity');
    expect(CheckoutSessionStates).toContain('receiver_bank_selection');
    expect(BuyerSafeCheckoutStatuses).toEqual([
      'awaiting_payment',
      'searching_signal',
      'signal_detected',
      'needs_review',
      'confirmed',
      'expired',
      'not_validated'
    ]);

    expect(mapCheckoutStateToBuyerSafeStatus('buyer_identity')).toBe('not_validated');
    expect(mapCheckoutStateToBuyerSafeStatus('receiver_bank_selection')).toBe('not_validated');
    expect(mapCheckoutStateToBuyerSafeStatus('payment_instructions')).toBe('awaiting_payment');
    expect(mapCheckoutStateToBuyerSafeStatus('buyer_claimed_paid')).toBe('searching_signal');
    expect(mapCheckoutStateToBuyerSafeStatus('signal_detected')).toBe('signal_detected');
    expect(mapCheckoutStateToBuyerSafeStatus('needs_review')).toBe('needs_review');
    expect(mapCheckoutStateToBuyerSafeStatus('confirmed')).toBe('confirmed');
    expect(isCheckoutStatePaymentConfirming('buyer_claimed_paid')).toBe(false);
    expect(isCheckoutStatePaymentConfirming('signal_detected')).toBe(false);
    expect(isCheckoutStatePaymentConfirming('confirmed')).toBe(true);
  });

  it('derives checkout state from persisted session selections and runtime status', () => {
    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        paymentMethod: null,
        selectedReceiverBankId: null,
        selectedPayerBankLauncherId: null,
        paymentInstructionsShownAt: null
      })
    ).toBe('buyer_identity');

    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        paymentMethod: 'card',
        selectedReceiverBankId: null,
        selectedPayerBankLauncherId: null,
        paymentInstructionsShownAt: null
      })
    ).toBe('receiver_bank_selection');

    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        paymentMethod: 'sbp',
        selectedReceiverBankId: 'sber_ru',
        selectedReceivingRouteId: null,
        selectedPayerBankLauncherId: null,
        paymentInstructionsShownAt: null
      })
    ).toBe('receiving_route_selection');

    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        paymentMethod: 'sbp',
        selectedReceiverBankId: 'sber_ru',
        selectedReceivingRouteId: 'route_sber_phone',
        selectedPayerBankLauncherId: null,
        paymentInstructionsShownAt: null
      })
    ).toBe('payer_bank_launcher_selection');

    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        paymentMethod: 'sbp',
        selectedReceiverBankId: 'sber_ru',
        selectedReceivingRouteId: 'route_sber_phone',
        selectedPayerBankLauncherId: 'tbank_ru',
        paymentInstructionsShownAt: null
      })
    ).toBe('payment_instructions');

    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'buyer_claimed_paid',
        paymentMethod: 'sbp',
        selectedReceiverBankId: 'sber_ru',
        selectedReceivingRouteId: 'route_sber_phone',
        selectedPayerBankLauncherId: 'tbank_ru',
        paymentInstructionsShownAt: '2026-05-03T12:00:00.000Z'
      })
    ).toBe('buyer_claimed_paid');

    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'manual_confirmed',
        paymentMethod: 'sbp',
        selectedReceiverBankId: 'sber_ru',
        selectedReceivingRouteId: 'route_sber_phone',
        selectedPayerBankLauncherId: 'tbank_ru',
        paymentInstructionsShownAt: '2026-05-03T12:00:00.000Z'
      })
    ).toBe('confirmed');
  });

  it('defines hybrid merchant receiving routes with masked buyer-safe output', () => {
    expect(ReceivingRouteRailTypes).toEqual(['phone_transfer', 'card_transfer']);
    expect(ReceiverIdentifierTypes).toEqual(['phone', 'card']);
    expect(ReceivingRouteReviewPolicies).toEqual(['review_first', 'eligible_low_risk_later']);

    const phoneRoute = toBuyerSafeReceivingRoute({
      route_id: 'route_sber_phone',
      merchant_id: 'mch_01',
      bank_profile_id: 'sber_ru',
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_encrypted: 'enc:v1:test',
      receiver_identifier_hmac: 'hmac_sha256:test',
      receiver_identifier_masked: '+7 *** *** **67',
      receiver_identifier_last4: '4567',
      route_code: 'SBER-PHONE',
      display_label: 'Sberbank telephone',
      enabled: true,
      recommended: true,
      review_policy: 'eligible_low_risk_later',
      fees_hint: 'Usually instant',
      lifecycle_status: 'active',
      created_at: '2026-05-03T12:00:00.000Z',
      updated_at: '2026-05-03T12:00:00.000Z'
    });

    expect(phoneRoute).toEqual({
      route_id: 'route_sber_phone',
      bank_profile_id: 'sber_ru',
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_masked: '+7 *** *** **67',
      route_code: 'SBER-PHONE',
      display_label: 'Sberbank telephone',
      enabled: true,
      recommended: true,
      review_policy: 'eligible_low_risk_later',
      fees_hint: 'Usually instant',
      copy_action_available: true,
      buyer_status_label: 'review_beta',
      official_bank_confirmation: false
    });
    expect(JSON.stringify(phoneRoute)).not.toContain('receiver_identifier_encrypted');
  });

  it('masks receiver identifiers and keeps card routes review-first by policy', () => {
    expect(maskReceiverIdentifier('phone', '+7 (999) 123-45-67')).toBe('+7 *** *** **67');
    expect(maskReceiverIdentifier('card', '2202201234567890')).toBe('2202 **** **** 7890');
    expect(ReceivingRouteRiskReasonCodes).toEqual(
      expect.arrayContaining([
        'phone_transfer_matching_hint_available',
        'buyer_sender_phone_missing',
        'card_transfer_review_required',
        'amount_only_card_transfer',
        'receiver_route_review_only',
        'receiving_route_not_selected'
      ])
    );
  });

  it('generates human-readable payment references with collision fallback', () => {
    expect(
      generateHumanReadablePaymentReference({
        merchantId: 'mch_01',
        receivingRouteId: 'route_01',
        activeReferences: new Set(),
        wordSource: ['TANGO', 'ALFA']
      })
    ).toBe('TANGO ALFA');

    expect(
      generateHumanReadablePaymentReference({
        merchantId: 'mch_01',
        receivingRouteId: 'route_01',
        activeReferences: new Set(['mch_01:route_01:TANGO ALFA']),
        wordSource: ['TANGO', 'ALFA', 'NOVA']
      })
    ).toBe('TANGO ALFA NOVA');
  });
});
