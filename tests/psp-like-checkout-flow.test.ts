import { describe, expect, it } from 'vitest';
import {
  PayerBankLauncherRegistry,
  V1ReceiverBankOptions,
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState
} from '@swimpay/contracts';
import {
  InMemorySignalRuntimeRepository,
  SignalRuntimeProcessor,
  type SignalRuntimeSignal,
  type SignalRuntimeSessionCandidate,
  type SignalRuntimeTrustContext
} from '../apps/signal-worker/src/runtime.js';
import {
  InMemoryWebhookRepository,
  WebhookDeliveryWorker,
  createPaymentWebhookEvent,
  verifyWebhookSignature,
  type WebhookEndpoint,
  type WebhookHttpClient
} from '../apps/job-worker/src/webhooks.js';

const now = '2026-05-03T15:00:00.000Z';

describe('Sprint 7A PSP-like checkout bank selection flow', () => {
  it('rehearses receiver selection, payer launcher fallback, review signal, manual webhook, and expiry safely', async () => {
    const receiverBank = V1ReceiverBankOptions.find((bank) => bank.receiver_bank_id === 'sber_ru');
    const payerLauncher = PayerBankLauncherRegistry.find((launcher) => launcher.payer_bank_launcher_id === 'other_manual');

    expect(receiverBank).toMatchObject({
      review_only: true,
      detection_supported: true,
      auto_confirm_enabled: false,
      official_bank_confirmation: false
    });
    expect(payerLauncher).toMatchObject({
      fallback_strategy: 'copy_details_manual_transfer',
      does_not_confirm_payment: true,
      detection_supported: false,
      official_bank_confirmation: false
    });

    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming'
      })
    ).toBe('receiver_bank_selection');
    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        selectedReceiverBankId: receiverBank?.receiver_bank_id
      })
    ).toBe('receiving_route_selection');
    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        selectedReceiverBankId: receiverBank?.receiver_bank_id,
        selectedReceivingRouteId: 'route_checkout_phone'
      })
    ).toBe('payer_bank_launcher_selection');
    expect(
      mapPaymentSessionToCheckoutState({
        paymentSessionStatus: 'receiver_arming',
        selectedReceiverBankId: receiverBank?.receiver_bank_id,
        selectedReceivingRouteId: 'route_checkout_phone',
        selectedPayerBankLauncherId: payerLauncher?.payer_bank_launcher_id
      })
    ).toBe('payment_instructions');
    expect(
      mapCheckoutStateToBuyerSafeStatus(
        mapPaymentSessionToCheckoutState({
          paymentSessionStatus: 'buyer_claimed_paid',
          selectedReceiverBankId: receiverBank?.receiver_bank_id,
          selectedReceivingRouteId: 'route_checkout_phone',
          selectedPayerBankLauncherId: payerLauncher?.payer_bank_launcher_id,
          paymentInstructionsShownAt: now
        })
      )
    ).toBe('searching_signal');

    const runtime = createReviewOnlyRuntime();
    const result = await runtime.processor.processSignalReceived({ signalId: 'sig_checkout_01' });

    expect(result.decision).toBe('needs_review');
    expect(runtime.repository.orders.get('ord_checkout_01')?.status).toBe('needs_review');
    expect(runtime.repository.webhookEvents.map((event) => event.type)).toEqual([
      'payment.signal_detected',
      'payment.needs_review'
    ]);
    expect(runtime.repository.webhookEvents.some((event) => event.type === 'payment.confirmed')).toBe(false);
    expect(JSON.stringify(runtime.repository.webhookEvents)).not.toContain('raw_notification_text');
    for (const event of runtime.repository.webhookEvents) {
      expect(event.data).toMatchObject({
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      });
    }

    const manualWebhook = createPaymentWebhookEvent({
      eventId: 'evt_checkout_manual_confirm',
      type: 'payment.confirmed',
      createdAt: now,
      merchantId: 'mch_checkout',
      data: {
        order_id: 'ord_checkout_01',
        payment_session_id: 'ps_checkout_01',
        signal_id: 'sig_checkout_01',
        decision: 'manual_confirmed',
        reason_codes: ['manual_review_confirmed', 'review_only_bank_signal']
      }
    });
    const webhookRepository = new InMemoryWebhookRepository({ deliveryId: () => 'del_checkout_manual_confirm' });
    const httpClient = new CapturingWebhookHttpClient([{ status: 200 }]);
    webhookRepository.endpoints.push(activeEndpoint());
    const worker = new WebhookDeliveryWorker({ repository: webhookRepository, httpClient });

    await worker.enqueueEvent(manualWebhook);
    expect(await worker.deliverDue(now)).toEqual({ delivered: 1, retrying: 0, failed: 0 });
    expect(httpClient.requests[0]?.body).toContain('"type":"payment.confirmed"');
    expect(httpClient.requests[0]?.body).toContain('"confirmation_type":"notification_signal"');
    expect(httpClient.requests[0]?.body).toContain('"official_bank_confirmation":false');
    expect(
      verifyWebhookSignature({
        secret: 'whsec_checkout_e2e',
        timestamp: now,
        payload: httpClient.requests[0]!.body,
        signature: httpClient.requests[0]!.headers['SwimPay-Signature']!
      })
    ).toBe(true);

    expect(mapCheckoutStateToBuyerSafeStatus('expired')).toBe('expired');
  });
});

