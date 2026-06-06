import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { parseBankNotification } from '@swimpay/bank-templates';
import {
  EventTypes,
  PUBLIC_EVENT_SIGNAL_DISCLOSURE,
  type EventType,
  type InternalEventEnvelope
} from '@swimpay/events';
import {
  evaluatePaymentIntentGate,
  evaluateSignalMatch,
  type BankProfileTrustStatus,
  type MatchingCandidateSession,
  type MatchingContext,
  type MatchingSignal,
  type MatchConfidenceVector,
  type PaymentIntentGateClassification,
  type PaymentIntentGateDecision,
  type PaymentIntentGateIntent,
  type PaymentIntentGateSignal,
  type TemplateTrustStatus
} from '@swimpay/matching-core';
import { MetricNames, type MetricsRegistry } from '@swimpay/observability';

const { Pool } = pg;

export type SignalRuntimeDecision = 'needs_review' | 'rejected';

export interface SignalRuntimeSignal {
  id: string;
  merchantId: string;
  deviceId: string;
  bankProfileId?: string | undefined;
  packageName?: string | undefined;
  packageCertSha256?: string | undefined;
  eventId: string;
  notificationHash: string;
  observedAt: string;
  receivedAt: string;
  titleRedacted?: string | undefined;
  bodyRedacted?: string | undefined;
  amountMinor?: number | undefined;
  currency?: string | undefined;
  senderPhoneHmac?: string | undefined;
  senderPhoneMasked?: string | undefined;
  referenceHmac?: string | undefined;
  referenceCodeMasked?: string | undefined;
  receivingRouteId?: string | undefined;
  directionLabel?: MatchingSignal['directionLabel'] | undefined;
  signalQuality?: number | undefined;
  parserVersion?: string | undefined;
  templateId?: string | undefined;
  shapeHash?: string | undefined;
  signatureValid: boolean;
  status: string;
}

export interface SignalRuntimeSessionCandidate extends MatchingCandidateSession {
  orderStatus: string;
  paymentSessionStatus: string;
}

export interface SignalRuntimeTrustContext {
  bankProfileStatus: BankProfileTrustStatus;
  bankAppVerificationStatus: 'verified' | 'pending_verification' | 'revoked' | 'unknown' | 'TO_VERIFY';
  bankRouteCertificationStatus?:
    | 'certified'
    | 'observed'
    | 'experimental'
    | 'review_only'
    | 'package_validation_pending'
    | 'disabled'
    | 'unknown'
    | undefined;
  trustedPackageName?: string | undefined;
  trustedPackageCertSha256?: string | undefined;
  templateStatus: TemplateTrustStatus | 'unknown';
  deviceStatus: string;
  deviceTrustScore: number;
  merchantTrusted: boolean;
}

export interface SignalRuntimeResult {
  signalId: string;
  decision: SignalRuntimeDecision;
  score: number;
  collisionDetected: boolean;
  reasonCodes: string[];
  confidenceVector?: MatchConfidenceVector | undefined;
  orderId?: string | undefined;
  paymentSessionId?: string | undefined;
  receiverRouteCode?: string | undefined;
  railType?: 'phone_transfer' | 'card_transfer' | undefined;
  paymentReference?: string | undefined;
  receiverBankId?: string | undefined;
}

export interface SignalRuntimeReviewItem {
  id: string;
  merchantId: string;
  orderId?: string | undefined;
  paymentSessionId?: string | undefined;
  signalId: string;
  reasonCode: string;
  reasonCodes: string[];
  status: 'open';
  createdAt: string;
}

export interface SignalRuntimeAuditEvent {
  id: string;
  merchantId: string;
  eventType: string;
  objectType: string;
  objectId: string;
  payloadRedacted: Record<string, unknown>;
  createdAt: string;
}

export interface SignalRuntimeIdGenerator {
  eventId(): string;
  matchId(): string;
  reviewId(): string;
  auditEventId(): string;
}

export interface CrossCurrencyProbeHit {
  orderId: string;
  externalId: string;
  paymentSessionId: string;
  expectedCurrency: string;
  expectedAmountMinor: number;
  matchedOn: 'reference' | 'amount';
}

export interface SignalRuntimeRepository {
  findSignal(input: { signalId?: string | undefined; eventId?: string | undefined }): Promise<SignalRuntimeSignal | null>;
  getExistingResult(signalId: string): Promise<SignalRuntimeResult | null>;
  getTrustContext(signal: SignalRuntimeSignal): Promise<SignalRuntimeTrustContext>;
  listCandidateSessions(signal: SignalRuntimeSignal): Promise<SignalRuntimeSessionCandidate[]>;
  markSignalParsed(input: { signalId: string; parsed: ParsedSignalRuntimeFields; parsedAt: string }): Promise<void>;
  recordRejected(input: RuntimeRecordInput): Promise<void>;
  createReview(input: RuntimeReviewInput): Promise<{ created: boolean; reviewId: string }>;
  writeAuditEvent(event: SignalRuntimeAuditEvent): Promise<void>;
  publishInternalEvent(event: InternalEventEnvelope): Promise<void>;
  probeCrossCurrencySessions(input: {
    merchantId: string;
    signalCurrency: string;
    amountMinor: number | undefined;
    referenceCode: string | undefined;
    observedAt: string;
  }): Promise<CrossCurrencyProbeHit | null>;
  markCurrencyMismatchNotified(signalId: string, notifiedAt: string): Promise<boolean>;
}

export interface SignalRuntimeProcessorOptions {
  repository: SignalRuntimeRepository;
  metrics?: MetricsRegistry | undefined;
  now?: () => string;
  idGenerator?: SignalRuntimeIdGenerator;
}

interface ParsedSignalRuntimeFields {
  directionLabel: MatchingSignal['directionLabel'];
  amountMinor?: number | undefined;
  currency?: string | undefined;
  referenceCode?: string | undefined;
  signalQuality: number;
  reasonCodes: string[];
}

interface RuntimeRecordInput {
  signal: SignalRuntimeSignal;
  result: SignalRuntimeResult;
  parsed: ParsedSignalRuntimeFields;
  now: string;
}

interface RuntimeReviewInput extends RuntimeRecordInput {
  review: SignalRuntimeReviewItem;
}

const DEFAULT_ID_GENERATOR: SignalRuntimeIdGenerator = {
  eventId: () => `evt_${randomUUID()}`,
  matchId: () => randomUUID(),
  reviewId: () => randomUUID(),
  auditEventId: () => randomUUID()
};

const REJECTED_DIRECTIONS = new Set<MatchingSignal['directionLabel']>([
  'incoming_cashback',
  'incoming_refund',
  'outgoing_payment',
  'outgoing_transfer',
  'failed_transfer',
  'promo',
  'balance_update'
]);

export class SignalRuntimeProcessor {
  private readonly now: () => string;
  private readonly idGenerator: SignalRuntimeIdGenerator;

  public constructor(private readonly options: SignalRuntimeProcessorOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGenerator = options.idGenerator ?? DEFAULT_ID_GENERATOR;
  }

