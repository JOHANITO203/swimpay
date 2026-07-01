import { describe, expect, it } from 'vitest';
import {
  buildIntentBoundLearningMetadata,
  buildMerchantReviewMatchingCopy,
  buildPaymentIntent,
  deriveExpectedPaymentProfile,
  deriveBuyerRecognitionHints,
  maskBuyerSourceCard,
  normalizeBuyerIdentity,
  receivingRailForBuyerPaymentMethod,
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

  it('normalizes Latin and Cyrillic buyer names into deterministic variants', () => {
    const latin = normalizeBuyerIdentity({ first_name: 'Ivan', last_name: 'Petrov' });
    const cyrillic = normalizeBuyerIdentity({ first_name: 'Иван', last_name: 'Петров' });

    expect(latin.script_detected).toBe('latin');
    expect(latin.cyrillic_variants).toContain('иван петров');
    expect(latin.initials_variants).toEqual(expect.arrayContaining(['i. petrov', 'и. петров']));
    expect(cyrillic.script_detected).toBe('cyrillic');
    expect(cyrillic.latin_variants).toContain('ivan petrov');
    expect(cyrillic.reversed_order_variants).toEqual(expect.arrayContaining(['петров иван', 'petrov ivan']));
  });

  it('derives an expected payment profile without returning raw PAN or phone', () => {
    const profile = deriveExpectedPaymentProfile({
      payment_session_id: 'ps_01',
      merchant_id: 'mch_01',
      buyer_first_name_raw: 'Ivan',
      buyer_last_name_raw: 'Petrov',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      sender_card_number: '4242 4242 4242 4242',
      display_amount_minor: 139000,
      currency: 'RUB',
      generated_reference: 'TANGO ALFA',
      expires_at: '2026-05-06T10:15:00.000Z',
      hmac
    });

    expect(profile).toMatchObject({
      payment_session_id: 'ps_01',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      sender_card_masked: '4242 **** **** 4242',
      sender_card_last4: '4242',
      display_amount_minor: 139000,
      currency: 'RUB'
    });
    expect(profile.reconciliation_delta_minor).toBeGreaterThanOrEqual(1);
    expect(profile.reconciliation_delta_minor).toBeLessThanOrEqual(99);
    expect(profile.payable_amount_minor).toBe(139000 + profile.reconciliation_delta_minor);
    expect(profile.sender_card_hmac).toMatch(/^hmac:sender_card_pan:/);
    expect(profile.expected_payment_fingerprint).toMatch(/^hmac:expected_payment_fingerprint:/);
    expect(JSON.stringify(profile)).not.toContain('4242424242424242');
    expect(receivingRailForBuyerPaymentMethod(profile.payment_method)).toBe('card_transfer');
  });

  it('rejects non-Luhn sender card numbers in the expected payment profile', () => {
    expect(() =>
      deriveExpectedPaymentProfile({
        payment_session_id: 'ps_bad_card',
        merchant_id: 'mch_01',
        buyer_first_name_raw: 'Ivan',
        buyer_last_name_raw: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4241',
        display_amount_minor: 139000,
        currency: 'RUB',
        generated_reference: 'TANGO ALFA',
        expires_at: '2026-05-06T10:15:00.000Z',
        hmac
      })
    ).toThrow('Sender card number is not plausible.');
  });

  it('derives an SBP phone expected payment profile as masked phone and HMAC only', () => {
    const profile = deriveExpectedPaymentProfile({
      payment_session_id: 'ps_02',
      merchant_id: 'mch_01',
      buyer_first_name_raw: 'Иван',
      buyer_last_name_raw: 'Петров',
      payment_method: 'sbp',
      sender_bank_id: 'tbank_ru',
      sender_phone: '+7 (999) 123-45-67',
      display_amount_minor: 50000,
      currency: 'RUB',
      generated_reference: 'NOVA KILO',
      expires_at: '2026-05-06T10:15:00.000Z',
      hmac
    });

    expect(profile.sender_phone_masked).toBe('+7 *** *** **67');
    expect(profile.sender_phone_hmac).toMatch(/^hmac:sender_phone:/);
    expect(profile.sender_card_hmac).toBeUndefined();
    expect(JSON.stringify(profile)).not.toContain('9991234567');
    expect(receivingRailForBuyerPaymentMethod(profile.payment_method)).toBe('phone_transfer');
  });

  it('derives a mobile-money (XOF) expected payment profile with a West-African sender phone', () => {
    const profile = deriveExpectedPaymentProfile({
      payment_session_id: 'ps_wa',
      merchant_id: 'mch_01',
      buyer_first_name_raw: 'Awa',
      buyer_last_name_raw: 'Diop',
      payment_method: 'mobile_money',
      sender_bank_id: 'mtn_momo_ci',
      sender_phone: '+225 07 12 34 56 78',
      display_amount_minor: 5000,
      currency: 'XOF',
      generated_reference: 'WAVE ZULU',
      expires_at: '2026-05-06T10:15:00.000Z',
      hmac
    });

    expect(profile.currency).toBe('XOF');
    expect(profile.sender_phone_hmac).toMatch(/^hmac:sender_phone:/);
    expect(profile.sender_card_hmac).toBeUndefined();
    expect(profile.expected_payment_fingerprint).toMatch(/^hmac:expected_payment_fingerprint:/);
  });

  it('derives a wallet (USD) expected payment profile that is reference + name based (no card/phone key)', () => {
    const profile = deriveExpectedPaymentProfile({
      payment_session_id: 'ps_usd',
      merchant_id: 'mch_01',
      buyer_first_name_raw: 'John',
      buyer_last_name_raw: 'Smith',
      payment_method: 'wallet',
      sender_bank_id: 'revolut_int',
      display_amount_minor: 1250,
      currency: 'USD',
      generated_reference: 'DELTA ECHO',
      expires_at: '2026-05-06T10:15:00.000Z',
      hmac
    });

    expect(profile.currency).toBe('USD');
    expect(profile.sender_card_hmac).toBeUndefined();
    expect(profile.sender_phone_hmac).toBeUndefined();
    expect(profile.buyer_name_fingerprint).toMatch(/^hmac:buyer_name:/);
    expect(profile.expected_payment_fingerprint).toMatch(/^hmac:expected_payment_fingerprint:/);
  });

  it('rejects a currency that does not match the rail', () => {
    expect(() =>
      deriveExpectedPaymentProfile({
        payment_session_id: 'ps_bad',
        merchant_id: 'mch_01',
        buyer_first_name_raw: 'A',
        buyer_last_name_raw: 'B',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4111111111111111',
        display_amount_minor: 1000,
        currency: 'USD',
        generated_reference: 'X Y',
        expires_at: '2026-05-06T10:15:00.000Z',
        hmac
      })
    ).toThrow(/not supported for card/);
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
