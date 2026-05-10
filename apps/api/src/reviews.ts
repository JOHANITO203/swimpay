import pg from 'pg';
import { EventTypes, PUBLIC_EVENT_SIGNAL_DISCLOSURE, type EventEnvelope } from '@swimpay/events';
import type { Decision, OrderStatus, PaymentSessionStatus, ReviewStatus } from '@swimpay/contracts';
import { formatAmountMinor, invalidRequest, type ApiErrorResponse } from './orders.js';

const { Pool } = pg;

const finalOrderStatuses = new Set<OrderStatus>(['manual_confirmed', 'fulfilled', 'rejected', 'expired']);
const finalPaymentSessionStatuses = new Set<PaymentSessionStatus>(['manual_confirmed', 'rejected', 'expired']);

export interface ReviewListItem {
  id: string;
  merchantId: string;
  orderId: string;
  paymentSessionId: string;
  signalId?: string | undefined;
  reasonCode: string;
  status: ReviewStatus;
  amountMinor?: number | undefined;
  displayAmountMinor?: number | undefined;
  payableAmountMinor?: number | undefined;
  detectedAmountMinor?: number | undefined;
  amountDeltaMinor?: number | undefined;
  amountRiskLabel?: string | undefined;
  currency?: string | undefined;
  bankProfileId?: string | undefined;
  directionLabel?: string | undefined;
  signalQuality?: number | undefined;
  score?: number | undefined;
  positiveReasonCodes: string[];
  negativeReasonCodes: string[];
  senderPhoneMasked?: string | undefined;
  referenceCodeMasked?: string | undefined;
  createdAt: string;
  resolvedAt?: string | undefined;
}

export interface ReviewSignalMatchInput {
  id: string;
  signalId: string;
  orderId: string;
  paymentSessionId: string;
  score: number;
  decision: Extract<Decision, 'needs_review'>;
  collisionDetected: boolean;
  reasonCodes: string[];
}

export interface ReviewAuditEventInput {
  id: string;
  merchantId: string;
  eventType: (typeof EventTypes.REVIEW_CREATED) | (typeof EventTypes.REVIEW_CONFIRMED) | (typeof EventTypes.REVIEW_REJECTED);
  objectType: 'review' | 'order' | 'payment_session';
  objectId: string;
  actorType: 'system' | 'merchant_user';
  actorId?: string | undefined;
  payloadRedacted: Record<string, unknown>;
}

export interface ReviewCreateInput {
  review: ReviewListItem;
  signalMatch: ReviewSignalMatchInput;
  auditEvent: ReviewAuditEventInput;
}

export interface ReviewActionInput {
  merchantId: string;
  reviewId: string;
  reviewActionId: string;
  auditEventId: string;
  actorId?: string | undefined;
  action: 'confirmed' | 'rejected';
  scope?: ReviewRejectionScope | undefined;
  reason?: string | undefined;
  feedbackLabel?: string | undefined;
  createdAt: string;
}

export type ReviewCreateResult = { kind: 'created'; reviewId: string };

export type ReviewActionResult =
  | {
      kind: 'updated';
      reviewId: string;
      status: 'confirmed' | 'rejected';
      orderId: string;
      paymentSessionId: string;
      orderStatus: OrderStatus;
      paymentSessionStatus: PaymentSessionStatus;
      rejectionScope?: ReviewRejectionScope | undefined;
      reason?: ReviewRejectionReason | undefined;
      confirmationType?: 'notification_signal' | 'manual_bank_check' | undefined;
      reasonLabel?: string | undefined;
      idempotent?: boolean | undefined;
    }
  | { kind: 'not_found' }
  | { kind: 'not_open' }
  | { kind: 'already_confirmed' }
  | { kind: 'rejection_scope_conflict'; existingScope: ReviewRejectionScope; requestedScope: ReviewRejectionScope };

export interface ReviewRepository {
  createReview(input: ReviewCreateInput): Promise<ReviewCreateResult>;
  listOpenReviews(merchantId: string): Promise<ReviewListItem[]>;
  confirmReview(input: ReviewActionInput): Promise<ReviewActionResult>;
  rejectReview(input: ReviewActionInput): Promise<ReviewActionResult>;
}

export interface ReviewIdGenerator {
  reviewActionId: () => string;
  auditEventId: () => string;
  eventId: () => string;
}

export interface ReviewActionRequestBody {
  actor_id?: string | undefined;
  scope?: ReviewRejectionScope | undefined;
  reason?: string | undefined;
  feedback_label?: string | undefined;
}

export interface ReviewListResponse {
  reviews: ReviewListItemResponse[];
}

