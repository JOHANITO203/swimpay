import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hmacSha256 } from '@swimpay/security';
import { EventTypes } from '@swimpay/events';
import {
  InMemorySignalRuntimeRepository,
  SignalRuntimeProcessor,
  type SignalRuntimeSignal,
  type SignalRuntimeSessionCandidate,
  type SignalRuntimeTrustContext
} from '../apps/signal-worker/src/runtime.js';
import {
  createPaymentWebhookEvent,
  InMemoryWebhookRepository,
  verifyWebhookSignature,
  WebhookDeliveryWorker,
  type WebhookEndpoint,
  type WebhookHttpClient
} from '../apps/job-worker/src/webhooks.js';

const root = process.cwd();
const now = '2026-05-03T12:00:00.000Z';
const fiveBankIds = ['sber_ru', 'tbank_ru', 'vtb_ru', 'alfa_ru', 'gazprombank_ru'] as const;

interface PrivateBetaFixtureSet {
  mode: string;
  merchant: {
    merchant_id: string;
    webhook_endpoint: {
      url: string;
      enabled_events: string[];
    };
  };
  order_fixture: {
    order_id: string;
    payment_session_id: string;
    amount_minor: number;
    currency: string;
    buyer_phone_hmac: string;
    buyer_phone_masked: string;
    checkout_url: string;
    status_url: string;
  };
  support_trace: {
    excluded_fields: string[];
  };
  bank_signal_scenarios: Array<{
    bank_profile_id: string;
    signal_id: string;
    event_id: string;
    notification_hash: string;
    redacted_title: string;
    redacted_body: string;
    expected_runtime_decision: 'needs_review';
    expected_review_status: 'open';
    expected_order_status_before_review: 'needs_review';
    expected_manual_confirm_status: 'manual_confirmed';
    expected_default_reject_scope: 'signal';
    expected_webhook_decision: 'manual_confirmed';
    official_bank_confirmation: false;
    confirmation_type: 'notification_signal';
  }>;
}

