import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import { EventTypes, type InternalEventEnvelope } from '@swimpay/events';
import {
  InMemorySignalRuntimeRepository,
  SignalRuntimeProcessor,
  createSignalReceivedHandler,
  type SignalRuntimeSignal,
  type SignalRuntimeSessionCandidate,
  type SignalRuntimeTrustContext
} from './runtime.js';

const now = '2026-05-02T08:00:00.000Z';
const root = process.cwd();

const trustedContext: SignalRuntimeTrustContext = {
  bankProfileStatus: 'trusted',
  bankAppVerificationStatus: 'verified',
  templateStatus: 'trusted',
  deviceStatus: 'active',
  deviceTrustScore: 100,
  merchantTrusted: true
};

const toVerifyContext: SignalRuntimeTrustContext = {
  ...trustedContext,
  bankProfileStatus: 'learning',
  bankAppVerificationStatus: 'pending_verification',
  templateStatus: 'learning'
};

function buildSignal(overrides: Partial<SignalRuntimeSignal> = {}): SignalRuntimeSignal {
  return {
    id: 'sig_01',
    merchantId: 'mch_01',
    deviceId: 'dev_01',
    bankProfileId: 'sber_ru',
    eventId: 'bank_evt_01',
    notificationHash: 'notif_hash_01',
    observedAt: now,
    receivedAt: now,
    titleRedacted: 'Incoming transfer 137 RUB',
    bodyRedacted: 'Transfer from +7 999 123-45-67 SWP-ABC123',
    senderPhoneHmac: 'phone_hmac_01',
    senderPhoneMasked: '+7 *** ***-**-67',
    referenceHmac: 'ref_hmac_01',
    referenceCodeMasked: 'SWP-***123',
    directionLabel: 'unknown',
    signatureValid: true,
    status: 'received',
    ...overrides
  };
}

function buildSession(overrides: Partial<SignalRuntimeSessionCandidate> = {}): SignalRuntimeSessionCandidate {
  return {
    orderId: 'ord_01',
    paymentSessionId: 'ps_01',
    merchantId: 'mch_01',
    expectedAmountMinor: 13700,
    currency: 'RUB',
    buyerPhoneHmac: 'phone_hmac_01',
    referenceHmac: 'ref_hmac_01',
    selectedReceiverBankId: 'sber_ru',
    selectedReceiverBankProfileId: 'sber_ru',
    selectedReceivingRouteId: 'route_sber_phone',
    receiverRouteCode: 'SBER-PHONE',
    railType: 'phone_transfer',
    paymentReference: 'TANGO ALFA',
    status: 'awaiting_payment',
    validFrom: '2026-05-02T07:50:00.000Z',
    validUntil: '2026-05-02T08:10:00.000Z',
    orderAlreadyConfirmed: false,
    orderStatus: 'awaiting_payment',
    paymentSessionStatus: 'awaiting_payment',
    ...overrides
  };
}

function createProcessor(params: {
  signal?: SignalRuntimeSignal;
  sessions?: SignalRuntimeSessionCandidate[];
  trustContext?: SignalRuntimeTrustContext;
  metrics?: InMemoryMetricsRegistry;
} = {}) {
  const repository = new InMemorySignalRuntimeRepository({
    signals: [params.signal ?? buildSignal()],
    sessions: params.sessions ?? [buildSession()],
    trustContext: params.trustContext ?? trustedContext
  });
  const processor = new SignalRuntimeProcessor({
    repository,
    metrics: params.metrics,
    now: () => now,
    idGenerator: {
      eventId: () => `evt_${repository.publishedEvents.length + 1}`,
      matchId: () => `match_${repository.matches.length + 1}`,
      reviewId: () => `review_${repository.reviews.length + 1}`,
      auditEventId: () => `audit_${repository.auditEvents.length + 1}`,
      webhookEventId: () => `wh_evt_${repository.webhookEvents.length + 1}`
    }
  });

  return { processor, repository };
}