  public async processSignalReceived(input: {
    signalId?: string | undefined;
    eventId?: string | undefined;
  }): Promise<SignalRuntimeResult> {
    const signal = await this.options.repository.findSignal(input);
    if (!signal) {
      throw new Error('Signal runtime could not find notification signal.');
    }

    const existing = await this.options.repository.getExistingResult(signal.id);
    if (existing) {
      this.options.metrics?.increment(MetricNames.SIGNALS_DUPLICATE_TOTAL);
      return existing;
    }

    const now = this.now();

    if (!signal.signatureValid) {
      return this.rejectSignalBeforeParsing({
        signal,
        now,
        reasonCodes: ['invalid_signature'],
        score: 0
      });
    }

    const trustContext = await this.options.repository.getTrustContext(signal);
    const trustHardGateReasonCodes = evaluatePreParseTrustHardGate(signal, trustContext);
    if (trustHardGateReasonCodes.length > 0) {
      return this.rejectSignalBeforeParsing({
        signal,
        now,
        reasonCodes: trustHardGateReasonCodes,
        score: 0
      });
    }

    const parsed = parseSignal(signal);
    this.options.metrics?.increment(MetricNames.SIGNALS_PARSED_TOTAL);
    await this.options.repository.markSignalParsed({ signalId: signal.id, parsed, parsedAt: now });
    await this.emitRuntimeEvent(EventTypes.SIGNAL_PARSED, signal, now, {
      signal_id: signal.id,
      direction_label: parsed.directionLabel,
      signal_quality: parsed.signalQuality,
      reason_codes: parsed.reasonCodes
    });
    await this.writeAudit(EventTypes.SIGNAL_PARSED, signal, now, {
      direction_label: parsed.directionLabel,
      signal_quality: parsed.signalQuality,
      reason_codes: parsed.reasonCodes
    });

    const hydratedSignal = hydrateSignalWithParsed(signal, parsed);
    const candidates = await this.options.repository.listCandidateSessions(hydratedSignal);

    if (REJECTED_DIRECTIONS.has(parsed.directionLabel)) {
      this.incrementSafetyMetric(parsed.directionLabel);
      return this.rejectSignal({
        signal: hydratedSignal,
        parsed,
        now,
        reasonCodes: uniqueReasonCodes([...parsed.reasonCodes, 'negative_direction']),
        score: 0
      });
    }

    const gate = evaluatePaymentIntentGate({
      signal: toPaymentIntentGateSignal(hydratedSignal),
      activePaymentIntents: candidates.map(toPaymentIntentGateIntent),
      allowLatePaymentReview: false
    });
    const gateReasonCodes = uniqueReasonCodes([...parsed.reasonCodes, ...gate.reasonCodes]);
    if (!gate.reviewCreationAllowed) {
      await this.maybeNotifyCurrencyMismatch(hydratedSignal, parsed, now);
      return this.ignoreUnrelatedSignal({
        signal: hydratedSignal,
        parsed,
        now,
        reasonCodes: uniqueReasonCodes([...gateReasonCodes, 'no_active_payment_intent_no_review']),
        score: parsed.signalQuality
      });
    }

    const reviewableCandidates = filterPaymentIntentGateSessions(hydratedSignal, candidates);
    if (reviewableCandidates.length > 0) {
      await this.emitRuntimeEvent(EventTypes.MATCH_CANDIDATES_FOUND, hydratedSignal, now, {
        signal_id: hydratedSignal.id,
        candidate_count: reviewableCandidates.length
      });
      await this.writeAudit(EventTypes.MATCH_CANDIDATES_FOUND, hydratedSignal, now, {
        candidate_count: reviewableCandidates.length
      });
    }

    if (parsed.directionLabel === 'unknown' || parsed.directionLabel === 'unknown_ambiguous_direction') {
      const selected = selectRuntimeSessionForGate(candidates, gate);
      if (!selected) {
        return this.ignoreUnrelatedSignal({
          signal: hydratedSignal,
          parsed,
          now,
          reasonCodes: uniqueReasonCodes([...gateReasonCodes, 'unknown_without_active_payment_intent']),
          score: parsed.signalQuality
        });
      }
      return this.reviewSignal({
        signal: hydratedSignal,
        parsed,
        now,
        selected,
        score: parsed.signalQuality,
        collisionDetected: gate.collisionDetected,
        reasonCodes: uniqueReasonCodes([...gateReasonCodes, 'ambiguous_direction']),
        confidenceVector: gate.confidenceVector
      });
    }

    const match = evaluateSignalMatch({
      signal: toMatchingSignal(hydratedSignal),
      sessions: reviewableCandidates,
      context: toMatchingContext(trustContext)
    });
    const reasonCodes = enrichReasonCodes(
      uniqueReasonCodes([...match.reasonCodes, ...gate.reasonCodes]),
      parsed,
      trustContext,
      reviewableCandidates.length
    );

    if (match.collisionDetected) {
      await this.emitRuntimeEvent(EventTypes.MATCH_COLLISION_DETECTED, hydratedSignal, now, {
        signal_id: hydratedSignal.id,
        candidate_count: match.candidates.length
      });
      await this.writeAudit(EventTypes.MATCH_COLLISION_DETECTED, hydratedSignal, now, {
        candidate_count: match.candidates.length
      });
    }

    await this.emitRuntimeEvent(EventTypes.MATCH_SCORED, hydratedSignal, now, {
      signal_id: hydratedSignal.id,
      score: match.score,
      decision: match.decision,
      collision_detected: match.collisionDetected,
      reason_codes: reasonCodes
    });
    await this.writeAudit(EventTypes.MATCH_SCORED, hydratedSignal, now, {
      score: match.score,
      decision: match.decision,
      collision_detected: match.collisionDetected,
      reason_codes: reasonCodes
    });

    if (match.decision === 'rejected') {
      return this.rejectSignal({
        signal: hydratedSignal,
        parsed,
        now,
        reasonCodes,
        score: match.score
      });
    }

    if (match.decision === 'wait' && !match.selected) {
      await this.maybeNotifyCurrencyMismatch(hydratedSignal, parsed, now);
      return this.ignoreUnrelatedSignal({
        signal: hydratedSignal,
        parsed,
        now,
        reasonCodes: uniqueReasonCodes([...reasonCodes, 'no_active_payment_intent_no_review']),
        score: match.score
      });
    }

    return this.reviewSignal({
      signal: hydratedSignal,
      parsed,
      now,
      selected: match.selected as SignalRuntimeSessionCandidate | undefined,
      score: match.score || parsed.signalQuality,
      collisionDetected: match.collisionDetected,
      reasonCodes,
      confidenceVector: match.confidenceVector
    });
  }

  private async rejectSignalBeforeParsing(input: {
    signal: SignalRuntimeSignal;
    now: string;
    reasonCodes: string[];
    score: number;
  }): Promise<SignalRuntimeResult> {
    return this.rejectSignal({
      signal: input.signal,
      parsed: unparsedRuntimeFields(input.signal, input.reasonCodes),
      now: input.now,
      reasonCodes: uniqueReasonCodes(input.reasonCodes),
      score: input.score
    });
  }

