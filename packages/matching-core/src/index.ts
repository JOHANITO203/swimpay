export const MATCHING_CORE_FOUNDATION = {
  deterministic: true,
  amountOnlyAutoConfirmAllowed: false,
  finalDecisionImplemented: true
} as const;

export type DirectionLabel =
  | 'incoming_customer_transfer'
  | 'incoming_card_transfer'
  | 'incoming_sbp_transfer'
  | 'incoming_cashback'
  | 'incoming_refund'
  | 'outgoing_payment'
  | 'outgoing_transfer'
  | 'failed_transfer'
  | 'promo'
  | 'balance_update'
  | 'unknown'
  | 'unknown_ambiguous_direction';

export type MatchingDecision = 'auto_confirm' | 'needs_review' | 'rejected' | 'wait';
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
  senderNameHintHash?: string | undefined;
  directionLabel: DirectionLabel;
  observedAt: string;
  signatureValid: boolean;
  signalAlreadyUsed: boolean;
  channelRecognition?: 'recognized' | 'pending_unknown' | 'not_applicable' | undefined;
  railHint?: 'sbp' | 'card' | 'mobile_money' | 'wallet' | undefined;
}

export interface MatchingCandidateSession {
  orderId: string;
  paymentSessionId: string;
  merchantId: string;
  expectedAmountMinor: number;
  displayAmountMinor?: number | undefined;
  payableAmountMinor?: number | undefined;
  reconciliationDeltaMinor?: number | undefined;
  currency: string;
  buyerPhoneHmac?: string | undefined;
  buyerSenderPhoneHmac?: string | undefined;
  buyerFirstNameRaw?: string | undefined;
  buyerLastNameRaw?: string | undefined;
  buyerNameStrongMatchHashes?: readonly string[] | undefined;
  buyerNameInitialMatchHashes?: readonly string[] | undefined;
  referenceHmac?: string | undefined;
  selectedReceiverBankId?: string | undefined;
  selectedReceiverBankProfileId?: string | undefined;
  selectedReceivingRouteId?: string | undefined;
  receiverRouteCode?: string | undefined;
  railType?: 'phone_transfer' | 'card_transfer' | undefined;
  paymentMethod?: 'card' | 'sbp' | undefined;
  senderBankId?: string | undefined;
  senderCardHmac?: string | undefined;
  senderCardMasked?: string | undefined;
  senderCardLast4?: string | undefined;
  senderPhoneHmac?: string | undefined;
  senderPhoneMasked?: string | undefined;
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
  /**
   * Global merchant trigger for auto-confirmation. Undefined is treated as
   * 'manual' (safe default): the engine never emits `auto_confirm` unless the
   * merchant has explicitly opted into 'auto'.
   */
  autoConfirmMode?: 'auto' | 'manual' | undefined;
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
  confidenceVector: MatchConfidenceVector;
  selected?: MatchingCandidateSession | undefined;
  candidates: MatchingCandidateSession[];
  reasonCodes: string[];
}

export interface MatchConfidenceVector {
  amount: 'exact' | 'delta_match' | 'mismatch';
  rail: 'sbp' | 'card' | 'mobile_money' | 'wallet' | 'unknown';
  channel: 'recognized' | 'pending_unknown' | 'not_applicable';
  direction: 'incoming' | 'outgoing' | 'refund' | 'cashback' | 'promo' | 'unknown';
  time_window: 'inside' | 'late' | 'too_old';
  receiver_route: 'exact' | 'compatible' | 'missing';
  bank_package: 'trusted_cert' | 'package_only' | 'unknown';
  template: 'known_high' | 'known_medium' | 'unknown_shape';
  sender_name: 'strong' | 'weak' | 'missing' | 'mismatch';
  sender_phone: 'hmac_match' | 'masked_match' | 'not_observed';
  sender_card: 'hmac_match' | 'last4_match' | 'not_observed';
  reference: 'exact' | 'not_observed' | 'mismatch';
  collision_pressure: number;
}

export type PaymentIntentGateClassification =
  | 'incoming_customer_transfer'
  | 'incoming_card_transfer'
  | 'incoming_sbp_transfer'
  | 'cashback'
  | 'refund'
  | 'outgoing_payment'
  | 'outgoing_transfer'
  | 'failed_transfer'
  | 'promo'
  | 'balance_update'
  | 'system_notice'
  | 'unknown';

