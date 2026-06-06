import { EventTypes, type DurableEventHandler, type InternalEventEnvelope, type SafeEventLogger } from '@swimpay/events';
import { createPaymentWebhookEvent, type PublicWebhookEvent } from './webhooks.js';

export interface WebhookWorkerConfig {
  enabled: boolean;
  pollIntervalMs: number;
  batchSize: number;
  maxAttempts: number;
  requestTimeoutMs: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
}

export interface WebhookDeliveryProcessor {
  processDeliveryById(deliveryId: string, now: string): Promise<unknown>;
  processEventDeliveries(eventId: string, now: string): Promise<unknown>;
  processDueDeliveries(now: string, limit: number): Promise<unknown>;
}

export interface PublicWebhookEnqueuer {
  enqueueEvent(event: PublicWebhookEvent): Promise<{ created: number; skippedDuplicates: number }>;
}

export function parseWebhookWorkerConfig(env: Record<string, string | undefined>): WebhookWorkerConfig {
  return {
    enabled: env.WEBHOOK_WORKER_ENABLED === 'true',
    pollIntervalMs: parsePositiveInt(env.WEBHOOK_POLL_INTERVAL_MS, 30_000),
    batchSize: parsePositiveInt(env.WEBHOOK_WORKER_BATCH_SIZE, 10),
    maxAttempts: parsePositiveInt(env.WEBHOOK_MAX_ATTEMPTS, 7),
    requestTimeoutMs: parsePositiveInt(env.WEBHOOK_REQUEST_TIMEOUT_MS, 5_000),
    retryBaseDelayMs: parsePositiveInt(env.WEBHOOK_RETRY_BASE_DELAY_MS, 60_000),
    retryMaxDelayMs: parsePositiveInt(env.WEBHOOK_RETRY_MAX_DELAY_MS, 24 * 60 * 60_000)
  };
}

export function createWebhookDeliveryRequestedHandler(
  processor: WebhookDeliveryProcessor,
  now: () => string
): DurableEventHandler {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    if (event.type !== EventTypes.WEBHOOK_DELIVERY_REQUESTED) {
      throw new Error(`Unexpected webhook worker event type: ${event.type}`);
    }

    const deliveryId = readOptionalString(event.data.delivery_id);
    const eventId = readOptionalString(event.data.event_id);

    if (deliveryId) {
      await processor.processDeliveryById(deliveryId, now());
      return { kind: 'ok' };
    }

    if (eventId) {
      await processor.processEventDeliveries(eventId, now());
      return { kind: 'ok' };
    }

    throw new Error('webhook.delivery_requested requires delivery_id or event_id.');
  };
}

export function createReviewFinalWebhookHandler(enqueuer: PublicWebhookEnqueuer): DurableEventHandler {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    if (event.type !== EventTypes.REVIEW_CONFIRMED && event.type !== EventTypes.REVIEW_REJECTED) {
      throw new Error(`Unexpected review final webhook event type: ${event.type}`);
    }

    const confirmationType = readOptionalString(event.data.confirmation_type);
    if (confirmationType !== 'notification_signal' && confirmationType !== 'manual_bank_check') {
      return { kind: 'ok' };
    }

    const merchantId = requireString(event.data.merchant_id, 'merchant_id');
    const reviewId = requireString(event.data.review_id, 'review_id');
    const orderId = requireString(event.data.order_id, 'order_id');
    const externalOrderId = readOptionalString(event.data.external_id);
    const paymentSessionId = requireString(event.data.payment_session_id, 'payment_session_id');
    const amountMinor = requireInteger(event.data.amount_minor, 'amount_minor');
    const currency = requireString(event.data.currency, 'currency');
    const publicStatus = event.type === EventTypes.REVIEW_CONFIRMED ? 'confirmed' : 'rejected';

    if (event.type === EventTypes.REVIEW_REJECTED) {
      const rejectionScope = readOptionalString(event.data.rejection_scope);
      if (rejectionScope !== 'payment_session' && rejectionScope !== 'order') {
        return { kind: 'ok' };
      }

      await enqueuer.enqueueEvent(
        createPaymentWebhookEvent({
          eventId: event.id,
          type: 'payment.rejected',
          createdAt: event.created_at,
          merchantId,
          data: stripUndefined({
            review_id: reviewId,
            order_id: orderId,
            external_id: externalOrderId,
            payment_session_id: paymentSessionId,
            amount_minor: amountMinor,
            currency,
            status: publicStatus,
            decision: 'manual_rejected',
            rejection_scope: rejectionScope,
            reason: readOptionalString(event.data.reason),
            reason_label: readOptionalString(event.data.reason_label)
          })
        })
      );
      return { kind: 'ok' };
    }

    await enqueuer.enqueueEvent(
      createPaymentWebhookEvent({
        eventId: event.id,
        type: 'payment.confirmed',
        createdAt: event.created_at,
        merchantId,
        data: stripUndefined({
          review_id: reviewId,
          order_id: orderId,
          external_id: externalOrderId,
          payment_session_id: paymentSessionId,
          amount_minor: amountMinor,
          currency,
          status: publicStatus,
          decision: 'manual_confirmed',
          reason_label: readOptionalString(event.data.reason_label),
          currency_detection: readOptionalRecord(event.data.currency_detection),
          buyer_currency_selection: readOptionalRecord(event.data.buyer_currency_selection),
          receiving_route: readOptionalRecord(event.data.receiving_route)
        })
      })
    );
    return { kind: 'ok' };
  };
}