  private async reviewSignal(input: {
    signal: SignalRuntimeSignal;
    parsed: ParsedSignalRuntimeFields;
    now: string;
    selected?: SignalRuntimeSessionCandidate | undefined;
    score: number;
    collisionDetected: boolean;
    reasonCodes: string[];
    confidenceVector?: MatchConfidenceVector | undefined;
  }): Promise<SignalRuntimeResult> {
    const result: SignalRuntimeResult = {
      signalId: input.signal.id,
      decision: 'needs_review',
      score: input.score,
      collisionDetected: input.collisionDetected,
      reasonCodes: input.reasonCodes,
      confidenceVector: input.confidenceVector,
      orderId: input.selected?.orderId,
      paymentSessionId: input.selected?.paymentSessionId,
      ...(input.selected ? routeContextFromSession(input.selected) : {})
    };
    const review: SignalRuntimeReviewItem = {
      id: this.idGenerator.reviewId(),
      merchantId: input.signal.merchantId,
      orderId: input.selected?.orderId,
      paymentSessionId: input.selected?.paymentSessionId,
      signalId: input.signal.id,
      reasonCode: primaryReasonCode(input.reasonCodes),
      reasonCodes: input.reasonCodes,
      status: 'open',
      createdAt: input.now
    };

    const created = await this.options.repository.createReview({
      signal: input.signal,
      parsed: input.parsed,
      now: input.now,
      result,
      review
    });
    await this.emitRuntimeEvent(EventTypes.DECISION_NEEDS_REVIEW, input.signal, input.now, {
      signal_id: input.signal.id,
      order_id: input.selected?.orderId,
      payment_session_id: input.selected?.paymentSessionId,
      review_id: created.reviewId,
      reason_codes: input.reasonCodes,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    });
    await this.emitRuntimeEvent(EventTypes.REVIEW_CREATED, input.signal, input.now, {
      signal_id: input.signal.id,
      order_id: input.selected?.orderId,
      payment_session_id: input.selected?.paymentSessionId,
      review_id: created.reviewId,
      reason_code: review.reasonCode
    });
    await this.writeAudit(EventTypes.DECISION_NEEDS_REVIEW, input.signal, input.now, {
      review_id: created.reviewId,
      reason_codes: input.reasonCodes,
      score: input.score
    });
    await this.writeAudit(EventTypes.REVIEW_CREATED, input.signal, input.now, {
      review_id: created.reviewId,
      reason_code: review.reasonCode
    });
    this.options.metrics?.increment(MetricNames.SIGNALS_NEEDS_REVIEW_TOTAL);
    if (created.created) {
      this.options.metrics?.increment(MetricNames.REVIEWS_CREATED_TOTAL);
    }
    if (input.reasonCodes.includes('amount_only_never_auto_confirm')) {
      this.options.metrics?.increment(MetricNames.AMOUNT_ONLY_REVIEW_TOTAL);
    }
    if (
      input.reasonCodes.includes('bank_profile_untrusted') ||
      input.reasonCodes.includes('bank_app_unverified') ||
      input.reasonCodes.includes('package_cert_to_verify')
    ) {
      this.options.metrics?.increment(MetricNames.UNTRUSTED_BANK_REVIEW_TOTAL);
    }
    return result;
  }

  private async ignoreUnrelatedSignal(input: {
    signal: SignalRuntimeSignal;
    parsed: ParsedSignalRuntimeFields;
    now: string;
    reasonCodes: string[];
    score: number;
  }): Promise<SignalRuntimeResult> {
    const result: SignalRuntimeResult = {
      signalId: input.signal.id,
      decision: 'rejected',
      score: input.score,
      collisionDetected: false,
      reasonCodes: input.reasonCodes
    };
    await this.options.repository.recordRejected({
      signal: input.signal,
      parsed: input.parsed,
      now: input.now,
      result
    });
    await this.writeAudit(EventTypes.DECISION_REJECTED, input.signal, input.now, {
      reason_codes: input.reasonCodes,
      payment_review_created: false,
      merchant_payment_notification_created: false,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    });
    return result;
  }

  private async rejectSignal(input: {
    signal: SignalRuntimeSignal;
    parsed: ParsedSignalRuntimeFields;
    now: string;
    reasonCodes: string[];
    score: number;
  }): Promise<SignalRuntimeResult> {
    const result: SignalRuntimeResult = {
      signalId: input.signal.id,
      decision: 'rejected',
      score: input.score,
      collisionDetected: false,
      reasonCodes: input.reasonCodes
    };
    await this.options.repository.recordRejected({
      signal: input.signal,
      parsed: input.parsed,
      now: input.now,
      result
    });
    await this.emitRuntimeEvent(EventTypes.DECISION_REJECTED, input.signal, input.now, {
      signal_id: input.signal.id,
      reason_codes: input.reasonCodes,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    });
    await this.writeAudit(EventTypes.DECISION_REJECTED, input.signal, input.now, {
      reason_codes: input.reasonCodes,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    });
    this.options.metrics?.increment(MetricNames.SIGNALS_REJECTED_TOTAL);
    return result;
  }

  private incrementSafetyMetric(directionLabel: MatchingSignal['directionLabel']): void {
    switch (directionLabel) {
      case 'incoming_cashback':
        this.options.metrics?.increment(MetricNames.UNSAFE_CASHBACK_BLOCKED_TOTAL);
        return;
      case 'incoming_refund':
        this.options.metrics?.increment(MetricNames.UNSAFE_REFUND_BLOCKED_TOTAL);
        return;
      case 'outgoing_payment':
      case 'outgoing_transfer':
        this.options.metrics?.increment(MetricNames.UNSAFE_OUTGOING_BLOCKED_TOTAL);
        return;
      case 'promo':
        this.options.metrics?.increment(MetricNames.UNSAFE_PROMO_BLOCKED_TOTAL);
        return;
      case 'failed_transfer':
        this.options.metrics?.increment(MetricNames.UNSAFE_FAILED_BLOCKED_TOTAL);
        return;
      default:
        return;
    }
  }

  private async maybeNotifyCurrencyMismatch(
    signal: SignalRuntimeSignal,
    parsed: ParsedSignalRuntimeFields,
    now: string
  ): Promise<void> {
    if (!signal.currency) {
      return;
    }
    try {
      const hit = await this.options.repository.probeCrossCurrencySessions({
        merchantId: signal.merchantId,
        signalCurrency: signal.currency,
        amountMinor: signal.amountMinor,
        referenceCode: parsed.referenceCode,
        observedAt: signal.observedAt
      });
      if (!hit) {
        return;
      }
      const marked = await this.options.repository.markCurrencyMismatchNotified(signal.id, now);
      if (!marked) {
        return; // already notified — at most one event per signal
      }
      await this.emitRuntimeEvent(EventTypes.SIGNAL_CURRENCY_MISMATCH, signal, now, {
        signal_id: signal.id,
        merchant_id: signal.merchantId,
        order_id: hit.orderId,
        external_id: hit.externalId,
        payment_session_id: hit.paymentSessionId,
        expected_currency: hit.expectedCurrency,
        signal_currency: signal.currency,
        signal_amount_minor: signal.amountMinor ?? null,
        expected_amount_minor: hit.expectedAmountMinor,
        matched_on: hit.matchedOn
      });
    } catch (error) {
      // Probe failures must not break signal processing — swallow and log
      const message = error instanceof Error ? error.message : String(error);
      console.error('[signal-worker] maybeNotifyCurrencyMismatch failed:', message);
    }
  }

  private async emitRuntimeEvent(
    type: EventType,
    signal: SignalRuntimeSignal,
    now: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.options.repository.publishInternalEvent({
      id: this.idGenerator.eventId(),
      type,
      created_at: now,
      source: 'swimpay-signal-worker',
      data: stripUndefined(data),
      metadata: {
        correlation_id: signal.eventId,
        causation_id: signal.id
      }
    });
  }

  private async writeAudit(
    eventType: string,
    signal: SignalRuntimeSignal,
    now: string,
    payloadRedacted: Record<string, unknown>
  ): Promise<void> {
    await this.options.repository.writeAuditEvent({
      id: this.idGenerator.auditEventId(),
      merchantId: signal.merchantId,
      eventType,
      objectType: 'notification_signal',
      objectId: signal.id,
      payloadRedacted: stripUndefined(payloadRedacted),
      createdAt: now
    });
  }
}

export function createSignalReceivedHandler(processor: SignalRuntimeProcessor) {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    const signalId = typeof event.data.signal_id === 'string' ? event.data.signal_id : undefined;
    const eventId = typeof event.data.event_id === 'string' ? event.data.event_id : undefined;

    if (!signalId && !eventId) {
      throw new Error('signal.received requires signal_id or event_id');
    }

    await processor.processSignalReceived({ signalId, eventId });
    return { kind: 'ok' };
  };
}

export class InMemorySignalRuntimeRepository implements SignalRuntimeRepository {
  public readonly signals: SignalRuntimeSignal[];
  public readonly sessions: SignalRuntimeSessionCandidate[];
  public readonly matches: SignalRuntimeResult[] = [];
  public readonly reviews: SignalRuntimeReviewItem[] = [];
  public readonly webhookEvents: never[] = [];
  public readonly auditEvents: SignalRuntimeAuditEvent[] = [];
  public readonly publishedEvents: InternalEventEnvelope[] = [];
  public readonly orders = new Map<string, { status: string }>();
  public readonly paymentSessions = new Map<string, { status: string }>();
  public readonly currencyMismatchNotifiedSignalIds: string[] = [];

