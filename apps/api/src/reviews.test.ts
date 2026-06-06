import { describe, expect, it } from 'vitest';
import { EventTypes, type EventEnvelope } from '@swimpay/events';
import { buildApiServer, type ReviewRepository } from './server.js';
import {
  buildReviewActionEvent,
  buildReviewCreateInput,
  toReviewListResponse,
  validateReviewActionBody,
  type ReviewActionInput,
  type ReviewActionResult,
  type ReviewCreateInput,
  type ReviewListItem,
  type ReviewRejectionReason,
  type ReviewRejectionScope
} from './reviews.js';

type ReviewActionResultUpdated = Extract<ReviewActionResult, { kind: 'updated' }>;

describe('review queue api', () => {
  it('does not persist Android legacy actor marker as a UUID actor id', () => {
    const body = validateReviewActionBody(
      {
        actor_id: 'android_merchant',
        reason: 'merchant confirmed receipt from bank app',
        feedback_label: 'true_payment'
      },
      'confirmed'
    );

    expect(body).toEqual({
      actor_id: undefined,
      reason: 'merchant confirmed receipt from bank app',
      feedback_label: 'true_payment',
      scope: undefined
    });
  });

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
      external_order_id: 'external_ord_01',
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
        merchant_id: 'mch_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        external_id: 'external_ord_01',
        payment_session_id: 'ps_01',
        amount_minor: 13700,
        currency: 'RUB',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }
    });
  });

  it('confirms a no-notification fallback review as manual bank check only after merchant action', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_fallback_01', {
      ...openReviewItem(),
      id: 'rev_fallback_01',
      signalId: undefined,
      reasonCode: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
      negativeReasonCodes: ['NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT']
    });
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const listed = await server.inject({
      method: 'GET',
      url: '/v1/reviews',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const confirmed = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_fallback_01/confirm',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        actor_id: 'usr_01',
        reason: 'merchant opened bank app and verified receipt'
      }
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json().reviews[0]).toMatchObject({
      review_id: 'rev_fallback_01',
      reason_code: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
      recommended_action: 'manual_review'
    });
    expect(listed.json().reviews[0]).not.toHaveProperty('signal_id');
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json()).toMatchObject({
      status: 'confirmed',
      order_status: 'manual_confirmed',
      payment_session_status: 'manual_confirmed'
    });
    expect(events.events[0]).toMatchObject({
      eventType: EventTypes.REVIEW_CONFIRMED,
      data: {
        review_id: 'rev_fallback_01',
        confirmation_type: 'manual_bank_check',
        official_bank_confirmation: false,
        reason_label: 'NO_NOTIFICATION_MANUAL_FALLBACK_CONFIRMED'
      }
    });
    expect(JSON.stringify(events.events)).not.toContain('payment.confirmed');
  });

  it('rejects a no-notification fallback review as manual bank check without notification-signal disclosure', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_fallback_01', {
      ...openReviewItem(),
      id: 'rev_fallback_01',
      signalId: undefined,
      reasonCode: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
      negativeReasonCodes: ['NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT']
    });
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_fallback_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        scope: 'order',
        reason: 'merchant_cancelled'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'rejected',
      rejection_scope: 'order',
      order_status: 'rejected',
      payment_session_status: 'rejected'
    });
    expect(events.events[0]).toMatchObject({
      eventType: EventTypes.REVIEW_REJECTED,
      data: {
        review_id: 'rev_fallback_01',
        confirmation_type: 'manual_bank_check',
        official_bank_confirmation: false,
        reason_label: 'NO_NOTIFICATION_MANUAL_FALLBACK_REJECTED'
      }
    });
    expect(JSON.stringify(events.events)).not.toContain('notification_signal');
  });

  it('rejects a review with default signal scope without rejecting order or session', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    repository.orderStatuses.set('ord_01', 'awaiting_payment');
    repository.paymentSessionStatuses.set('ps_01', 'awaiting_payment');
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        reason: 'false_positive',
        feedback_label: 'false_positive'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      review_id: 'rev_01',
      status: 'rejected',
      order_id: 'ord_01',
      external_order_id: 'external_ord_01',
      payment_session_id: 'ps_01',
      rejection_scope: 'signal',
      reason: 'false_positive',
      order_status: 'awaiting_payment',
      payment_session_status: 'awaiting_payment'
    });
    expect(repository.items.get('rev_01')?.status).toBe('rejected');
    expect(repository.signalStatuses.get('sig_01')).toBe('rejected');
    expect(repository.orderStatuses.get('ord_01')).toBe('awaiting_payment');
    expect(repository.paymentSessionStatuses.get('ps_01')).toBe('awaiting_payment');
    expect(repository.actions).toContainEqual(
      expect.objectContaining({
        reviewId: 'rev_01',
        action: 'rejected',
        scope: 'signal',
        reason: 'false_positive',
        feedbackLabel: 'false_positive'
      })
    );
    expect(repository.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: EventTypes.REVIEW_REJECTED, objectType: 'review', objectId: 'rev_01' }),
        expect.objectContaining({ eventType: 'signal.rejected', objectType: 'notification_signal', objectId: 'sig_01' })
      ])
    );
    expect(events.events[0]?.eventType).toBe(EventTypes.REVIEW_REJECTED);
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('raw notification');
  });

  it('rejects only the linked payment session when scope is payment_session', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    repository.orderStatuses.set('ord_01', 'awaiting_payment');
    repository.paymentSessionStatuses.set('ps_01', 'awaiting_payment');
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        scope: 'payment_session',
        reason: 'expired_payment'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      rejection_scope: 'payment_session',
      reason: 'expired_payment',
      order_status: 'awaiting_payment',
      payment_session_status: 'rejected'
    });
    expect(repository.signalStatuses.get('sig_01')).toBe('rejected');
    expect(repository.orderStatuses.get('ord_01')).toBe('awaiting_payment');
    expect(repository.paymentSessionStatuses.get('ps_01')).toBe('rejected');
    expect(repository.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'payment_session.status_changed', objectType: 'payment_session', objectId: 'ps_01' })
      ])
    );
  });

  it('rejects order and linked session only when scope is explicitly order', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    repository.orderStatuses.set('ord_01', 'awaiting_payment');
    repository.paymentSessionStatuses.set('ps_01', 'awaiting_payment');
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        scope: 'order',
        reason: 'merchant_cancelled'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      rejection_scope: 'order',
      reason: 'merchant_cancelled',
      order_status: 'rejected',
      payment_session_status: 'rejected'
    });
    expect(repository.signalStatuses.get('sig_01')).toBe('rejected');
    expect(repository.orderStatuses.get('ord_01')).toBe('rejected');
    expect(repository.paymentSessionStatuses.get('ps_01')).toBe('rejected');
    expect(repository.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'order.status_changed', objectType: 'order', objectId: 'ord_01' }),
        expect.objectContaining({ eventType: 'payment_session.status_changed', objectType: 'payment_session', objectId: 'ps_01' })
      ])
    );
  });

  it('treats duplicate rejection with the same scope as idempotent without duplicate actions', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', { ...openReviewItem(), status: 'rejected', resolvedAt: '2026-05-02T10:05:00.000Z' });
    repository.orderStatuses.set('ord_01', 'awaiting_payment');
    repository.paymentSessionStatuses.set('ps_01', 'awaiting_payment');
    repository.actions.push({
      merchantId: 'mch_01',
      reviewId: 'rev_01',
      reviewActionId: 'act_existing',
      auditEventId: 'aud_existing',
      actorType: 'dashboard_merchant',
      action: 'rejected',
      scope: 'signal',
      reason: 'false_positive',
      createdAt: '2026-05-02T10:05:00.000Z'
    });
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        scope: 'signal',
        reason: 'false_positive'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      rejection_scope: 'signal',
      reason: 'false_positive',
      idempotent: true
    });
    expect(repository.actions).toHaveLength(1);
    expect(events.events).toHaveLength(0);
  });

  it('rejects conflicting scope escalation after review resolution', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', { ...openReviewItem(), status: 'rejected', resolvedAt: '2026-05-02T10:05:00.000Z' });
    repository.actions.push({
      merchantId: 'mch_01',
      reviewId: 'rev_01',
      reviewActionId: 'act_existing',
      auditEventId: 'aud_existing',
      actorType: 'dashboard_merchant',
      action: 'rejected',
      scope: 'signal',
      reason: 'false_positive',
      createdAt: '2026-05-02T10:05:00.000Z'
    });
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        scope: 'order',
        reason: 'merchant_cancelled'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('review_rejection_scope_conflict');
    expect(repository.actions).toHaveLength(1);
  });

  it('rejects invalid rejection scope and reason without side effects', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    const server = buildTestServer(repository);

    const invalidScope = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { scope: 'everything', reason: 'false_positive' }
    });
    const invalidReason = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { scope: 'signal', reason: 'contains raw +79991234567' }
    });

    expect(invalidScope.statusCode).toBe(400);
    expect(invalidReason.statusCode).toBe(400);
    expect(repository.actions).toHaveLength(0);
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

  it('does not confirm an open review after the order or session reached a final state', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    repository.orderStatuses.set('ord_01', 'expired');
    repository.paymentSessionStatuses.set('ps_01', 'expired');
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/confirm',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { actor_id: 'usr_01' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('review_not_open');
    expect(repository.items.get('rev_01')?.status).toBe('open');
    expect(repository.orderStatuses.get('ord_01')).toBe('expired');
    expect(repository.paymentSessionStatuses.get('ps_01')).toBe('expired');
    expect(repository.actions).toHaveLength(0);
    expect(events.events).toHaveLength(0);
  });

  it('does not reject a payment session review after the session reached a final state', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    repository.orderStatuses.set('ord_01', 'awaiting_payment');
    repository.paymentSessionStatuses.set('ps_01', 'expired');
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        scope: 'payment_session',
        reason: 'expired_payment'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('review_not_open');
    expect(repository.items.get('rev_01')?.status).toBe('open');
    expect(repository.signalStatuses.get('sig_01')).toBeUndefined();
    expect(repository.paymentSessionStatuses.get('ps_01')).toBe('expired');
    expect(repository.actions).toHaveLength(0);
    expect(events.events).toHaveLength(0);
  });

  it('does not reject a payment session review after the order reached a final state', async () => {
    const repository = new FakeReviewRepository();
    repository.items.set('rev_01', openReviewItem());
    repository.orderStatuses.set('ord_01', 'manual_confirmed');
    repository.paymentSessionStatuses.set('ps_01', 'awaiting_payment');
    const events = new FakeEventPublisher();
    const server = buildTestServer(repository, events);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/reject',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        scope: 'payment_session',
        reason: 'merchant_cancelled'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('review_not_open');
    expect(repository.items.get('rev_01')?.status).toBe('open');
    expect(repository.paymentSessionStatuses.get('ps_01')).toBe('awaiting_payment');
    expect(repository.actions).toHaveLength(0);
    expect(events.events).toHaveLength(0);
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

describe('buildReviewActionEvent', () => {
  it('includes currency_detection and receiving_route in event data when result carries them', () => {
    const result: Extract<ReviewActionResult, { kind: 'updated' }> = {
      kind: 'updated',
      reviewId: 'rev_01',
      status: 'confirmed',
      orderId: 'ord_01',
      externalOrderId: 'external_ord_01',
      paymentSessionId: 'ps_01',
      amountMinor: 1084,
      currency: 'USD',
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed',
      confirmationType: 'notification_signal',
      currencyDetection: {
        source: 'display_price_parsed',
        rawInput: '€9.99',
        originalCurrency: 'EUR',
        originalAmountMinor: 999,
        fxRate: '1.0852',
        fxRateTimestamp: '2026-06-05T10:00:00.000Z'
      },
      receivingRoute: {
        routeCode: 'USD-WISE-MAIN',
        railType: 'wallet_transfer',
        bankProfileId: 'wise_int',
        receiverIdentifierMasked: 'j•••@•••.com'
      }
    };

    const event = buildReviewActionEvent({
      eventId: 'evt_01',
      result,
      merchantId: 'mch_01',
      occurredAt: '2026-06-05T10:00:00.000Z'
    });

    expect(event.data['currency_detection']).toEqual({
      source: 'display_price_parsed',
      raw_input: '€9.99',
      original_currency: 'EUR',
      original_amount_minor: 999,
      fx_rate: '1.0852',
      fx_rate_timestamp: '2026-06-05T10:00:00.000Z'
    });
    expect(event.data['receiving_route']).toEqual({
      route_code: 'USD-WISE-MAIN',
      rail_type: 'wallet_transfer',
      bank_profile_id: 'wise_int',
      receiver_identifier_masked: 'j•••@•••.com'
    });
  });

  it('omits currency_detection and receiving_route from event data when result does not carry them', () => {
    const result: Extract<ReviewActionResult, { kind: 'updated' }> = {
      kind: 'updated',
      reviewId: 'rev_01',
      status: 'confirmed',
      orderId: 'ord_01',
      externalOrderId: 'external_ord_01',
      paymentSessionId: 'ps_01',
      amountMinor: 13700,
      currency: 'RUB',
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed',
      confirmationType: 'notification_signal'
    };

    const event = buildReviewActionEvent({
      eventId: 'evt_01',
      result,
      merchantId: 'mch_01',
      occurredAt: '2026-05-02T10:00:00.000Z'
    });

    expect('currency_detection' in event.data).toBe(false);
    expect('receiving_route' in event.data).toBe(false);
  });

  it('includes buyer_currency_selection in event data when result carries it', () => {
    const result: Extract<ReviewActionResult, { kind: 'updated' }> = {
      kind: 'updated',
      reviewId: 'rev_02',
      status: 'confirmed',
      orderId: 'ord_02',
      externalOrderId: 'external_ord_02',
      paymentSessionId: 'ps_02',
      amountMinor: 79500,
      currency: 'RUB',
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed',
      confirmationType: 'notification_signal',
      buyerCurrencySelection: {
        selectedCurrency: 'RUB',
        baseCurrency: 'USD',
        baseAmountMinor: 1000,
        fxRate: '79.5000',
        fxSource: 'cbr',
        fxTimestamp: '2026-06-06T10:00:00.000Z'
      }
    };

    const event = buildReviewActionEvent({
      eventId: 'evt_02',
      result,
      merchantId: 'mch_01',
      occurredAt: '2026-06-06T10:00:00.000Z'
    });

    expect(event.data['buyer_currency_selection']).toEqual({
      selected_currency: 'RUB',
      base_currency: 'USD',
      base_amount_minor: 1000,
      fx_rate: '79.5000',
      fx_source: 'cbr',
      fx_rate_timestamp: '2026-06-06T10:00:00.000Z'
    });
    expect('currency_detection' in event.data).toBe(false);
  });

  it('omits buyer_currency_selection from event data when result does not carry it', () => {
    const result: Extract<ReviewActionResult, { kind: 'updated' }> = {
      kind: 'updated',
      reviewId: 'rev_03',
      status: 'confirmed',
      orderId: 'ord_03',
      externalOrderId: 'external_ord_03',
      paymentSessionId: 'ps_03',
      amountMinor: 13700,
      currency: 'RUB',
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed',
      confirmationType: 'notification_signal'
    };

    const event = buildReviewActionEvent({
      eventId: 'evt_03',
      result,
      merchantId: 'mch_01',
      occurredAt: '2026-06-06T10:00:00.000Z'
    });

    expect('buyer_currency_selection' in event.data).toBe(false);
  });
});

describe('toReviewListResponse XOF currency formatting', () => {
  it('formats XOF amounts as integers (no decimal places)', () => {
    const item: ReviewListItem = {
      id: 'rev_xof',
      merchantId: 'mch_01',
      orderId: 'ord_xof',
      paymentSessionId: 'ps_xof',
      reasonCode: 'requires_review',
      status: 'open',
      amountMinor: 1000,
      displayAmountMinor: 1000,
      payableAmountMinor: 1000,
      detectedAmountMinor: 1000,
      currency: 'XOF',
      positiveReasonCodes: [],
      negativeReasonCodes: ['requires_review'],
      createdAt: '2026-06-06T10:00:00.000Z'
    };

    const response = toReviewListResponse([item]);
    expect(response.reviews[0]!.amount?.value).toBe('1000');
    expect(response.reviews[0]!.display_amount?.value).toBe('1000');
    expect(response.reviews[0]!.payable_amount?.value).toBe('1000');
    expect(response.reviews[0]!.detected_amount?.value).toBe('1000');
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
  public readonly signalStatuses = new Map<string, string>();

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

  public async rejectReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    const review = this.items.get(input.reviewId);
    if (!review || review.merchantId !== input.merchantId) {
      return { kind: 'not_found' as const };
    }

    const requestedScope: ReviewRejectionScope = input.scope ?? 'signal';
    const scope: ReviewRejectionScope = review.signalId ? requestedScope : 'order';
    const currentOrderStatus = this.orderStatuses.get(review.orderId) ?? 'awaiting_payment';
    const currentPaymentSessionStatus = this.paymentSessionStatuses.get(review.paymentSessionId) ?? 'awaiting_payment';
    if (review.status !== 'open') {
      if (review.status === 'rejected') {
        const previous = this.actions.find((action) => action.reviewId === input.reviewId && action.action === 'rejected');
        if (previous?.scope === scope) {
          return {
            kind: 'updated' as const,
            reviewId: review.id,
            status: 'rejected' as const,
            orderId: review.orderId,
            externalOrderId: `external_${review.orderId}`,
            paymentSessionId: review.paymentSessionId,
            amountMinor: review.amountMinor ?? 13700,
            currency: review.currency ?? 'RUB',
            orderStatus: (this.orderStatuses.get(review.orderId) ?? 'awaiting_payment') as ReviewActionResultUpdated['orderStatus'],
            paymentSessionStatus: (this.paymentSessionStatuses.get(review.paymentSessionId) ?? 'awaiting_payment') as ReviewActionResultUpdated['paymentSessionStatus'],
            rejectionScope: previous.scope,
            reason: previous.reason as ReviewRejectionReason | undefined,
            idempotent: true
          };
        }

        return { kind: 'rejection_scope_conflict' as const, existingScope: previous?.scope ?? 'signal', requestedScope: scope };
      }

      return { kind: 'not_open' as const };
    }

    if (
      (scope === 'payment_session' || scope === 'order') &&
      (isTerminalTestPaymentSessionStatus(currentPaymentSessionStatus) || isTerminalTestOrderStatus(currentOrderStatus))
    ) {
      return { kind: 'not_open' as const };
    }
    if (scope === 'order' && isTerminalTestOrderStatus(currentOrderStatus)) {
      return { kind: 'not_open' as const };
    }

    review.status = 'rejected';
    review.resolvedAt = input.createdAt;
    if (review.signalId) {
      this.signalStatuses.set(review.signalId, 'rejected');
    }

    if (scope === 'payment_session' || scope === 'order') {
      this.paymentSessionStatuses.set(review.paymentSessionId, 'rejected');
    }
    if (scope === 'order') {
      this.orderStatuses.set(review.orderId, 'rejected');
    }

    this.actions.push(input);
    this.auditEvents.push({
      eventType: EventTypes.REVIEW_REJECTED,
      objectType: 'review',
      objectId: review.id
    });
    if (review.signalId) {
      this.auditEvents.push({
        eventType: EventTypes.SIGNAL_REJECTED,
        objectType: 'notification_signal',
        objectId: review.signalId
      });
    }
    if (scope === 'payment_session' || scope === 'order') {
      this.auditEvents.push({
        eventType: 'payment_session.status_changed',
        objectType: 'payment_session',
        objectId: review.paymentSessionId
      });
    }
    if (scope === 'order') {
      this.auditEvents.push({
        eventType: 'order.status_changed',
        objectType: 'order',
        objectId: review.orderId
      });
    }

    return {
      kind: 'updated' as const,
      reviewId: review.id,
      status: 'rejected' as const,
      orderId: review.orderId,
      externalOrderId: `external_${review.orderId}`,
      paymentSessionId: review.paymentSessionId,
      amountMinor: review.amountMinor ?? 13700,
      currency: review.currency ?? 'RUB',
      orderStatus: (this.orderStatuses.get(review.orderId) ?? 'awaiting_payment') as ReviewActionResultUpdated['orderStatus'],
      paymentSessionStatus: (this.paymentSessionStatuses.get(review.paymentSessionId) ?? 'awaiting_payment') as ReviewActionResultUpdated['paymentSessionStatus'],
      rejectionScope: scope,
      reason: input.reason as ReviewRejectionReason | undefined,
      confirmationType: review.signalId ? 'notification_signal' as const : 'manual_bank_check' as const,
      reasonLabel: review.signalId ? undefined : 'NO_NOTIFICATION_MANUAL_FALLBACK_REJECTED'
    };
  }

  private actionReview(input: ReviewActionInput, reviewStatus: 'confirmed' | 'rejected', stateStatus: 'manual_confirmed' | 'rejected') {
    const review = this.items.get(input.reviewId);
    if (!review || review.merchantId !== input.merchantId) {
      return Promise.resolve({ kind: 'not_found' as const });
    }

    if (review.status !== 'open') {
      return Promise.resolve({ kind: 'not_open' as const });
    }
    const currentOrderStatus = this.orderStatuses.get(review.orderId) ?? 'awaiting_payment';
    const currentPaymentSessionStatus = this.paymentSessionStatuses.get(review.paymentSessionId) ?? 'awaiting_payment';
    if (isTerminalTestOrderStatus(currentOrderStatus) || isTerminalTestPaymentSessionStatus(currentPaymentSessionStatus)) {
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
      externalOrderId: `external_${review.orderId}`,
      paymentSessionId: review.paymentSessionId,
      amountMinor: review.amountMinor ?? 13700,
      currency: review.currency ?? 'RUB',
      orderStatus: stateStatus,
      paymentSessionStatus: stateStatus,
      confirmationType: review.signalId ? 'notification_signal' as const : 'manual_bank_check' as const,
      reasonLabel: review.signalId
        ? undefined
        : reviewStatus === 'confirmed'
          ? 'NO_NOTIFICATION_MANUAL_FALLBACK_CONFIRMED'
          : 'NO_NOTIFICATION_MANUAL_FALLBACK_REJECTED'
    });
  }
}

function isTerminalTestOrderStatus(status: string): boolean {
  return ['manual_confirmed', 'fulfilled', 'rejected', 'expired'].includes(status);
}

function isTerminalTestPaymentSessionStatus(status: string): boolean {
  return ['manual_confirmed', 'rejected', 'expired'].includes(status);
}