export interface ReviewListItemResponse {
  review_id: string;
  status: ReviewStatus;
  reason_code: string;
  order_id: string;
  payment_session_id: string;
  signal_id?: string | undefined;
  amount?: {
    value: string;
    currency: string;
  };
  display_amount?: {
    value: string;
    currency: string;
  };
  payable_amount?: {
    value: string;
    currency: string;
  };
  detected_amount?: {
    value: string;
    currency: string;
  };
  amount_delta_minor?: number | undefined;
  risk_label?: string | undefined;
  bank_profile_id?: string | undefined;
  direction_label?: string | undefined;
  signal_quality?: number | undefined;
  score?: number | undefined;
  positive_reasons: string[];
  negative_reasons: string[];
  sender_phone_masked?: string | undefined;
  reference_code_masked?: string | undefined;
  recommended_action: 'manual_review';
  created_at: string;
}

export interface ReviewActionResponse {
  review_id: string;
  status: 'confirmed' | 'rejected';
  order_id: string;
  payment_session_id: string;
  order_status: OrderStatus;
  payment_session_status: PaymentSessionStatus;
  rejection_scope?: ReviewRejectionScope | undefined;
  reason?: ReviewRejectionReason | undefined;
  idempotent?: boolean | undefined;
}

export const ReviewRejectionScopes = ['signal', 'payment_session', 'order'] as const;
export type ReviewRejectionScope = (typeof ReviewRejectionScopes)[number];

export const ReviewRejectionReasons = [
  'false_positive',
  'wrong_signal',
  'amount_collision',
  'negative_direction',
  'buyer_not_recognized',
  'expired_payment',
  'fraud_suspected',
  'merchant_cancelled',
  'other'
] as const;
export type ReviewRejectionReason = (typeof ReviewRejectionReasons)[number];