  /** Set to a hit object in tests that need probeCrossCurrencySessions to return a result. */
  public crossCurrencyHit: CrossCurrencyProbeHit | null = null;
  /** Set to true in tests to simulate the signal already being dedup-marked. */
  public alreadyCurrencyMismatchNotified = false;
  /** Counts how many times probeCrossCurrencySessions was called (for no-probe assertions). */
  public probeCrossCurrencyCallCount = 0;

  public constructor(private readonly params: {
    signals: SignalRuntimeSignal[];
    sessions: SignalRuntimeSessionCandidate[];
    trustContext: SignalRuntimeTrustContext;
  }) {
    this.signals = params.signals.map((signal) => ({ ...signal }));
    this.sessions = params.sessions.map((session) => ({ ...session }));
    for (const session of this.sessions) {
      this.orders.set(session.orderId, { status: session.orderStatus });
      this.paymentSessions.set(session.paymentSessionId, { status: session.paymentSessionStatus });
    }
  }

  public async findSignal(input: { signalId?: string; eventId?: string }): Promise<SignalRuntimeSignal | null> {
    return (
      this.signals.find((signal) => signal.id === input.signalId || signal.eventId === input.eventId) ?? null
    );
  }

  public async getExistingResult(signalId: string): Promise<SignalRuntimeResult | null> {
    return this.matches.find((match) => match.signalId === signalId) ?? null;
  }

  public async getTrustContext(): Promise<SignalRuntimeTrustContext> {
    return this.params.trustContext;
  }

  public async listCandidateSessions(signal: SignalRuntimeSignal): Promise<SignalRuntimeSessionCandidate[]> {
    return this.sessions.filter((session) => {
      if (session.merchantId !== signal.merchantId) {
        return false;
      }
      if (!isRuntimeAmountRelated(signal, session) || signal.currency !== session.currency) {
        return false;
      }

      const observed = Date.parse(signal.observedAt);
      return observed >= Date.parse(session.validFrom) && observed <= Date.parse(session.validUntil);
    });
  }

  public async markSignalParsed(input: { signalId: string; parsed: ParsedSignalRuntimeFields }): Promise<void> {
    const signal = this.signals.find((item) => item.id === input.signalId);
    if (!signal) {
      throw new Error(`Signal ${input.signalId} was not found.`);
    }

    signal.directionLabel = input.parsed.directionLabel;
    signal.amountMinor = input.parsed.amountMinor ?? signal.amountMinor;
    signal.currency = input.parsed.currency ?? signal.currency;
    signal.signalQuality = input.parsed.signalQuality;
    signal.parserVersion = 'bank-template-runtime-v1';
    signal.status = 'parsed';
  }

  public async recordRejected(input: RuntimeRecordInput): Promise<void> {
    this.matches.push(input.result);
    this.markSignalStatus(input.signal.id, 'rejected');
  }

  public async createReview(input: RuntimeReviewInput): Promise<{ created: boolean; reviewId: string }> {
    const existing = this.reviews.find((review) => review.signalId === input.signal.id && review.status === 'open');
    if (existing) {
      return { created: false, reviewId: existing.id };
    }

    this.matches.push(input.result);
    this.reviews.push(input.review);
    if (input.result.orderId) {
      this.orders.set(input.result.orderId, { status: 'needs_review' });
    }
    if (input.result.paymentSessionId) {
      this.paymentSessions.set(input.result.paymentSessionId, { status: 'needs_review' });
    }
    this.markSignalStatus(input.signal.id, 'matched');
    return { created: true, reviewId: input.review.id };
  }

  public async writeAuditEvent(event: SignalRuntimeAuditEvent): Promise<void> {
    this.auditEvents.push(event);
  }

  public async publishInternalEvent(event: InternalEventEnvelope): Promise<void> {
    this.publishedEvents.push(event);
  }

  public async probeCrossCurrencySessions(input: {
    merchantId: string;
    signalCurrency: string;
    amountMinor: number | undefined;
    referenceCode: string | undefined;
    observedAt: string;
  }): Promise<CrossCurrencyProbeHit | null> {
    void input;
    this.probeCrossCurrencyCallCount++;
    return this.crossCurrencyHit;
  }

  public async markCurrencyMismatchNotified(signalId: string, notifiedAt: string): Promise<boolean> {
    void notifiedAt; // used only in the Pg implementation
    if (this.alreadyCurrencyMismatchNotified) {
      return false;
    }
    this.currencyMismatchNotifiedSignalIds.push(signalId);
    return true;
  }

  private markSignalStatus(signalId: string, status: string): void {
    const signal = this.signals.find((item) => item.id === signalId);
    if (signal) {
      signal.status = status;
    }
  }
}

export class PgSignalRuntimeRepository implements SignalRuntimeRepository {
  private readonly pool: pg.Pool;

  public constructor(private readonly params: {
    connectionString: string;
    publishInternalEvent?: ((event: InternalEventEnvelope) => Promise<void>) | undefined;
  }) {
    this.pool = new Pool({ connectionString: params.connectionString, max: 5 });
  }

  public async findSignal(input: { signalId?: string; eventId?: string }): Promise<SignalRuntimeSignal | null> {
    const result = await this.pool.query(
      `SELECT
        ns.id, ns.merchant_id, ns.device_id, ns.bank_profile_id, ns.event_id, ns.notification_hash,
        ns.package_name, ns.package_cert_sha256, ns.shape_hash,
        ns.observed_at, ns.received_at, ns.amount_minor, ns.currency, ns.sender_phone_hmac,
        ns.sender_phone_masked, ns.reference_hmac, ns.reference_code_masked, ns.direction_label,
        ns.signal_quality, ns.parser_version, ns.template_id, ns.signature_valid, ns.status,
        ae.payload_redacted->>'title_redacted' AS title_redacted,
        ae.payload_redacted->>'body_redacted' AS body_redacted
       FROM notification_signals ns
       LEFT JOIN LATERAL (
         SELECT payload_redacted
         FROM audit_events
         WHERE object_type = 'notification_signal'
           AND object_id = ns.id::text
           AND event_type = 'signal.received'
         ORDER BY created_at DESC
         LIMIT 1
       ) ae ON true
       WHERE ($1::uuid IS NOT NULL AND ns.id = $1::uuid)
          OR ($2::text IS NOT NULL AND ns.event_id = $2)
       LIMIT 1`,
      [input.signalId ?? null, input.eventId ?? null]
    );

    return result.rows[0] ? toSignal(result.rows[0] as SignalRow) : null;
  }

