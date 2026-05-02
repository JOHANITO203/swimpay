import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';
import { parseBankNotification } from '@swimpay/bank-templates';
import {
  EventTypes,
  PUBLIC_EVENT_SIGNAL_DISCLOSURE,
  type EventType,
  type InternalEventEnvelope
} from '@swimpay/events';
import {
  evaluateSignalMatch,
  type BankProfileTrustStatus,
  type MatchingCandidateSession,
  type MatchingContext,
  type MatchingDecision,
  type MatchingSignal,
  type TemplateTrustStatus
} from '@swimpay/matching-core';
import { MetricNames, type MetricsRegistry } from '@swimpay/observability';

const { Pool } = pg;

export type SignalRuntimeDecision = Extract<MatchingDecision, 'auto_confirmed' | 'needs_review' | 'rejected'>;

export interface SignalRuntimeSignal {
  id: string;
  merchantId: string;
  deviceId: string;
  bankProfileId?: string | undefined;
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
  directionLabel?: MatchingSignal['directionLabel'] | undefined;
  signalQuality?: number | undefined;
  parserVersion?: string | undefined;
  templateId?: string | undefined;
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
  orderId?: string | undefined;
  paymentSessionId?: string | undefined;
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

export interface SignalRuntimeWebhookEvent {
  id: string;
  type: 'payment.signal_detected' | 'payment.confirmed' | 'payment.needs_review' | 'payment.rejected';
  created_at: string;
  merchant_id: string;
  data: Record<string, unknown> & typeof PUBLIC_EVENT_SIGNAL_DISCLOSURE;
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
  webhookEventId(): string;
}

export interface SignalRuntimeRepository {
  findSignal(input: { signalId?: string | undefined; eventId?: string | undefined }): Promise<SignalRuntimeSignal | null>;
  getExistingResult(signalId: string): Promise<SignalRuntimeResult | null>;
  getTrustContext(signal: SignalRuntimeSignal): Promise<SignalRuntimeTrustContext>;
  listCandidateSessions(signal: SignalRuntimeSignal): Promise<SignalRuntimeSessionCandidate[]>;
  markSignalParsed(input: { signalId: string; parsed: ParsedSignalRuntimeFields; parsedAt: string }): Promise<void>;
  recordRejected(input: RuntimeRecordInput): Promise<void>;
  createReview(input: RuntimeReviewInput): Promise<{ created: boolean; reviewId: string }>;
  autoConfirm(input: RuntimeAutoConfirmInput): Promise<{ confirmed: boolean; alreadyConfirmed: boolean }>;
  requestWebhookDelivery(event: SignalRuntimeWebhookEvent): Promise<{ created: number; skippedDuplicates: number }>;
  writeAuditEvent(event: SignalRuntimeAuditEvent): Promise<void>;
  publishInternalEvent(event: InternalEventEnvelope): Promise<void>;
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

interface RuntimeAutoConfirmInput extends RuntimeRecordInput {
  selected: SignalRuntimeSessionCandidate;
  matchId: string;
}

const DEFAULT_ID_GENERATOR: SignalRuntimeIdGenerator = {
  eventId: () => `evt_${randomUUID()}`,
  matchId: () => randomUUID(),
  reviewId: () => randomUUID(),
  auditEventId: () => randomUUID(),
  webhookEventId: () => `wh_evt_${randomUUID()}`
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
    const trustContext = await this.options.repository.getTrustContext(hydratedSignal);
    const candidates = await this.options.repository.listCandidateSessions(hydratedSignal);
    if (candidates.length > 0) {
      await this.emitRuntimeEvent(EventTypes.MATCH_CANDIDATES_FOUND, hydratedSignal, now, {
        signal_id: hydratedSignal.id,
        candidate_count: candidates.length
      });
      await this.writeAudit(EventTypes.MATCH_CANDIDATES_FOUND, hydratedSignal, now, {
        candidate_count: candidates.length
      });
    }

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

    if (parsed.directionLabel === 'unknown' || parsed.directionLabel === 'unknown_ambiguous_direction') {
      return this.reviewSignal({
        signal: hydratedSignal,
        parsed,
        now,
        selected: candidates[0],
        score: parsed.signalQuality,
        collisionDetected: false,
        reasonCodes: uniqueReasonCodes([...parsed.reasonCodes, 'ambiguous_direction'])
      });
    }

    const match = evaluateSignalMatch({
      signal: toMatchingSignal(hydratedSignal),
      sessions: candidates,
      context: toMatchingContext(trustContext)
    });
    const reasonCodes = enrichReasonCodes(match.reasonCodes, parsed, trustContext, candidates.length);

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

    if (match.decision === 'auto_confirmed' && match.selected) {
      return this.autoConfirmSignal({
        signal: hydratedSignal,
        parsed,
        now,
        selected: match.selected as SignalRuntimeSessionCandidate,
        score: match.score,
        collisionDetected: match.collisionDetected,
        reasonCodes
      });
    }

    if (match.decision === 'rejected') {
      return this.rejectSignal({
        signal: hydratedSignal,
        parsed,
        now,
        reasonCodes,
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
      reasonCodes
    });
  }

  private async autoConfirmSignal(input: {
    signal: SignalRuntimeSignal;
    parsed: ParsedSignalRuntimeFields;
    now: string;
    selected: SignalRuntimeSessionCandidate;
    score: number;
    collisionDetected: boolean;
    reasonCodes: string[];
  }): Promise<SignalRuntimeResult> {
    const result: SignalRuntimeResult = {
      signalId: input.signal.id,
      decision: 'auto_confirmed',
      score: input.score,
      collisionDetected: input.collisionDetected,
      reasonCodes: input.reasonCodes,
      orderId: input.selected.orderId,
      paymentSessionId: input.selected.paymentSessionId
    };

    const confirmation = await this.options.repository.autoConfirm({
      signal: input.signal,
      parsed: input.parsed,
      now: input.now,
      selected: input.selected,
      matchId: this.idGenerator.matchId(),
      result
    });

    if (!confirmation.confirmed && confirmation.alreadyConfirmed) {
      this.options.metrics?.increment(MetricNames.SIGNALS_DUPLICATE_TOTAL);
      return {
        ...result,
        decision: 'rejected',
        score: 0,
        reasonCodes: uniqueReasonCodes([...input.reasonCodes, 'duplicate_signal'])
      };
    }

    await this.emitRuntimeEvent(EventTypes.DECISION_AUTO_CONFIRMED, input.signal, input.now, {
      signal_id: input.signal.id,
      order_id: input.selected.orderId,
      payment_session_id: input.selected.paymentSessionId,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    });
    await this.writeAudit(EventTypes.DECISION_AUTO_CONFIRMED, input.signal, input.now, {
      order_id: input.selected.orderId,
      payment_session_id: input.selected.paymentSessionId,
      reason_codes: input.reasonCodes,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    });
    await this.createWebhookRequest('payment.confirmed', input.signal, input.now, result);
    this.options.metrics?.increment(MetricNames.SIGNALS_AUTO_CONFIRMED_TOTAL);
    return result;
  }

  private async reviewSignal(input: {
    signal: SignalRuntimeSignal;
    parsed: ParsedSignalRuntimeFields;
    now: string;
    selected?: SignalRuntimeSessionCandidate | undefined;
    score: number;
    collisionDetected: boolean;
    reasonCodes: string[];
  }): Promise<SignalRuntimeResult> {
    const result: SignalRuntimeResult = {
      signalId: input.signal.id,
      decision: 'needs_review',
      score: input.score,
      collisionDetected: input.collisionDetected,
      reasonCodes: input.reasonCodes,
      orderId: input.selected?.orderId,
      paymentSessionId: input.selected?.paymentSessionId
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
    await this.createWebhookRequest('payment.needs_review', input.signal, input.now, result);
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
    await this.createWebhookRequest('payment.rejected', input.signal, input.now, result);
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

  private async createWebhookRequest(
    type: SignalRuntimeWebhookEvent['type'],
    signal: SignalRuntimeSignal,
    now: string,
    result: SignalRuntimeResult
  ): Promise<void> {
    const event: SignalRuntimeWebhookEvent = {
      id: this.idGenerator.webhookEventId(),
      type,
      created_at: now,
      merchant_id: signal.merchantId,
      data: stripUndefined({
        signal_id: signal.id,
        order_id: result.orderId,
        payment_session_id: result.paymentSessionId,
        decision: result.decision,
        reason_codes: result.reasonCodes,
        score: result.score,
        ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
      }) as SignalRuntimeWebhookEvent['data']
    };

    assertSafeWebhookPayload(event);
    await this.options.repository.requestWebhookDelivery(event);
    await this.emitRuntimeEvent(EventTypes.WEBHOOK_DELIVERY_REQUESTED, signal, now, {
      signal_id: signal.id,
      event_id: event.id,
      event_type: event.type
    });
    await this.writeAudit(EventTypes.WEBHOOK_DELIVERY_REQUESTED, signal, now, {
      event_id: event.id,
      event_type: event.type
    });
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
  public readonly webhookEvents: SignalRuntimeWebhookEvent[] = [];
  public readonly auditEvents: SignalRuntimeAuditEvent[] = [];
  public readonly publishedEvents: InternalEventEnvelope[] = [];
  public readonly orders = new Map<string, { status: string }>();
  public readonly paymentSessions = new Map<string, { status: string }>();

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
      if (signal.amountMinor !== session.expectedAmountMinor || signal.currency !== session.currency) {
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

  public async autoConfirm(input: RuntimeAutoConfirmInput): Promise<{ confirmed: boolean; alreadyConfirmed: boolean }> {
    if (
      this.matches.some(
        (match) =>
          match.decision === 'auto_confirmed' &&
          (match.signalId === input.signal.id || match.orderId === input.selected.orderId)
      )
    ) {
      return { confirmed: false, alreadyConfirmed: true };
    }

    this.matches.push(input.result);
    this.orders.set(input.selected.orderId, { status: 'auto_confirmed' });
    this.paymentSessions.set(input.selected.paymentSessionId, { status: 'auto_confirmed' });
    this.markSignalStatus(input.signal.id, 'matched');
    return { confirmed: true, alreadyConfirmed: false };
  }

  public async requestWebhookDelivery(event: SignalRuntimeWebhookEvent): Promise<{ created: number; skippedDuplicates: number }> {
    const existing = this.webhookEvents.find((item) => item.id === event.id || item.data.signal_id === event.data.signal_id);
    if (existing) {
      return { created: 0, skippedDuplicates: 1 };
    }

    this.webhookEvents.push(event);
    return { created: 1, skippedDuplicates: 0 };
  }

  public async writeAuditEvent(event: SignalRuntimeAuditEvent): Promise<void> {
    this.auditEvents.push(event);
  }

  public async publishInternalEvent(event: InternalEventEnvelope): Promise<void> {
    this.publishedEvents.push(event);
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
        EXISTS (
          SELECT 1
          FROM bank_app_signatures bas
          WHERE bas.bank_profile_id = ns.bank_profile_id
            AND bas.status = 'verified'
        ) AS has_verified_app
       FROM notification_signals ns
       JOIN receiver_devices rd ON rd.id = ns.device_id AND rd.merchant_id = ns.merchant_id
       LEFT JOIN bank_profiles bp ON bp.id = ns.bank_profile_id
       LEFT JOIN bank_templates bt ON bt.id = ns.template_id
       WHERE ns.id = $1`,
      [signal.id]
    );
    const row = result.rows[0] as TrustRow | undefined;

    return {
      bankProfileStatus: normalizeBankProfileStatus(row?.bank_profile_status),
      bankAppVerificationStatus: row?.has_verified_app ? 'verified' : 'pending_verification',
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
        ps.currency,
        ps.buyer_phone_hmac,
        ps.reference_hmac,
        ps.status,
        ps.valid_from,
        ps.valid_until,
        o.status AS order_status,
        ps.status AS payment_session_status,
        EXISTS (
          SELECT 1
          FROM signal_matches sm
          WHERE sm.order_id = o.id
            AND sm.decision IN ('auto_confirmed', 'manual_confirmed')
        ) AS order_already_confirmed
       FROM payment_sessions ps
       JOIN orders o ON o.id = ps.order_id AND o.merchant_id = ps.merchant_id
       WHERE ps.merchant_id = $1
         AND ps.expected_amount_minor = $2
         AND ps.currency = $3
         AND $4::timestamptz BETWEEN ps.valid_from AND ps.valid_until
         AND ps.status NOT IN ('auto_confirmed', 'manual_confirmed', 'rejected', 'expired')
         AND o.status NOT IN ('auto_confirmed', 'manual_confirmed', 'fulfilled', 'rejected', 'expired')
       ORDER BY ps.created_at ASC
       LIMIT 25`,
      [signal.merchantId, signal.amountMinor, signal.currency, signal.observedAt]
    );

    return result.rows.map((row) => toSession(row as SessionRow));
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
            id, signal_id, order_id, payment_session_id, score, decision, collision_detected, reasons_json, created_at
          )
          VALUES ($1, $2, $3, $4, $5, 'needs_review', $6, $7::jsonb, $8)`,
          [
            DEFAULT_ID_GENERATOR.matchId(),
            input.signal.id,
            input.result.orderId,
            input.result.paymentSessionId,
            input.result.score,
            input.result.collisionDetected,
            JSON.stringify(input.result.reasonCodes),
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
             AND status NOT IN ('auto_confirmed', 'manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
          [input.signal.merchantId, input.now, input.result.orderId]
        );
      }

      if (input.result.paymentSessionId) {
        await client.query(
          `UPDATE payment_sessions
           SET status = 'needs_review', updated_at = $2
           WHERE merchant_id = $1 AND id = $3
             AND status NOT IN ('auto_confirmed', 'manual_confirmed', 'rejected', 'expired')`,
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

  public async autoConfirm(input: RuntimeAutoConfirmInput): Promise<{ confirmed: boolean; alreadyConfirmed: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const duplicate = await client.query(
        `SELECT id FROM signal_matches
         WHERE (signal_id = $1 OR order_id = $2)
           AND decision IN ('auto_confirmed', 'manual_confirmed')
         LIMIT 1
         FOR UPDATE`,
        [input.signal.id, input.selected.orderId]
      );
      if (duplicate.rows[0]) {
        await client.query('ROLLBACK');
        return { confirmed: false, alreadyConfirmed: true };
      }

      await client.query(
        `INSERT INTO signal_matches (
          id, signal_id, order_id, payment_session_id, score, decision, collision_detected, reasons_json, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'auto_confirmed', false, $6::jsonb, $7)`,
        [
          input.matchId,
          input.signal.id,
          input.selected.orderId,
          input.selected.paymentSessionId,
          input.result.score,
          JSON.stringify(input.result.reasonCodes),
          input.now
        ]
      );
      await client.query(
        `UPDATE orders
         SET status = 'auto_confirmed', updated_at = $2
         WHERE merchant_id = $1 AND id = $3
           AND status NOT IN ('auto_confirmed', 'manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
        [input.signal.merchantId, input.now, input.selected.orderId]
      );
      await client.query(
        `UPDATE payment_sessions
         SET status = 'auto_confirmed', updated_at = $2
         WHERE merchant_id = $1 AND id = $3
           AND status NOT IN ('auto_confirmed', 'manual_confirmed', 'rejected', 'expired')`,
        [input.signal.merchantId, input.now, input.selected.paymentSessionId]
      );
      await client.query(`UPDATE notification_signals SET status = 'matched' WHERE id = $1`, [input.signal.id]);
      await client.query('COMMIT');
      return { confirmed: true, alreadyConfirmed: false };
    } catch (error) {
      await client.query('ROLLBACK');
      if (isUniqueViolation(error)) {
        return { confirmed: false, alreadyConfirmed: true };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  public async requestWebhookDelivery(event: SignalRuntimeWebhookEvent): Promise<{ created: number; skippedDuplicates: number }> {
    assertSafeWebhookPayload(event);
    const endpoints = await this.pool.query(
      `SELECT id FROM webhook_endpoints
       WHERE merchant_id = $1
         AND status = 'active'
         AND enabled_events ? $2`,
      [event.merchant_id, event.type]
    );
    let created = 0;
    let skippedDuplicates = 0;
    const payload = stableStringify(event);
    const payloadHash = createHmac('sha256', 'swimpay_payload_hash_v1').update(payload).digest('hex');

    for (const row of endpoints.rows as { id: string }[]) {
      try {
        await this.pool.query(
          `INSERT INTO webhook_deliveries (
            id, merchant_id, endpoint_id, event_id, event_type, payload_hash, payload_json,
            status, attempt_count, max_attempts, next_retry_at, created_at, updated_at
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, 'pending', 0, 7, $7, $7, $7)`,
          [event.merchant_id, row.id, event.id, event.type, payloadHash, payload, event.created_at]
        );
        created += 1;
      } catch (error) {
        if (isUniqueViolation(error)) {
          skippedDuplicates += 1;
          continue;
        }
        throw error;
      }
    }

    return { created, skippedDuplicates };
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

function toMatchingSignal(signal: SignalRuntimeSignal): MatchingSignal {
  return {
    id: signal.id,
    merchantId: signal.merchantId,
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
    ...(context.templateStatus !== 'trusted' && context.templateStatus !== 'trusted_low_amount' ? ['template_untrusted'] : []),
    ...(context.deviceStatus !== 'active' || context.deviceTrustScore < 80 ? ['device_untrusted'] : [])
  ];

  if (parsed.directionLabel === 'incoming_customer_transfer' && !codes.includes('sender_phone_exact') && !codes.includes('reference_exact')) {
    codes.push('amount_only_never_auto_confirm');
  }

  return uniqueReasonCodes(codes);
}

function primaryReasonCode(reasonCodes: string[]): string {
  return (
    reasonCodes.find((code) =>
      [
        'amount_collision',
        'bank_app_unverified',
        'bank_profile_untrusted',
        'template_untrusted',
        'ambiguous_direction',
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

function assertSafeWebhookPayload(event: SignalRuntimeWebhookEvent): void {
  if (containsRawPiiMarker(event.data)) {
    throw new Error('Signal runtime webhook payload must not expose raw PII.');
  }
}

function containsRawPiiMarker(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsRawPiiMarker(item));
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (/raw[_-]?(notification|text|phone)|notification_raw|phone_raw|raw_phone|buyer_phone$/iu.test(key)) {
      return true;
    }
    if (containsRawPiiMarker(nestedValue)) {
      return true;
    }
  }

  return false;
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
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

function normalizeTemplateStatus(value: unknown): TemplateTrustStatus | 'unknown' {
  return ['new', 'learning', 'shadow_testing', 'trusted_low_amount', 'trusted', 'degraded', 'review_only', 'disabled'].includes(String(value))
    ? (String(value) as TemplateTrustStatus)
    : 'unknown';
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}

interface SignalRow {
  id: string;
  merchant_id: string;
  device_id: string;
  bank_profile_id: string | null;
  event_id: string;
  notification_hash: string;
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
  has_verified_app: boolean;
}

interface SessionRow {
  order_id: string;
  payment_session_id: string;
  merchant_id: string;
  expected_amount_minor: number | string;
  currency: string;
  buyer_phone_hmac: string | null;
  reference_hmac: string | null;
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
    eventId: String(row.event_id),
    notificationHash: String(row.notification_hash),
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
    currency: row.currency,
    buyerPhoneHmac: row.buyer_phone_hmac ?? undefined,
    referenceHmac: row.reference_hmac ?? undefined,
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
