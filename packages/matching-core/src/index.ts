export const MATCHING_CORE_FOUNDATION = {
  deterministic: true,
  amountOnlyAutoConfirmAllowed: false,
  finalDecisionImplemented: false
} as const;

export type DirectionLabel =
  | 'incoming_customer_transfer'
  | 'incoming_cashback'
  | 'incoming_refund'
  | 'outgoing_payment'
  | 'outgoing_transfer'
  | 'failed_transfer'
  | 'promo'
  | 'balance_update'
  | 'unknown'
  | 'unknown_ambiguous_direction';

export type MatchingDecision = 'auto_confirmed' | 'needs_review' | 'rejected' | 'wait';
export type BankProfileTrustStatus = 'learning' | 'shadow_testing' | 'trusted_low_amount' | 'trusted' | 'degraded' | 'review_only' | 'disabled';
export type TemplateTrustStatus = 'new' | 'learning' | 'shadow_testing' | 'trusted_low_amount' | 'trusted' | 'degraded' | 'review_only' | 'disabled';

export interface MatchingSignal {
  id: string;
  merchantId: string;
  bankProfileId?: string | undefined;
  amountMinor?: number | undefined;
  currency?: string | undefined;
  senderPhoneHmac?: string | undefined;
  referenceHmac?: string | undefined;
  directionLabel: DirectionLabel;
  observedAt: string;
  signatureValid: boolean;
  signalAlreadyUsed: boolean;
}

export interface MatchingCandidateSession {
  orderId: string;
  paymentSessionId: string;
  merchantId: string;
  expectedAmountMinor: number;
  currency: string;
  buyerPhoneHmac?: string | undefined;
  buyerSenderPhoneHmac?: string | undefined;
  referenceHmac?: string | undefined;
  selectedReceiverBankId?: string | undefined;
  selectedReceiverBankProfileId?: string | undefined;
  selectedReceivingRouteId?: string | undefined;
  receiverRouteCode?: string | undefined;
  railType?: 'phone_transfer' | 'card_transfer' | undefined;
  paymentReference?: string | undefined;
  receivingRouteReviewPolicy?: 'review_first' | 'eligible_low_risk_later' | undefined;
  status: string;
  validFrom: string;
  validUntil: string;
  orderAlreadyConfirmed: boolean;
}

export interface MatchingContext {
  bankProfileStatus: BankProfileTrustStatus;
  bankAppTrusted: boolean;
  templateTrusted: boolean;
  deviceTrusted: boolean;
  merchantTrusted: boolean;
}

export interface EvaluateSignalMatchInput {
  signal: MatchingSignal;
  sessions: MatchingCandidateSession[];
  context: MatchingContext;
}

export interface MatchDecisionOutput {
  decision: MatchingDecision;
  score: number;
  collisionDetected: boolean;
  selected?: MatchingCandidateSession | undefined;
  candidates: MatchingCandidateSession[];
  reasonCodes: string[];
}

const ACTIVE_SESSION_STATUSES = new Set([
  'receiver_arming',
  'receiver_armed',
  'payment_instructions_shown',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching'
]);

const NEGATIVE_DIRECTIONS = new Set<DirectionLabel>([
  'incoming_cashback',
  'incoming_refund',
  'outgoing_payment',
  'outgoing_transfer',
  'failed_transfer',
  'promo',
  'balance_update',
  'unknown',
  'unknown_ambiguous_direction'
]);