  public async getExistingResult(signalId: string): Promise<SignalRuntimeResult | null> {
    const result = await this.pool.query(
      `SELECT signal_id, order_id, payment_session_id, score, decision, collision_detected, reasons_json
       FROM signal_matches
       WHERE signal_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [signalId]
    );

    if (result.rows[0]) {
      const row = result.rows[0] as MatchRow;
      return {
        signalId: String(row.signal_id),
        decision: row.decision as SignalRuntimeDecision,
        score: Number(row.score),
        collisionDetected: Boolean(row.collision_detected),
        reasonCodes: parseReasonCodes(row.reasons_json),
        orderId: row.order_id ? String(row.order_id) : undefined,
        paymentSessionId: row.payment_session_id ? String(row.payment_session_id) : undefined
      };
    }

    const signal = await this.pool.query(
      `SELECT id, status, signal_quality FROM notification_signals WHERE id = $1 AND status = 'rejected'`,
      [signalId]
    );
    if (signal.rows[0]) {
      const row = signal.rows[0] as { id: string; signal_quality: number | string | null };
      return {
        signalId: String(row.id),
        decision: 'rejected',
        score: Number(row.signal_quality ?? 0),
        collisionDetected: false,
        reasonCodes: ['duplicate_signal']
      };
    }

    return null;
  }

  public async getTrustContext(signal: SignalRuntimeSignal): Promise<SignalRuntimeTrustContext> {
    const result = await this.pool.query(
      `SELECT
        bp.status AS bank_profile_status,
        COALESCE(bt.status, 'unknown') AS template_status,
        rd.status AS device_status,
        rd.trust_score,
        bas.status AS exact_bank_app_status,
        COALESCE(brc.runtime_status, 'unknown') AS bank_route_certification_status
       FROM notification_signals ns
       JOIN receiver_devices rd ON rd.id = ns.device_id AND rd.merchant_id = ns.merchant_id
       LEFT JOIN bank_profiles bp ON bp.id = ns.bank_profile_id
       LEFT JOIN bank_templates bt ON bt.id = ns.template_id
       LEFT JOIN bank_app_signatures bas
         ON bas.bank_profile_id = ns.bank_profile_id
        AND bas.package_name = $2
        AND bas.cert_sha256 = $3
       LEFT JOIN bank_route_certifications brc
         ON brc.bank_id = ns.bank_profile_id
        AND brc.package_name = $2
       WHERE ns.id = $1`,
      [signal.id, signal.packageName ?? null, signal.packageCertSha256 ?? null]
    );
    const row = result.rows[0] as TrustRow | undefined;

    return {
      bankProfileStatus: normalizeBankProfileStatus(row?.bank_profile_status),
      bankAppVerificationStatus: normalizeBankAppVerificationStatus(row?.exact_bank_app_status),
      bankRouteCertificationStatus: normalizeBankRouteCertificationStatus(row?.bank_route_certification_status),
      templateStatus: normalizeTemplateStatus(row?.template_status),
      deviceStatus: String(row?.device_status ?? 'unknown'),
      deviceTrustScore: Number(row?.trust_score ?? 0),
      merchantTrusted: true
    };
  }

  public async listCandidateSessions(signal: SignalRuntimeSignal): Promise<SignalRuntimeSessionCandidate[]> {
    if (signal.amountMinor === undefined || !signal.currency) {
      return [];
    }

    const result = await this.pool.query(
      `SELECT
        o.id AS order_id,
        ps.id AS payment_session_id,
        ps.merchant_id,
        ps.expected_amount_minor,
        ps.display_amount_minor,
        ps.payable_amount_minor,
        ps.reconciliation_delta_minor,
        ps.currency,
        ps.buyer_phone_hmac,
        ps.buyer_sender_phone_hmac,
        ps.buyer_first_name_raw,
        ps.buyer_last_name_raw,
        ps.payment_method,
        ps.sender_bank_id,
        ps.sender_card_last4,
        ps.sender_card_masked,
        ps.sender_card_hmac,
        ps.sender_phone_masked,
        ps.sender_phone_hmac,
        ps.reference_hmac,
        ps.selected_receiver_bank_id,
        ps.selected_receiver_bank_profile_id,
        ps.selected_receiving_route_id,
        mrr.route_code AS receiver_route_code,
        mrr.rail_type,
        mrr.review_policy AS receiving_route_review_policy,
        ps.reference_code AS payment_reference,
        ps.status,
        ps.valid_from,
        ps.valid_until,
        o.status AS order_status,
        ps.status AS payment_session_status,
        EXISTS (
          SELECT 1
          FROM signal_matches sm
          WHERE sm.order_id = o.id
            AND sm.decision = 'manual_confirmed'
        ) AS order_already_confirmed
       FROM payment_sessions ps
       JOIN orders o ON o.id = ps.order_id AND o.merchant_id = ps.merchant_id
       LEFT JOIN merchant_receiving_routes mrr
         ON mrr.id = ps.selected_receiving_route_id
        AND mrr.merchant_id = ps.merchant_id
       WHERE ps.merchant_id = $1
         AND (
           COALESCE(ps.payable_amount_minor, ps.expected_amount_minor) = $2
           OR ps.display_amount_minor = $2
         )
         AND ps.currency = $3
         AND $4::timestamptz BETWEEN ps.valid_from AND ps.valid_until
         AND ps.status NOT IN ('manual_confirmed', 'rejected', 'expired')
         AND o.status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')
       ORDER BY ps.created_at ASC
       LIMIT 25`,
      [signal.merchantId, signal.amountMinor, signal.currency, signal.observedAt]
    );

    return result.rows.map((row) => toSession(row as SessionRow));
  }

  public async probeCrossCurrencySessions(input: {
    merchantId: string;
    signalCurrency: string;
    amountMinor: number | undefined;
    referenceCode: string | undefined;
    observedAt: string;
  }): Promise<CrossCurrencyProbeHit | null> {
    if (input.amountMinor === undefined && !input.referenceCode) {
      return null;
    }
    const result = await this.pool.query(
      `SELECT
        o.id AS order_id,
        o.external_id,
        ps.id AS payment_session_id,
        ps.currency AS expected_currency,
        COALESCE(ps.payable_amount_minor, ps.expected_amount_minor) AS expected_amount_minor,
        (UPPER(COALESCE(ps.reference_code, '')) = UPPER(COALESCE($4, ''))) AS reference_matched
       FROM payment_sessions ps
       JOIN orders o ON o.id = ps.order_id AND o.merchant_id = ps.merchant_id
       WHERE ps.merchant_id = $1
         AND ps.currency <> $2
         AND $5::timestamptz BETWEEN ps.valid_from AND ps.valid_until
         AND ps.status NOT IN ('manual_confirmed', 'rejected', 'expired')
         AND o.status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')
         AND (
           ($4::text IS NOT NULL AND UPPER(ps.reference_code) = UPPER($4))
           OR ($3::bigint IS NOT NULL AND (
             COALESCE(ps.payable_amount_minor, ps.expected_amount_minor) = $3
             OR ps.display_amount_minor = $3
           ))
         )
       ORDER BY reference_matched DESC, ps.created_at ASC
       LIMIT 1`,
      [input.merchantId, input.signalCurrency, input.amountMinor ?? null, input.referenceCode ?? null, input.observedAt]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      orderId: String(row.order_id),
      externalId: String(row.external_id),
      paymentSessionId: String(row.payment_session_id),
      expectedCurrency: String(row.expected_currency),
      expectedAmountMinor: Number(row.expected_amount_minor),
      matchedOn: row.reference_matched === true ? 'reference' : 'amount'
    };
  }

  public async markCurrencyMismatchNotified(signalId: string, notifiedAt: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE notification_signals
       SET currency_mismatch_notified_at = $2
       WHERE id = $1 AND currency_mismatch_notified_at IS NULL`,
      [signalId, notifiedAt]
    );
    return result.rowCount === 1;
  }

  public async markSignalParsed(input: { signalId: string; parsed: ParsedSignalRuntimeFields; parsedAt: string }): Promise<void> {
    await this.pool.query(
      `UPDATE notification_signals
       SET amount_minor = COALESCE($2, amount_minor),
           currency = COALESCE($3, currency),
           direction_label = $4,
           signal_quality = $5,
           parser_version = 'bank-template-runtime-v1',
           status = 'parsed'
       WHERE id = $1`,
      [
        input.signalId,
        input.parsed.amountMinor ?? null,
        input.parsed.currency ?? null,
        input.parsed.directionLabel,
        input.parsed.signalQuality
      ]
    );
  }

  public async recordRejected(input: RuntimeRecordInput): Promise<void> {
    await this.pool.query(
      `UPDATE notification_signals SET status = 'rejected' WHERE id = $1`,
      [input.signal.id]
    );
  }