function createReviewOnlyRuntime() {
  const repository = new InMemorySignalRuntimeRepository({
    signals: [runtimeSignal()],
    sessions: [runtimeSession()],
    trustContext: reviewOnlyContext()
  });
  const processor = new SignalRuntimeProcessor({
    repository,
    now: () => now,
    idGenerator: {
      eventId: () => `evt_checkout_${repository.publishedEvents.length + 1}`,
      matchId: () => `match_checkout_${repository.matches.length + 1}`,
      reviewId: () => `rev_checkout_${repository.reviews.length + 1}`,
      auditEventId: () => `audit_checkout_${repository.auditEvents.length + 1}`,
      webhookEventId: () => `wh_checkout_${repository.webhookEvents.length + 1}`
    }
  });

  return { processor, repository };
}

function runtimeSignal(): SignalRuntimeSignal {
  return {
    id: 'sig_checkout_01',
    merchantId: 'mch_checkout',
    deviceId: 'dev_checkout',
    bankProfileId: 'sber_ru',
    eventId: 'evt_bank_checkout_01',
    notificationHash: 'hash_checkout_01',
    observedAt: now,
    receivedAt: now,
    titleRedacted: 'Incoming transfer <AMOUNT> <CURRENCY>',
    bodyRedacted: 'Transfer from <PHONE>. Reference <REFERENCE>',
    amountMinor: 13700,
    currency: 'RUB',
    senderPhoneHmac: 'phone_hmac_checkout',
    senderPhoneMasked: '+7 *** ***-**-67',
    referenceHmac: 'ref_hmac_checkout',
    referenceCodeMasked: 'SWP-***789',
    directionLabel: 'incoming_customer_transfer',
    signatureValid: true,
    status: 'received'
  };
}

function runtimeSession(): SignalRuntimeSessionCandidate {
  return {
    orderId: 'ord_checkout_01',
    paymentSessionId: 'ps_checkout_01',
    merchantId: 'mch_checkout',
    expectedAmountMinor: 13700,
    currency: 'RUB',
    buyerPhoneHmac: 'phone_hmac_checkout',
    buyerSenderPhoneHmac: 'phone_hmac_checkout',
    referenceHmac: 'ref_hmac_checkout',
    selectedReceiverBankId: 'sber_ru',
    selectedReceiverBankProfileId: 'sber_ru',
    selectedReceivingRouteId: 'route_checkout_phone',
    receiverRouteCode: 'SBER-PHONE',
    railType: 'phone_transfer',
    paymentReference: 'TANGO ALFA',
    receivingRouteReviewPolicy: 'review_first',
    status: 'awaiting_payment',
    validFrom: '2026-05-03T14:50:00.000Z',
    validUntil: '2026-05-03T15:10:00.000Z',
    orderAlreadyConfirmed: false,
    orderStatus: 'awaiting_payment',
    paymentSessionStatus: 'awaiting_payment'
  };
}

function reviewOnlyContext(): SignalRuntimeTrustContext {
  return {
    bankProfileStatus: 'learning',
    bankAppVerificationStatus: 'pending_verification',
    templateStatus: 'learning',
    deviceStatus: 'active',
    deviceTrustScore: 100,
    merchantTrusted: true
  };
}

function activeEndpoint(): WebhookEndpoint {
  return {
    id: 'we_checkout',
    merchantId: 'mch_checkout',
    url: 'https://merchant.example/swimpay',
    secret: 'whsec_checkout_e2e',
    enabledEvents: ['payment.signal_detected', 'payment.needs_review', 'payment.confirmed'],
    status: 'active'
  };
}

class CapturingWebhookHttpClient implements WebhookHttpClient {
  public readonly requests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

  public constructor(private readonly responses: Array<{ status: number; body?: string } | Error>) {}

  public async postJson(params: { url: string; headers: Record<string, string>; body: string }) {
    this.requests.push(params);
    const response = this.responses.shift() ?? { status: 200 };
    if (response instanceof Error) {
      throw response;
    }

    return response;
  }
}