export type PaymentIntentRelation =
  | 'expected_payment_candidate'
  | 'ambiguous_activity'
  | 'unrelated_bank_activity'
  | 'negative_activity'
  | 'unknown_activity'
  | 'late_payment_candidate';

export interface PaymentIntentGateSignal {
  merchantId: string;
  bankProfileId?: string | undefined;
  packageName?: string | undefined;
  classification: PaymentIntentGateClassification;
  amountMinor?: number | undefined;
  currency?: string | undefined;
  shapeHash: string;
  referenceHmac?: string | undefined;
  senderPhoneHmac?: string | undefined;
  senderNameHintHash?: string | undefined;
  receivingRouteId?: string | undefined;
  observedAt: string;
}

export interface PaymentIntentGateIntent {
  orderId: string;
  paymentSessionId: string;
  merchantId: string;
  expectedPaymentAmountMinor: number;
  displayPriceMinor: number;
  reconciliationDeltaMinor: number;
  currency: string;
  generatedReference: string;
  referenceHmac?: string | undefined;
  selectedReceiverBankProfileId: string;
  selectedReceivingRouteId?: string | undefined;
  selectedReceivingMethod: 'phone_transfer' | 'card_transfer';
  buyerFirstName: string;
  buyerLastName: string;
  buyerNameStrongMatchHashes?: readonly string[] | undefined;
  buyerNameInitialMatchHashes?: readonly string[] | undefined;
  buyerPhoneHmac?: string | undefined;
  buyerPhoneMasked?: string | undefined;
  buyerSourceCardHmac?: string | undefined;
  buyerSourceCardMasked?: string | undefined;
  buyerSourceCardLast4?: string | undefined;
  status: string;
  validFrom: string;
  expiresAt: string;
}

export interface PaymentIntentGateReviewCopy {
  title: string;
  label: string;
  text: string;
}

export interface PaymentIntentGateDecision {
  intentRelation: PaymentIntentRelation;
  selectedIntent?: PaymentIntentGateIntent | undefined;
  reviewCreationAllowed: boolean;
  autoConfirmAllowed: false;
  collisionDetected: boolean;
  confidenceVector: MatchConfidenceVector;
  paymentWindowStatus: 'active' | 'expired' | 'none';
  reasonCodes: string[];
  reviewCopy: PaymentIntentGateReviewCopy;
}