  public async createReview(input: RuntimeReviewInput): Promise<{ created: boolean; reviewId: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existingReview = await client.query(
        `SELECT id FROM review_queue
         WHERE signal_id = $1 AND status = 'open'
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [input.signal.id]
      );
      if (existingReview.rows[0]) {
        await client.query('COMMIT');
        return { created: false, reviewId: String((existingReview.rows[0] as { id: string }).id) };
      }

      if (input.result.orderId && input.result.paymentSessionId) {
        await client.query(
          `INSERT INTO signal_matches (
            id, signal_id, order_id, payment_session_id, score, decision, collision_detected, reasons_json,
            confidence_vector_json, collision_pressure, created_at
          )
          VALUES ($1, $2, $3, $4, $5, 'needs_review', $6, $7::jsonb, $8::jsonb, $9, $10)`,
          [
            DEFAULT_ID_GENERATOR.matchId(),
            input.signal.id,
            input.result.orderId,
            input.result.paymentSessionId,
            input.result.score,
            input.result.collisionDetected,
            JSON.stringify(input.result.reasonCodes),
            JSON.stringify(input.result.confidenceVector ?? {}),
            input.result.confidenceVector?.collision_pressure ?? (input.result.collisionDetected ? 1 : 0),
            input.now
          ]
        );
      }

      await client.query(
        `INSERT INTO review_queue (
          id, merchant_id, order_id, payment_session_id, signal_id, reason_code, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)`,
        [
          input.review.id,
          input.review.merchantId,
          input.review.orderId ?? null,
          input.review.paymentSessionId ?? null,
          input.review.signalId,
          input.review.reasonCode,
          input.review.createdAt
        ]
      );

      if (input.result.orderId) {
        await client.query(
          `UPDATE orders
           SET status = 'needs_review', updated_at = $2
           WHERE merchant_id = $1 AND id = $3
             AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
          [input.signal.merchantId, input.now, input.result.orderId]
        );
      }

      if (input.result.paymentSessionId) {
        await client.query(
          `UPDATE payment_sessions
           SET status = 'needs_review', updated_at = $2
           WHERE merchant_id = $1 AND id = $3
             AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
          [input.signal.merchantId, input.now, input.result.paymentSessionId]
        );
      }

      await client.query(`UPDATE notification_signals SET status = 'matched' WHERE id = $1`, [input.signal.id]);
      await client.query('COMMIT');
      return { created: true, reviewId: input.review.id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async writeAuditEvent(event: SignalRuntimeAuditEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_events (
        id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'system', $6::jsonb, $7)`,
      [
        event.id,
        event.merchantId,
        event.eventType,
        event.objectType,
        event.objectId,
        JSON.stringify(stripUndefined(event.payloadRedacted)),
        event.createdAt
      ]
    );
  }

