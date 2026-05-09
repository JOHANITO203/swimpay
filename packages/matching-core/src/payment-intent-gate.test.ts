import { describe, expect, it } from 'vitest';
import {
  evaluatePaymentIntentGate,
  type PaymentIntentGateIntent,
  type PaymentIntentGateSignal
} from './index.js';

const observedAt = '2026-05-06T10:05:00.000Z';

const baseSignal: PaymentIntentGateSignal = {
  merchantId: 'mch_01',
  bankProfileId: 'sber_ru',
  packageName: 'ru.sberbankmobile',
  classification: 'incoming_customer_transfer',
  amountMinor: 139035,
  currency: 'RUB',
  shapeHash: 'shape_v1:incoming',
  referenceHmac: 'ref_hmac_01',
  senderPhoneHmac: 'phone_hmac_01',
  receivingRouteId: 'route_sber_card',
  observedAt
};

const baseIntent: PaymentIntentGateIntent = {
  orderId: 'ord_01',
  paymentSessionId: 'ps_01',
  merchantId: 'mch_01',
  expectedPaymentAmountMinor: 139035,
  displayPriceMinor: 139000,
  reconciliationDeltaMinor: 35,
  currency: 'RUB',
  generatedReference: 'TANGO ALFA',
  referenceHmac: 'ref_hmac_01',
  selectedReceiverBankProfileId: 'sber_ru',
  selectedReceivingRouteId: 'route_sber_card',
  selectedReceivingMethod: 'card_transfer',
  buyerFirstName: 'Ivan',
  buyerLastName: 'Petrov',
  buyerPhoneHmac: 'phone_hmac_01',
  buyerPhoneMasked: '+7 *** *** **67',
  buyerSourceCardHmac: 'card_hmac_01',
  buyerSourceCardMasked: '2202 **** **** 4821',
  buyerSourceCardLast4: '4821',
  status: 'receiver_armed',
  validFrom: '2026-05-06T10:00:00.000Z',
  expiresAt: '2026-05-06T10:15:00.000Z'
};

const v1BankTargets = [
  ['sber_ru', 'ru.sberbankmobile'],
  ['tbank_ru', 'com.idamob.tinkoff.android'],
  ['vtb_ru', 'ru.vtb24.mobilebanking.android'],
  ['alfa_ru', 'ru.alfabank.mobile.android'],
  ['gazprombank_ru', 'ru.gazprombank.android.mobilebank.app']
] as const;