describe('signal runtime processor', () => {
  it('routes an incoming transfer to review when bank app metadata is still TO_VERIFY/pending', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({ trustContext: toVerifyContext, metrics });

    const result = await processor.processSignalReceived({ signalId: 'sig_01', eventId: 'bank_evt_01' });

    expect(result.decision).toBe('needs_review');
    expect(repository.reviews).toHaveLength(1);
    expect(repository.reviews[0]?.reasonCodes).toContain('bank_profile_untrusted');
    expect(repository.reviews[0]?.reasonCodes).toContain('bank_app_unverified');
    const needsReviewWebhook = repository.webhookEvents.find((event) => event.type === 'payment.needs_review');
    expect(needsReviewWebhook?.data.official_bank_confirmation).toBe(false);
    expect(needsReviewWebhook?.data.confirmation_type).toBe('notification_signal');
    expect(metrics.counterValue(MetricNames.SIGNALS_PARSED_TOTAL)).toBe(1);
    expect(metrics.counterValue(MetricNames.SIGNALS_NEEDS_REVIEW_TOTAL)).toBe(1);
    expect(metrics.counterValue(MetricNames.REVIEWS_CREATED_TOTAL)).toBe(1);
    expect(metrics.counterValue(MetricNames.UNTRUSTED_BANK_REVIEW_TOTAL)).toBe(1);
  });

  it('emits signal detected before review webhook for matched review-only signals', async () => {
    const { processor, repository } = createProcessor({ trustContext: toVerifyContext });

    await processor.processSignalReceived({ signalId: 'sig_01', eventId: 'bank_evt_01' });

    expect(repository.webhookEvents.map((event) => event.type)).toEqual([
      'payment.signal_detected',
      'payment.needs_review'
    ]);
    for (const event of repository.webhookEvents) {
      expect(event.data.official_bank_confirmation).toBe(false);
      expect(event.data.confirmation_type).toBe('notification_signal');
      expect(event.data).not.toHaveProperty('sender_phone_hmac');
      expect(event.data).not.toHaveProperty('sender_phone_masked');
      expect(event.data).not.toHaveProperty('title_redacted');
      expect(event.data).not.toHaveProperty('body_redacted');
      expect(event.data).toMatchObject({
        receiver_route_code: 'SBER-PHONE',
        rail_type: 'phone_transfer',
        payment_reference: 'TANGO ALFA',
        receiver_bank_id: 'sber_ru'
      });
      expect(JSON.stringify(event)).not.toContain('+7 999');
    }
  });

  it.each([
    'sber_ru',
    'tbank_ru',
    'vtb_ru',
    'alfa_ru',
    'gazprombank_ru'
  ] as const)('routes synthetic review-only %s signals to review without auto-confirm', async (bankProfileId) => {
    const { processor, repository } = createProcessor({
      trustContext: toVerifyContext,
      signal: buildSignal({
        id: `sig_${bankProfileId}`,
        bankProfileId,
        eventId: `evt_${bankProfileId}`,
        notificationHash: `hash_${bankProfileId}`,
        titleRedacted: 'Incoming transfer <AMOUNT> <CURRENCY>',
        bodyRedacted: 'Transfer from <PHONE>. Reference <REFERENCE>',
        amountMinor: 13700,
        currency: 'RUB',
        directionLabel: 'incoming_customer_transfer'
      })
    });

    const result = await processor.processSignalReceived({ signalId: `sig_${bankProfileId}` });

    expect(result.decision).toBe('needs_review');
    expect(repository.reviews).toHaveLength(1);
    expect(repository.reviews[0]?.reasonCodes).toEqual(
      expect.arrayContaining(['bank_profile_untrusted', 'bank_app_unverified', 'package_cert_to_verify'])
    );
    expect(repository.orders.get('ord_01')?.status).not.toBe('auto_confirmed');
    const needsReviewWebhook = repository.webhookEvents.find((event) => event.type === 'payment.needs_review');
    expect(needsReviewWebhook?.data.official_bank_confirmation).toBe(false);
    expect(needsReviewWebhook?.data.confirmation_type).toBe('notification_signal');
  });

  it.each([
    ['cashback', 'cashback 137 RUB from store', 'incoming_cashback'],
    ['refund', 'refund 137 RUB from shop', 'incoming_refund'],
    ['outgoing', 'payment 137 RUB to shop', 'outgoing_payment'],
    ['promo', 'promo bonus 137 RUB', 'promo'],
    ['failed', 'failed transfer 137 RUB', 'failed_transfer']
  ] as const)('never auto-confirms %s notifications', async (_label, text, direction) => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({
      metrics,
      signal: buildSignal({ titleRedacted: text, bodyRedacted: '' })
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('rejected');
    expect(repository.matches[0]?.decision).toBe('rejected');
    expect(repository.signals[0]?.directionLabel).toBe(direction);
    expect(repository.orders.get('ord_01')?.status).not.toBe('auto_confirmed');
    expect(metrics.counterValue(MetricNames.SIGNALS_REJECTED_TOTAL)).toBe(1);
    expect(metrics.counterValue(safetyMetricForDirection(direction))).toBe(1);
  });

  it('routes unknown direction to review without auto-confirming', async () => {
    const { processor, repository } = createProcessor({
      signal: buildSignal({ titleRedacted: 'Account update 137 RUB', bodyRedacted: '' })
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('needs_review');
    expect(repository.reviews[0]?.reasonCodes).toContain('ambiguous_direction');
    expect(repository.orders.get('ord_01')?.status).toBe('needs_review');
  });

  it('never auto-confirms an amount-only signal', async () => {
    const { processor, repository } = createProcessor({
      signal: buildSignal({ titleRedacted: 'Incoming transfer 137 RUB', bodyRedacted: '' }),
      sessions: [buildSession({ buyerPhoneHmac: undefined, referenceHmac: undefined })]
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('needs_review');
    expect(repository.reviews[0]?.reasonCodes).toContain('amount_only_never_auto_confirm');
    expect(repository.orders.get('ord_01')?.status).not.toBe('auto_confirmed');
  });

  it('rehearses five-bank synthetic shadow fixtures through review or rejection without official confirmation claims', async () => {
    const fixtureSet = JSON.parse(
      readFileSync(join(root, 'packages/bank-templates/five-bank-synthetic-shadow-fixtures.json'), 'utf8')
    ) as {
      banks: Array<{
        bank_profile_id: string;
        fixtures: Array<{
          category: string;
          title_redacted: string;
          body_redacted: string;
          expected_decision: 'needs_review' | 'rejected';
          expected_webhook_type: 'payment.needs_review' | 'payment.rejected';
        }>;
      }>;
    };

    for (const bank of fixtureSet.banks) {
      for (const fixture of bank.fixtures) {
        const signalId = `sig_${bank.bank_profile_id}_${fixture.category}`;
        const { processor, repository } = createProcessor({
          trustContext: toVerifyContext,
          signal: buildSignal({
            id: signalId,
            bankProfileId: bank.bank_profile_id,
            eventId: `evt_${bank.bank_profile_id}_${fixture.category}`,
            notificationHash: `hash_${bank.bank_profile_id}_${fixture.category}`,
            titleRedacted: fixture.title_redacted,
            bodyRedacted: fixture.body_redacted,
            amountMinor: fixture.category === 'promo' ? undefined : 13700,
            currency: fixture.category === 'promo' ? undefined : 'RUB'
          }),
          sessions: [
            buildSession({
              buyerPhoneHmac: fixture.category === 'amount_only' ? undefined : 'phone_hmac_01',
              referenceHmac: fixture.category === 'amount_only' ? undefined : 'ref_hmac_01'
            })
          ]
        });

        const result = await processor.processSignalReceived({ signalId });

        expect(result.decision, `${bank.bank_profile_id}/${fixture.category}`).toBe(fixture.expected_decision);
        expect(repository.orders.get('ord_01')?.status).not.toBe('auto_confirmed');
        const expectedWebhook = repository.webhookEvents.find((event) => event.type === fixture.expected_webhook_type);
        expect(expectedWebhook?.data.official_bank_confirmation).toBe(false);
        expect(expectedWebhook?.data.confirmation_type).toBe('notification_signal');
        expect(expectedWebhook?.data).not.toHaveProperty('sender_phone_hmac');
        expect(expectedWebhook?.data).not.toHaveProperty('sender_phone_masked');
        expect(expectedWebhook?.data).not.toHaveProperty('title_redacted');
        expect(expectedWebhook?.data).not.toHaveProperty('body_redacted');
        expect(JSON.stringify(repository.webhookEvents)).not.toContain('Transfer from +7');
      }
    }
  });

  it('auto-confirms only a trusted synthetic signal with exact identity match and emits a safe webhook request', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({ metrics });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('auto_confirmed');
    expect(repository.orders.get('ord_01')?.status).toBe('auto_confirmed');
    expect(repository.webhookEvents[0]?.type).toBe('payment.confirmed');
    expect(repository.webhookEvents[0]?.data).toMatchObject({
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false,
      order_id: 'ord_01',
      payment_session_id: 'ps_01',
      signal_id: 'sig_01',
      receiver_route_code: 'SBER-PHONE',
      rail_type: 'phone_transfer',
      payment_reference: 'TANGO ALFA',
      receiver_bank_id: 'sber_ru'
    });
    expect(JSON.stringify(repository.webhookEvents[0])).not.toContain('+7 999');
    expect(JSON.stringify(repository.auditEvents)).not.toContain('Transfer from +7');
    expect(metrics.counterValue(MetricNames.SIGNALS_AUTO_CONFIRMED_TOTAL)).toBe(1);
  });

  it('creates review on collision and does not auto-confirm', async () => {
    const { processor, repository } = createProcessor({
      sessions: [
        buildSession({ orderId: 'ord_01', paymentSessionId: 'ps_01' }),
        buildSession({ orderId: 'ord_02', paymentSessionId: 'ps_02' })
      ]
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('needs_review');
    expect(result.collisionDetected).toBe(true);
    expect(repository.reviews[0]?.reasonCodes).toContain('amount_collision');
  });

  it('does not confirm expired sessions', async () => {
    const { processor, repository } = createProcessor({
      sessions: [buildSession({ status: 'expired', validUntil: '2026-05-02T07:59:00.000Z' })]
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('needs_review');
    expect(repository.reviews[0]?.reasonCodes).toContain('no_candidate');
    expect(repository.orders.get('ord_01')?.status).not.toBe('auto_confirmed');
  });

  it('is idempotent for repeated signal events', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({ metrics });

    await processor.processSignalReceived({ signalId: 'sig_01' });
    const repeated = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(repeated.decision).toBe('auto_confirmed');
    expect(repository.matches).toHaveLength(1);
    expect(repository.webhookEvents).toHaveLength(1);
    expect(repository.reviews).toHaveLength(0);
    expect(metrics.counterValue(MetricNames.SIGNALS_DUPLICATE_TOTAL)).toBe(1);
  });

  it('does not duplicate review items for repeated review decisions', async () => {
    const { processor, repository } = createProcessor({ trustContext: toVerifyContext });

    await processor.processSignalReceived({ signalId: 'sig_01' });
    await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(repository.reviews).toHaveLength(1);
    expect(repository.webhookEvents.map((event) => event.type)).toEqual([
      'payment.signal_detected',
      'payment.needs_review'
    ]);
  });
});

function safetyMetricForDirection(direction: SignalRuntimeSignal['directionLabel']) {
  switch (direction) {
    case 'incoming_cashback':
      return MetricNames.UNSAFE_CASHBACK_BLOCKED_TOTAL;
    case 'incoming_refund':
      return MetricNames.UNSAFE_REFUND_BLOCKED_TOTAL;
    case 'outgoing_payment':
    case 'outgoing_transfer':
      return MetricNames.UNSAFE_OUTGOING_BLOCKED_TOTAL;
    case 'promo':
      return MetricNames.UNSAFE_PROMO_BLOCKED_TOTAL;
    case 'failed_transfer':
      return MetricNames.UNSAFE_FAILED_BLOCKED_TOTAL;
    default:
      return MetricNames.SIGNALS_REJECTED_TOTAL;
  }
}

describe('signal.received handler', () => {
  it('calls the runtime processor with a safe envelope', async () => {
    const { processor } = createProcessor();
    const handler = createSignalReceivedHandler(processor);
    const event: InternalEventEnvelope = {
      id: 'evt_signal_received',
      type: EventTypes.SIGNAL_RECEIVED,
      created_at: now,
      source: 'test',
      data: { signal_id: 'sig_01', event_id: 'bank_evt_01' }
    };

    await expect(handler(event)).resolves.toEqual({ kind: 'ok' });
  });

  it('rejects signal.received events without signal_id or event_id', async () => {
    const { processor } = createProcessor();
    const handler = createSignalReceivedHandler(processor);
    const event: InternalEventEnvelope = {
      id: 'evt_signal_received',
      type: EventTypes.SIGNAL_RECEIVED,
      created_at: now,
      source: 'test',
      data: {}
    };

    await expect(handler(event)).rejects.toThrow('signal.received requires signal_id or event_id');
  });
});