  public async publishInternalEvent(event: InternalEventEnvelope): Promise<void> {
    await this.params.publishInternalEvent?.(event);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

function parseSignal(signal: SignalRuntimeSignal): ParsedSignalRuntimeFields {
  const redactedText = [signal.titleRedacted, signal.bodyRedacted].filter(Boolean).join(' ').trim();
  const parsed = redactedText
    ? parseBankNotification({ bankProfileId: signal.bankProfileId ?? 'unknown', text: redactedText })
    : null;
  const directionLabel = coerceDirectionLabel(parsed?.directionLabel ?? signal.directionLabel ?? 'unknown');
  const reasonCodes = uniqueReasonCodes([
    ...(parsed?.reasonCodes ?? []),
    ...(directionLabel === 'unknown' ? ['ambiguous_direction'] : []),
    ...(!signal.senderPhoneHmac && !signal.referenceHmac && directionLabel === 'incoming_customer_transfer'
      ? ['amount_only_never_auto_confirm']
      : [])
  ]);

  return {
    directionLabel,
    amountMinor: parsed?.amountMinor ?? signal.amountMinor,
    currency: parsed?.currency ?? signal.currency,
    referenceCode: parsed?.referenceCode,
    signalQuality: parsed?.signalQuality ?? signal.signalQuality ?? 0,
    reasonCodes
  };
}

function hydrateSignalWithParsed(signal: SignalRuntimeSignal, parsed: ParsedSignalRuntimeFields): SignalRuntimeSignal {
  return {
    ...signal,
    amountMinor: parsed.amountMinor ?? signal.amountMinor,
    currency: parsed.currency ?? signal.currency,
    directionLabel: parsed.directionLabel,
    signalQuality: parsed.signalQuality,
    parserVersion: 'bank-template-runtime-v1',
    status: 'parsed'
  };
}

function unparsedRuntimeFields(signal: SignalRuntimeSignal, reasonCodes: string[]): ParsedSignalRuntimeFields {
  return {
    directionLabel: coerceDirectionLabel(signal.directionLabel ?? 'unknown'),
    amountMinor: signal.amountMinor,
    currency: signal.currency,
    signalQuality: signal.signalQuality ?? 0,
    reasonCodes
  };
}

function evaluatePreParseTrustHardGate(signal: SignalRuntimeSignal, context: SignalRuntimeTrustContext): string[] {
  const reasonCodes: string[] = [];

  if (!isTrustedRuntimeDevice(context)) {
    reasonCodes.push('device_untrusted');
  }

  reasonCodes.push(...bankAppTrustHardGateReasonCodes(signal, context));
  reasonCodes.push(...bankRouteCertificationHardGateReasonCodes(context));

  return uniqueReasonCodes(reasonCodes);
}

function isTrustedRuntimeDevice(context: SignalRuntimeTrustContext): boolean {
  return context.deviceStatus === 'active' && context.deviceTrustScore >= 80;
}

function bankAppTrustHardGateReasonCodes(signal: SignalRuntimeSignal, context: SignalRuntimeTrustContext): string[] {
  if (context.bankAppVerificationStatus === 'verified' && isExactTrustedPackageCertificate(signal, context)) {
    return [];
  }

  const reasonCodes = ['bank_app_unverified'];
  if (context.bankAppVerificationStatus === 'revoked') {
    reasonCodes.push('package_cert_revoked');
  } else if (context.bankAppVerificationStatus === 'verified') {
    reasonCodes.push('package_cert_mismatch');
  } else if (
    context.bankAppVerificationStatus === 'TO_VERIFY' ||
    context.bankAppVerificationStatus === 'pending_verification' ||
    context.bankAppVerificationStatus === 'unknown'
  ) {
    reasonCodes.push('package_cert_to_verify');
  }

  return reasonCodes;
}

function bankRouteCertificationHardGateReasonCodes(context: SignalRuntimeTrustContext): string[] {
  if (context.bankRouteCertificationStatus === 'package_validation_pending') {
    return ['bank_route_certification_pending'];
  }
  if (context.bankRouteCertificationStatus === 'disabled') {
    return ['bank_route_certification_disabled'];
  }

  return [];
}

function isExactTrustedPackageCertificate(signal: SignalRuntimeSignal, context: SignalRuntimeTrustContext): boolean {
  if (!context.trustedPackageName && !context.trustedPackageCertSha256) {
    return true;
  }

  return Boolean(
    signal.packageName &&
      signal.packageCertSha256 &&
      signal.packageName === context.trustedPackageName &&
      signal.packageCertSha256 === context.trustedPackageCertSha256
  );
}

function toPaymentIntentGateSignal(signal: SignalRuntimeSignal): PaymentIntentGateSignal {
  return {
    merchantId: signal.merchantId,
    bankProfileId: signal.bankProfileId,
    packageName: signal.packageName,
    classification: toPaymentIntentGateClassification(signal.directionLabel ?? 'unknown'),
    amountMinor: signal.amountMinor,
    currency: signal.currency,
    shapeHash: signal.shapeHash ?? signal.templateId ?? signal.notificationHash,
    referenceHmac: signal.referenceHmac,
    senderPhoneHmac: signal.senderPhoneHmac,
    receivingRouteId: signal.receivingRouteId,
    observedAt: signal.observedAt
  };
}

function toPaymentIntentGateIntent(session: SignalRuntimeSessionCandidate): PaymentIntentGateIntent {
  const expectedPaymentAmountMinor = runtimeMatchingAmountMinor(session);
  return {
    orderId: session.orderId,
    paymentSessionId: session.paymentSessionId,
    merchantId: session.merchantId,
    expectedPaymentAmountMinor,
    displayPriceMinor: session.displayAmountMinor ?? session.expectedAmountMinor,
    reconciliationDeltaMinor: session.reconciliationDeltaMinor ?? Math.max(0, expectedPaymentAmountMinor - (session.displayAmountMinor ?? session.expectedAmountMinor)),
    currency: session.currency,
    generatedReference: session.paymentReference ?? '',
    referenceHmac: session.referenceHmac,
    selectedReceiverBankProfileId: session.selectedReceiverBankProfileId ?? '',
    selectedReceivingRouteId: session.selectedReceivingRouteId,
    selectedReceivingMethod: session.railType ?? (session.paymentMethod === 'card' ? 'card_transfer' : 'phone_transfer'),
    buyerFirstName: session.buyerFirstNameRaw ?? '',
    buyerLastName: session.buyerLastNameRaw ?? '',
    buyerPhoneHmac: session.senderPhoneHmac ?? session.buyerSenderPhoneHmac ?? session.buyerPhoneHmac,
    buyerPhoneMasked: session.senderPhoneMasked,
    buyerSourceCardHmac: session.senderCardHmac,
    buyerSourceCardMasked: session.senderCardMasked,
    buyerSourceCardLast4: session.senderCardLast4,
    status: session.status,
    validFrom: session.validFrom,
    expiresAt: session.validUntil
  };
}

function runtimeMatchingAmountMinor(session: SignalRuntimeSessionCandidate): number {
  return session.payableAmountMinor ?? session.expectedAmountMinor;
}

function isRuntimeAmountRelated(signal: SignalRuntimeSignal, session: SignalRuntimeSessionCandidate): boolean {
  return Boolean(
    signal.amountMinor !== undefined &&
      (signal.amountMinor === runtimeMatchingAmountMinor(session) || signal.amountMinor === session.displayAmountMinor)
  );
}

function filterPaymentIntentGateSessions(
  signal: SignalRuntimeSignal,
  sessions: SignalRuntimeSessionCandidate[]
): SignalRuntimeSessionCandidate[] {
  return sessions.filter((session) => {
    const sessionBankProfileId = session.selectedReceiverBankProfileId;
    if (!signal.bankProfileId || !sessionBankProfileId || signal.bankProfileId !== sessionBankProfileId) {
      return false;
    }

    if (
      signal.receivingRouteId &&
      session.selectedReceivingRouteId &&
      signal.receivingRouteId !== session.selectedReceivingRouteId
    ) {
      return false;
    }

    return true;
  });
}

function selectRuntimeSessionForGate(
  sessions: SignalRuntimeSessionCandidate[],
  gate: PaymentIntentGateDecision
): SignalRuntimeSessionCandidate | undefined {
  if (!gate.selectedIntent) {
    return undefined;
  }

  return sessions.find((session) => session.paymentSessionId === gate.selectedIntent?.paymentSessionId);
}

function toPaymentIntentGateClassification(directionLabel: MatchingSignal['directionLabel']): PaymentIntentGateClassification {
  switch (directionLabel) {
    case 'incoming_customer_transfer':
      return 'incoming_customer_transfer';
    case 'incoming_card_transfer':
      return 'incoming_card_transfer';
    case 'incoming_sbp_transfer':
      return 'incoming_sbp_transfer';
    case 'incoming_cashback':
      return 'cashback';
    case 'incoming_refund':
      return 'refund';
    case 'outgoing_payment':
      return 'outgoing_payment';
    case 'outgoing_transfer':
      return 'outgoing_transfer';
    case 'failed_transfer':
      return 'failed_transfer';
    case 'promo':
      return 'promo';
    case 'balance_update':
      return 'balance_update';
    case 'unknown':
    case 'unknown_ambiguous_direction':
      return 'unknown';
  }
}

function toMatchingSignal(signal: SignalRuntimeSignal): MatchingSignal {
  return {
    id: signal.id,
    merchantId: signal.merchantId,
    bankProfileId: signal.bankProfileId,
    amountMinor: signal.amountMinor,
    currency: signal.currency,
    senderPhoneHmac: signal.senderPhoneHmac,
    referenceHmac: signal.referenceHmac,
    directionLabel: signal.directionLabel ?? 'unknown',
    observedAt: signal.observedAt,
    signatureValid: signal.signatureValid,
    signalAlreadyUsed: signal.status === 'matched'
  };
}

function toMatchingContext(context: SignalRuntimeTrustContext): MatchingContext {
  return {
    bankProfileStatus: context.bankProfileStatus,
    bankAppTrusted: context.bankAppVerificationStatus === 'verified',
    templateTrusted: context.templateStatus === 'trusted' || context.templateStatus === 'trusted_low_amount',
    deviceTrusted: context.deviceStatus === 'active' && context.deviceTrustScore >= 80,
    merchantTrusted: context.merchantTrusted
  };
}

function enrichReasonCodes(
  matchReasonCodes: string[],
  parsed: ParsedSignalRuntimeFields,
  context: SignalRuntimeTrustContext,
  candidateCount: number
): string[] {
  const codes = [
    ...parsed.reasonCodes,
    ...matchReasonCodes,
    ...(candidateCount === 0 ? ['no_candidate'] : []),
    ...(context.bankProfileStatus !== 'trusted' && context.bankProfileStatus !== 'trusted_low_amount'
      ? ['bank_profile_untrusted']
      : []),
    ...(context.bankAppVerificationStatus !== 'verified' ? ['bank_app_unverified'] : []),
    ...(context.bankAppVerificationStatus === 'TO_VERIFY' || context.bankAppVerificationStatus === 'pending_verification'
      ? ['package_cert_to_verify']
      : []),
    ...(context.bankRouteCertificationStatus === 'experimental' ? ['bank_route_certification_experimental'] : []),
    ...(context.bankRouteCertificationStatus === 'unknown' ? ['bank_route_certification_unknown'] : []),
    ...(context.templateStatus !== 'trusted' && context.templateStatus !== 'trusted_low_amount' ? ['template_untrusted'] : []),
    ...(context.deviceStatus !== 'active' || context.deviceTrustScore < 80 ? ['device_untrusted'] : [])
  ];

  if (parsed.directionLabel === 'incoming_customer_transfer' && !codes.includes('sender_phone_exact') && !codes.includes('reference_exact')) {
    codes.push('amount_only_never_auto_confirm');
  }

  return uniqueReasonCodes(codes);
}

function routeContextFromSession(session: SignalRuntimeSessionCandidate): Pick<
  SignalRuntimeResult,
  'receiverRouteCode' | 'railType' | 'paymentReference' | 'receiverBankId'
> {
  return {
    receiverRouteCode: session.receiverRouteCode,
    railType: session.railType,
    paymentReference: session.paymentReference,
    receiverBankId: session.selectedReceiverBankId ?? session.selectedReceiverBankProfileId
  };
}

function primaryReasonCode(reasonCodes: string[]): string {
  return (
    reasonCodes.find((code) =>
      [
        'amount_collision',
        'bank_route_certification_pending',
        'bank_route_certification_disabled',
        'bank_app_unverified',
        'bank_profile_untrusted',
        'template_untrusted',
        'ambiguous_direction',
        'manual_confirmation_required_v1',
        'negative_direction',
        'amount_only_never_auto_confirm',
        'no_candidate'
      ].includes(code)
    ) ?? reasonCodes[0] ?? 'manual_review_required'
  );
}

function coerceDirectionLabel(value: string): MatchingSignal['directionLabel'] {
  if (
    [
      'incoming_customer_transfer',
      'incoming_card_transfer',
      'incoming_sbp_transfer',
      'incoming_cashback',
      'incoming_refund',
      'outgoing_payment',
      'outgoing_transfer',
      'failed_transfer',
      'promo',
      'balance_update',
      'unknown',
      'unknown_ambiguous_direction'
    ].includes(value)
  ) {
    return value as MatchingSignal['directionLabel'];
  }

  return 'unknown_ambiguous_direction';
}

function uniqueReasonCodes(reasonCodes: string[]): string[] {
  return [...new Set(reasonCodes.filter((code) => code.trim().length > 0))];
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function parseReasonCodes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeBankProfileStatus(value: unknown): BankProfileTrustStatus {
  return ['learning', 'shadow_testing', 'trusted_low_amount', 'trusted', 'degraded', 'review_only', 'disabled'].includes(String(value))
    ? (String(value) as BankProfileTrustStatus)
    : 'learning';
}

function normalizeBankAppVerificationStatus(value: unknown): SignalRuntimeTrustContext['bankAppVerificationStatus'] {
  return ['verified', 'pending_verification', 'revoked', 'unknown', 'TO_VERIFY'].includes(String(value))
    ? (String(value) as SignalRuntimeTrustContext['bankAppVerificationStatus'])
    : 'pending_verification';
}

function normalizeTemplateStatus(value: unknown): TemplateTrustStatus | 'unknown' {
  return ['new', 'learning', 'shadow_testing', 'trusted_low_amount', 'trusted', 'degraded', 'review_only', 'disabled'].includes(String(value))
    ? (String(value) as TemplateTrustStatus)
    : 'unknown';
}

function normalizeBankRouteCertificationStatus(value: unknown): NonNullable<SignalRuntimeTrustContext['bankRouteCertificationStatus']> {
  return ['certified', 'observed', 'experimental', 'review_only', 'package_validation_pending', 'disabled', 'unknown'].includes(String(value))
    ? (String(value) as NonNullable<SignalRuntimeTrustContext['bankRouteCertificationStatus']>)
    : 'unknown';
}

interface SignalRow {
  id: string;
  merchant_id: string;
  device_id: string;
  bank_profile_id: string | null;
  package_name: string | null;
  package_cert_sha256: string | null;
  event_id: string;
  notification_hash: string;
  shape_hash: string | null;
  observed_at: Date | string;
  received_at: Date | string;
  amount_minor: number | string | null;
  currency: string | null;
  sender_phone_hmac: string | null;
  sender_phone_masked: string | null;
  reference_hmac: string | null;
  reference_code_masked: string | null;
  direction_label: string | null;
  signal_quality: number | string | null;
  parser_version: string | null;
  template_id: string | null;
  signature_valid: boolean;
  status: string;
  title_redacted?: string | null;
  body_redacted?: string | null;
}

interface TrustRow {
  bank_profile_status: string | null;
  template_status: string | null;
  device_status: string | null;
  trust_score: number | string | null;
  exact_bank_app_status: string | null;
  bank_route_certification_status: string | null;
}

interface SessionRow {
  order_id: string;
  payment_session_id: string;
  merchant_id: string;
  expected_amount_minor: number | string;
  display_amount_minor: number | string | null;
  payable_amount_minor: number | string | null;
  reconciliation_delta_minor: number | string | null;
  currency: string;
  buyer_phone_hmac: string | null;
  buyer_sender_phone_hmac: string | null;
  buyer_first_name_raw: string | null;
  buyer_last_name_raw: string | null;
  payment_method: 'card' | 'sbp' | null;
  sender_bank_id: string | null;
  sender_card_last4: string | null;
  sender_card_masked: string | null;
  sender_card_hmac: string | null;
  sender_phone_masked: string | null;
  sender_phone_hmac: string | null;
  reference_hmac: string | null;
  selected_receiver_bank_id: string | null;
  selected_receiver_bank_profile_id: string | null;
  selected_receiving_route_id: string | null;
  receiver_route_code: string | null;
  rail_type: 'phone_transfer' | 'card_transfer' | null;
  receiving_route_review_policy: 'review_first' | 'eligible_low_risk_later' | null;
  payment_reference: string | null;
  status: string;
  valid_from: Date | string;
  valid_until: Date | string;
  order_status: string;
  payment_session_status: string;
  order_already_confirmed: boolean;
}

interface MatchRow {
  signal_id: string;
  order_id: string | null;
  payment_session_id: string | null;
  score: number | string;
  decision: string;
  collision_detected: boolean;
  reasons_json: unknown;
}

function toSignal(row: SignalRow): SignalRuntimeSignal {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    deviceId: String(row.device_id),
    bankProfileId: row.bank_profile_id ?? undefined,
    packageName: row.package_name ?? undefined,
    packageCertSha256: row.package_cert_sha256 ?? undefined,
    eventId: String(row.event_id),
    notificationHash: String(row.notification_hash),
    shapeHash: row.shape_hash ?? undefined,
    observedAt: toIso(row.observed_at),
    receivedAt: toIso(row.received_at),
    titleRedacted: row.title_redacted ?? undefined,
    bodyRedacted: row.body_redacted ?? undefined,
    amountMinor: row.amount_minor === null ? undefined : Number(row.amount_minor),
    currency: row.currency ?? undefined,
    senderPhoneHmac: row.sender_phone_hmac ?? undefined,
    senderPhoneMasked: row.sender_phone_masked ?? undefined,
    referenceHmac: row.reference_hmac ?? undefined,
    referenceCodeMasked: row.reference_code_masked ?? undefined,
    directionLabel: coerceDirectionLabel(row.direction_label ?? 'unknown'),
    signalQuality: row.signal_quality === null ? undefined : Number(row.signal_quality),
    parserVersion: row.parser_version ?? undefined,
    templateId: row.template_id ?? undefined,
    signatureValid: row.signature_valid,
    status: row.status
  };
}

function toSession(row: SessionRow): SignalRuntimeSessionCandidate {
  return {
    orderId: String(row.order_id),
    paymentSessionId: String(row.payment_session_id),
    merchantId: String(row.merchant_id),
    expectedAmountMinor: Number(row.expected_amount_minor),
    displayAmountMinor: row.display_amount_minor === null ? undefined : Number(row.display_amount_minor),
    payableAmountMinor: row.payable_amount_minor === null ? undefined : Number(row.payable_amount_minor),
    reconciliationDeltaMinor: row.reconciliation_delta_minor === null ? undefined : Number(row.reconciliation_delta_minor),
    currency: row.currency,
    buyerPhoneHmac: row.buyer_phone_hmac ?? undefined,
    buyerSenderPhoneHmac: row.buyer_sender_phone_hmac ?? undefined,
    buyerFirstNameRaw: row.buyer_first_name_raw ?? undefined,
    buyerLastNameRaw: row.buyer_last_name_raw ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    senderBankId: row.sender_bank_id ?? undefined,
    senderCardLast4: row.sender_card_last4 ?? undefined,
    senderCardMasked: row.sender_card_masked ?? undefined,
    senderCardHmac: row.sender_card_hmac ?? undefined,
    senderPhoneMasked: row.sender_phone_masked ?? undefined,
    senderPhoneHmac: row.sender_phone_hmac ?? undefined,
    referenceHmac: row.reference_hmac ?? undefined,
    selectedReceiverBankId: row.selected_receiver_bank_id ?? undefined,
    selectedReceiverBankProfileId: row.selected_receiver_bank_profile_id ?? undefined,
    selectedReceivingRouteId: row.selected_receiving_route_id ?? undefined,
    receiverRouteCode: row.receiver_route_code ?? undefined,
    railType: row.rail_type ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    receivingRouteReviewPolicy: row.receiving_route_review_policy ?? undefined,
    status: row.status,
    validFrom: toIso(row.valid_from),
    validUntil: toIso(row.valid_until),
    orderAlreadyConfirmed: row.order_already_confirmed,
    orderStatus: row.order_status,
    paymentSessionStatus: row.payment_session_status
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