export class PgReviewRepository implements ReviewRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  public async createReview(input: ReviewCreateInput): Promise<ReviewCreateResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO signal_matches (
          id, signal_id, order_id, payment_session_id, score, decision, collision_detected, reasons_json, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          input.signalMatch.id,
          input.signalMatch.signalId,
          input.signalMatch.orderId,
          input.signalMatch.paymentSessionId,
          input.signalMatch.score,
          input.signalMatch.decision,
          input.signalMatch.collisionDetected,
          JSON.stringify(input.signalMatch.reasonCodes),
          input.review.createdAt
        ]
      );

      await client.query(
        `INSERT INTO review_queue (
          id, merchant_id, order_id, payment_session_id, signal_id, reason_code, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.review.id,
          input.review.merchantId,
          input.review.orderId,
          input.review.paymentSessionId,
          input.review.signalId,
          input.review.reasonCode,
          input.review.status,
          input.review.createdAt
        ]
      );

      await client.query(
        `UPDATE orders
         SET status = $1, updated_at = $2
         WHERE merchant_id = $3 AND id = $4 AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
        ['needs_review', input.review.createdAt, input.review.merchantId, input.review.orderId]
      );

      await client.query(
        `UPDATE payment_sessions
         SET status = $1, updated_at = $2
         WHERE merchant_id = $3 AND id = $4 AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
        ['needs_review', input.review.createdAt, input.review.merchantId, input.review.paymentSessionId]
      );

      await insertReviewAuditEvent(client, input.auditEvent);

      await client.query('COMMIT');
      return { kind: 'created', reviewId: input.review.id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listOpenReviews(merchantId: string): Promise<ReviewListItem[]> {
    const result = await this.pool.query(
      `SELECT
        rq.id,
        rq.merchant_id,
        rq.order_id,
        rq.payment_session_id,
        rq.signal_id,
        rq.reason_code,
        rq.status,
        rq.created_at,
        rq.resolved_at,
        COALESCE(ns.amount_minor, ps.payable_amount_minor, ps.expected_amount_minor, o.amount_minor) AS amount_minor,
        COALESCE(ps.display_amount_minor, o.amount_minor, ps.expected_amount_minor) AS display_amount_minor,
        COALESCE(ps.payable_amount_minor, ps.expected_amount_minor, o.amount_minor) AS payable_amount_minor,
        ns.amount_minor AS detected_amount_minor,
        CASE
          WHEN ns.amount_minor IS NOT NULL AND COALESCE(ps.payable_amount_minor, ps.expected_amount_minor, o.amount_minor) IS NOT NULL
          THEN ABS(ns.amount_minor - COALESCE(ps.payable_amount_minor, ps.expected_amount_minor, o.amount_minor))
          ELSE NULL
        END AS amount_delta_minor,
        COALESCE(ns.currency, o.currency, ps.currency) AS currency,
        ns.bank_profile_id,
        ns.direction_label,
        ns.signal_quality,
        ns.sender_phone_masked,
        ns.reference_code_masked,
        sm.score,
        sm.reasons_json
       FROM review_queue rq
       LEFT JOIN orders o ON o.id = rq.order_id AND o.merchant_id = rq.merchant_id
       LEFT JOIN payment_sessions ps ON ps.id = rq.payment_session_id AND ps.merchant_id = rq.merchant_id
       LEFT JOIN notification_signals ns ON ns.id = rq.signal_id AND ns.merchant_id = rq.merchant_id
       LEFT JOIN LATERAL (
         SELECT score, reasons_json
         FROM signal_matches
         WHERE signal_id = rq.signal_id
           AND order_id = rq.order_id
           AND payment_session_id = rq.payment_session_id
         ORDER BY created_at DESC
         LIMIT 1
       ) sm ON true
       WHERE rq.merchant_id = $1 AND rq.status = 'open'
       ORDER BY rq.created_at ASC`,
      [merchantId]
    );

    return result.rows.map((row) => toReviewListItem(row as ReviewListRow));
  }

  public async confirmReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    return this.actionReview(input, {
      reviewStatus: 'confirmed',
      stateStatus: 'manual_confirmed',
      eventType: EventTypes.REVIEW_CONFIRMED
    });
  }

  public async rejectReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    const client = await this.pool.connect();
    const scope = input.scope ?? 'signal';
    const reason = normalizeRejectionReason(input.reason);

    try {
      await client.query('BEGIN');

      const reviewResult = await client.query(
        `SELECT
           rq.id, rq.merchant_id, rq.order_id, rq.payment_session_id, rq.signal_id, rq.status,
           o.status AS order_status,
           ps.status AS payment_session_status
         FROM review_queue rq
         LEFT JOIN orders o ON o.id = rq.order_id AND o.merchant_id = rq.merchant_id
         LEFT JOIN payment_sessions ps ON ps.id = rq.payment_session_id AND ps.merchant_id = rq.merchant_id
         WHERE rq.merchant_id = $1 AND rq.id = $2
         FOR UPDATE OF rq`,
        [input.merchantId, input.reviewId]
      );

      if (reviewResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }

      const review = reviewResult.rows[0] as ReviewActionRow;
      const currentOrderStatus = normalizeOrderStatus(review.order_status);
      const currentSessionStatus = normalizePaymentSessionStatus(review.payment_session_status);
      const effectiveScope: ReviewRejectionScope = review.signal_id ? scope : 'order';

      if (String(review.status) !== 'open') {
        if (String(review.status) === 'rejected') {
          const previous = await findPreviousRejectionAction(client, input.merchantId, input.reviewId);
          if (previous?.scope === effectiveScope) {
            await client.query('COMMIT');
            return {
              kind: 'updated',
              reviewId: input.reviewId,
              status: 'rejected',
              orderId: String(review.order_id),
              paymentSessionId: String(review.payment_session_id),
              orderStatus: currentOrderStatus,
              paymentSessionStatus: currentSessionStatus,
              rejectionScope: previous.scope,
              reason: previous.reason,
              idempotent: true
            };
          }

          await client.query('ROLLBACK');
          return {
            kind: 'rejection_scope_conflict',
            existingScope: previous?.scope ?? 'signal',
            requestedScope: effectiveScope
          };
        }

        await client.query('ROLLBACK');
        return { kind: 'not_open' };
      }

      if (
        (effectiveScope === 'payment_session' || effectiveScope === 'order') &&
        (isFinalPaymentSessionStatus(currentSessionStatus) || isFinalOrderStatus(currentOrderStatus))
      ) {
        await client.query('ROLLBACK');
        return { kind: 'not_open' };
      }

      if (effectiveScope === 'order' && isFinalOrderStatus(currentOrderStatus)) {
        await client.query('ROLLBACK');
        return { kind: 'not_open' };
      }

      await client.query(
        `UPDATE review_queue
         SET status = 'rejected', resolved_at = $2
         WHERE merchant_id = $1 AND id = $3`,
        [input.merchantId, input.createdAt, input.reviewId]
      );

      if (review.signal_id) {
        await client.query(
          `UPDATE notification_signals
           SET status = 'rejected'
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, review.signal_id]
        );
      }

      let orderStatus = currentOrderStatus;
      let paymentSessionStatus = currentSessionStatus;

      if (effectiveScope === 'payment_session' || effectiveScope === 'order') {
        paymentSessionStatus = 'rejected';
        const paymentSessionUpdate = await client.query(
          `UPDATE payment_sessions
           SET status = 'rejected',
               route_lock_expires_at = NULL,
               amount_lease_id = NULL,
               updated_at = $3
           WHERE merchant_id = $1 AND id = $2 AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
          [input.merchantId, review.payment_session_id, input.createdAt]
        );
        if (paymentSessionUpdate.rowCount !== 1) {
          await client.query('ROLLBACK');
          return { kind: 'not_open' };
        }
        await client.query(
          `UPDATE amount_leases
           SET status = 'released',
               updated_at = $3::timestamptz
           WHERE merchant_id = $1
             AND payment_session_id = $2
             AND status = 'active'`,
          [input.merchantId, review.payment_session_id, input.createdAt]
        );
      }

      if (effectiveScope === 'order') {
        orderStatus = 'rejected';
        const orderUpdate = await client.query(
          `UPDATE orders
           SET status = 'rejected', updated_at = $3
           WHERE merchant_id = $1 AND id = $2 AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
          [input.merchantId, review.order_id, input.createdAt]
        );
        if (orderUpdate.rowCount !== 1) {
          await client.query('ROLLBACK');
          return { kind: 'not_open' };
        }
      }

      await client.query(
        `INSERT INTO review_actions (
          id, review_id, merchant_id, actor_id, action, reason, feedback_label, scope, created_at
        ) VALUES ($1, $2, $3, $4, 'rejected', $5, $6, $7, $8)`,
        [
          input.reviewActionId,
          input.reviewId,
          input.merchantId,
          input.actorId ?? null,
          reason,
          input.feedbackLabel ?? null,
          effectiveScope,
          input.createdAt
        ]
      );

      await insertReviewAuditEvent(client, {
        id: input.auditEventId,
        merchantId: input.merchantId,
        eventType: EventTypes.REVIEW_REJECTED,
        objectType: 'review',
        objectId: input.reviewId,
        actorType: 'merchant_user',
        actorId: input.actorId,
        payloadRedacted: {
          order_id: review.order_id,
          payment_session_id: review.payment_session_id,
          signal_id: review.signal_id,
          action: input.action,
          rejection_scope: effectiveScope,
          reason,
          feedback_label: input.feedbackLabel
        }
      });
      await insertSystemAuditEvent(client, {
        merchantId: input.merchantId,
        eventType: 'review.action_created',
        objectType: 'review',
        objectId: input.reviewId,
        createdAt: input.createdAt,
        payloadRedacted: { action: 'rejected', rejection_scope: effectiveScope, reason }
      });
      if (review.signal_id) {
        await insertSystemAuditEvent(client, {
          merchantId: input.merchantId,
          eventType: EventTypes.SIGNAL_REJECTED,
          objectType: 'notification_signal',
          objectId: String(review.signal_id),
          createdAt: input.createdAt,
          payloadRedacted: { review_id: input.reviewId, rejection_scope: effectiveScope, reason }
        });
      }

      if (effectiveScope === 'payment_session' || effectiveScope === 'order') {
        await insertSystemAuditEvent(client, {
          merchantId: input.merchantId,
          eventType: 'payment_session.status_changed',
          objectType: 'payment_session',
          objectId: String(review.payment_session_id),
          createdAt: input.createdAt,
          payloadRedacted: { review_id: input.reviewId, from_status: currentSessionStatus, to_status: 'rejected', reason }
        });
      }

      if (effectiveScope === 'order') {
        await insertSystemAuditEvent(client, {
          merchantId: input.merchantId,
          eventType: 'order.status_changed',
          objectType: 'order',
          objectId: String(review.order_id),
          createdAt: input.createdAt,
          payloadRedacted: { review_id: input.reviewId, from_status: currentOrderStatus, to_status: 'rejected', reason }
        });
      }

      await client.query('COMMIT');

      return {
        kind: 'updated',
        reviewId: input.reviewId,
        status: 'rejected',
        orderId: String(review.order_id),
        paymentSessionId: String(review.payment_session_id),
        orderStatus,
        paymentSessionStatus,
        rejectionScope: effectiveScope,
        reason,
        confirmationType: review.signal_id ? 'notification_signal' : 'manual_bank_check',
        reasonLabel: review.signal_id ? undefined : 'NO_NOTIFICATION_MANUAL_FALLBACK_REJECTED'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async actionReview(
    input: ReviewActionInput,
    outcome: {
      reviewStatus: 'confirmed' | 'rejected';
      stateStatus: 'manual_confirmed' | 'rejected';
      eventType: typeof EventTypes.REVIEW_CONFIRMED | typeof EventTypes.REVIEW_REJECTED;
    }
  ): Promise<ReviewActionResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const reviewResult = await client.query(
        `SELECT
           rq.id, rq.merchant_id, rq.order_id, rq.payment_session_id, rq.signal_id, rq.status,
           o.status AS order_status,
           ps.status AS payment_session_status
         FROM review_queue rq
         LEFT JOIN orders o ON o.id = rq.order_id AND o.merchant_id = rq.merchant_id
         LEFT JOIN payment_sessions ps ON ps.id = rq.payment_session_id AND ps.merchant_id = rq.merchant_id
         WHERE rq.merchant_id = $1 AND rq.id = $2
         FOR UPDATE OF rq`,
        [input.merchantId, input.reviewId]
      );

      if (reviewResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }

      const review = reviewResult.rows[0] as ReviewActionRow;
      const currentOrderStatus = normalizeOrderStatus(review.order_status);
      const currentSessionStatus = normalizePaymentSessionStatus(review.payment_session_status);
      if (String(review.status) !== 'open') {
        await client.query('ROLLBACK');
        return { kind: 'not_open' };
      }

      if (isFinalOrderStatus(currentOrderStatus) || isFinalPaymentSessionStatus(currentSessionStatus)) {
        await client.query('ROLLBACK');
        return { kind: 'not_open' };
      }

      if (outcome.reviewStatus === 'confirmed') {
        const duplicateConfirmed = await client.query(
          `SELECT id FROM signal_matches
           WHERE (order_id = $1 OR ($2::uuid IS NOT NULL AND signal_id = $2::uuid))
             AND decision = 'manual_confirmed'
           LIMIT 1`,
          [review.order_id, review.signal_id]
        );

        if (duplicateConfirmed.rowCount && duplicateConfirmed.rowCount > 0) {
          await client.query('ROLLBACK');
          return { kind: 'already_confirmed' };
        }

        if (review.signal_id) {
          await client.query(
            `INSERT INTO signal_matches (
              signal_id, order_id, payment_session_id, score, decision, collision_detected, reasons_json, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              review.signal_id,
              review.order_id,
              review.payment_session_id,
              100,
              'manual_confirmed',
              false,
              JSON.stringify(['manual_review_confirmed']),
              input.createdAt
            ]
          );
        }
      }

      await client.query(
        `UPDATE review_queue
         SET status = $1, resolved_at = $2
         WHERE merchant_id = $3 AND id = $4`,
        [outcome.reviewStatus, input.createdAt, input.merchantId, input.reviewId]
      );

      await client.query(
        `INSERT INTO review_actions (
          id, review_id, merchant_id, actor_id, action, reason, feedback_label, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.reviewActionId,
          input.reviewId,
          input.merchantId,
          input.actorId ?? null,
          input.action,
          input.reason ?? null,
          input.feedbackLabel ?? null,
          input.createdAt
        ]
      );

      const orderUpdate = await client.query(
        `UPDATE orders
         SET status = $1, updated_at = $2
         WHERE merchant_id = $3
           AND id = $4
           AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
        [outcome.stateStatus, input.createdAt, input.merchantId, review.order_id]
      );

      const paymentSessionUpdate = await client.query(
        `UPDATE payment_sessions
         SET status = $1,
             route_lock_expires_at = NULL,
             amount_lease_id = NULL,
             updated_at = $2
         WHERE merchant_id = $3
           AND id = $4
           AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
        [outcome.stateStatus, input.createdAt, input.merchantId, review.payment_session_id]
      );

      if (orderUpdate.rowCount !== 1 || paymentSessionUpdate.rowCount !== 1) {
        await client.query('ROLLBACK');
        return { kind: 'not_open' };
      }

      if (outcome.reviewStatus === 'confirmed') {
        await client.query(
          `UPDATE amount_leases
           SET status = 'used',
               updated_at = $3::timestamptz
           WHERE merchant_id = $1
             AND payment_session_id = $2
             AND status = 'active'`,
          [input.merchantId, review.payment_session_id, input.createdAt]
        );
      }

      await insertReviewAuditEvent(client, {
        id: input.auditEventId,
        merchantId: input.merchantId,
        eventType: outcome.eventType,
        objectType: 'review',
        objectId: input.reviewId,
        actorType: 'merchant_user',
        actorId: input.actorId,
        payloadRedacted: {
          order_id: review.order_id,
          payment_session_id: review.payment_session_id,
          signal_id: review.signal_id,
          action: input.action,
          reason: input.reason,
          feedback_label: input.feedbackLabel
        }
      });

      await client.query('COMMIT');

      return {
        kind: 'updated',
        reviewId: input.reviewId,
        status: outcome.reviewStatus,
        orderId: String(review.order_id),
        paymentSessionId: String(review.payment_session_id),
        orderStatus: outcome.stateStatus,
        paymentSessionStatus: outcome.stateStatus,
        confirmationType: review.signal_id ? 'notification_signal' : 'manual_bank_check',
        reasonLabel: review.signal_id ? undefined : 'NO_NOTIFICATION_MANUAL_FALLBACK_CONFIRMED'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (isConfirmedUniqueViolation(error)) {
        return { kind: 'already_confirmed' };
      }

      throw error;
    } finally {
      client.release();
    }
  }
}

export function buildReviewCreateInput(params: {
  merchantId: string;
  reviewId: string;
  signalMatchId: string;
  auditEventId: string;
  now: string;
  orderId: string;
  paymentSessionId: string;
  signalId: string;
  reasonCode: string;
  score: number;
  collisionDetected: boolean;
  reasonCodes: string[];
}): ReviewCreateInput {
  const review: ReviewListItem = {
    id: params.reviewId,
    merchantId: params.merchantId,
    orderId: params.orderId,
    paymentSessionId: params.paymentSessionId,
    signalId: params.signalId,
    reasonCode: params.reasonCode,
    status: 'open',
    positiveReasonCodes: [],
    negativeReasonCodes: params.reasonCodes,
    createdAt: params.now
  };

  return {
    review,
    signalMatch: {
      id: params.signalMatchId,
      signalId: params.signalId,
      orderId: params.orderId,
      paymentSessionId: params.paymentSessionId,
      score: params.score,
      decision: 'needs_review',
      collisionDetected: params.collisionDetected,
      reasonCodes: params.reasonCodes
    },
    auditEvent: {
      id: params.auditEventId,
      merchantId: params.merchantId,
      eventType: EventTypes.REVIEW_CREATED,
      objectType: 'review',
      objectId: params.reviewId,
      actorType: 'system',
      payloadRedacted: {
        order_id: params.orderId,
        payment_session_id: params.paymentSessionId,
        signal_id: params.signalId,
        reason_code: params.reasonCode,
        score: params.score,
        collision_detected: params.collisionDetected,
        reason_codes: params.reasonCodes
      }
    }
  };
}

export function validateReviewActionBody(
  body: unknown,
  action: 'confirmed' | 'rejected' = 'confirmed'
): ReviewActionRequestBody | ApiErrorResponse {
  if (body === undefined || body === null) {
    return action === 'rejected' ? { scope: 'signal', reason: 'other' } : {};
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return invalidRequest('Review action request body must be a JSON object.', {});
  }

  const candidate = body as Partial<ReviewActionRequestBody>;
  const actorId = normalizeOptionalString(candidate.actor_id);
  const reason = normalizeOptionalString(candidate.reason);
  const scope = normalizeOptionalString(candidate.scope);
  const feedbackLabel = normalizeOptionalString(candidate.feedback_label);

  if (action === 'rejected') {
    if (scope && !isReviewRejectionScope(scope)) {
      return invalidRequest('Review rejection scope is invalid.', {
        allowed: ReviewRejectionScopes
      });
    }

    if (reason && !isReviewRejectionReason(reason)) {
      return invalidRequest('Review rejection reason is invalid.', {
        allowed: ReviewRejectionReasons
      });
    }
  }

  if (reason && reason.length > 500) {
    return invalidRequest('Review action reason is too long.', { max_length: 500 });
  }

  if (feedbackLabel && !['true_payment', 'false_positive', 'ambiguous', 'template_issue'].includes(feedbackLabel)) {
    return invalidRequest('Review action feedback_label is invalid.', {
      allowed: ['true_payment', 'false_positive', 'ambiguous', 'template_issue']
    });
  }

  return {
    actor_id: actorId,
    scope: action === 'rejected' ? (scope as ReviewRejectionScope | undefined) ?? 'signal' : undefined,
    reason: action === 'rejected' ? (reason as ReviewRejectionReason | undefined) ?? 'other' : reason ? redactOperatorText(reason) : undefined,
    feedback_label: feedbackLabel
  };
}

export function buildReviewActionInput(params: {
  merchantId: string;
  reviewId: string;
  action: 'confirmed' | 'rejected';
  body: ReviewActionRequestBody;
  idGenerator: ReviewIdGenerator;
  now: string;
}): ReviewActionInput {
  return {
    merchantId: params.merchantId,
    reviewId: params.reviewId,
    action: params.action,
    reviewActionId: params.idGenerator.reviewActionId(),
    auditEventId: params.idGenerator.auditEventId(),
    actorId: params.body.actor_id,
    scope: params.action === 'rejected' ? params.body.scope ?? 'signal' : undefined,
    reason: params.body.reason,
    feedbackLabel: params.body.feedback_label,
    createdAt: params.now
  };
}

export function buildReviewActionEvent(params: {
  eventId: string;
  result: Extract<ReviewActionResult, { kind: 'updated' }>;
  merchantId: string;
  occurredAt: string;
}): EventEnvelope {
  const eventType = params.result.status === 'confirmed' ? EventTypes.REVIEW_CONFIRMED : EventTypes.REVIEW_REJECTED;
  const disclosure =
    params.result.confirmationType === 'manual_bank_check'
      ? {
          confirmation_type: 'manual_bank_check',
          official_bank_confirmation: false
        }
      : PUBLIC_EVENT_SIGNAL_DISCLOSURE;

  return {
    eventId: params.eventId,
    eventType,
    version: 1,
    occurredAt: params.occurredAt,
    merchantId: params.merchantId,
    idempotencyKey: `${eventType}:${params.result.reviewId}`,
    data: {
      merchant_id: params.merchantId,
      review_id: params.result.reviewId,
      order_id: params.result.orderId,
      payment_session_id: params.result.paymentSessionId,
      rejection_scope: params.result.rejectionScope,
      reason: params.result.reason,
      reason_label: params.result.reasonLabel,
      ...disclosure
    }
  };
}

export function toReviewListResponse(items: ReviewListItem[]): ReviewListResponse {
  return {
    reviews: items.map((item) => {
      const response: ReviewListItemResponse = {
        review_id: item.id,
        status: item.status,
        reason_code: item.reasonCode,
        order_id: item.orderId,
        payment_session_id: item.paymentSessionId,
        positive_reasons: item.positiveReasonCodes,
        negative_reasons: item.negativeReasonCodes,
        recommended_action: 'manual_review',
        created_at: item.createdAt
      };

      if (item.signalId) {
        response.signal_id = item.signalId;
      }

      if (item.amountMinor !== undefined && item.currency) {
        response.amount = {
          value: formatAmountMinor(item.amountMinor),
          currency: item.currency
        };
      }

      if (item.displayAmountMinor !== undefined && item.currency) {
        response.display_amount = {
          value: formatAmountMinor(item.displayAmountMinor),
          currency: item.currency
        };
      }

      if (item.payableAmountMinor !== undefined && item.currency) {
        response.payable_amount = {
          value: formatAmountMinor(item.payableAmountMinor),
          currency: item.currency
        };
      }

      if (item.detectedAmountMinor !== undefined && item.currency) {
        response.detected_amount = {
          value: formatAmountMinor(item.detectedAmountMinor),
          currency: item.currency
        };
      }

      if (item.amountDeltaMinor !== undefined) {
        response.amount_delta_minor = item.amountDeltaMinor;
      }

      if (item.amountRiskLabel) {
        response.risk_label = item.amountRiskLabel;
      }

      if (item.bankProfileId) {
        response.bank_profile_id = item.bankProfileId;
      }

      if (item.directionLabel) {
        response.direction_label = item.directionLabel;
      }

      if (item.signalQuality !== undefined) {
        response.signal_quality = item.signalQuality;
      }

      if (item.score !== undefined) {
        response.score = item.score;
      }

      if (item.senderPhoneMasked) {
        response.sender_phone_masked = item.senderPhoneMasked;
      }

      if (item.referenceCodeMasked) {
        response.reference_code_masked = item.referenceCodeMasked;
      }

      return response;
    })
  };
}

export function toReviewActionResponse(result: Extract<ReviewActionResult, { kind: 'updated' }>): ReviewActionResponse {
  return stripUndefined({
    review_id: result.reviewId,
    status: result.status,
    order_id: result.orderId,
    payment_session_id: result.paymentSessionId,
    order_status: result.orderStatus,
    payment_session_status: result.paymentSessionStatus,
    rejection_scope: result.rejectionScope,
    reason: result.reason,
    idempotent: result.idempotent
  }) as ReviewActionResponse;
}

async function insertReviewAuditEvent(client: pg.PoolClient, auditEvent: ReviewAuditEventInput): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
      id, merchant_id, event_type, object_type, object_id, actor_type, actor_id, payload_redacted
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      auditEvent.id,
      auditEvent.merchantId,
      auditEvent.eventType,
      auditEvent.objectType,
      auditEvent.objectId,
      auditEvent.actorType,
      auditEvent.actorId ?? null,
      JSON.stringify(auditEvent.payloadRedacted)
    ]
  );
}

