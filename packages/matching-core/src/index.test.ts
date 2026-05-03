import { describe, expect, it } from 'vitest';
import { evaluateSignalMatch, type MatchingCandidateSession, type MatchingSignal } from './index.js';

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
