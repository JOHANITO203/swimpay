import { describe, expect, it } from 'vitest';
import { EventTypes, type EventEnvelope } from '@swimpay/events';
import { buildApiServer, type ReviewRepository } from './server.js';
import {
  buildReviewCreateInput,
  type ReviewActionInput,
  type ReviewCreateInput,
  type ReviewListItem
} from './reviews.js';

describe('review queue api', () => {
  it('lists open review items for the authenticated merchant without raw sensitive fields', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', {
      id: 'rev_01',
      merchantId: 'mch_01',
      orderId: 'ord_01',
      paymentSessionId: 'ps_01',
      signalId: 'sig_01',
      reasonCode: 'amount_collision',
      status: 'open',
      amountMinor: 13700,
      currency: 'RUB',
      bankProfileId: 'sber_ru',
      directionLabel: 'incoming_customer_transfer',
      signalQuality: 72,
      score: 68,
      positiveReasonCodes: ['amount_exact'],
      negativeReasonCodes: ['amount_collision'],
      senderPhoneMasked: '+7 *** *** **67',
      referenceCodeMasked: 'SWP-A***',
      createdAt: '2026-05-02T10:00:00.000Z'
    });

    const server = buildTestServer(repository);
    const response = await server.inject({
      method: 'GET',
      url: '/v1/reviews',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      reviews: [
        {
          review_id: 'rev_01',
          status: 'open',
          reason_code: 'amount_collision',
          order_id: 'ord_01',
          payment_session_id: 'ps_01',
          signal_id: 'sig_01',
          amount: {
            value: '137.00',
            currency: 'RUB'
          },
          bank_profile_id: 'sber_ru',
          direction_label: 'incoming_customer_transfer',
          signal_quality: 72,
          score: 68,
          positive_reasons: ['amount_exact'],
          negative_reasons: ['amount_collision'],
          sender_phone_masked: '+7 *** *** **67',
          reference_code_masked: 'SWP-A***',
          recommended_action: 'manual_review',
          created_at: '2026-05-02T10:00:00.000Z'
        }
      ]
    });
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('raw notification');
  });

  it('confirms a review, updates order and session state, audits, and emits review.confirmed', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/confirm',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        actor_id: 'usr_01',
        reason: 'manual evidence matched masked sender and reference',
        feedback_label: 'true_payment'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      review_id: 'rev_01',
      status: 'confirmed',
      order_id: 'ord_01',
      payment_session_id: 'ps_01',
      order_status: 'manual_confirmed',
      payment_session_status: 'manual_confirmed'
    });
    expect(repository.items.get('rev_01')?.status).toBe('confirmed');
    expect(repository.orderStatuses.get('ord_01')).toBe('manual_confirmed');
    expect(repository.paymentSessionStatuses.get('ps_01')).toBe('manual_confirmed');
    expect(repository.actions).toContainEqual(
      expect.objectContaining({
        reviewId: 'rev_01',
        action: 'confirmed',
        feedbackLabel: 'true_payment'
      })
    );
    expect(repository.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: EventTypes.REVIEW_CONFIRMED, objectType: 'review', objectId: 'rev_01' })
      ])
    );
    expect(events.events[0]).toMatchObject({
      eventType: EventTypes.REVIEW_CONFIRMED,
      merchantId: 'mch_01',
      data: {
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }
    });
  });

  it('rejects a review, records the action, audits, and emits review.rejected', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        reason: 'masked fields did not match order',
        feedback_label: 'false_positive'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      review_id: 'rev_01',
      status: 'rejected',
      order_id: 'ord_01',
      payment_session_id: 'ps_01',
      order_status: 'rejected',
      payment_session_status: 'rejected'
    });
    expect(repository.actions).toContainEqual(
      expect.objectContaining({
        reviewId: 'rev_01',
        action: 'rejected',
        feedbackLabel: 'false_positive'
      })
    );
    expect(events.events[0]?.eventType).toBe(EventTypes.REVIEW_REJECTED);
  });

  it('does not allow a closed review to be actioned twice', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', { ...openReviewItem(), status: 'confirmed' });
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/confirm',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {}
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('review_not_open');
  });
});