export function createPaymentExpiredWebhookHandler(enqueuer: PublicWebhookEnqueuer): DurableEventHandler {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    if (event.type !== EventTypes.ORDER_EXPIRED && event.type !== EventTypes.PAYMENT_SESSION_EXPIRED) {
      throw new Error(`Unexpected payment expired webhook event type: ${event.type}`);
    }

    const merchantId = requireString(event.data.merchant_id, 'merchant_id');
    const orderId = requireString(event.data.order_id, 'order_id');
    const externalOrderId = readOptionalString(event.data.external_id);
    const paymentSessionId = requireString(event.data.payment_session_id, 'payment_session_id');
    const amountMinor = requireInteger(event.data.amount_minor, 'amount_minor');
    const currency = requireString(event.data.currency, 'currency');

    await enqueuer.enqueueEvent(
      createPaymentWebhookEvent({
        eventId: event.id,
        type: 'payment.expired',
        createdAt: event.created_at,
        merchantId,
        data: stripUndefined({
          order_id: orderId,
          external_id: externalOrderId,
          payment_session_id: paymentSessionId,
          amount_minor: amountMinor,
          currency,
          status: 'expired',
          decision: 'expired',
          reason_label: readOptionalString(event.data.reason_label)
        })
      })
    );
    return { kind: 'ok' };
  };
}

export function createCurrencyMismatchWebhookHandler(enqueuer: PublicWebhookEnqueuer): DurableEventHandler {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    if (event.type !== EventTypes.SIGNAL_CURRENCY_MISMATCH) {
      throw new Error(`Unexpected currency mismatch webhook event type: ${event.type}`);
    }

    const merchantId = requireString(event.data.merchant_id, 'merchant_id');
    const orderId = requireString(event.data.order_id, 'order_id');
    const externalOrderId = readOptionalString(event.data.external_id);
    const paymentSessionId = requireString(event.data.payment_session_id, 'payment_session_id');
    const expectedCurrency = requireString(event.data.expected_currency, 'expected_currency');
    const signalCurrency = requireString(event.data.signal_currency, 'signal_currency');
    const expectedAmountMinor = requireInteger(event.data.expected_amount_minor, 'expected_amount_minor');
    const matchedOn = requireString(event.data.matched_on, 'matched_on');

    await enqueuer.enqueueEvent(
      createPaymentWebhookEvent({
        eventId: event.id,
        type: 'payment.currency_mismatch',
        createdAt: event.created_at,
        merchantId,
        includeSignalDisclosure: false,
        data: stripUndefined({
          order_id: orderId,
          external_id: externalOrderId,
          payment_session_id: paymentSessionId,
          expected_currency: expectedCurrency,
          signal_currency: signalCurrency,
          expected_amount_minor: expectedAmountMinor,
          signal_amount_minor: Number.isInteger(event.data.signal_amount_minor) ? (event.data.signal_amount_minor as number) : undefined,
          matched_on: matchedOn
        })
      })
    );
    return { kind: 'ok' };
  };
}

export class WebhookPollingLoop {
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;

  public constructor(
    private readonly options: {
      processor: WebhookDeliveryProcessor;
      config: WebhookWorkerConfig;
      now: () => string;
      logger?: SafeEventLogger | undefined;
    }
  ) {}

  public start(): void {
    if (!this.options.config.enabled || this.timer) {
      return;
    }

    this.stopped = false;
    const tick = async () => {
      if (this.stopped) {
        return;
      }

      await this.runOnce();
      if (!this.stopped) {
        this.timer = setTimeout(() => {
          void tick();
        }, this.options.config.pollIntervalMs);
      }
    };

    this.timer = setTimeout(() => {
      void tick();
    }, this.options.config.pollIntervalMs);
  }

  public async runOnce(): Promise<void> {
    if (!this.options.config.enabled) {
      return;
    }

    try {
      await this.options.processor.processDueDeliveries(this.options.now(), this.options.config.batchSize);
    } catch (error) {
      this.options.logger?.error('webhook_polling_loop_failed', {
        error_name: error instanceof Error ? error.name : 'UnknownError'
      });
      throw error;
    }
  }

  public stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function requireString(value: unknown, field: string): string {
  const normalized = readOptionalString(value);
  if (!normalized) {
    throw new Error(`review final webhook event requires ${field}.`);
  }

  return normalized;
}

function requireInteger(value: unknown, field: string): number {
  if (Number.isInteger(value)) {
    return value as number;
  }
  if (typeof value === 'string' && /^\d+$/u.test(value)) {
    return Number(value);
  }
  throw new Error(`review final webhook event requires ${field}.`);
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