export function evaluateSignalMatch(input: EvaluateSignalMatchInput): MatchDecisionOutput {
  const earlyRejection = evaluateHardRejection(input.signal);
  if (earlyRejection) {
    return {
      decision: 'rejected',
      score: 0,
      collisionDetected: false,
      candidates: [],
      reasonCodes: [earlyRejection]
    };
  }

  const candidates = findCandidateSessions(input.signal, input.sessions);
  if (candidates.some((candidate) => candidate.orderAlreadyConfirmed)) {
    return {
      decision: 'rejected',
      score: 0,
      collisionDetected: false,
      candidates,
      reasonCodes: ['order_already_confirmed']
    };
  }

  if (candidates.length === 0) {
    return {
      decision: 'wait',
      score: 0,
      collisionDetected: false,
      candidates,
      reasonCodes: ['no_candidate']
    };
  }

  const scoredCandidates = candidates
    .map((candidate) => ({
      candidate,
      score: computeScore(input.signal, candidate, input.context),
      reasonCodes: computeReasonCodes(input.signal, candidate, input.context)
    }))
    .sort((left, right) => right.score - left.score);

  const best = scoredCandidates[0];
  if (!best) {
    return {
      decision: 'wait',
      score: 0,
      collisionDetected: false,
      candidates,
      reasonCodes: ['no_candidate']
    };
  }

  const identityMatchCount = scoredCandidates.filter((item) => hasIdentityMatch(input.signal, item.candidate)).length;
  const collisionDetected = candidates.length > 1 && identityMatchCount !== 1;
  const reasonCodes = new Set(best.reasonCodes);

  if (collisionDetected) {
    reasonCodes.add('amount_collision');
    reasonCodes.add('requires_review');
    return {
      decision: 'needs_review',
      score: Math.max(0, best.score - 80),
      collisionDetected,
      selected: best.candidate,
      candidates,
      reasonCodes: [...reasonCodes]
    };
  }

  reasonCodes.add('no_collision');
  const autoConfirmAllowed = canAutoConfirm({
    signal: input.signal,
    candidate: best.candidate,
    context: input.context,
    score: best.score
  });

  if (autoConfirmAllowed) {
    return {
      decision: 'auto_confirmed',
      score: best.score,
      collisionDetected: false,
      selected: best.candidate,
      candidates,
      reasonCodes: [...reasonCodes]
    };
  }

  reasonCodes.add('requires_review');
  return {
    decision: 'needs_review',
    score: best.score,
    collisionDetected: false,
    selected: best.candidate,
    candidates,
    reasonCodes: [...reasonCodes]
  };
}

export function findCandidateSessions(
  signal: MatchingSignal,
  sessions: MatchingCandidateSession[]
): MatchingCandidateSession[] {
  return sessions.filter((session) => {
    if (session.merchantId !== signal.merchantId) {
      return false;
    }

    if (!ACTIVE_SESSION_STATUSES.has(session.status)) {
      return false;
    }

    if (signal.amountMinor !== session.expectedAmountMinor || signal.currency !== session.currency) {
      return false;
    }

    return isObservedInsideWindow(signal.observedAt, session.validFrom, session.validUntil);
  });
}

