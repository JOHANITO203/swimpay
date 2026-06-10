import { describe, expect, it } from 'vitest';
import {
  evaluateSignalMatch,
  meetsAutoConfirmFloor,
  railFromSignal,
  MATCHING_CORE_FOUNDATION,
  type MatchConfidenceVector,
  type MatchingCandidateSession,
  type MatchingContext,
  type MatchingSignal
} from './index.js';

const baseSignal: MatchingSignal = {
  id: 'sig_01',
  merchantId: 'mch_01',
  amountMinor: 13700,
  currency: 'RUB',
  directionLabel: 'incoming_customer_transfer',
  observedAt: '2026-05-02T08:00:00.000Z',
  signatureValid: true,
  signalAlreadyUsed: false
};

const baseSession: MatchingCandidateSession = {
  orderId: 'ord_01',
  paymentSessionId: 'ps_01',
  merchantId: 'mch_01',
  expectedAmountMinor: 13700,
  currency: 'RUB',
  status: 'awaiting_payment',
  validFrom: '2026-05-02T07:55:00.000Z',
  validUntil: '2026-05-02T08:10:00.000Z',
  orderAlreadyConfirmed: false
};

const trustedContext = {
  bankProfileStatus: 'trusted' as const,
  bankAppTrusted: true,
  templateTrusted: true,
  deviceTrusted: true,
  merchantTrusted: true
};