describe('review creation foundation', () => {
  it('builds a review creation input for ambiguous matches with redacted audit payload only', () => {
    const input = buildReviewCreateInput({
      merchantId: 'mch_01',
      reviewId: 'rev_01',
      signalMatchId: 'match_01',
      auditEventId: 'aud_01',
      now: '2026-05-02T10:00:00.000Z',
      orderId: 'ord_01',
      paymentSessionId: 'ps_01',
      signalId: 'sig_01',
      reasonCode: 'requires_review',
      score: 68,
      collisionDetected: true,
      reasonCodes: ['requires_review', 'amount_collision']
    });

    expect(input.review).toMatchObject({
      id: 'rev_01',
      merchantId: 'mch_01',
      status: 'open',
      reasonCode: 'requires_review'
    });
    expect(input.signalMatch).toMatchObject({
      id: 'match_01',
      decision: 'needs_review',
      collisionDetected: true
    });
    expect(input.auditEvent).toMatchObject({
      eventType: EventTypes.REVIEW_CREATED,
      objectType: 'review',
      payloadRedacted: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        signal_id: 'sig_01',
        reason_code: 'requires_review',
        score: 68,
        collision_detected: true,
        reason_codes: ['requires_review', 'amount_collision']
      }
    });
    expect(JSON.stringify(input)).not.toContain('+79991234567');
    expect(JSON.stringify(input)).not.toContain('raw notification');
  });
});

function buildTestServer(repository: FakeReviewRepository, eventPublisher = new FakeEventPublisher()) {
  return buildApiServer({
    environment: 'test',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    reviewRepository: repository,
    eventPublisher,
    reviewIdGenerator: {
      reviewActionId: () => 'act_01',
      auditEventId: () => 'aud_01',
      eventId: () => 'evt_review_01'
    },
    clock: () => new Date('2026-05-02T10:05:00.000Z')
  });
}

function openReviewItem(): ReviewListItem {
  return {
    id: 'rev_01',
    merchantId: 'mch_01',
    orderId: 'ord_01',
    paymentSessionId: 'ps_01',
    signalId: 'sig_01',
    reasonCode: 'requires_review',
    status: 'open',
    amountMinor: 13700,
    currency: 'RUB',
    bankProfileId: 'sber_ru',
    directionLabel: 'incoming_customer_transfer',
    signalQuality: 72,
    score: 68,
    positiveReasonCodes: ['amount_exact'],
    negativeReasonCodes: ['requires_review'],
    senderPhoneMasked: '+7 *** *** **67',
    referenceCodeMasked: 'SWP-A***',
    createdAt: '2026-05-02T10:00:00.000Z'
  };
}

class FakeEventPublisher {
  public readonly events: EventEnvelope[] = [];

  public async publish(event: EventEnvelope): Promise<void> {
    this.events.push(event);
  }
}

class FakeReviewRepository implements ReviewRepository {
  public readonly items = new Map<string, ReviewListItem>();
  public readonly actions: ReviewActionInput[] = [];
  public readonly auditEvents: Array<{ eventType: string; objectType: string; objectId: string }> = [];
  public readonly orderStatuses = new Map<string, string>();
  public readonly paymentSessionStatuses = new Map<string, string>();

  public async createReview(input: ReviewCreateInput): Promise<{ kind: 'created'; reviewId: string }> {
    this.items.set(input.review.id, input.review);
    this.orderStatuses.set(input.review.orderId, 'needs_review');
    this.paymentSessionStatuses.set(input.review.paymentSessionId, 'needs_review');
    this.auditEvents.push(input.auditEvent);
    return { kind: 'created', reviewId: input.review.id };
  }

  public async listOpenReviews(merchantId: string): Promise<ReviewListItem[]> {
    return [...this.items.values()].filter((item) => item.merchantId === merchantId && item.status === 'open');
  }

  public async confirmReview(input: ReviewActionInput) {
    return this.actionReview(input, 'confirmed', 'manual_confirmed');
  }

  public async rejectReview(input: ReviewActionInput) {
    return this.actionReview(input, 'rejected', 'rejected');
  }

  private actionReview(input: ReviewActionInput, reviewStatus: 'confirmed' | 'rejected', stateStatus: 'manual_confirmed' | 'rejected') {
    const review = this.items.get(input.reviewId);
    if (!review || review.merchantId !== input.merchantId) {
      return Promise.resolve({ kind: 'not_found' as const });
    }

    if (review.status !== 'open') {
      return Promise.resolve({ kind: 'not_open' as const });
    }

    review.status = reviewStatus;
    review.resolvedAt = input.createdAt;
    this.orderStatuses.set(review.orderId, stateStatus);
    this.paymentSessionStatuses.set(review.paymentSessionId, stateStatus);
    this.actions.push(input);
    this.auditEvents.push({
      eventType: reviewStatus === 'confirmed' ? EventTypes.REVIEW_CONFIRMED : EventTypes.REVIEW_REJECTED,
      objectType: 'review',
      objectId: review.id
    });

    return Promise.resolve({
      kind: 'updated' as const,
      reviewId: review.id,
      status: reviewStatus,
      orderId: review.orderId,
      paymentSessionId: review.paymentSessionId,
      orderStatus: stateStatus,
      paymentSessionStatus: stateStatus
    });
  }
}