interface ReviewListRow {
  id: string;
  merchant_id: string;
  order_id: string;
  payment_session_id: string;
  signal_id: string | null;
  reason_code: string;
  status: string;
  created_at: Date | string;
  resolved_at: Date | string | null;
  amount_minor: number | string | null;
  display_amount_minor: number | string | null;
  payable_amount_minor: number | string | null;
  detected_amount_minor: number | string | null;
  amount_delta_minor: number | string | null;
  currency: string | null;
  bank_profile_id: string | null;
  direction_label: string | null;
  signal_quality: number | string | null;
  sender_phone_masked: string | null;
  reference_code_masked: string | null;
  score: number | string | null;
  reasons_json: unknown;
}

interface ReviewActionRow {
  id: string;
  merchant_id: string;
  order_id: string;
  payment_session_id: string;
  signal_id: string | null;
  status: string;
  order_status?: string | null;
  payment_session_status?: string | null;
}

interface PreviousRejectionActionRow {
  scope: string | null;
  reason: string | null;
}

function toReviewListItem(row: ReviewListRow): ReviewListItem {
  const reasonCodes = parseReasonCodes(row.reasons_json);
  const negativeReasonCodes = reasonCodes.filter((reason) =>
    ['amount_collision', 'phone_missing', 'reference_missing', 'requires_review', 'template_drift'].includes(reason)
  );

  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    orderId: String(row.order_id),
    paymentSessionId: String(row.payment_session_id),
    signalId: row.signal_id ? String(row.signal_id) : undefined,
    reasonCode: String(row.reason_code),
    status: String(row.status) as ReviewStatus,
    amountMinor: row.amount_minor === null ? undefined : Number(row.amount_minor),
    displayAmountMinor: row.display_amount_minor === null ? undefined : Number(row.display_amount_minor),
    payableAmountMinor: row.payable_amount_minor === null ? undefined : Number(row.payable_amount_minor),
    detectedAmountMinor: row.detected_amount_minor === null ? undefined : Number(row.detected_amount_minor),
    amountDeltaMinor: row.amount_delta_minor === null ? undefined : Number(row.amount_delta_minor),
    currency: row.currency ?? undefined,
    bankProfileId: row.bank_profile_id ?? undefined,
    directionLabel: row.direction_label ?? undefined,
    signalQuality: row.signal_quality === null ? undefined : Number(row.signal_quality),
    score: row.score === null ? undefined : Number(row.score),
    positiveReasonCodes: reasonCodes.filter((reason) => !negativeReasonCodes.includes(reason)),
    negativeReasonCodes: negativeReasonCodes.length > 0 ? negativeReasonCodes : [String(row.reason_code)],
    senderPhoneMasked: row.sender_phone_masked ?? undefined,
    referenceCodeMasked: row.reference_code_masked ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : undefined
  };
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

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isReviewRejectionScope(value: string): value is ReviewRejectionScope {
  return (ReviewRejectionScopes as readonly string[]).includes(value);
}