describe('matching core', () => {
  it('does not auto-confirm amount-only signals', () => {
    const result = evaluateSignalMatch({
      signal: baseSignal,
      sessions: [baseSession],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).toContain('amount_exact');
    expect(result.reasonCodes).toContain('phone_missing');
    expect(result.reasonCodes).toContain('reference_missing');
    expect(result.reasonCodes).toContain('requires_review');
  });

  it('uses payable amount as the exact matching amount when reconciliation delta is present', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, amountMinor: 139035, referenceHmac: 'hmac_ref' },
      sessions: [
        {
          ...baseSession,
          expectedAmountMinor: 139000,
          displayAmountMinor: 139000,
          payableAmountMinor: 139035,
          reconciliationDeltaMinor: 35,
          referenceHmac: 'hmac_ref'
        }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.selected?.paymentSessionId).toBe('ps_01');
    expect(result.reasonCodes).toContain('amount_exact');
    expect(result.confidenceVector.amount).toBe('exact');
  });

  it('does not match the legacy expected/display amount when payable amount differs', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, amountMinor: 139000, referenceHmac: 'hmac_ref' },
      sessions: [
        {
          ...baseSession,
          expectedAmountMinor: 139000,
          displayAmountMinor: 139000,
          payableAmountMinor: 139035,
          reconciliationDeltaMinor: 35,
          referenceHmac: 'hmac_ref'
        }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('wait');
    expect(result.selected).toBeUndefined();
    expect(result.candidates).toHaveLength(0);
    expect(result.confidenceVector.amount).toBe('mismatch');
  });

  it('routes exact sender phone match to review when receiving route is not selected', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, senderPhoneHmac: 'hmac_phone' },
      sessions: [{ ...baseSession, buyerPhoneHmac: 'hmac_phone' }],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.selected?.paymentSessionId).toBe('ps_01');
    expect(result.reasonCodes).toContain('sender_phone_exact');
    expect(result.reasonCodes).toContain('receiving_route_not_selected');
    expect(result.reasonCodes).toContain('no_collision');
  });

  it('routes exact reference match to review when receiving route is review-only beta', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, referenceHmac: 'hmac_ref' },
      sessions: [
        {
          ...baseSession,
          referenceHmac: 'hmac_ref',
          selectedReceivingRouteId: 'route_sber_phone',
          railType: 'phone_transfer',
          receivingRouteReviewPolicy: 'eligible_low_risk_later'
        }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.selected?.paymentSessionId).toBe('ps_01');
    expect(result.reasonCodes).toContain('reference_exact');
    expect(result.reasonCodes).toContain('receiver_route_review_only');
  });

  it('uses buyer sender phone HMAC as a phone-transfer matching hint without confirming by default', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, senderPhoneHmac: 'hmac_sender', bankProfileId: 'sber_ru' },
      sessions: [
        {
          ...baseSession,
          buyerSenderPhoneHmac: 'hmac_sender',
          selectedReceiverBankProfileId: 'sber_ru',
          selectedReceivingRouteId: 'route_sber_phone',
          railType: 'phone_transfer',
          receivingRouteReviewPolicy: 'eligible_low_risk_later'
        }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).toContain('phone_transfer_matching_hint_available');
    expect(result.reasonCodes).toContain('receiver_bank_exact');
    expect(result.reasonCodes).toContain('receiver_route_review_only');
  });

  it('does not create a review when the receiver bank does not match the active intent', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, senderPhoneHmac: 'hmac_sender', bankProfileId: 'sber_ru' },
      sessions: [
        {
          ...baseSession,
          buyerSenderPhoneHmac: 'hmac_sender',
          selectedReceiverBankProfileId: 'tbank_ru',
          selectedReceivingRouteId: 'route_tbank_phone',
          railType: 'phone_transfer',
          receivingRouteReviewPolicy: 'eligible_low_risk_later'
        }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('wait');
    expect(result.selected).toBeUndefined();
    expect(result.reasonCodes).toContain('no_candidate');
  });

  it('keeps card-transfer amount-only matches in review with route risk reasons', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, bankProfileId: 'sber_ru' },
      sessions: [
        {
          ...baseSession,
          selectedReceiverBankProfileId: 'sber_ru',
          selectedReceivingRouteId: 'route_sber_card',
          railType: 'card_transfer',
          receivingRouteReviewPolicy: 'review_first'
        }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).toContain('card_transfer_review_required');
    expect(result.reasonCodes).toContain('amount_only_card_transfer');
    expect(result.reasonCodes).toContain('receiver_route_review_only');
  });

  it('routes amount collisions to review', () => {
    const result = evaluateSignalMatch({
      signal: baseSignal,
      sessions: [
        baseSession,
        { ...baseSession, orderId: 'ord_02', paymentSessionId: 'ps_02' }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.collisionDetected).toBe(true);
    expect(result.reasonCodes).toContain('amount_collision');
  });

  it('rejects duplicate signals before matching candidates', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, signalAlreadyUsed: true, senderPhoneHmac: 'hmac_phone' },
      sessions: [{ ...baseSession, buyerPhoneHmac: 'hmac_phone' }],
      context: trustedContext
    });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('duplicate_signal');
  });

  it('does not confirm an order that is already confirmed', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, senderPhoneHmac: 'hmac_phone' },
      sessions: [{ ...baseSession, buyerPhoneHmac: 'hmac_phone', orderAlreadyConfirmed: true }],
      context: trustedContext
    });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('order_already_confirmed');
  });

  it('exposes the channel dimension of the recognition couplet', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, channelRecognition: 'recognized' },
      sessions: [baseSession],
      context: trustedContext
    });

    expect(result.confidenceVector.channel).toBe('recognized');
  });

  it('defaults channel to not_applicable when not provided', () => {
    const result = evaluateSignalMatch({
      signal: baseSignal,
      sessions: [baseSession],
      context: trustedContext
    });

    expect(result.confidenceVector.channel).toBe('not_applicable');
  });

  it('classe le rail mobile_money et wallet (hors RU)', () => {
    expect(railFromSignal({ ...baseSignal, railHint: 'mobile_money' })).toBe('mobile_money');
    expect(railFromSignal({ ...baseSignal, railHint: 'wallet' })).toBe('wallet');
  });

  it('propage le railHint mobile_money jusqu au vecteur de confiance', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, railHint: 'mobile_money' },
      sessions: [baseSession],
      context: trustedContext
    });

    expect(result.confidenceVector.rail).toBe('mobile_money');
  });

  it.each([
    'incoming_cashback',
    'incoming_refund',
    'outgoing_payment',
    'failed_transfer',
    'promo',
    'unknown'
  ] as const)('rejects negative or unsafe direction %s', (directionLabel) => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, directionLabel, senderPhoneHmac: 'hmac_phone' },
      sessions: [{ ...baseSession, buyerPhoneHmac: 'hmac_phone' }],
      context: trustedContext
    });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('negative_direction');
  });
});

// A "perfect" signal+session that yields the strong-candidate non-collision path:
// amount exact, currency match, incoming_customer_transfer, reference HMAC identity,
// a selected non-card receiving route whose policy is not review-first, and a fully
// trusted context (device/bankApp/template + trusted bank profile). Score = 100.
const perfectSignal: MatchingSignal = {
  ...baseSignal,
  referenceHmac: 'hmac_ref',
  bankProfileId: 'sber_ru',
  railHint: 'sbp'
};