describe('Sprint 6D private beta review queue and webhook rehearsal', () => {
  test('creates Sprint 6D task files and closeout report', () => {
    const requiredFiles = [
      'tasks/296_beta_synthetic_merchant_fixture_set.md',
      'tasks/297_beta_order_checkout_review_flow.md',
      'tasks/298_beta_review_confirm_reject_rehearsal.md',
      'tasks/299_beta_webhook_fulfillment_rehearsal.md',
      'tasks/300_beta_audit_and_support_trace.md',
      'tasks/301_beta_merchant_operator_runbook.md',
      'tasks/302_sprint_6d_closeout_review.md',
      '.swimpay-agent/SPRINT_6D_REPORT.md',
      'docs/PRIVATE_BETA_OPERATOR_RUNBOOK.md',
      'packages/bank-templates/private-beta-merchant-order-fixtures.json'
    ];

    for (const file of requiredFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });

  test('defines synthetic merchant/order fixtures for five-bank private beta review mode without raw PII', () => {
    const fixtures = readPrivateBetaFixtures();
    expect(fixtures.mode).toBe('private_beta_review_only_rehearsal');
    expect(fixtures.order_fixture.currency).toBe('RUB');
    expect(fixtures.order_fixture.buyer_phone_hmac).toMatch(/^phone_hmac_/u);
    expect(fixtures.order_fixture.buyer_phone_masked).toContain('***');
    expect(fixtures.merchant.webhook_endpoint.enabled_events).toEqual(['payment.confirmed', 'payment.rejected', 'payment.expired']);
    expect(fixtures.bank_signal_scenarios.map((scenario) => scenario.bank_profile_id)).toEqual([...fiveBankIds]);

    expect(fixtures.order_fixture.buyer_phone_masked).toContain('***');
    expect(fixtures.order_fixture.buyer_phone_masked).not.toContain('+799');
    for (const scenario of fixtures.bank_signal_scenarios) {
      const notificationFields = `${scenario.redacted_title}\n${scenario.redacted_body}`;
      expect(notificationFields, scenario.bank_profile_id).toContain('<PHONE>');
      expect(notificationFields, scenario.bank_profile_id).not.toMatch(/\+?\d[\d\s().-]{7,}\d/u);
    }

    const serialized = JSON.stringify(fixtures);
    expect(serialized).not.toContain('official_bank_confirmation:true');
    expect(serialized).not.toContain('bank_confirmed');
    expect(fixtures.support_trace.excluded_fields).toEqual(
      expect.arrayContaining(['raw_phone', 'raw_notification_text', 'raw_title', 'raw_body'])
    );
  });

  test('routes every private beta bank scenario to review before manual action', async () => {
    const fixtures = readPrivateBetaFixtures();

    for (const scenario of fixtures.bank_signal_scenarios) {
      const { processor, repository } = createRuntimeHarness(fixtures, scenario);
      const result = await processor.processSignalReceived({ signalId: scenario.signal_id });

      expect(result.decision, scenario.bank_profile_id).toBe('needs_review');
      expect(repository.reviews).toHaveLength(1);
      expect(repository.reviews[0]).toMatchObject({
        status: scenario.expected_review_status
      });
      expect(repository.signals[0]?.bankProfileId).toBe(scenario.bank_profile_id);
      expect(repository.reviews[0]?.reasonCodes).toEqual(expect.arrayContaining(['bank_profile_untrusted']));
      expect(repository.reviews[0]?.reasonCodes).not.toEqual(
        expect.arrayContaining(['bank_app_unverified', 'package_cert_to_verify'])
      );
      expect(repository.orders.get(fixtures.order_fixture.order_id)?.status).toBe(
        scenario.expected_order_status_before_review
      );
      expect(repository.orders.get(fixtures.order_fixture.order_id)?.status).not.toBe('manual_confirmed');
      expect(repository.webhookEvents).toEqual([]);
      expect(repository.publishedEvents.map((event) => event.type)).toEqual(
        expect.arrayContaining([EventTypes.DECISION_NEEDS_REVIEW, EventTypes.REVIEW_CREATED])
      );
      expect(JSON.stringify(repository.publishedEvents)).not.toContain('raw_notification_text');
    }
  });

  test('rehearses manual confirm webhook delivery, default signal reject, and audit/support trace safely', async () => {
    const fixtures = readPrivateBetaFixtures();
    const scenario = fixtures.bank_signal_scenarios[0]!;
    const { processor, repository } = createRuntimeHarness(fixtures, scenario);

    await processor.processSignalReceived({ signalId: scenario.signal_id });
    const review = repository.reviews[0]!;
    const manualConfirmedEvent = createPaymentWebhookEvent({
      eventId: 'evt_beta_manual_confirmed_01',
      type: 'payment.confirmed',
      createdAt: now,
      merchantId: fixtures.merchant.merchant_id,
      data: {
        order_id: fixtures.order_fixture.order_id,
        payment_session_id: fixtures.order_fixture.payment_session_id,
        review_id: review.id,
        signal_id: scenario.signal_id,
        decision: scenario.expected_webhook_decision,
        reason_codes: ['manual_review_confirmed', 'review_only_bank_signal']
      }
    });
    const webhookRepository = new InMemoryWebhookRepository({ deliveryId: () => 'del_beta_manual_01' });
    webhookRepository.endpoints.push(activeEndpoint(fixtures));
    const httpClient = new CapturingWebhookHttpClient([{ status: 200 }]);
    const worker = new WebhookDeliveryWorker({ repository: webhookRepository, httpClient });

    await worker.enqueueEvent(manualConfirmedEvent);
    const delivered = await worker.deliverDue(now);

    expect(delivered).toEqual({ delivered: 1, retrying: 0, failed: 0 });
    expect(webhookRepository.deliveries[0]).toMatchObject({ status: 'delivered', attemptCount: 1 });
    expect(httpClient.requests).toHaveLength(1);
    expect(httpClient.requests[0]?.body).toContain('"decision":"manual_confirmed"');
    expect(httpClient.requests[0]?.body).toContain('"confirmation_type":"notification_signal"');
    expect(httpClient.requests[0]?.body).toContain('"official_bank_confirmation":false');
    expect(httpClient.requests[0]?.body).not.toContain('raw_notification_text');
    expect(
      verifyWebhookSignature({
        secret: 'whsec_private_beta_rehearsal',
        timestamp: now,
        payload: httpClient.requests[0]!.body,
        signature: httpClient.requests[0]!.headers['SwimPay-Signature']!
      })
    ).toBe(true);
    expect(scenario.expected_default_reject_scope).toBe('signal');
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['review.created'])
    );
    expect(repository.auditEvents.map((event) => event.eventType)).not.toContain('webhook.delivery_requested');
  });

  test('documents private beta review-first operations without official confirmation wording', () => {
    const runbook = readFileSync(join(root, 'docs/PRIVATE_BETA_OPERATOR_RUNBOOK.md'), 'utf8');
    const readiness = readFileSync(join(root, 'docs/PRIVATE_BETA_READINESS.md'), 'utf8');
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_6D_REPORT.md'), 'utf8');

    for (const content of [runbook, readiness, report]) {
      expect(content).toContain('SwimPay recognizes merchant-side notification signals');
      expect(content).toContain('SwimPay does not provide official bank confirmation');
      expect(content).toContain('Review is required in beta');
      expect(content).toContain('official_bank_confirmation=false');
      expect(content).toContain('confirmation_type=notification_signal');
      expect(content).not.toContain('official_bank_confirmation=true');
      expect(content).not.toContain('bank_confirmed');
      expect(content).not.toContain('guaranteed_payment');
    }
  });
});

function readPrivateBetaFixtures(): PrivateBetaFixtureSet {
  return JSON.parse(
    readFileSync(join(root, 'packages/bank-templates/private-beta-merchant-order-fixtures.json'), 'utf8')
  ) as PrivateBetaFixtureSet;
}

