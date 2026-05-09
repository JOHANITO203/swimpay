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
      auditEventId: () => `audit_${repository.auditEvents.length + 1}`
    }
  });

  return { processor, repository };
}

describe('signal runtime processor', () => {
  it('rejects an incoming transfer before parsing when bank app metadata is still TO_VERIFY/pending', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({ trustContext: toVerifyContext, metrics });

    const result = await processor.processSignalReceived({ signalId: 'sig_01', eventId: 'bank_evt_01' });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['bank_app_unverified', 'package_cert_to_verify']));
    expect(repository.reviews).toHaveLength(0);
    expect(repository.signals[0]?.parserVersion).toBeUndefined();
    expect(repository.webhookEvents).toEqual([]);
    expect(metrics.counterValue(MetricNames.SIGNALS_PARSED_TOTAL)).toBe(0);
    expect(metrics.counterValue(MetricNames.SIGNALS_REJECTED_TOTAL)).toBe(1);
    expect(metrics.counterValue(MetricNames.SIGNALS_NEEDS_REVIEW_TOTAL)).toBe(0);
    expect(metrics.counterValue(MetricNames.REVIEWS_CREATED_TOTAL)).toBe(0);
    expect(metrics.counterValue(MetricNames.UNTRUSTED_BANK_REVIEW_TOTAL)).toBe(0);
  });

  it('rejects invalid signatures before parsing or match side effects', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({
      metrics,
      signal: buildSignal({ signatureValid: false })
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('invalid_signature');
    expect(repository.reviews).toHaveLength(0);
    expect(repository.signals[0]?.parserVersion).toBeUndefined();
    expect(repository.signals[0]?.status).toBe('rejected');
    expect(repository.publishedEvents.map((event) => event.type)).not.toEqual(
      expect.arrayContaining([EventTypes.SIGNAL_PARSED, EventTypes.MATCH_CANDIDATES_FOUND, EventTypes.MATCH_SCORED])
    );
    expect(repository.auditEvents.map((event) => event.eventType)).not.toEqual(
      expect.arrayContaining([EventTypes.SIGNAL_PARSED, EventTypes.MATCH_CANDIDATES_FOUND, EventTypes.MATCH_SCORED])
    );
    expect(metrics.counterValue(MetricNames.SIGNALS_PARSED_TOTAL)).toBe(0);
    expect(metrics.counterValue(MetricNames.SIGNALS_REJECTED_TOTAL)).toBe(1);
  });

  it('rejects exact package/certificate mismatches before parsing or review creation', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const exactTrustedContext = {
      ...trustedContext,
      trustedPackageName: 'ru.sberbankmobile',
      trustedPackageCertSha256: 'cert_sber_verified'
    } as SignalRuntimeTrustContext;
    const { processor, repository } = createProcessor({
      metrics,
      trustContext: exactTrustedContext,
      signal: {
        ...buildSignal(),
        packageName: 'com.fake.sberbankmobile',
        packageCertSha256: 'cert_fake'
      } as SignalRuntimeSignal
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['bank_app_unverified', 'package_cert_mismatch']));
    expect(repository.reviews).toHaveLength(0);
    expect(repository.signals[0]?.parserVersion).toBeUndefined();
    expect(repository.publishedEvents.map((event) => event.type)).not.toContain(EventTypes.SIGNAL_PARSED);
    expect(metrics.counterValue(MetricNames.SIGNALS_PARSED_TOTAL)).toBe(0);
  });

  it('publishes internal review events without public signal or review webhooks', async () => {
    const { processor, repository } = createProcessor();

    await processor.processSignalReceived({ signalId: 'sig_01', eventId: 'bank_evt_01' });

    expect(repository.webhookEvents).toEqual([]);
    expect(repository.publishedEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([EventTypes.DECISION_NEEDS_REVIEW, EventTypes.REVIEW_CREATED])
    );
    expect(JSON.stringify(repository.publishedEvents)).not.toContain('+7 999');
  });

  it.each([
    'sber_ru',
    'tbank_ru',
    'vtb_ru',
    'alfa_ru',
    'gazprombank_ru'
  ] as const)('rejects synthetic unverified %s signals without auto-confirm', async (bankProfileId) => {
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

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['bank_app_unverified', 'package_cert_to_verify']));
    expect(repository.reviews).toHaveLength(0);
    expect(repository.orders.get('ord_01')?.status).toBe('awaiting_payment');
    expect(repository.webhookEvents).toEqual([]);
  });

  it.each([
    ['cashback', 'cashback 137 RUB from store', 'incoming_cashback'],
    ['refund', 'refund 137 RUB from shop', 'incoming_refund'],
    ['outgoing', 'payment 137 RUB to shop', 'outgoing_payment'],
    ['promo', 'promo bonus 137 RUB', 'promo'],
    ['failed', 'failed transfer 137 RUB', 'failed_transfer']
  ] as const)('rejects unsafe %s notifications', async (_label, text, direction) => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({
      metrics,
      signal: buildSignal({ titleRedacted: text, bodyRedacted: '' })
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('rejected');
    expect(repository.matches[0]?.decision).toBe('rejected');
    expect(repository.signals[0]?.directionLabel).toBe(direction);
    expect(repository.orders.get('ord_01')?.status).toBe('awaiting_payment');
    expect(metrics.counterValue(MetricNames.SIGNALS_REJECTED_TOTAL)).toBe(1);
    expect(metrics.counterValue(safetyMetricForDirection(direction))).toBe(1);
  });

  it('routes unknown direction to review without confirming', async () => {
    const { processor, repository } = createProcessor({
      signal: buildSignal({ titleRedacted: 'Account update 137 RUB', bodyRedacted: '' })
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('needs_review');
    expect(repository.reviews[0]?.reasonCodes).toContain('ambiguous_direction');
    expect(repository.orders.get('ord_01')?.status).toBe('needs_review');
  });

  it('routes an amount-only signal to review', async () => {
    const { processor, repository } = createProcessor({
      signal: buildSignal({ titleRedacted: 'Incoming transfer 137 RUB', bodyRedacted: '' }),
      sessions: [buildSession({ buyerPhoneHmac: undefined, referenceHmac: undefined })]
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('needs_review');
    expect(repository.reviews[0]?.reasonCodes).toContain('amount_only_never_auto_confirm');
    expect(repository.orders.get('ord_01')?.status).toBe('needs_review');
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
        }>;
      }>;
    };

    for (const bank of fixtureSet.banks) {
      for (const fixture of bank.fixtures) {
        const signalId = `sig_${bank.bank_profile_id}_${fixture.category}`;
        const { processor, repository } = createProcessor({
          trustContext: trustedContext,
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
              selectedReceiverBankId: bank.bank_profile_id,
              selectedReceiverBankProfileId: bank.bank_profile_id,
              selectedReceivingRouteId: `route_${bank.bank_profile_id}_phone`,
              buyerPhoneHmac: fixture.category === 'amount_only' ? undefined : 'phone_hmac_01',
              referenceHmac: fixture.category === 'amount_only' ? undefined : 'ref_hmac_01'
            })
          ]
        });

        const result = await processor.processSignalReceived({ signalId });

        expect(result.decision, `${bank.bank_profile_id}/${fixture.category}`).toBe(fixture.expected_decision);
        expect(repository.orders.get('ord_01')?.status).not.toBe('manual_confirmed');
        expect(repository.webhookEvents).toEqual([]);
        expect(JSON.stringify(repository.webhookEvents)).not.toContain('Transfer from +7');
      }
    }
  });

  it('does not create payment review for wrong-bank signals even when amount and identity match', async () => {
    const { processor, repository } = createProcessor({
      signal: buildSignal({ bankProfileId: 'tbank_ru' })
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('receiver_bank_mismatch');
    expect(repository.reviews).toHaveLength(0);
    expect(repository.orders.get('ord_01')?.status).toBe('awaiting_payment');
    expect(repository.publishedEvents.map((event) => event.type)).not.toContain(EventTypes.DECISION_NEEDS_REVIEW);
  });

  it('does not create payment review for wrong receiving-route signals even when amount and identity match', async () => {
    const { processor, repository } = createProcessor({
      signal: {
        ...buildSignal(),
        receivingRouteId: 'route_other_phone'
      } as SignalRuntimeSignal
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('receiving_route_mismatch');
    expect(repository.reviews).toHaveLength(0);
    expect(repository.orders.get('ord_01')?.status).toBe('awaiting_payment');
    expect(repository.publishedEvents.map((event) => event.type)).not.toContain(EventTypes.DECISION_NEEDS_REVIEW);
  });

  it('routes trusted exact matches to manual review without emitting payment.confirmed', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({ metrics });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('needs_review');
    expect(result.reasonCodes).toContain('manual_confirmation_required_v1');
    expect(repository.orders.get('ord_01')?.status).toBe('needs_review');
    expect(repository.reviews).toHaveLength(1);
    expect(repository.webhookEvents).toEqual([]);
    expect(JSON.stringify(repository.auditEvents)).not.toContain('Transfer from +7');
    expect(metrics.counterValue(MetricNames.SIGNALS_NEEDS_REVIEW_TOTAL)).toBe(1);
  });

  it('creates review on collision and waits for manual confirmation', async () => {
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

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('no_active_payment_intent_no_review');
    expect(repository.reviews).toHaveLength(0);
    expect(repository.webhookEvents).toHaveLength(0);
    expect(repository.orders.get('ord_01')?.status).toBe('awaiting_payment');
  });

  it('does not create payment review for unrelated bank activity without an active intent', async () => {
    const { processor, repository } = createProcessor({
      sessions: []
    });

    const result = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(result.decision).toBe('rejected');
    expect(result.reasonCodes).toContain('no_active_payment_intent_no_review');
    expect(repository.reviews).toHaveLength(0);
    expect(repository.webhookEvents).toHaveLength(0);
  });

  it('is idempotent for repeated signal events', async () => {
    const metrics = new InMemoryMetricsRegistry();
    const { processor, repository } = createProcessor({ metrics });

    await processor.processSignalReceived({ signalId: 'sig_01' });
    const repeated = await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(repeated.decision).toBe('needs_review');
    expect(repository.matches).toHaveLength(1);
    expect(repository.webhookEvents).toHaveLength(0);
    expect(repository.reviews).toHaveLength(1);
    expect(metrics.counterValue(MetricNames.SIGNALS_DUPLICATE_TOTAL)).toBe(1);
  });

  it('does not duplicate review items for repeated review decisions', async () => {
    const { processor, repository } = createProcessor();

    await processor.processSignalReceived({ signalId: 'sig_01' });
    await processor.processSignalReceived({ signalId: 'sig_01' });

    expect(repository.reviews).toHaveLength(1);
    expect(repository.webhookEvents).toEqual([]);
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