const perfectSession: MatchingCandidateSession = {
  ...baseSession,
  referenceHmac: 'hmac_ref',
  selectedReceiverBankProfileId: 'sber_ru',
  selectedReceivingRouteId: 'route_sber_phone',
  railType: 'phone_transfer'
};

const autoContext: MatchingContext = { ...trustedContext, autoConfirmMode: 'auto' };

describe('matching core — final decision (auto_confirm floor)', () => {
  it('mode manual (explicit) keeps a perfect strong match in needs_review (unchanged behavior)', () => {
    const result = evaluateSignalMatch({
      signal: perfectSignal,
      sessions: [perfectSession],
      context: { ...trustedContext, autoConfirmMode: 'manual' }
    });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).toContain('manual_confirmation_required_v1');
    expect(result.reasonCodes).not.toContain('auto_confirm_floor_met');
  });

  it('mode undefined (default) keeps a perfect strong match in needs_review (unchanged behavior)', () => {
    const result = evaluateSignalMatch({
      signal: perfectSignal,
      sessions: [perfectSession],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).toContain('manual_confirmation_required_v1');
    expect(result.reasonCodes).not.toContain('auto_confirm_floor_met');
  });

  it('mode auto + floor met (reference exact + trusted_cert + amount exact + window inside + no collision) → auto_confirm', () => {
    const result = evaluateSignalMatch({
      signal: perfectSignal,
      sessions: [perfectSession],
      context: autoContext
    });

    expect(result.decision).toBe('auto_confirm');
    expect(result.collisionDetected).toBe(false);
    expect(result.selected?.paymentSessionId).toBe('ps_01');
    expect(result.reasonCodes).toContain('auto_confirm_floor_met');
    expect(result.confidenceVector.reference).toBe('exact');
    expect(result.confidenceVector.bank_package).toBe('trusted_cert');
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('mode auto + collision (two identity-matching candidates) → needs_review', () => {
    const result = evaluateSignalMatch({
      signal: perfectSignal,
      sessions: [
        perfectSession,
        { ...perfectSession, orderId: 'ord_02', paymentSessionId: 'ps_02' }
      ],
      context: autoContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.collisionDetected).toBe(true);
    expect(result.reasonCodes).toContain('amount_collision');
    expect(result.reasonCodes).not.toContain('auto_confirm_floor_met');
  });

  it('mode auto + amountOnly (no reference, no phone/card hmac) → needs_review (never auto)', () => {
    const result = evaluateSignalMatch({
      signal: { ...perfectSignal, referenceHmac: undefined, senderPhoneHmac: undefined },
      sessions: [{ ...perfectSession, referenceHmac: undefined }],
      context: autoContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).not.toContain('auto_confirm_floor_met');
  });

  it('mode auto + bank_package not trusted_cert (bankApp untrusted) → needs_review', () => {
    const result = evaluateSignalMatch({
      signal: perfectSignal,
      sessions: [perfectSession],
      context: { ...autoContext, bankAppTrusted: false }
    });

    expect(result.decision).toBe('needs_review');
    expect(result.confidenceVector.bank_package).not.toBe('trusted_cert');
    expect(result.reasonCodes).not.toContain('auto_confirm_floor_met');
  });

  it('mode auto + rail-with-channel but channelRecognition pending_unknown → needs_review (channel blocks)', () => {
    const result = evaluateSignalMatch({
      signal: { ...perfectSignal, channelRecognition: 'pending_unknown' },
      sessions: [perfectSession],
      context: autoContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.confidenceVector.channel).toBe('pending_unknown');
    expect(result.reasonCodes).not.toContain('auto_confirm_floor_met');
  });

  it('mode auto + channelRecognition recognized + rest of floor met → auto_confirm', () => {
    const result = evaluateSignalMatch({
      signal: { ...perfectSignal, channelRecognition: 'recognized' },
      sessions: [perfectSession],
      context: autoContext
    });

    expect(result.decision).toBe('auto_confirm');
    expect(result.confidenceVector.channel).toBe('recognized');
    expect(result.reasonCodes).toContain('auto_confirm_floor_met');
  });

  it('mode auto + channel not_applicable (rail without stable channel) + rest of floor met → auto_confirm', () => {
    const result = evaluateSignalMatch({
      signal: { ...perfectSignal, channelRecognition: 'not_applicable' },
      sessions: [perfectSession],
      context: autoContext
    });

    expect(result.decision).toBe('auto_confirm');
    expect(result.confidenceVector.channel).toBe('not_applicable');
    expect(result.reasonCodes).toContain('auto_confirm_floor_met');
  });

  it('mode auto + channel absent (defaults not_applicable) + rest of floor met → auto_confirm', () => {
    const result = evaluateSignalMatch({
      signal: perfectSignal,
      sessions: [perfectSession],
      context: autoContext
    });

    expect(result.decision).toBe('auto_confirm');
    expect(result.confidenceVector.channel).toBe('not_applicable');
    expect(result.reasonCodes).toContain('auto_confirm_floor_met');
  });

  it('exposes finalDecisionImplemented=true and amountOnlyAutoConfirmAllowed=false', () => {
    expect(MATCHING_CORE_FOUNDATION.finalDecisionImplemented).toBe(true);
    expect(MATCHING_CORE_FOUNDATION.amountOnlyAutoConfirmAllowed).toBe(false);
  });
});

describe('meetsAutoConfirmFloor — predicate truth table', () => {
  const floorVector: MatchConfidenceVector = {
    amount: 'exact',
    rail: 'sbp',
    channel: 'not_applicable',
    direction: 'incoming',
    time_window: 'inside',
    receiver_route: 'exact',
    bank_package: 'trusted_cert',
    template: 'known_high',
    sender_name: 'strong',
    sender_phone: 'not_observed',
    sender_card: 'not_observed',
    reference: 'exact',
    collision_pressure: 0
  };

  it('passes when reference is exact and all floor conditions hold', () => {
    expect(meetsAutoConfirmFloor(floorVector)).toBe(true);
  });

  it('passes when sender_phone is hmac_match (reference not observed)', () => {
    expect(
      meetsAutoConfirmFloor({ ...floorVector, reference: 'not_observed', sender_phone: 'hmac_match' })
    ).toBe(true);
  });

  it('passes when sender_card is hmac_match (reference not observed)', () => {
    expect(
      meetsAutoConfirmFloor({ ...floorVector, reference: 'not_observed', sender_card: 'hmac_match' })
    ).toBe(true);
  });

  it('passes when channel is recognized', () => {
    expect(meetsAutoConfirmFloor({ ...floorVector, channel: 'recognized' })).toBe(true);
  });

  it('fails with no strong key (amount-only: reference not observed, no phone/card hmac)', () => {
    expect(
      meetsAutoConfirmFloor({
        ...floorVector,
        reference: 'not_observed',
        sender_phone: 'not_observed',
        sender_card: 'not_observed'
      })
    ).toBe(false);
  });

  it('fails when reference is a mismatch and no other strong key', () => {
    expect(
      meetsAutoConfirmFloor({ ...floorVector, reference: 'mismatch', sender_phone: 'not_observed' })
    ).toBe(false);
  });

  it('fails when amount is not exact', () => {
    expect(meetsAutoConfirmFloor({ ...floorVector, amount: 'delta_match' })).toBe(false);
    expect(meetsAutoConfirmFloor({ ...floorVector, amount: 'mismatch' })).toBe(false);
  });

  it('fails when time_window is not inside', () => {
    expect(meetsAutoConfirmFloor({ ...floorVector, time_window: 'late' })).toBe(false);
    expect(meetsAutoConfirmFloor({ ...floorVector, time_window: 'too_old' })).toBe(false);
  });

  it('fails when bank_package is not trusted_cert', () => {
    expect(meetsAutoConfirmFloor({ ...floorVector, bank_package: 'package_only' })).toBe(false);
    expect(meetsAutoConfirmFloor({ ...floorVector, bank_package: 'unknown' })).toBe(false);
  });

  it('fails when channel is pending_unknown', () => {
    expect(meetsAutoConfirmFloor({ ...floorVector, channel: 'pending_unknown' })).toBe(false);
  });

  it('fails when collision_pressure is greater than zero', () => {
    expect(meetsAutoConfirmFloor({ ...floorVector, collision_pressure: 1 })).toBe(false);
  });
});
