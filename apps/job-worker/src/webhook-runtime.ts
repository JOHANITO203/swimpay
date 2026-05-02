import { EventTypes, type DurableEventHandler, type InternalEventEnvelope, type SafeEventLogger } from '@swimpay/events';

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