function createRuntimeHarness(
  fixtures: PrivateBetaFixtureSet,
  scenario: PrivateBetaFixtureSet['bank_signal_scenarios'][number]
) {
  const repository = new InMemorySignalRuntimeRepository({
    signals: [runtimeSignal(fixtures, scenario)],
    sessions: [runtimeSession(fixtures, scenario)],
    trustContext: reviewOnlyTrustContext(scenario)
  });
  const processor = new SignalRuntimeProcessor({
    repository,
    now: () => now,
    idGenerator: {
      eventId: () => `evt_beta_runtime_${repository.publishedEvents.length + 1}`,
      matchId: () => `match_beta_${repository.matches.length + 1}`,
      reviewId: () => `rev_beta_${repository.reviews.length + 1}`,
      auditEventId: () => `audit_beta_${repository.auditEvents.length + 1}`
    }
  });

  return { processor, repository };
}

function runtimeSignal(
  fixtures: PrivateBetaFixtureSet,
  scenario: PrivateBetaFixtureSet['bank_signal_scenarios'][number]
): SignalRuntimeSignal {
  return {
    id: scenario.signal_id,
    merchantId: fixtures.merchant.merchant_id,
    deviceId: 'dev_private_beta_01',
    bankProfileId: scenario.bank_profile_id,
    packageName: `com.swimpay.synthetic.${scenario.bank_profile_id}`,
    packageCertSha256: `cert_${scenario.bank_profile_id}`,
    eventId: scenario.event_id,
    notificationHash: scenario.notification_hash,
    observedAt: now,
    receivedAt: now,
    titleRedacted: scenario.redacted_title,
    bodyRedacted: scenario.redacted_body,
    amountMinor: fixtures.order_fixture.amount_minor,
    currency: fixtures.order_fixture.currency,
    senderPhoneHmac: fixtures.order_fixture.buyer_phone_hmac,
    senderPhoneMasked: fixtures.order_fixture.buyer_phone_masked,
    referenceHmac: hmacSha256('<REFERENCE>', 'private_beta_reference_secret'),
    referenceCodeMasked: 'SWP-BETA-***',
    directionLabel: 'incoming_customer_transfer',
    signatureValid: true,
    status: 'received'
  };
}

function runtimeSession(
  fixtures: PrivateBetaFixtureSet,
  scenario: PrivateBetaFixtureSet['bank_signal_scenarios'][number]
): SignalRuntimeSessionCandidate {
  return {
    orderId: fixtures.order_fixture.order_id,
    paymentSessionId: fixtures.order_fixture.payment_session_id,
    merchantId: fixtures.merchant.merchant_id,
    expectedAmountMinor: fixtures.order_fixture.amount_minor,
    currency: fixtures.order_fixture.currency,
    buyerPhoneHmac: fixtures.order_fixture.buyer_phone_hmac,
    referenceHmac: hmacSha256('<REFERENCE>', 'private_beta_reference_secret'),
    selectedReceiverBankId: scenario.bank_profile_id,
    selectedReceiverBankProfileId: scenario.bank_profile_id,
    selectedReceivingRouteId: `route_${scenario.bank_profile_id}_phone`,
    receiverRouteCode: `${scenario.bank_profile_id.toUpperCase()}-PHONE`,
    railType: 'phone_transfer',
    paymentReference: 'TANGO ALFA',
    status: 'awaiting_payment',
    orderStatus: 'awaiting_payment',
    paymentSessionStatus: 'awaiting_payment',
    validFrom: '2026-05-03T11:45:00.000Z',
    validUntil: '2026-05-03T12:15:00.000Z',
    orderAlreadyConfirmed: false
  };
}

function reviewOnlyTrustContext(scenario: PrivateBetaFixtureSet['bank_signal_scenarios'][number]): SignalRuntimeTrustContext {
  return {
    bankProfileStatus: 'learning',
    bankAppVerificationStatus: 'verified',
    trustedPackageName: `com.swimpay.synthetic.${scenario.bank_profile_id}`,
    trustedPackageCertSha256: `cert_${scenario.bank_profile_id}`,
    templateStatus: 'learning',
    deviceStatus: 'active',
    deviceTrustScore: 100,
    merchantTrusted: true
  };
}

function activeEndpoint(fixtures: PrivateBetaFixtureSet): WebhookEndpoint {
  return {
    id: 'we_private_beta_01',
    merchantId: fixtures.merchant.merchant_id,
    url: fixtures.merchant.webhook_endpoint.url,
    secret: 'whsec_private_beta_rehearsal',
    enabledEvents: ['payment.confirmed', 'payment.rejected', 'payment.expired'],
    status: 'active'
  };
}

class CapturingWebhookHttpClient implements WebhookHttpClient {
  public readonly requests: Array<{ url: string; headers: Record<string, string>; body: string; timeoutMs: number }> = [];

  public constructor(private readonly responses: Array<{ status: number; body?: string } | Error>) {}

  public async postJson(params: { url: string; headers: Record<string, string>; body: string; timeoutMs: number }) {
    this.requests.push(params);
    const response = this.responses.shift() ?? { status: 200 };
    if (response instanceof Error) {
      throw response;
    }

    return response;
  }
}