export interface EvaluatePaymentIntentGateInput {
  signal: PaymentIntentGateSignal;
  activePaymentIntents: PaymentIntentGateIntent[];
  allowLatePaymentReview?: boolean | undefined;
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

const PAYMENT_INTENT_GATE_NEGATIVE_CATEGORIES = new Set<PaymentIntentGateClassification>([
  'cashback',
  'refund',
  'outgoing_payment',
  'outgoing_transfer',
  'failed_transfer',
  'promo',
  'balance_update',
  'system_notice'
]);

const PAYMENT_INTENT_GATE_INCOMING_CATEGORIES = new Set<PaymentIntentGateClassification>([
  'incoming_customer_transfer',
  'incoming_card_transfer',
  'incoming_sbp_transfer'
]);

/**
 * Sender-name compatibility from already-hashed evidence (never raw names).
 * The buyer side derives variant hashes (full/latin/cyrillic/reversed = strong,
 * initials = weak); the signal carries the hashed sender-name hint. A match is
 * weak, additive evidence only: per ADR 0005 and task 355 it must never resolve a
 * collision or, on its own, make a signal an expected-payment candidate.
 */
export function evaluateSenderNameCompatibility(
  senderNameHintHash: string | undefined,
  strongMatchHashes: readonly string[] | undefined,
  initialMatchHashes: readonly string[] | undefined
): MatchConfidenceVector['sender_name'] {
  if (!senderNameHintHash) {
    return 'missing';
  }
  if (strongMatchHashes && strongMatchHashes.includes(senderNameHintHash)) {
    return 'strong';
  }
  if (initialMatchHashes && initialMatchHashes.includes(senderNameHintHash)) {
    return 'weak';
  }
  return 'mismatch';
}

/**
 * Rail classification from the signal's parser-provided hint. Additive and
 * non-decisional: when the parser knows the receiving rail (sbp/card for RU,
 * mobile_money for West-Africa, wallet for USD) it sets `railHint`; otherwise
 * the vector falls back to session-derived rail or 'unknown'.
 */
export function railFromSignal(signal: MatchingSignal): MatchConfidenceVector['rail'] {
  return signal.railHint ?? 'unknown';
}

/**
 * Strict floor that a confidence vector must clear before the engine may emit
 * `auto_confirm`. Safety-critical: a false positive confirms an unpaid order, so
 * every condition is conservative and ANDed together.
 *
 * - A strong identity key is mandatory (exact reference OR sender phone/card
 *   HMAC match). Amount-only evidence can never reach auto-confirm.
 * - `pending_unknown` on a channel-bearing rail blocks auto-confirm;
 *   `not_applicable` (no stable channel for this rail) does not block.
 */
export function meetsAutoConfirmFloor(v: MatchConfidenceVector): boolean {
  const strongKey = v.reference === 'exact' || v.sender_phone === 'hmac_match' || v.sender_card === 'hmac_match';
  // pending_unknown on a channel-bearing rail blocks auto; not_applicable (no stable channel) does not.
  const channelOk = v.channel === 'recognized' || v.channel === 'not_applicable';
  return (
    strongKey &&
    v.amount === 'exact' &&
    v.time_window === 'inside' &&
    v.bank_package === 'trusted_cert' &&
    channelOk &&
    v.collision_pressure === 0
  );
}

const NAME_COMPATIBLE_SCORE_BONUS = 5;

export function evaluateSignalMatch(input: EvaluateSignalMatchInput): MatchDecisionOutput {
  const earlyRejection = evaluateHardRejection(input.signal);
  if (earlyRejection) {
    return {
      decision: 'rejected',
      score: 0,
      collisionDetected: false,
      confidenceVector: buildMatchConfidenceVector(input.signal, undefined, input.context, 0, 'none'),
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
      confidenceVector: buildMatchConfidenceVector(input.signal, candidates[0], input.context, candidates.length),
      candidates,
      reasonCodes: ['order_already_confirmed']
    };
  }

  if (candidates.length === 0) {
    return {
      decision: 'wait',
      score: 0,
      collisionDetected: false,
      confidenceVector: buildMatchConfidenceVector(input.signal, undefined, input.context, 0, 'none'),
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
      confidenceVector: buildMatchConfidenceVector(input.signal, undefined, input.context, candidates.length),
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
        confidenceVector: buildMatchConfidenceVector(input.signal, best.candidate, input.context, candidates.length),
        selected: best.candidate,
        candidates,
        reasonCodes: [...reasonCodes]
    };
  }

  reasonCodes.add('no_collision');
  reasonCodes.add('requires_review');
  const confidenceVector = buildMatchConfidenceVector(input.signal, best.candidate, input.context, candidates.length);
  if (
    isStrongManualReviewCandidate({
      signal: input.signal,
      candidate: best.candidate,
      context: input.context,
      score: best.score
    })
  ) {
    reasonCodes.add('manual_confirmation_required_v1');
    reasonCodes.add('strong_match_manual_review');

    // Final decision (engine-only): only a merchant that has explicitly opted
    // into 'auto', on a non-collision strong match that clears the strict floor,
    // earns auto_confirm. Every other case keeps the current needs_review path.
    if (input.context.autoConfirmMode === 'auto' && !collisionDetected && meetsAutoConfirmFloor(confidenceVector)) {
      reasonCodes.add('auto_confirm_floor_met');
      return {
        decision: 'auto_confirm',
        score: best.score,
        collisionDetected: false,
        confidenceVector,
        selected: best.candidate,
        candidates,
        reasonCodes: [...reasonCodes]
      };
    }
  }

  return {
    decision: 'needs_review',
    score: best.score,
    collisionDetected: false,
    confidenceVector,
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

    if (signal.amountMinor !== matchingAmountMinor(session) || signal.currency !== session.currency) {
      return false;
    }

    if (!isReceiverBankCompatible(signal, session)) {
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

  if (signal.amountMinor === matchingAmountMinor(session)) {
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

  const senderName = evaluateSenderNameCompatibility(
    signal.senderNameHintHash,
    session.buyerNameStrongMatchHashes,
    session.buyerNameInitialMatchHashes
  );
  if (senderName === 'strong' || senderName === 'weak') {
    score += NAME_COMPATIBLE_SCORE_BONUS;
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

  if (signal.amountMinor === matchingAmountMinor(session)) {
    codes.push('amount_exact');
    codes.push('PAYABLE_AMOUNT_EXACT_MATCH');
  } else {
    codes.push('PAYABLE_AMOUNT_MISMATCH');
  }

  if (hasReconciliationDelta(session)) {
    codes.push('RECONCILIATION_AMOUNT_EXPECTED');
  }

  if (isDisplayAmountOnlySessionMatch(signal, session)) {
    codes.push('DISPLAY_AMOUNT_ONLY_MATCH');
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

  const senderName = evaluateSenderNameCompatibility(
    signal.senderNameHintHash,
    session.buyerNameStrongMatchHashes,
    session.buyerNameInitialMatchHashes
  );
  if (senderName === 'strong' || senderName === 'weak') {
    codes.push('name_compatible');
  } else if (senderName === 'mismatch') {
    codes.push('name_mismatch');
  }

  return codes;
}

function isStrongManualReviewCandidate(input: {
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
    input.signal.amountMinor === matchingAmountMinor(input.candidate) &&
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

function matchingAmountMinor(session: MatchingCandidateSession): number {
  return session.payableAmountMinor ?? session.expectedAmountMinor;
}

function hasReconciliationDelta(session: MatchingCandidateSession): boolean {
  return Boolean(session.reconciliationDeltaMinor && session.reconciliationDeltaMinor !== 0);
}

function isDisplayAmountOnlySessionMatch(signal: MatchingSignal, session: MatchingCandidateSession): boolean {
  return Boolean(
    signal.currency === session.currency &&
      signal.amountMinor !== undefined &&
      session.displayAmountMinor !== undefined &&
      signal.amountMinor === session.displayAmountMinor &&
      signal.amountMinor !== matchingAmountMinor(session)
  );
}

function isReceiverBankCompatible(signal: MatchingSignal, session: MatchingCandidateSession): boolean {
  if (!signal.bankProfileId || !session.selectedReceiverBankProfileId) {
    return true;
  }

  return signal.bankProfileId === session.selectedReceiverBankProfileId;
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

export function evaluatePaymentIntentGate(input: EvaluatePaymentIntentGateInput): PaymentIntentGateDecision {
  const baseReasons = ['auto_confirm_disabled_v1', 'manual_confirmation_required'];
  if (PAYMENT_INTENT_GATE_NEGATIVE_CATEGORIES.has(input.signal.classification)) {
    return gateDecision({
      intentRelation: 'negative_activity',
      reviewCreationAllowed: false,
      collisionDetected: false,
      paymentWindowStatus: 'none',
      reasonCodes: ['negative_activity_never_review', ...baseReasons]
    });
  }

  const merchantIntents = input.activePaymentIntents.filter((intent) => intent.merchantId === input.signal.merchantId);
  const activeBankCandidates = merchantIntents.filter(
    (intent) =>
      isPaymentIntentActive(intent.status) &&
      isInsidePaymentIntentWindow(input.signal.observedAt, intent) &&
      isReceiverBankMatch(input.signal, intent)
  );
  const activeRouteCandidates = activeBankCandidates.filter((intent) => isReceiverRouteCompatible(input.signal, intent));
  const activeCandidates = activeRouteCandidates.filter((intent) => isAmountRelated(input.signal, intent));
  const activeDisplayAmountOnlyCandidates = activeRouteCandidates.filter((intent) => isDisplayAmountOnlyGateMatch(input.signal, intent));
  const activeAmountMismatchCandidates = activeRouteCandidates.filter(
    (intent) =>
      input.signal.currency === intent.currency &&
      input.signal.amountMinor !== undefined &&
      input.signal.amountMinor !== intent.expectedPaymentAmountMinor &&
      !isDisplayAmountOnlyGateMatch(input.signal, intent)
  );
  const expiredCandidates = merchantIntents.filter(
    (intent) =>
      isReceiverBankMatch(input.signal, intent) &&
      isReceiverRouteCompatible(input.signal, intent) &&
      isExpiredPaymentIntent(input.signal.observedAt, intent) &&
      isExactAmountAndCurrency(input.signal, intent)
  );

  if (input.signal.classification === 'unknown') {
    if (activeCandidates.length > 0) {
      return selectAmbiguousGateDecision({
        signal: input.signal,
        candidates: activeCandidates,
        intentRelation: 'unknown_activity',
        reasonCodes: ['unknown_classification_with_active_intent', ...baseReasons]
      });
    }

    return gateDecision({
      intentRelation: 'unknown_activity',
      reviewCreationAllowed: false,
      collisionDetected: false,
      paymentWindowStatus: 'none',
      reasonCodes: ['unknown_without_active_intent', ...baseReasons]
    });
  }

  if (activeCandidates.length === 0) {
    const hasBankMismatch = merchantIntents.some((intent) => isPaymentIntentActive(intent.status) && !isReceiverBankMatch(input.signal, intent));
    const hasRouteMismatch = activeBankCandidates.some(
      (intent) => isAmountRelated(input.signal, intent) && hasExplicitGateRouteMismatch(input.signal, intent)
    );
    const amountRelatedNonReviewCandidates =
      activeDisplayAmountOnlyCandidates.length > 0 ? activeDisplayAmountOnlyCandidates : activeAmountMismatchCandidates;
    if (amountRelatedNonReviewCandidates.length > 0) {
      const selected = selectBestIntent(input.signal, amountRelatedNonReviewCandidates);
      return gateDecision({
        intentRelation: 'unrelated_bank_activity',
        reviewCreationAllowed: false,
        collisionDetected: amountRelatedNonReviewCandidates.length > 1,
        paymentWindowStatus: 'active',
        reasonCodes: [
          'no_payable_amount_match',
          ...gateAmountReasonCodes(input.signal, selected),
          ...baseReasons
        ],
        confidenceVector: buildPaymentIntentGateConfidenceVector(
          input.signal,
          selected,
          amountRelatedNonReviewCandidates,
          'active'
        )
      });
    }
    if (expiredCandidates.length > 0 && (input.allowLatePaymentReview ?? true)) {
      return selectAmbiguousGateDecision({
        signal: input.signal,
        candidates: expiredCandidates,
        intentRelation: 'late_payment_candidate',
        reasonCodes: ['payment_window_expired', ...baseReasons],
        paymentWindowStatus: 'expired'
      });
    }

    return gateDecision({
      intentRelation: 'unrelated_bank_activity',
      reviewCreationAllowed: false,
      collisionDetected: false,
      paymentWindowStatus: 'none',
      reasonCodes: [
        hasRouteMismatch ? 'receiving_route_mismatch' : hasBankMismatch ? 'receiver_bank_mismatch' : 'no_active_payment_intent',
        ...baseReasons
      ]
    });
  }

  const exactCandidates = activeCandidates.filter((intent) => isExactAmountAndCurrency(input.signal, intent));
  const candidatePool = exactCandidates.length > 0 ? exactCandidates : activeCandidates;
  const selected = selectBestIntent(input.signal, candidatePool);
  const identityMatchCount = candidatePool.filter((intent) => hasGateIdentityMatch(input.signal, intent)).length;
  const collisionDetected = candidatePool.length > 1 && identityMatchCount !== 1;
  const routeExact = hasGateRouteMatch(input.signal, selected);
  const amountExact = isExactAmountAndCurrency(input.signal, selected);
  const referenceExact = hasGateReferenceMatch(input.signal, selected);
  const senderPhoneExact = hasGateSenderPhoneMatch(input.signal, selected);
  const strongIdentity = referenceExact || senderPhoneExact;
  const incoming = PAYMENT_INTENT_GATE_INCOMING_CATEGORIES.has(input.signal.classification);

  const reasons = new Set<string>([
    'active_payment_intent_present',
    'receiver_bank_exact',
    ...baseReasons
  ]);
  reasons.add(amountExact ? 'expected_amount_exact' : 'expected_amount_mismatch');
  for (const reason of gateAmountReasonCodes(input.signal, selected)) {
    reasons.add(reason);
  }
  if (input.signal.currency === selected.currency) {
    reasons.add('currency_exact');
  }
  reasons.add(routeExact ? 'receiving_route_exact' : 'receiving_route_unclear');
  if (referenceExact) {
    reasons.add('reference_exact');
  }
  if (senderPhoneExact) {
    reasons.add('buyer_identity_hint_exact');
  }
  if (!strongIdentity) {
    reasons.add('weak_identity_evidence');
  }
  if (!referenceExact && !senderPhoneExact) {
    reasons.add('amount_only');
  }
  if (collisionDetected) {
    reasons.add('collision_detected');
  }

  const expected =
    incoming &&
    amountExact &&
    routeExact &&
    strongIdentity &&
    !collisionDetected;

  return gateDecision({
    intentRelation: expected ? 'expected_payment_candidate' : 'ambiguous_activity',
    selectedIntent: selected,
    reviewCreationAllowed: true,
    collisionDetected,
    paymentWindowStatus: 'active',
    reasonCodes: [...reasons],
    confidenceVector: buildPaymentIntentGateConfidenceVector(input.signal, selected, candidatePool, 'active')
  });
}

function selectAmbiguousGateDecision(input: {
  signal: PaymentIntentGateSignal;
  candidates: PaymentIntentGateIntent[];
  intentRelation: PaymentIntentRelation;
  reasonCodes: string[];
  paymentWindowStatus?: 'active' | 'expired' | 'none' | undefined;
}): PaymentIntentGateDecision {
  const selected = selectBestIntent(input.signal, input.candidates);
  const identityMatchCount = input.candidates.filter((intent) => hasGateIdentityMatch(input.signal, intent)).length;
  const collisionDetected = input.candidates.length > 1 && identityMatchCount !== 1;
  const reasons = new Set(input.reasonCodes);
  if (collisionDetected) {
    reasons.add('collision_detected');
  }
  if (!hasGateIdentityMatch(input.signal, selected)) {
    reasons.add('weak_identity_evidence');
  }
  if (!input.signal.referenceHmac && !input.signal.senderPhoneHmac) {
    reasons.add('amount_only');
  }

  return gateDecision({
    intentRelation: input.intentRelation,
    selectedIntent: selected,
    reviewCreationAllowed: true,
    collisionDetected,
    paymentWindowStatus: input.paymentWindowStatus ?? 'active',
    reasonCodes: [...reasons],
    confidenceVector: buildPaymentIntentGateConfidenceVector(
      input.signal,
      selected,
      input.candidates,
      input.paymentWindowStatus ?? 'active'
    )
  });
}

function gateDecision(input: {
  intentRelation: PaymentIntentRelation;
  selectedIntent?: PaymentIntentGateIntent | undefined;
  reviewCreationAllowed: boolean;
  collisionDetected: boolean;
  paymentWindowStatus: 'active' | 'expired' | 'none';
  reasonCodes: string[];
  confidenceVector?: MatchConfidenceVector | undefined;
}): PaymentIntentGateDecision {
  return {
    intentRelation: input.intentRelation,
    selectedIntent: input.selectedIntent,
    reviewCreationAllowed: input.reviewCreationAllowed,
    autoConfirmAllowed: false,
    collisionDetected: input.collisionDetected,
    confidenceVector: input.confidenceVector ?? buildEmptyConfidenceVector(input.paymentWindowStatus),
    paymentWindowStatus: input.paymentWindowStatus,
    reasonCodes: unique(input.reasonCodes),
    reviewCopy: reviewCopyForRelation(input.intentRelation)
  };
}

export function calculateCollisionPressure(compatibleIntentCount: number): number {
  if (!Number.isFinite(compatibleIntentCount) || compatibleIntentCount <= 1) {
    return 0;
  }
  return Math.max(0, Math.trunc(compatibleIntentCount) - 1);
}

function buildEmptyConfidenceVector(
  timeWindow: MatchConfidenceVector['time_window'] | 'active' | 'expired' | 'none'
): MatchConfidenceVector {
  return {
    amount: 'mismatch',
    rail: 'unknown',
    channel: 'not_applicable',
    direction: 'unknown',
    time_window: timeWindow === 'active' ? 'inside' : timeWindow === 'expired' ? 'late' : 'too_old',
    receiver_route: 'missing',
    bank_package: 'unknown',
    template: 'unknown_shape',
    sender_name: 'missing',
    sender_phone: 'not_observed',
    sender_card: 'not_observed',
    reference: 'not_observed',
    collision_pressure: 0
  };
}

function buildPaymentIntentGateConfidenceVector(
  signal: PaymentIntentGateSignal,
  selected: PaymentIntentGateIntent,
  compatibleIntents: readonly PaymentIntentGateIntent[],
  paymentWindowStatus: 'active' | 'expired' | 'none'
): MatchConfidenceVector {
  return {
    amount: isExactAmountAndCurrency(signal, selected)
      ? 'exact'
      : signal.currency === selected.currency && signal.amountMinor === selected.displayPriceMinor
        ? 'delta_match'
        : 'mismatch',
    rail: selected.selectedReceivingMethod === 'card_transfer' ? 'card' : selected.selectedReceivingMethod === 'phone_transfer' ? 'sbp' : 'unknown',
    channel: 'not_applicable',
    direction: confidenceDirectionFromGate(signal.classification),
    time_window: paymentWindowStatus === 'active' ? 'inside' : paymentWindowStatus === 'expired' ? 'late' : 'too_old',
    receiver_route: hasGateRouteMatch(signal, selected) ? 'exact' : signal.receivingRouteId ? 'compatible' : 'missing',
    bank_package: signal.packageName ? 'package_only' : 'unknown',
    template: signal.shapeHash && signal.shapeHash !== 'unknown' ? 'unknown_shape' : 'unknown_shape',
    sender_name: evaluateSenderNameCompatibility(
      signal.senderNameHintHash,
      selected.buyerNameStrongMatchHashes,
      selected.buyerNameInitialMatchHashes
    ),
    sender_phone: hasGateSenderPhoneMatch(signal, selected) ? 'hmac_match' : 'not_observed',
    sender_card: 'not_observed',
    reference: hasGateReferenceMatch(signal, selected) ? 'exact' : signal.referenceHmac ? 'mismatch' : 'not_observed',
    collision_pressure: calculateCollisionPressure(compatibleIntents.length)
  };
}

function buildMatchConfidenceVector(
  signal: MatchingSignal,
  selected: MatchingCandidateSession | undefined,
  context: MatchingContext,
  compatibleIntentCount: number,
  fallbackTimeWindow?: MatchConfidenceVector['time_window'] | 'none'
): MatchConfidenceVector {
  if (!selected) {
    return buildEmptyConfidenceVector(fallbackTimeWindow ?? 'none');
  }

  const insideWindow = isObservedInsideWindow(signal.observedAt, selected.validFrom, selected.validUntil);
  return {
    amount: signal.amountMinor === matchingAmountMinor(selected) ? 'exact' : signal.amountMinor === selected.displayAmountMinor ? 'delta_match' : 'mismatch',
    rail: signal.railHint
      ? railFromSignal(signal)
      : selected.railType === 'card_transfer'
        ? 'card'
        : selected.railType === 'phone_transfer'
          ? 'sbp'
          : 'unknown',
    channel: signal.channelRecognition ?? 'not_applicable',
    direction: confidenceDirectionFromMatching(signal.directionLabel),
    time_window: insideWindow ? 'inside' : Date.parse(signal.observedAt) > Date.parse(selected.validUntil) ? 'late' : 'too_old',
    receiver_route: signal.bankProfileId && selected.selectedReceiverBankProfileId && signal.bankProfileId === selected.selectedReceiverBankProfileId
      ? 'compatible'
      : selected.selectedReceivingRouteId
        ? 'compatible'
        : 'missing',
    bank_package: context.bankAppTrusted ? 'trusted_cert' : signal.bankProfileId ? 'package_only' : 'unknown',
    template: context.templateTrusted ? 'known_high' : 'unknown_shape',
    sender_name: evaluateSenderNameCompatibility(
      signal.senderNameHintHash,
      selected.buyerNameStrongMatchHashes,
      selected.buyerNameInitialMatchHashes
    ),
    sender_phone: hasPhoneMatch(signal, selected) ? 'hmac_match' : 'not_observed',
    sender_card: 'not_observed',
    reference: hasReferenceMatch(signal, selected) ? 'exact' : signal.referenceHmac ? 'mismatch' : 'not_observed',
    collision_pressure: calculateCollisionPressure(compatibleIntentCount)
  };
}

function confidenceDirectionFromGate(classification: PaymentIntentGateClassification): MatchConfidenceVector['direction'] {
  switch (classification) {
    case 'incoming_customer_transfer':
    case 'incoming_card_transfer':
    case 'incoming_sbp_transfer':
      return 'incoming';
    case 'outgoing_payment':
    case 'outgoing_transfer':
    case 'failed_transfer':
      return 'outgoing';
    case 'refund':
      return 'refund';
    case 'cashback':
      return 'cashback';
    case 'promo':
      return 'promo';
    default:
      return 'unknown';
  }
}

function confidenceDirectionFromMatching(directionLabel: DirectionLabel): MatchConfidenceVector['direction'] {
  switch (directionLabel) {
    case 'incoming_customer_transfer':
    case 'incoming_card_transfer':
    case 'incoming_sbp_transfer':
      return 'incoming';
    case 'outgoing_payment':
    case 'outgoing_transfer':
    case 'failed_transfer':
      return 'outgoing';
    case 'incoming_refund':
      return 'refund';
    case 'incoming_cashback':
      return 'cashback';
    case 'promo':
      return 'promo';
    default:
      return 'unknown';
  }
}

function reviewCopyForRelation(relation: PaymentIntentRelation): PaymentIntentGateReviewCopy {
  if (relation === 'expected_payment_candidate') {
    return {
      title: 'Nouveau paiement détecté',
      label: 'Matching 100 %',
      text: 'Veuillez confirmer ce paiement.'
    };
  }

  return {
    title: 'Paiement à vérifier',
    label: 'Paiement à vérifier',
    text: 'Certains éléments correspondent, mais une confirmation est nécessaire.'
  };
}

function selectBestIntent(
  signal: PaymentIntentGateSignal,
  candidates: PaymentIntentGateIntent[]
): PaymentIntentGateIntent {
  const selected = [...candidates].sort((left, right) => gateIntentScore(signal, right) - gateIntentScore(signal, left))[0];
  if (!selected) {
    throw new Error('Payment Intent Gate requires at least one candidate to select.');
  }
  return selected;
}

function gateIntentScore(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): number {
  let score = 0;
  if (isExactAmountAndCurrency(signal, intent)) {
    score += 30;
  }
  if (hasGateRouteMatch(signal, intent)) {
    score += 20;
  }
  if (hasGateReferenceMatch(signal, intent)) {
    score += 30;
  }
  if (hasGateSenderPhoneMatch(signal, intent)) {
    score += 20;
  }
  const senderName = evaluateSenderNameCompatibility(
    signal.senderNameHintHash,
    intent.buyerNameStrongMatchHashes,
    intent.buyerNameInitialMatchHashes
  );
  if (senderName === 'strong' || senderName === 'weak') {
    score += NAME_COMPATIBLE_SCORE_BONUS;
  }
  return score;
}

function isAmountRelated(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return signal.currency === intent.currency && signal.amountMinor === intent.expectedPaymentAmountMinor;
}

function isExactAmountAndCurrency(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return signal.amountMinor === intent.expectedPaymentAmountMinor && signal.currency === intent.currency;
}

function isDisplayAmountOnlyGateMatch(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return Boolean(
    signal.currency === intent.currency &&
      signal.amountMinor !== undefined &&
      signal.amountMinor === intent.displayPriceMinor &&
      signal.amountMinor !== intent.expectedPaymentAmountMinor
  );
}

function gateAmountReasonCodes(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): string[] {
  const reasons: string[] = [];
  if (isExactAmountAndCurrency(signal, intent)) {
    reasons.push('PAYABLE_AMOUNT_EXACT_MATCH');
  } else {
    reasons.push('PAYABLE_AMOUNT_MISMATCH');
  }

  if (intent.reconciliationDeltaMinor !== 0) {
    reasons.push('RECONCILIATION_AMOUNT_EXPECTED');
  }

  if (isDisplayAmountOnlyGateMatch(signal, intent)) {
    reasons.push('DISPLAY_AMOUNT_ONLY_MATCH');
    reasons.push('display_amount_only_mismatch');
  }

  return reasons;
}

function hasGateRouteMatch(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return Boolean(signal.receivingRouteId && intent.selectedReceivingRouteId && signal.receivingRouteId === intent.selectedReceivingRouteId);
}

function isReceiverRouteCompatible(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return !hasExplicitGateRouteMismatch(signal, intent);
}

function hasExplicitGateRouteMismatch(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return Boolean(signal.receivingRouteId && intent.selectedReceivingRouteId && signal.receivingRouteId !== intent.selectedReceivingRouteId);
}

function hasGateIdentityMatch(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return hasGateReferenceMatch(signal, intent) || hasGateSenderPhoneMatch(signal, intent);
}

function hasGateReferenceMatch(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return Boolean(signal.referenceHmac && intent.referenceHmac && signal.referenceHmac === intent.referenceHmac);
}

function hasGateSenderPhoneMatch(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return Boolean(signal.senderPhoneHmac && intent.buyerPhoneHmac && signal.senderPhoneHmac === intent.buyerPhoneHmac);
}

function isReceiverBankMatch(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return Boolean(signal.bankProfileId && signal.bankProfileId === intent.selectedReceiverBankProfileId);
}

function isPaymentIntentActive(status: string): boolean {
  return ACTIVE_SESSION_STATUSES.has(status);
}

function isInsidePaymentIntentWindow(observedAt: string, intent: PaymentIntentGateIntent): boolean {
  return isObservedInsideWindow(observedAt, intent.validFrom, intent.expiresAt);
}

function isExpiredPaymentIntent(observedAt: string, intent: PaymentIntentGateIntent): boolean {
  return Date.parse(observedAt) > Date.parse(intent.expiresAt);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