function isReviewRejectionReason(value: string): value is ReviewRejectionReason {
  return (ReviewRejectionReasons as readonly string[]).includes(value);
}

function normalizeRejectionReason(value: string | undefined): ReviewRejectionReason {
  return value && isReviewRejectionReason(value) ? value : 'other';
}

async function findPreviousRejectionAction(
  client: pg.PoolClient,
  merchantId: string,
  reviewId: string
): Promise<{ scope: ReviewRejectionScope; reason: ReviewRejectionReason } | null> {
  const result = await client.query(
    `SELECT scope, reason
     FROM review_actions
     WHERE merchant_id = $1 AND review_id = $2 AND action = 'rejected'
     ORDER BY created_at DESC
     LIMIT 1`,
    [merchantId, reviewId]
  );
  const row = result.rows[0] as PreviousRejectionActionRow | undefined;
  if (!row) {
    return null;
  }

  return {
    scope: row.scope && isReviewRejectionScope(row.scope) ? row.scope : 'signal',
    reason: row.reason && isReviewRejectionReason(row.reason) ? row.reason : 'other'
  };
}

async function insertSystemAuditEvent(
  client: pg.PoolClient,
  event: {
    merchantId: string;
    eventType: string;
    objectType: string;
    objectId: string;
    payloadRedacted: Record<string, unknown>;
    createdAt: string;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
      id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, 'system', $5::jsonb, $6)`,
    [
      event.merchantId,
      event.eventType,
      event.objectType,
      event.objectId,
      JSON.stringify(stripUndefined(event.payloadRedacted)),
      event.createdAt
    ]
  );
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  return typeof value === 'string' ? (value as OrderStatus) : 'awaiting_payment';
}

function normalizePaymentSessionStatus(value: unknown): PaymentSessionStatus {
  return typeof value === 'string' ? (value as PaymentSessionStatus) : 'awaiting_payment';
}

function isFinalOrderStatus(status: OrderStatus): boolean {
  return finalOrderStatuses.has(status);
}

function isFinalPaymentSessionStatus(status: PaymentSessionStatus): boolean {
  return finalPaymentSessionStatuses.has(status);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

function redactOperatorText(value: string): string {
  return value
    .replace(/(?:\+7|8)[\s().-]*\d{3}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/g, '<PHONE>')
    .replace(/\b\d{10,16}\b/g, '<REFERENCE>');
}

function isConfirmedUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '23505') {
    return false;
  }

  const constraint = 'constraint' in error ? String(error.constraint) : '';
  return constraint.includes('unique_confirmed_order') || constraint.includes('unique_used_signal_confirmed');
}