describe('payment intent gate', () => {
  it('creates an expected payment candidate only for an active exact intent match', () => {
    const result = evaluatePaymentIntentGate({
      signal: baseSignal,
      activePaymentIntents: [baseIntent]
    });

    expect(result.intentRelation).toBe('expected_payment_candidate');
    expect(result.reviewCreationAllowed).toBe(true);
    expect(result.autoConfirmAllowed).toBe(false);
    expect(result.selectedIntent?.paymentSessionId).toBe('ps_01');
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining([
        'active_payment_intent_present',
        'receiver_bank_exact',
        'receiving_route_exact',
        'expected_amount_exact',
        'currency_exact',
        'reference_exact',
        'manual_confirmation_required'
      ])
    );
    expect(result.reviewCopy).toMatchObject({
      title: 'Nouveau paiement détecté',
      label: 'Matching 100 %'
    });
  });

  it('does not create a payment review when no active payment intent exists', () => {
    const result = evaluatePaymentIntentGate({
      signal: baseSignal,
      activePaymentIntents: []
    });

    expect(result.intentRelation).toBe('unrelated_bank_activity');
    expect(result.reviewCreationAllowed).toBe(false);
    expect(result.selectedIntent).toBeUndefined();
    expect(result.reasonCodes).toContain('no_active_payment_intent');
  });

  it('blocks negative bank activity even if an active intent exists', () => {
    const result = evaluatePaymentIntentGate({
      signal: { ...baseSignal, classification: 'cashback' },
      activePaymentIntents: [baseIntent]
    });

    expect(result.intentRelation).toBe('negative_activity');
    expect(result.reviewCreationAllowed).toBe(false);
    expect(result.reasonCodes).toContain('negative_activity_never_review');
  });

  it('does not review wrong-bank notifications', () => {
    const result = evaluatePaymentIntentGate({
      signal: { ...baseSignal, bankProfileId: 'tbank_ru', packageName: 'com.idamob.tinkoff.android' },
      activePaymentIntents: [baseIntent]
    });

    expect(result.intentRelation).toBe('unrelated_bank_activity');
    expect(result.reviewCreationAllowed).toBe(false);
    expect(result.reasonCodes).toContain('receiver_bank_mismatch');
  });

  it('does not review wrong receiving-route notifications', () => {
    const result = evaluatePaymentIntentGate({
      signal: { ...baseSignal, receivingRouteId: 'route_other_card' },
      activePaymentIntents: [baseIntent]
    });

    expect(result.intentRelation).toBe('unrelated_bank_activity');
    expect(result.reviewCreationAllowed).toBe(false);
    expect(result.selectedIntent).toBeUndefined();
    expect(result.reasonCodes).toContain('receiving_route_mismatch');
  });

  it('routes amount-only active matches to cautious review', () => {
    const result = evaluatePaymentIntentGate({
      signal: { ...baseSignal, referenceHmac: undefined, senderPhoneHmac: undefined },
      activePaymentIntents: [baseIntent]
    });

    expect(result.intentRelation).toBe('ambiguous_activity');
    expect(result.reviewCreationAllowed).toBe(true);
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining(['amount_only', 'weak_identity_evidence', 'manual_confirmation_required'])
    );
    expect(result.reviewCopy).toMatchObject({
      title: 'Paiement à vérifier'
    });
  });

  it('routes expired plausible matches to late payment review only', () => {
    const result = evaluatePaymentIntentGate({
      signal: { ...baseSignal, observedAt: '2026-05-06T10:18:00.000Z' },
      activePaymentIntents: [{ ...baseIntent, status: 'expired' }]
    });

    expect(result.intentRelation).toBe('late_payment_candidate');
    expect(result.reviewCreationAllowed).toBe(true);
    expect(result.autoConfirmAllowed).toBe(false);
    expect(result.reasonCodes).toContain('payment_window_expired');
  });

  it('routes unknown activity to review only when tied to an active intent', () => {
    const activeUnknown = evaluatePaymentIntentGate({
      signal: { ...baseSignal, classification: 'unknown', referenceHmac: undefined, senderPhoneHmac: undefined },
      activePaymentIntents: [baseIntent]
    });
    const backgroundUnknown = evaluatePaymentIntentGate({
      signal: { ...baseSignal, classification: 'unknown' },
      activePaymentIntents: []
    });

    expect(activeUnknown.intentRelation).toBe('unknown_activity');
    expect(activeUnknown.reviewCreationAllowed).toBe(true);
    expect(backgroundUnknown.intentRelation).toBe('unknown_activity');
    expect(backgroundUnknown.reviewCreationAllowed).toBe(false);
  });

  it('detects collisions and keeps them in manual review', () => {
    const result = evaluatePaymentIntentGate({
      signal: { ...baseSignal, referenceHmac: undefined, senderPhoneHmac: undefined },
      activePaymentIntents: [
        baseIntent,
        { ...baseIntent, orderId: 'ord_02', paymentSessionId: 'ps_02', referenceHmac: 'ref_hmac_02' }
      ]
    });

    expect(result.intentRelation).toBe('ambiguous_activity');
    expect(result.collisionDetected).toBe(true);
    expect(result.reviewCreationAllowed).toBe(true);
    expect(result.reasonCodes).toContain('collision_detected');
  });

  it('requires exact expected micro amount instead of rounded display amount', () => {
    const result = evaluatePaymentIntentGate({
      signal: { ...baseSignal, amountMinor: 139000 },
      activePaymentIntents: [baseIntent]
    });

    expect(result.intentRelation).toBe('ambiguous_activity');
    expect(result.reviewCreationAllowed).toBe(true);
    expect(result.reasonCodes).toContain('expected_amount_mismatch');
    expect(result.reasonCodes).toContain('display_amount_only_mismatch');
  });

  it.each(v1BankTargets)('validates intent-bound fixture outcomes for %s', (bankProfileId, packageName) => {
    const intent = {
      ...baseIntent,
      selectedReceiverBankProfileId: bankProfileId,
      selectedReceivingRouteId: `route_${bankProfileId}_card`
    };
    const signal = {
      ...baseSignal,
      bankProfileId,
      packageName,
      receivingRouteId: intent.selectedReceivingRouteId
    };

    const strong = evaluatePaymentIntentGate({
      signal,
      activePaymentIntents: [intent]
    });
    const noIntent = evaluatePaymentIntentGate({
      signal,
      activePaymentIntents: []
    });
    const negative = evaluatePaymentIntentGate({
      signal: { ...signal, classification: 'outgoing_payment' },
      activePaymentIntents: [intent]
    });
    const amountOnly = evaluatePaymentIntentGate({
      signal: { ...signal, referenceHmac: undefined, senderPhoneHmac: undefined },
      activePaymentIntents: [intent]
    });
    const roundedAmount = evaluatePaymentIntentGate({
      signal: { ...signal, amountMinor: intent.displayPriceMinor },
      activePaymentIntents: [intent]
    });
    const late = evaluatePaymentIntentGate({
      signal: { ...signal, observedAt: '2026-05-06T10:18:00.000Z' },
      activePaymentIntents: [{ ...intent, status: 'expired' }]
    });

    expect(strong).toMatchObject({
      intentRelation: 'expected_payment_candidate',
      reviewCreationAllowed: true,
      autoConfirmAllowed: false,
      collisionDetected: false
    });
    expect(noIntent).toMatchObject({
      intentRelation: 'unrelated_bank_activity',
      reviewCreationAllowed: false
    });
    expect(negative).toMatchObject({
      intentRelation: 'negative_activity',
      reviewCreationAllowed: false
    });
    expect(amountOnly).toMatchObject({
      intentRelation: 'ambiguous_activity',
      reviewCreationAllowed: true
    });
    expect(roundedAmount.reasonCodes).toContain('display_amount_only_mismatch');
    expect(late).toMatchObject({
      intentRelation: 'late_payment_candidate',
      reviewCreationAllowed: true,
      autoConfirmAllowed: false
    });
  });
});
