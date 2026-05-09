export const MATCHING_CORE_FOUNDATION = {
  deterministic: true,
  amountOnlyAutoConfirmAllowed: false,
  finalDecisionImplemented: false
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

export type MatchingDecision = 'needs_review' | 'rejected' | 'wait';
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
  reasonCodes.add('requires_review');
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
  }

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
  if (!amountExact && input.signal.amountMinor === selected.displayPriceMinor) {
    reasons.add('display_amount_only_mismatch');
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
    reasonCodes: [...reasons]
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
    reasonCodes: [...reasons]
  });
}

function gateDecision(input: {
  intentRelation: PaymentIntentRelation;
  selectedIntent?: PaymentIntentGateIntent | undefined;
  reviewCreationAllowed: boolean;
  collisionDetected: boolean;
  paymentWindowStatus: 'active' | 'expired' | 'none';
  reasonCodes: string[];
}): PaymentIntentGateDecision {
  return {
    intentRelation: input.intentRelation,
    selectedIntent: input.selectedIntent,
    reviewCreationAllowed: input.reviewCreationAllowed,
    autoConfirmAllowed: false,
    collisionDetected: input.collisionDetected,
    paymentWindowStatus: input.paymentWindowStatus,
    reasonCodes: unique(input.reasonCodes),
    reviewCopy: reviewCopyForRelation(input.intentRelation)
  };
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
  return score;
}

function isAmountRelated(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return (
    signal.currency === intent.currency &&
    (signal.amountMinor === intent.expectedPaymentAmountMinor || signal.amountMinor === intent.displayPriceMinor)
  );
}

function isExactAmountAndCurrency(signal: PaymentIntentGateSignal, intent: PaymentIntentGateIntent): boolean {
  return signal.amountMinor === intent.expectedPaymentAmountMinor && signal.currency === intent.currency;
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
