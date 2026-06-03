import { describe, expect, it } from 'vitest';
import {
  evaluateSenderNameCompatibility,
  evaluateSignalMatch,
  type MatchingCandidateSession,
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

describe('evaluateSenderNameCompatibility', () => {
  it('returns missing when the signal carries no sender-name hint', () => {
    expect(evaluateSenderNameCompatibility(undefined, ['h_full'], ['h_init'])).toBe('missing');
  });

  it('returns strong on a full-name variant hash match', () => {
    expect(evaluateSenderNameCompatibility('h_full', ['h_full', 'h_latin'], ['h_init'])).toBe('strong');
  });

  it('returns weak when only an initials variant matches', () => {
    expect(evaluateSenderNameCompatibility('h_init', ['h_full'], ['h_init'])).toBe('weak');
  });

  it('returns mismatch when a present hint matches no variant', () => {
    expect(evaluateSenderNameCompatibility('h_other', ['h_full'], ['h_init'])).toBe('mismatch');
  });
});

describe('matching core sender-name wiring', () => {
  it('keeps sender_name missing and adds no bonus when no name evidence is present (backward compatible)', () => {
    const result = evaluateSignalMatch({ signal: baseSignal, sessions: [baseSession], context: trustedContext });

    expect(result.confidenceVector.sender_name).toBe('missing');
    expect(result.reasonCodes).not.toContain('name_compatible');
    expect(result.reasonCodes).not.toContain('name_mismatch');
  });

  it('marks sender_name strong, adds +5 and a name_compatible reason on a strong name match', () => {
    const withoutName = evaluateSignalMatch({ signal: baseSignal, sessions: [baseSession], context: trustedContext });
    const withName = evaluateSignalMatch({
      signal: { ...baseSignal, senderNameHintHash: 'h_full' },
      sessions: [{ ...baseSession, buyerNameStrongMatchHashes: ['h_full'], buyerNameInitialMatchHashes: ['h_init'] }],
      context: trustedContext
    });

    expect(withName.confidenceVector.sender_name).toBe('strong');
    expect(withName.reasonCodes).toContain('name_compatible');
    expect(withName.score).toBe(withoutName.score + 5);
  });

  it('surfaces a name_mismatch label without penalizing the score (banks abbreviate names)', () => {
    const withoutName = evaluateSignalMatch({ signal: baseSignal, sessions: [baseSession], context: trustedContext });
    const mismatch = evaluateSignalMatch({
      signal: { ...baseSignal, senderNameHintHash: 'h_other' },
      sessions: [{ ...baseSession, buyerNameStrongMatchHashes: ['h_full'], buyerNameInitialMatchHashes: ['h_init'] }],
      context: trustedContext
    });

    expect(mismatch.confidenceVector.sender_name).toBe('mismatch');
    expect(mismatch.reasonCodes).toContain('name_mismatch');
    expect(mismatch.score).toBe(withoutName.score);
  });

  it('does not let a name match resolve a collision on its own', () => {
    const result = evaluateSignalMatch({
      signal: { ...baseSignal, senderNameHintHash: 'h_full' },
      sessions: [
        { ...baseSession, buyerNameStrongMatchHashes: ['h_full'] },
        { ...baseSession, orderId: 'ord_02', paymentSessionId: 'ps_02', buyerNameStrongMatchHashes: ['h_full'] }
      ],
      context: trustedContext
    });

    expect(result.decision).toBe('needs_review');
    expect(result.collisionDetected).toBe(true);
    expect(result.reasonCodes).toContain('amount_collision');
  });
});
