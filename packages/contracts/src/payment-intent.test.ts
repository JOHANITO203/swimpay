import { describe, expect, it } from 'vitest';
import {
  buildIntentBoundLearningMetadata,
  buildMerchantReviewMatchingCopy,
  buildPaymentIntent,
  deriveBuyerRecognitionHints,
  maskBuyerSourceCard,
  type BuyerRecognitionHintInput
} from './index.js';

const hmac = (scope: string, value: string) => `hmac:${scope}:${value.length}`;
const encrypt = (scope: string, value: string) => `enc:${scope}:${value.slice(-4)}`;

describe('payment-intent-bound checkout contracts', () => {
  it('derives buyer recognition hints without retaining raw card or phone', () => {
    const hints = deriveBuyerRecognitionHints(
      {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        buyer_phone: '+7 (999) 123-45-67',
        buyer_source_card_number: '2202 2012 3456 4821'
      },
      {
        merchant_id: 'mch_01',
        hmac,
        encrypt
      }
    );

    expect(hints).toMatchObject({
      buyer_first_name: 'Ivan',
      buyer_last_name: 'Petrov',
      buyer_phone_masked: '+7 *** *** **67',
      buyer_source_card_masked: '2202 **** **** 4821',
      buyer_source_card_last4: '4821'
    });
    expect(hints.buyer_phone_hmac).toMatch(/^hmac:mch_01:phone:/);
    expect(hints.buyer_source_card_hmac).toMatch(/^hmac:mch_01:source_card:/);
    expect(hints.buyer_source_card_encrypted).toBe('enc:mch_01:source_card:4821');
    expect(JSON.stringify(hints)).not.toContain('9991234567');
    expect(JSON.stringify(hints)).not.toContain('2202201234564821');
  });

  it('rejects prohibited card credential fields from buyer recognition input', () => {
    const unsafe = {
      buyer_first_name: 'Ivan',
      buyer_last_name: 'Petrov',
      buyer_phone: '+7 999 123 45 67',
      buyer_source_card_number: '2202201234564821',
      cvv: '123'
    } satisfies BuyerRecognitionHintInput & { cvv: string };

    expect(() =>
      deriveBuyerRecognitionHints(unsafe, {
        merchant_id: 'mch_01',
        hmac,
        encrypt
      })
    ).toThrow('Buyer recognition hints must not include card secrets or bank credentials.');
  });

  it('builds a bounded reconciliation amount that is visible and used for matching', () => {
    const intent = buildPaymentIntent({
      order_id: 'ord_01',
      payment_session_id: 'ps_01',
      merchant_id: 'mch_01',
      display_price_minor: 139000,
      reconciliation_delta_minor: 35,
      max_reconciliation_delta_minor: 99,
      currency: 'RUB',
      generated_reference: 'TANGO ALFA',
      selected_receiver_bank: 'sber_ru',
      selected_receiving_method: 'card_transfer',
      buyer_hints: deriveBuyerRecognitionHints(
        {
          buyer_first_name: 'Ivan',
          buyer_last_name: 'Petrov',
          buyer_phone: '+7 999 123 45 67',
          buyer_source_card_number: '2202 2012 3456 4821'
        },
        { merchant_id: 'mch_01', hmac, encrypt }
      ),
      expires_at: '2026-05-06T10:15:00.000Z',
      status: 'receiver_arming'
    });

    expect(intent.display_price_minor).toBe(139000);
    expect(intent.expected_payment_amount_minor).toBe(139035);
    expect(intent.reconciliation_delta_minor).toBe(35);
    expect(intent.buyer_visible_expected_amount_minor).toBe(139035);
    expect(intent.matching_amount_minor).toBe(139035);
    expect(JSON.stringify(intent)).not.toContain('2202201234564821');
  });

  it('rejects reconciliation deltas outside the configured bound', () => {
    expect(() =>
      buildPaymentIntent({
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        merchant_id: 'mch_01',
        display_price_minor: 139000,
        reconciliation_delta_minor: 250,
        max_reconciliation_delta_minor: 99,
        currency: 'RUB',
        generated_reference: 'TANGO ALFA',
        selected_receiver_bank: 'sber_ru',
        selected_receiving_method: 'card_transfer',
        buyer_hints: deriveBuyerRecognitionHints(
          {
            buyer_first_name: 'Ivan',
            buyer_last_name: 'Petrov',
            buyer_phone: '+7 999 123 45 67',
            buyer_source_card_number: '2202 2012 3456 4821'
          },
          { merchant_id: 'mch_01', hmac, encrypt }
        ),
        expires_at: '2026-05-06T10:15:00.000Z',
        status: 'receiver_arming'
      })
    ).toThrow('Reconciliation delta exceeds configured bounds.');
  });

  it('returns merchant review copy without implying auto-confirmation', () => {
    expect(buildMerchantReviewMatchingCopy('expected_payment_candidate')).toEqual({
      title: 'Nouveau paiement détecté',
      label: 'Matching 100 %',
      text: 'Veuillez confirmer ce paiement.'
    });
    expect(buildMerchantReviewMatchingCopy('ambiguous_activity')).toEqual({
      title: 'Paiement à vérifier',
      label: 'Paiement à vérifier',
      text: 'Certains éléments correspondent, mais une confirmation est nécessaire.'
    });
  });

  it('adds passive learning metadata without mutating runtime rules', () => {
    const metadata = buildIntentBoundLearningMetadata({
      intent_relation: 'expected_payment_candidate',
      active_payment_intent_present: true,
      collision_detected: false,
      payment_window_status: 'active',
      review_created: true,
      profile_version: 'intelligence-v1',
      shape_hash: 'shape_v1:abc'
    });

    expect(metadata.learning_context).toBe('intent_bound_feedback');
    expect(metadata.mutates_runtime_rules).toBe(false);
    expect(metadata.promotes_profile).toBe(false);
  });

  it('masks short and formatted buyer source card values consistently', () => {
    expect(maskBuyerSourceCard('2202 2012 3456 4821')).toBe('2202 **** **** 4821');
    expect(maskBuyerSourceCard('4821')).toBe('**** 4821');
  });
});