export function computeScore(
  signal: MatchingSignal,
  session: MatchingCandidateSession,
  context: MatchingContext
): number {
  let score = 0;

  if (signal.amountMinor === session.expectedAmountMinor) {
    score += 35;
  }

  if (signal.currency === session.currency) {
    score += 35;
  }

  if (hasPhoneMatch(signal, session)) {
    score += 35;
  } else {
    score -= 50;
  }

  if (hasReferenceMatch(signal, session)) {
    score += 45;
  } else {
    score -= 40;
  }

  if (signal.directionLabel === 'incoming_customer_transfer') {
    score += 25;
  } else {
    score -= 100;
  }

  if (context.bankProfileStatus === 'trusted' || context.bankProfileStatus === 'trusted_low_amount') {
    score += 10;
  }

  if (context.bankAppTrusted) {
    score += 10;
  }

  if (context.templateTrusted) {
    score += 10;
  }

  if (isObservedInsideWindow(signal.observedAt, session.validFrom, session.validUntil)) {
    score += 10;
  }

  if (context.deviceTrusted) {
    score += 10;
  } else {
    score -= 60;
  }

  if (context.merchantTrusted) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function evaluateHardRejection(signal: MatchingSignal): string | null {
  if (!signal.signatureValid) {
    return 'invalid_signature';
  }

  if (signal.signalAlreadyUsed) {
    return 'duplicate_signal';
  }

  if (NEGATIVE_DIRECTIONS.has(signal.directionLabel)) {
    return 'negative_direction';
  }

  return null;
}

function computeReasonCodes(
  signal: MatchingSignal,
  session: MatchingCandidateSession,
  context: MatchingContext
): string[] {
  const codes: string[] = [];

  if (signal.amountMinor === session.expectedAmountMinor) {
    codes.push('amount_exact');
  }

  if (signal.currency === session.currency) {
    codes.push('currency_exact');
  }

  if (hasPhoneMatch(signal, session)) {
    codes.push('sender_phone_exact');
    if (session.railType === 'phone_transfer' && session.buyerSenderPhoneHmac) {
      codes.push('phone_transfer_matching_hint_available');
    }
  } else {
    codes.push('phone_missing');
    if (session.railType === 'phone_transfer') {
      codes.push('buyer_sender_phone_missing');
    }
  }

  if (hasReferenceMatch(signal, session)) {
    codes.push('reference_exact');
  } else {
    codes.push('reference_missing');
    codes.push('reference_not_observed');
  }

  if (!session.selectedReceivingRouteId) {
    codes.push('receiving_route_not_selected');
  }

  if (session.railType === 'card_transfer') {
    codes.push('card_transfer_review_required');
    if (!hasPhoneMatch(signal, session) && !hasReferenceMatch(signal, session)) {
      codes.push('amount_only_card_transfer');
    }
  }

  if (session.receivingRouteReviewPolicy === 'review_first' || session.receivingRouteReviewPolicy === 'eligible_low_risk_later') {
    codes.push('receiver_route_review_only');
  }

  if (signal.bankProfileId && session.selectedReceiverBankProfileId) {
    codes.push(signal.bankProfileId === session.selectedReceiverBankProfileId ? 'receiver_bank_exact' : 'receiver_bank_mismatch');
  }

  if (signal.directionLabel === 'incoming_customer_transfer') {
    codes.push('incoming_customer_transfer');
  }

  if (context.bankProfileStatus === 'trusted' || context.bankProfileStatus === 'trusted_low_amount') {
    codes.push('trusted_bank_profile');
  }

  if (context.deviceTrusted) {
    codes.push('trusted_device');
  }

  if (context.templateTrusted) {
    codes.push('trusted_template');
  }

  return codes;
}

function canAutoConfirm(input: {
  signal: MatchingSignal;
  candidate: MatchingCandidateSession;
  context: MatchingContext;
  score: number;
}): boolean {
  if (
    !input.candidate.selectedReceivingRouteId ||
    input.candidate.railType === 'card_transfer' ||
    input.candidate.receivingRouteReviewPolicy === 'review_first' ||
    input.candidate.receivingRouteReviewPolicy === 'eligible_low_risk_later'
  ) {
    return false;
  }

  return (
    input.score >= 90 &&
    input.signal.amountMinor === input.candidate.expectedAmountMinor &&
    input.signal.currency === input.candidate.currency &&
    input.signal.directionLabel === 'incoming_customer_transfer' &&
    hasIdentityMatch(input.signal, input.candidate) &&
    input.context.deviceTrusted &&
    input.context.bankAppTrusted &&
    input.context.templateTrusted &&
    (input.context.bankProfileStatus === 'trusted' || input.context.bankProfileStatus === 'trusted_low_amount') &&
    !input.candidate.orderAlreadyConfirmed
  );
}

function hasIdentityMatch(signal: MatchingSignal, session: MatchingCandidateSession): boolean {
  return hasPhoneMatch(signal, session) || hasReferenceMatch(signal, session);
}

function hasPhoneMatch(signal: MatchingSignal, session: MatchingCandidateSession): boolean {
  const sessionPhoneHmac = session.buyerSenderPhoneHmac ?? session.buyerPhoneHmac;
  return Boolean(signal.senderPhoneHmac && sessionPhoneHmac && signal.senderPhoneHmac === sessionPhoneHmac);
}

function hasReferenceMatch(signal: MatchingSignal, session: MatchingCandidateSession): boolean {
  return Boolean(signal.referenceHmac && session.referenceHmac && signal.referenceHmac === session.referenceHmac);
}

function isObservedInsideWindow(observedAt: string, validFrom: string, validUntil: string): boolean {
  const observed = Date.parse(observedAt);
  return observed >= Date.parse(validFrom) && observed <= Date.parse(validUntil);
}
