import { describe, expect, it } from 'vitest';

import { hmacSha256 } from '@swimpay/security';
import { evaluateSignalMatch, type MatchingCandidateSession, type MatchingContext, type MatchingSignal } from '@swimpay/matching-core';
import {
  createPaymentWebhookEvent,
  InMemoryWebhookRepository,
  verifyWebhookSignature,
  WebhookDeliveryWorker,
  type WebhookEndpoint,
  type WebhookHttpClient
} from '../apps/job-worker/src/webhooks.js';

const now = '2026-05-02T10:00:00.000Z';
const phoneHmac = hmacSha256('<PHONE>', 'e2e_phone_secret');
const referenceHmac = hmacSha256('<REFERENCE>', 'e2e_reference_secret');

describe('payment signal foundation e2e flow', () => {
  it('covers order session creation, incoming signal matching, and signed webhook delivery after confirm', async () => {
    const session = createSession();
    const signal = createSignal({ senderPhoneHmac: phoneHmac, referenceHmac });

    const decision = evaluateSignalMatch({
      signal,
      sessions: [session],
      context: trustedContext()
    });

    expect(decision.decision).toBe('auto_confirmed');
    expect(decision.selected?.paymentSessionId).toBe('ps_e2e_01');
    expect(decision.reasonCodes).toContain('sender_phone_exact');
    expect(decision.reasonCodes).toContain('reference_exact');

    const repository = new InMemoryWebhookRepository({ deliveryId: () => 'del_e2e_01' });
    repository.endpoints.push(activeEndpoint());
    const httpClient = new CapturingWebhookHttpClient();
    const worker = new WebhookDeliveryWorker({ repository, httpClient });
    const event = createPaymentWebhookEvent({
      eventId: 'evt_payment_confirmed_e2e',
      type: 'payment.confirmed',
      createdAt: now,
      merchantId: 'mch_e2e',
      data: {
        order_id: session.orderId,
        payment_session_id: session.paymentSessionId,
        decision: decision.decision,
        reason_codes: decision.reasonCodes
      }
    });

    await worker.enqueueEvent(event);
    const delivered = await worker.deliverDue(now);

    expect(delivered).toEqual({ delivered: 1, retrying: 0, failed: 0 });
    expect(httpClient.requests).toHaveLength(1);
    expect(httpClient.requests[0]?.body).toContain('"confirmation_type":"notification_signal"');
    expect(httpClient.requests[0]?.body).toContain('"official_bank_confirmation":false');
    expect(
      verifyWebhookSignature({
        secret: 'whsec_e2e',
        timestamp: now,
        payload: httpClient.requests[0]!.body,
        signature: httpClient.requests[0]!.headers['SwimPay-Signature']!
      })
    ).toBe(true);
  });

  it.each([
    ['missing phone/reference', createSignal({ senderPhoneHmac: undefined, referenceHmac: undefined }), 'needs_review'],
    ['cashback signal', createSignal({ directionLabel: 'incoming_cashback', senderPhoneHmac: phoneHmac }), 'rejected'],
    ['outgoing signal', createSignal({ directionLabel: 'outgoing_payment', senderPhoneHmac: phoneHmac }), 'rejected'],
    ['duplicate signal', createSignal({ senderPhoneHmac: phoneHmac, signalAlreadyUsed: true }), 'rejected']
  ])('routes unsafe path to review/reject: %s', (_label, signal, expectedDecision) => {
    const decision = evaluateSignalMatch({
      signal,
      sessions: [createSession()],
      context: trustedContext()
    });

    expect(decision.decision).toBe(expectedDecision);
    expect(decision.decision).not.toBe('auto_confirmed');
  });

  it('routes amount collisions to review instead of auto-confirming', () => {
    const session = createSession({ orderId: 'ord_e2e_01', paymentSessionId: 'ps_e2e_01', buyerPhoneHmac: undefined });
    const collidingSession = createSession({
      orderId: 'ord_e2e_02',
      paymentSessionId: 'ps_e2e_02',
      buyerPhoneHmac: undefined,
      referenceHmac: hmacSha256('<REFERENCE_2>', 'e2e_reference_secret')
    });
    const signal = createSignal({ senderPhoneHmac: undefined, referenceHmac: undefined });

    const decision = evaluateSignalMatch({
      signal,
      sessions: [session, collidingSession],
      context: trustedContext()
    });

    expect(decision.decision).toBe('needs_review');
    expect(decision.collisionDetected).toBe(true);
    expect(decision.reasonCodes).toContain('amount_collision');
  });
});

function createSession(overrides: Partial<MatchingCandidateSession> = {}): MatchingCandidateSession {
  return {
    orderId: 'ord_e2e_01',
    paymentSessionId: 'ps_e2e_01',
    merchantId: 'mch_e2e',
    expectedAmountMinor: 13700,
    currency: 'RUB',
    buyerPhoneHmac: phoneHmac,
    referenceHmac,
    status: 'awaiting_payment',
    validFrom: '2026-05-02T09:55:00.000Z',
    validUntil: '2026-05-02T10:15:00.000Z',
    orderAlreadyConfirmed: false,
    ...overrides
  };
}

function createSignal(overrides: Partial<MatchingSignal> = {}): MatchingSignal {
  return {
    id: 'sig_e2e_01',
    merchantId: 'mch_e2e',
    amountMinor: 13700,
    currency: 'RUB',
    senderPhoneHmac: phoneHmac,
    referenceHmac,
    directionLabel: 'incoming_customer_transfer',
    observedAt: now,
    signatureValid: true,
    signalAlreadyUsed: false,
    ...overrides
  };
}

function trustedContext(): MatchingContext {
  return {
    bankProfileStatus: 'trusted_low_amount',
    bankAppTrusted: true,
    templateTrusted: true,
    deviceTrusted: true,
    merchantTrusted: true
  };
}

function activeEndpoint(): WebhookEndpoint {
  return {
    id: 'we_e2e_01',
    merchantId: 'mch_e2e',
    url: 'https://merchant.example/e2e',
    secret: 'whsec_e2e',
    enabledEvents: ['payment.confirmed', 'payment.needs_review', 'payment.rejected'],
    status: 'active'
  };
}

class CapturingWebhookHttpClient implements WebhookHttpClient {
  public readonly requests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

  public async postJson(params: { url: string; headers: Record<string, string>; body: string }) {
    this.requests.push(params);
    return { status: 200 };
  }
}
