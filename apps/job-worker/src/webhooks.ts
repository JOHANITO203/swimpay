import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
import { PUBLIC_EVENT_SIGNAL_DISCLOSURE, type SafeEventLogger } from '@swimpay/events';
import { MetricNames, type MetricsRegistry } from '@swimpay/observability';
import { assertPublicWebhookUrlEgressAllowed, decryptSecret } from '@swimpay/security';
import { runWithWorkerIdempotency, type WorkerIdempotencyLedger } from './idempotency-ledger.js';

const { Pool } = pg;

export type PublicWebhookEventType =
  | 'payment.confirmed'
  | 'payment.rejected'
  | 'payment.expired'
  | 'payment.currency_mismatch';

const PUBLIC_WEBHOOK_EVENT_TYPES = new Set<string>(['payment.confirmed', 'payment.rejected', 'payment.expired', 'payment.currency_mismatch']);

export const WEBHOOK_DELIVERY_STATUSES = {
  PENDING: 'pending',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  DEAD: 'dead',
  CANCELLED: 'cancelled'
} as const;

export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[keyof typeof WEBHOOK_DELIVERY_STATUSES];

export const WEBHOOK_AUDIT_EVENTS = {
  DELIVERY_REQUESTED: 'webhook.delivery_requested',
  DELIVERY_ATTEMPTED: 'webhook.delivery_attempted',
  DELIVERED: 'webhook.delivered',
  FAILED: 'webhook.failed',
  DEAD: 'webhook.dead',
  REPLAYED: 'webhook.replayed'
} as const;

export interface PublicWebhookEvent<TData extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: PublicWebhookEventType;
  created_at: string;
  merchant_id: string;
  data: TData & typeof PUBLIC_EVENT_SIGNAL_DISCLOSURE;
}

export interface WebhookEndpoint {
  id: string;
  merchantId: string;
  url: string;
  secret: string;
  enabledEvents: PublicWebhookEventType[];
  status: 'active' | 'disabled' | 'cancelled';
}

export interface WebhookDelivery {
  id: string;
  merchantId: string;
  endpointId: string;
  endpointUrl: string;
  endpointSecret: string;
  endpointStatus: WebhookEndpoint['status'];
  eventId: string;
  eventType: PublicWebhookEventType;
  payload: PublicWebhookEvent;
  payloadHash: string;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: string | undefined;
  lastError?: string | undefined;
  lastHttpStatus?: number | undefined;
  createdAt: string;
  deliveredAt?: string | undefined;
  updatedAt: string;
  replayOfDeliveryId?: string | undefined;
}

export interface WebhookAuditEvent {
  id: string;
  merchantId: string;
  eventType: string;
  objectType: 'webhook_delivery';
  objectId: string;
  payloadRedacted: Record<string, unknown>;
  createdAt: string;
}

export interface WebhookDeliveryCreateInput {
  merchantId: string;
  endpoint: WebhookEndpoint;
  event: PublicWebhookEvent;
  createdAt: string;
  maxAttempts?: number | undefined;
  replayOfDeliveryId?: string | undefined;
  allowReplayDuplicate?: boolean | undefined;
}

export type WebhookDeliveryCreateResult =
  | { kind: 'created'; delivery: WebhookDelivery }
  | { kind: 'duplicate_endpoint_event' };

export interface WebhookRepository {
  listActiveEndpoints(merchantId: string, eventType: PublicWebhookEventType): Promise<WebhookEndpoint[]>;
  createDelivery(input: WebhookDeliveryCreateInput): Promise<WebhookDeliveryCreateResult>;
  claimDueDeliveries(now: string, limit: number, staleBefore?: string | undefined): Promise<WebhookDelivery[]>;
  claimDeliveryById(deliveryId: string, now: string, staleBefore?: string | undefined): Promise<WebhookDelivery | null>;
  claimDeliveriesByEventId(eventId: string, now: string, limit: number, staleBefore?: string | undefined): Promise<WebhookDelivery[]>;
  recordDeliveryAttempt(deliveryId: string, attemptedAt: string): Promise<void>;
  markDelivered(deliveryId: string, deliveredAt: string, httpStatus: number): Promise<void>;
  markFailed(deliveryId: string, nextRetryAt: string, lastError: string, httpStatus?: number | undefined): Promise<void>;
  markDead(deliveryId: string, lastError: string, httpStatus?: number | undefined): Promise<void>;
  markCancelled(deliveryId: string, reason: string, cancelledAt: string): Promise<void>;
  getDelivery(deliveryId: string): Promise<WebhookDelivery | null>;
}

export interface WebhookHttpClient {
  postJson(params: {
    url: string;
    headers: Record<string, string>;
    body: string;
    timeoutMs: number;
  }): Promise<{ status: number; body?: string | undefined }>;
}

export interface WebhookDeliveryWorkerOptions {
  repository: WebhookRepository;
  httpClient: WebhookHttpClient;
  idempotencyLedger?: WorkerIdempotencyLedger | undefined;
  maxAttempts?: number | undefined;
  requestTimeoutMs?: number | undefined;
  claimTimeoutMs?: number | undefined;
  metrics?: MetricsRegistry | undefined;
  logger?: SafeEventLogger | undefined;
}

export const WEBHOOK_RETRY_DELAYS_MS = [
  0,
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000
] as const;

export const RETRY_DELAYS_MS = WEBHOOK_RETRY_DELAYS_MS.slice(1);

const DEFAULT_MAX_ATTEMPTS = WEBHOOK_RETRY_DELAYS_MS.length;
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_CLAIM_TIMEOUT_MS = 5 * 60_000;
const STALE_DELIVERY_RECOVERY_ERROR = 'stale_delivery_recovered_after_worker_crash';

export class WebhookDeliveryWorker {
  private readonly maxAttempts: number;
  private readonly requestTimeoutMs: number;
  private readonly claimTimeoutMs: number;

  public constructor(private readonly options: WebhookDeliveryWorkerOptions) {
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.claimTimeoutMs = options.claimTimeoutMs ?? DEFAULT_CLAIM_TIMEOUT_MS;
  }

  public async enqueueEvent(event: PublicWebhookEvent): Promise<{ created: number; skippedDuplicates: number }> {
    assertSafePublicWebhookEvent(event);
    const endpoints = await this.options.repository.listActiveEndpoints(event.merchant_id, event.type);
    let created = 0;
    let skippedDuplicates = 0;

    if (endpoints.length === 0) {
      // A confirmed payment with nobody to notify is a merchant-facing outage, never a silent no-op.
      this.options.logger?.error('webhook_event_dropped_no_active_endpoint', {
        merchant_id: event.merchant_id,
        event_id: event.id,
        event_type: event.type
      });
      this.options.metrics?.increment(MetricNames.WEBHOOK_EVENTS_WITHOUT_ACTIVE_ENDPOINT_TOTAL);
      return { created: 0, skippedDuplicates: 0 };
    }

    for (const endpoint of endpoints) {
      const result = await this.options.repository.createDelivery({
        merchantId: event.merchant_id,
        endpoint,
        event,
        createdAt: event.created_at,
        maxAttempts: this.maxAttempts
      });

      if (result.kind === 'created') {
        created += 1;
      } else {
        skippedDuplicates += 1;
      }
    }
    this.options.metrics?.setGauge(MetricNames.WEBHOOK_DELIVERIES_PENDING, created);

    return { created, skippedDuplicates };
  }

  public async processDueDeliveries(now: string, limit = 10): Promise<{ delivered: number; retrying: number; failed: number }> {
    const deliveries = await this.options.repository.claimDueDeliveries(now, limit, this.staleBefore(now));
    return this.deliverClaimed(deliveries, now);
  }

  public async deliverDue(now: string, limit = 10): Promise<{ delivered: number; retrying: number; failed: number }> {
    return this.processDueDeliveries(now, limit);
  }

  public async processDeliveryById(deliveryId: string, now: string): Promise<{ delivered: number; retrying: number; failed: number }> {
    const delivery = await this.options.repository.claimDeliveryById(deliveryId, now, this.staleBefore(now));
    return this.deliverClaimed(delivery ? [delivery] : [], now);
  }

  public async processEventDeliveries(eventId: string, now: string): Promise<{ delivered: number; retrying: number; failed: number }> {
    const deliveries = await this.options.repository.claimDeliveriesByEventId(eventId, now, 25, this.staleBefore(now));
    return this.deliverClaimed(deliveries, now);
  }

  public async deliverClaimed(
    deliveries: readonly WebhookDelivery[],
    now: string
  ): Promise<{ delivered: number; retrying: number; failed: number }> {
    let delivered = 0;
    let retrying = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      const result = await this.deliverOne(delivery, now);
      if (result === 'skipped') {
        continue;
      }
      if (result === 'delivered') {
        delivered += 1;
        this.options.metrics?.increment(MetricNames.WEBHOOK_DELIVERIES_DELIVERED_TOTAL);
      } else if (result === 'retrying') {
        retrying += 1;
        this.options.metrics?.increment(MetricNames.WEBHOOK_DELIVERIES_FAILED_TOTAL);
      } else {
        failed += 1;
      }
    }

    return { delivered, retrying, failed };
  }

  public async replayDelivery(deliveryId: string, now: string): Promise<{ kind: 'created'; deliveryId: string } | { kind: 'not_found' }> {
    const original = await this.options.repository.getDelivery(deliveryId);
    if (!original) {
      return { kind: 'not_found' };
    }

    const endpoint: WebhookEndpoint = {
      id: original.endpointId,
      merchantId: original.merchantId,
      url: original.endpointUrl,
      secret: original.endpointSecret,
      enabledEvents: [original.eventType],
      status: 'active'
    };

    const replay = await this.options.repository.createDelivery({
      merchantId: original.merchantId,
      endpoint,
      event: original.payload,
      createdAt: now,
      maxAttempts: original.maxAttempts,
      replayOfDeliveryId: original.id,
      allowReplayDuplicate: true
    });

    if (replay.kind !== 'created') {
      throw new Error('Replay delivery creation was unexpectedly treated as duplicate.');
    }

    return { kind: 'created', deliveryId: replay.delivery.id };
  }

  private async deliverOne(delivery: WebhookDelivery, now: string): Promise<'delivered' | 'retrying' | 'failed' | 'skipped'> {
    if (delivery.status === WEBHOOK_DELIVERY_STATUSES.DELIVERED) {
      return 'delivered';
    }

    if (delivery.endpointStatus !== 'active') {
      await this.options.repository.markCancelled(delivery.id, 'webhook_endpoint_inactive', now);
      return 'failed';
    }

    assertSafePublicWebhookEvent(delivery.payload);
    if (this.options.idempotencyLedger) {
      const wrapped = await runWithWorkerIdempotency(
        this.options.idempotencyLedger,
        {
          serviceName: 'swimpay-job-worker',
          idempotencyKey: `webhook_delivery:${delivery.id}:attempt:${delivery.attemptCount + 1}`,
          eventType: delivery.eventType,
          eventId: delivery.eventId,
          now
        },
        () => this.deliverOneEffect(delivery, now)
      );
      return wrapped.kind === 'skipped' ? 'skipped' : wrapped.value;
    }

    return this.deliverOneEffect(delivery, now);
  }

  private async deliverOneEffect(delivery: WebhookDelivery, now: string): Promise<'delivered' | 'retrying' | 'failed'> {
    await this.options.repository.recordDeliveryAttempt(delivery.id, now);
    this.options.metrics?.increment(MetricNames.WEBHOOK_DELIVERY_ATTEMPTS_TOTAL);

    const body = stableStringify(delivery.payload);
    const signature = signWebhookPayload({
      secret: delivery.endpointSecret,
      timestamp: now,
      payload: body
    });

    try {
      const response = await this.options.httpClient.postJson({
        url: delivery.endpointUrl,
        headers: buildWebhookHeaders({
          eventId: delivery.eventId,
          deliveryId: delivery.id,
          timestamp: now,
          signature
        }),
        body,
        timeoutMs: this.requestTimeoutMs
      });

      if (response.status >= 200 && response.status < 300) {
        await this.options.repository.markDelivered(delivery.id, now, response.status);
        return 'delivered';
      }

      return this.scheduleFailure(delivery, now, buildDeliveryError(response), response.status);
    } catch (error) {
      return this.scheduleFailure(delivery, now, sanitizeNetworkError(error));
    }
  }

  private async scheduleFailure(
    delivery: WebhookDelivery,
    now: string,
    error: string,
    httpStatus?: number | undefined
  ): Promise<'retrying' | 'failed'> {
    const attemptedCount = delivery.attemptCount + 1;
    const maxAttempts = delivery.maxAttempts || this.maxAttempts;

    if (attemptedCount >= maxAttempts) {
      await this.options.repository.markDead(delivery.id, error, httpStatus);
      this.options.metrics?.increment(MetricNames.WEBHOOK_DELIVERIES_DEAD_TOTAL);
      return 'failed';
    }

    const nextAttempt = attemptedCount + 1;
    const delay = retryDelayForAttempt(nextAttempt);
    if (delay === undefined) {
      await this.options.repository.markDead(delivery.id, error, httpStatus);
      this.options.metrics?.increment(MetricNames.WEBHOOK_DELIVERIES_DEAD_TOTAL);
      return 'failed';
    }

    await this.options.repository.markFailed(delivery.id, new Date(Date.parse(now) + delay).toISOString(), error, httpStatus);
    return 'retrying';
  }

  private staleBefore(now: string): string {
    return new Date(Date.parse(now) - this.claimTimeoutMs).toISOString();
  }
}

export class FetchWebhookHttpClient implements WebhookHttpClient {
  public async postJson(params: { url: string; headers: Record<string, string>; body: string; timeoutMs: number }) {
    await assertPublicWebhookUrlEgressAllowed(params.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
    try {
      const response = await fetch(params.url, {
        method: 'POST',
        headers: params.headers,
        body: params.body,
        redirect: 'manual',
        signal: controller.signal
      });

      return {
        status: response.status,
        body: await response.text()
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class InMemoryWebhookRepository implements WebhookRepository {
  public readonly endpoints: WebhookEndpoint[] = [];
  public readonly deliveries: WebhookDelivery[] = [];
  public readonly auditEvents: WebhookAuditEvent[] = [];

  public constructor(private readonly idGenerator: { deliveryId: () => string; auditEventId?: () => string | undefined }) {}

  public async listActiveEndpoints(merchantId: string, eventType: PublicWebhookEventType): Promise<WebhookEndpoint[]> {
    if (!isPublicWebhookEventType(eventType)) {
      return [];
    }

    return this.endpoints.filter(
      (endpoint) =>
        endpoint.merchantId === merchantId &&
        endpoint.status === 'active' &&
        endpoint.enabledEvents.some((enabledEvent) => enabledEvent === eventType && isPublicWebhookEventType(enabledEvent))
    );
  }

  public async createDelivery(input: WebhookDeliveryCreateInput): Promise<WebhookDeliveryCreateResult> {
    assertSafePublicWebhookEvent(input.event);
    if (!input.allowReplayDuplicate) {
      const existing = this.deliveries.find(
        (delivery) => delivery.endpointId === input.endpoint.id && delivery.eventId === input.event.id
      );
      if (existing) {
        return { kind: 'duplicate_endpoint_event' };
      }
    }

    const payload = input.event;
    const delivery: WebhookDelivery = {
      id: this.idGenerator.deliveryId(),
      merchantId: input.merchantId,
      endpointId: input.endpoint.id,
      endpointUrl: input.endpoint.url,
      endpointSecret: input.endpoint.secret,
      endpointStatus: input.endpoint.status,
      eventId: input.event.id,
      eventType: input.event.type,
      payload,
      payloadHash: signPayloadHash(stableStringify(payload)),
      status: WEBHOOK_DELIVERY_STATUSES.PENDING,
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      nextRetryAt: input.createdAt,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      ...(input.replayOfDeliveryId ? { replayOfDeliveryId: input.replayOfDeliveryId } : {})
    };

    this.deliveries.push(delivery);
    this.addAuditEvent(
      input.replayOfDeliveryId ? WEBHOOK_AUDIT_EVENTS.REPLAYED : WEBHOOK_AUDIT_EVENTS.DELIVERY_REQUESTED,
      delivery,
      input.createdAt,
      {
        event_id: delivery.eventId,
        event_type: delivery.eventType,
        replay_of_delivery_id: input.replayOfDeliveryId
      }
    );
    return { kind: 'created', delivery };
  }

  public async claimDueDeliveries(now: string, limit: number, staleBefore?: string | undefined): Promise<WebhookDelivery[]> {
    this.recoverStaleDeliveries(now, staleBefore, () => true);
    const nowMs = Date.parse(now);
    return this.deliveries
      .filter((delivery) => isDeliveryClaimable(delivery, nowMs))
      .slice(0, limit)
      .map((delivery) => this.claim(delivery, now));
  }

  public async claimDeliveryById(deliveryId: string, now: string, staleBefore?: string | undefined): Promise<WebhookDelivery | null> {
    this.recoverStaleDeliveries(now, staleBefore, (delivery) => delivery.id === deliveryId);
    const delivery = this.deliveries.find((item) => item.id === deliveryId);
    if (!delivery || !isDeliveryClaimable(delivery, Date.parse(now))) {
      return null;
    }

    return this.claim(delivery, now);
  }

  public async claimDeliveriesByEventId(
    eventId: string,
    now: string,
    limit: number,
    staleBefore?: string | undefined
  ): Promise<WebhookDelivery[]> {
    this.recoverStaleDeliveries(now, staleBefore, (delivery) => delivery.eventId === eventId);
    const nowMs = Date.parse(now);
    return this.deliveries
      .filter((delivery) => delivery.eventId === eventId && isDeliveryClaimable(delivery, nowMs))
      .slice(0, limit)
      .map((delivery) => this.claim(delivery, now));
  }

  public async recordDeliveryAttempt(deliveryId: string, attemptedAt: string): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    this.addAuditEvent(WEBHOOK_AUDIT_EVENTS.DELIVERY_ATTEMPTED, delivery, attemptedAt, {
      event_id: delivery.eventId,
      event_type: delivery.eventType,
      attempt_number: delivery.attemptCount + 1
    });
  }

  public async markDelivered(deliveryId: string, deliveredAt: string, httpStatus: number): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    if (delivery.status === WEBHOOK_DELIVERY_STATUSES.DELIVERED) {
      return;
    }

    delivery.status = WEBHOOK_DELIVERY_STATUSES.DELIVERED;
    delivery.attemptCount += 1;
    delivery.deliveredAt = deliveredAt;
    delivery.updatedAt = deliveredAt;
    delivery.lastHttpStatus = httpStatus;
    delivery.nextRetryAt = undefined;
    delivery.lastError = undefined;
    this.addAuditEvent(WEBHOOK_AUDIT_EVENTS.DELIVERED, delivery, deliveredAt, {
      event_id: delivery.eventId,
      http_status: httpStatus,
      attempt_count: delivery.attemptCount
    });
  }

  public async markFailed(
    deliveryId: string,
    nextRetryAt: string,
    lastError: string,
    httpStatus?: number | undefined
  ): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    delivery.status = WEBHOOK_DELIVERY_STATUSES.FAILED;
    delivery.attemptCount += 1;
    delivery.nextRetryAt = nextRetryAt;
    delivery.lastError = lastError;
    delivery.updatedAt = nextRetryAt;
    delivery.lastHttpStatus = httpStatus;
    this.addAuditEvent(WEBHOOK_AUDIT_EVENTS.FAILED, delivery, nextRetryAt, {
      event_id: delivery.eventId,
      retry_at: nextRetryAt,
      error: lastError,
      http_status: httpStatus,
      attempt_count: delivery.attemptCount
    });
  }

  public async markDead(deliveryId: string, lastError: string, httpStatus?: number | undefined): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    delivery.status = WEBHOOK_DELIVERY_STATUSES.DEAD;
    delivery.attemptCount += 1;
    delivery.nextRetryAt = undefined;
    delivery.lastError = lastError;
    delivery.updatedAt = new Date().toISOString();
    delivery.lastHttpStatus = httpStatus;
    this.addAuditEvent(WEBHOOK_AUDIT_EVENTS.DEAD, delivery, delivery.updatedAt, {
      event_id: delivery.eventId,
      error: lastError,
      http_status: httpStatus,
      attempt_count: delivery.attemptCount
    });
  }

  public async markCancelled(deliveryId: string, reason: string, cancelledAt: string): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    delivery.status = WEBHOOK_DELIVERY_STATUSES.CANCELLED;
    delivery.nextRetryAt = undefined;
    delivery.lastError = reason;
    delivery.updatedAt = cancelledAt;
  }

  public async getDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    return this.deliveries.find((delivery) => delivery.id === deliveryId) ?? null;
  }

  private claim(delivery: WebhookDelivery, now: string): WebhookDelivery {
    delivery.status = WEBHOOK_DELIVERY_STATUSES.DELIVERING;
    delivery.updatedAt = now;
    return { ...delivery };
  }

  private recoverStaleDeliveries(
    now: string,
    staleBefore: string | undefined,
    matchesScope: (delivery: WebhookDelivery) => boolean
  ): void {
    if (!staleBefore) {
      return;
    }

    const staleBeforeMs = Date.parse(staleBefore);
    for (const delivery of this.deliveries) {
      if (!matchesScope(delivery) || !isStaleDelivering(delivery, staleBeforeMs)) {
        continue;
      }

      this.recoverStaleDelivery(delivery, now);
    }
  }

  private recoverStaleDelivery(delivery: WebhookDelivery, now: string): void {
    const recoveredAttemptCount = Math.min(delivery.attemptCount + 1, delivery.maxAttempts);
    const nextAttempt = recoveredAttemptCount + 1;
    const delay = retryDelayForAttempt(nextAttempt);

    delivery.attemptCount = recoveredAttemptCount;
    delivery.lastError = STALE_DELIVERY_RECOVERY_ERROR;
    delivery.lastHttpStatus = undefined;

    if (recoveredAttemptCount >= delivery.maxAttempts || delay === undefined) {
      delivery.status = WEBHOOK_DELIVERY_STATUSES.DEAD;
      delivery.nextRetryAt = undefined;
      delivery.updatedAt = now;
      this.addAuditEvent(WEBHOOK_AUDIT_EVENTS.DEAD, delivery, now, {
        event_id: delivery.eventId,
        error: STALE_DELIVERY_RECOVERY_ERROR,
        attempt_count: delivery.attemptCount
      });
      return;
    }

    const retryAt = new Date(Date.parse(delivery.updatedAt) + delay).toISOString();
    delivery.status = WEBHOOK_DELIVERY_STATUSES.FAILED;
    delivery.nextRetryAt = retryAt;
    delivery.updatedAt = now;
    this.addAuditEvent(WEBHOOK_AUDIT_EVENTS.FAILED, delivery, now, {
      event_id: delivery.eventId,
      retry_at: retryAt,
      error: STALE_DELIVERY_RECOVERY_ERROR,
      attempt_count: delivery.attemptCount
    });
  }

  private requireDelivery(deliveryId: string): WebhookDelivery {
    const delivery = this.deliveries.find((item) => item.id === deliveryId);
    if (!delivery) {
      throw new Error(`Webhook delivery ${deliveryId} was not found.`);
    }

    return delivery;
  }

  private addAuditEvent(eventType: string, delivery: WebhookDelivery, createdAt: string, payloadRedacted: Record<string, unknown>): void {
    this.auditEvents.push({
      id: this.idGenerator.auditEventId?.() ?? `aud_${this.auditEvents.length + 1}`,
      merchantId: delivery.merchantId,
      eventType,
      objectType: 'webhook_delivery',
      objectId: delivery.id,
      payloadRedacted: stripUndefined(payloadRedacted),
      createdAt
    });
  }
}

export class PgWebhookRepository implements WebhookRepository {
  private readonly pool: pg.Pool;
  private readonly secretEncryptionKey: string;

  public constructor(connectionString: string, secretEncryptionKey = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY ?? 'local_dev_webhook_secret_encryption_key') {
    this.pool = new Pool({ connectionString, max: 4 });
    this.secretEncryptionKey = secretEncryptionKey;
  }

  public async listActiveEndpoints(merchantId: string, eventType: PublicWebhookEventType): Promise<WebhookEndpoint[]> {
    if (!isPublicWebhookEventType(eventType)) {
      return [];
    }

    const result = await this.pool.query(
      `SELECT id, merchant_id, url, secret_hash, secret_encrypted, enabled_events, status
       FROM webhook_endpoints
       WHERE merchant_id = $1
         AND status = 'active'
         AND enabled_events ? $2`,
      [merchantId, eventType]
    );

    return result.rows.map((row) => toEndpoint(row as WebhookEndpointRow, this.secretEncryptionKey));
  }

  public async createDelivery(input: WebhookDeliveryCreateInput): Promise<WebhookDeliveryCreateResult> {
    assertSafePublicWebhookEvent(input.event);
    const payload = stableStringify(input.event);
    const deliveryId = randomUUID();
    const replayOfDeliveryId = input.replayOfDeliveryId ?? null;
    const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    try {
      const result = await this.pool.query(
        `INSERT INTO webhook_deliveries (
          id, merchant_id, endpoint_id, event_id, event_type, payload_hash, payload_json,
          status, attempt_count, max_attempts, next_retry_at, created_at, updated_at, replay_of_delivery_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'pending', 0, $8, $9, $9, $9, $10)
        RETURNING *`,
        [
          deliveryId,
          input.merchantId,
          input.endpoint.id,
          input.event.id,
          input.event.type,
          signPayloadHash(payload),
          payload,
          maxAttempts,
          input.createdAt,
          replayOfDeliveryId
        ]
      );

      const delivery = toDelivery(result.rows[0] as WebhookDeliveryRow, input.endpoint);
      await this.insertAuditEvent(
        replayOfDeliveryId ? WEBHOOK_AUDIT_EVENTS.REPLAYED : WEBHOOK_AUDIT_EVENTS.DELIVERY_REQUESTED,
        delivery,
        input.createdAt,
        { event_id: delivery.eventId, event_type: delivery.eventType, replay_of_delivery_id: replayOfDeliveryId }
      );
      return { kind: 'created', delivery };
    } catch (error) {
      if (!input.allowReplayDuplicate && isUniqueViolation(error)) {
        return { kind: 'duplicate_endpoint_event' };
      }

      throw error;
    }
  }

  public async claimDueDeliveries(now: string, limit: number, staleBefore?: string | undefined): Promise<WebhookDelivery[]> {
    await this.recoverStaleDeliveries('TRUE', [], now, staleBefore, limit);
    return this.claimByWhere(
      `d.status IN ('pending', 'failed')
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= $1::timestamptz)
       AND d.attempt_count < d.max_attempts`,
      [now],
      now,
      limit
    );
  }

  public async claimDeliveryById(deliveryId: string, now: string, staleBefore?: string | undefined): Promise<WebhookDelivery | null> {
    await this.recoverStaleDeliveries('d.id = $1', [deliveryId], now, staleBefore, 1);
    const deliveries = await this.claimByWhere(
      `d.id = $2
       AND d.status IN ('pending', 'failed')
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= $1::timestamptz)
       AND d.attempt_count < d.max_attempts`,
      [now, deliveryId],
      now,
      1
    );
    return deliveries[0] ?? null;
  }

  public async claimDeliveriesByEventId(
    eventId: string,
    now: string,
    limit: number,
    staleBefore?: string | undefined
  ): Promise<WebhookDelivery[]> {
    await this.recoverStaleDeliveries('d.event_id = $1', [eventId], now, staleBefore, limit);
    return this.claimByWhere(
      `d.event_id = $2
       AND d.status IN ('pending', 'failed')
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= $1::timestamptz)
       AND d.attempt_count < d.max_attempts`,
      [now, eventId],
      now,
      limit
    );
  }

  public async recordDeliveryAttempt(deliveryId: string, attemptedAt: string): Promise<void> {
    const delivery = await this.getDelivery(deliveryId);
    if (!delivery) {
      throw new Error(`Webhook delivery ${deliveryId} was not found.`);
    }

    await this.insertAuditEvent(WEBHOOK_AUDIT_EVENTS.DELIVERY_ATTEMPTED, delivery, attemptedAt, {
      event_id: delivery.eventId,
      event_type: delivery.eventType,
      attempt_number: delivery.attemptCount + 1
    });
  }

  public async markDelivered(deliveryId: string, deliveredAt: string, httpStatus: number): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = 'delivered',
           attempt_count = attempt_count + CASE WHEN status <> 'delivered' THEN 1 ELSE 0 END,
           delivered_at = COALESCE(delivered_at, $2::timestamptz),
           updated_at = $2::timestamptz,
           next_retry_at = NULL,
           last_error = NULL,
           last_http_status = $3
       WHERE id = $1`,
      [deliveryId, deliveredAt, httpStatus]
    );
    const delivery = await this.getDelivery(deliveryId);
    if (delivery) {
      await this.insertAuditEvent(WEBHOOK_AUDIT_EVENTS.DELIVERED, delivery, deliveredAt, {
        event_id: delivery.eventId,
        http_status: httpStatus,
        attempt_count: delivery.attemptCount
      });
    }
  }

  public async markFailed(
    deliveryId: string,
    nextRetryAt: string,
    lastError: string,
    httpStatus?: number | undefined
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = 'failed',
           attempt_count = attempt_count + 1,
           next_retry_at = $2::timestamptz,
           last_error = $3,
           last_http_status = $4,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [deliveryId, nextRetryAt, lastError, httpStatus ?? null]
    );
    const delivery = await this.hydrateDelivery(result.rows[0] as WebhookDeliveryRow | undefined);
    if (delivery) {
      await this.insertAuditEvent(WEBHOOK_AUDIT_EVENTS.FAILED, delivery, new Date().toISOString(), {
        event_id: delivery.eventId,
        retry_at: nextRetryAt,
        error: lastError,
        http_status: httpStatus,
        attempt_count: delivery.attemptCount
      });
    }
  }

  public async markDead(deliveryId: string, lastError: string, httpStatus?: number | undefined): Promise<void> {
    const result = await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = 'dead',
           attempt_count = attempt_count + 1,
           next_retry_at = NULL,
           last_error = $2,
           last_http_status = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [deliveryId, lastError, httpStatus ?? null]
    );
    const delivery = await this.hydrateDelivery(result.rows[0] as WebhookDeliveryRow | undefined);
    if (delivery) {
      await this.insertAuditEvent(WEBHOOK_AUDIT_EVENTS.DEAD, delivery, new Date().toISOString(), {
        event_id: delivery.eventId,
        error: lastError,
        http_status: httpStatus,
        attempt_count: delivery.attemptCount
      });
    }
  }

  public async markCancelled(deliveryId: string, reason: string, cancelledAt: string): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = 'cancelled', next_retry_at = NULL, last_error = $2, updated_at = $3::timestamptz
       WHERE id = $1`,
      [deliveryId, reason, cancelledAt]
    );
  }

  public async getDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    const result = await this.pool.query(
      `SELECT d.*, e.url, e.secret_hash, e.secret_encrypted, e.enabled_events, e.status AS endpoint_status
       FROM webhook_deliveries d
       JOIN webhook_endpoints e ON e.id = d.endpoint_id
       WHERE d.id = $1`,
      [deliveryId]
    );
    return this.hydrateDelivery(result.rows[0] as WebhookDeliveryRow | undefined);
  }

  private async claimByWhere(whereSql: string, values: unknown[], now: string, limit: number): Promise<WebhookDelivery[]> {
    const limitParam = values.length + 1;
    const nowParam = values.length + 2;
    const result = await this.pool.query(
      `WITH due AS (
         SELECT d.id
         FROM webhook_deliveries d
         JOIN webhook_endpoints e ON e.id = d.endpoint_id
         WHERE ${whereSql}
         ORDER BY COALESCE(d.next_retry_at, d.created_at), d.created_at
         LIMIT $${limitParam}
         FOR UPDATE SKIP LOCKED
       )
       UPDATE webhook_deliveries d
       SET status = 'delivering', updated_at = $${nowParam}::timestamptz
       FROM due
       WHERE d.id = due.id
       RETURNING d.*`,
      [...values, limit, now]
    );

    const deliveries: WebhookDelivery[] = [];
    for (const row of result.rows as WebhookDeliveryRow[]) {
      const delivery = await this.hydrateDelivery(row);
      if (delivery) {
        deliveries.push(delivery);
      }
    }

    return deliveries;
  }

  private async recoverStaleDeliveries(
    scopeSql: string,
    values: unknown[],
    now: string,
    staleBefore: string | undefined,
    limit: number
  ): Promise<void> {
    if (!staleBefore) {
      return;
    }

    const staleBeforeParam = values.length + 1;
    const limitParam = values.length + 2;
    const nowParam = values.length + 3;
    const errorParam = values.length + 4;
    const retryDelaySql = buildRetryDelayIntervalSql('LEAST(d.attempt_count + 1, d.max_attempts) + 1');
    const result = await this.pool.query(
      `WITH stale AS (
         SELECT d.id,
                LEAST(d.attempt_count + 1, d.max_attempts) AS recovered_attempt_count,
                ${retryDelaySql} AS retry_delay
         FROM webhook_deliveries d
         JOIN webhook_endpoints e ON e.id = d.endpoint_id
         WHERE ${scopeSql}
           AND d.status = 'delivering'
           AND d.updated_at <= $${staleBeforeParam}::timestamptz
         ORDER BY d.updated_at, d.created_at
         LIMIT $${limitParam}
         FOR UPDATE SKIP LOCKED
       )
       UPDATE webhook_deliveries d
       SET status = CASE
             WHEN stale.recovered_attempt_count >= d.max_attempts OR stale.retry_delay IS NULL THEN 'dead'
             ELSE 'failed'
           END,
           attempt_count = stale.recovered_attempt_count,
           next_retry_at = CASE
             WHEN stale.recovered_attempt_count >= d.max_attempts OR stale.retry_delay IS NULL THEN NULL
             ELSE d.updated_at + stale.retry_delay
           END,
           last_error = $${errorParam},
           last_http_status = NULL,
           updated_at = $${nowParam}::timestamptz
       FROM stale
       WHERE d.id = stale.id
       RETURNING d.*`,
      [...values, staleBefore, limit, now, STALE_DELIVERY_RECOVERY_ERROR]
    );

    for (const row of result.rows as WebhookDeliveryRow[]) {
      const delivery = await this.hydrateDelivery(row);
      if (!delivery) {
        continue;
      }

      if (delivery.status === WEBHOOK_DELIVERY_STATUSES.DEAD) {
        await this.insertAuditEvent(WEBHOOK_AUDIT_EVENTS.DEAD, delivery, now, {
          event_id: delivery.eventId,
          error: STALE_DELIVERY_RECOVERY_ERROR,
          attempt_count: delivery.attemptCount
        });
      } else {
        await this.insertAuditEvent(WEBHOOK_AUDIT_EVENTS.FAILED, delivery, now, {
          event_id: delivery.eventId,
          retry_at: delivery.nextRetryAt,
          error: STALE_DELIVERY_RECOVERY_ERROR,
          attempt_count: delivery.attemptCount
        });
      }
    }
  }

  private async hydrateDelivery(row: WebhookDeliveryRow | undefined): Promise<WebhookDelivery | null> {
    if (!row) {
      return null;
    }

    if (row.url && row.secret_hash && row.endpoint_status) {
      return toDelivery(row, toEndpoint(row as WebhookEndpointRow, this.secretEncryptionKey));
    }

    const endpointResult = await this.pool.query(
      `SELECT id, merchant_id, url, secret_hash, secret_encrypted, enabled_events, status
       FROM webhook_endpoints
       WHERE id = $1`,
      [row.endpoint_id]
    );
    const endpoint = toEndpoint(endpointResult.rows[0] as WebhookEndpointRow, this.secretEncryptionKey);
    return toDelivery(row, endpoint);
  }

  private async insertAuditEvent(
    eventType: string,
    delivery: WebhookDelivery,
    createdAt: string,
    payloadRedacted: Record<string, unknown>
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_events (
        id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, 'webhook_delivery', $3, 'system', $4::jsonb, $5::timestamptz)`,
      [delivery.merchantId, eventType, delivery.id, JSON.stringify(stripUndefined(payloadRedacted)), createdAt]
    );
  }
}

export function createPaymentWebhookEvent<TData extends Record<string, unknown>>(params: {
  eventId: string;
  type: PublicWebhookEventType;
  createdAt: string;
  merchantId: string;
  data: TData;
  includeSignalDisclosure?: boolean;
}): PublicWebhookEvent<TData> {
  assertPublicWebhookEventType(params.type);
  if (containsRawPiiMarker(params.data)) {
    throw new Error('Webhook event data must not contain raw PII fields.');
  }

  const disclosure =
    (params.includeSignalDisclosure ?? true)
      ? PUBLIC_EVENT_SIGNAL_DISCLOSURE
      : { official_bank_confirmation: false as const };

  return {
    id: params.eventId,
    type: params.type,
    created_at: params.createdAt,
    merchant_id: params.merchantId,
    data: {
      ...params.data,
      ...disclosure
    } as TData & typeof PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

export function retryDelayForAttempt(attemptNumber: number): number | undefined {
  return WEBHOOK_RETRY_DELAYS_MS[attemptNumber - 1];
}

export function signWebhookPayload(params: { secret: string; timestamp: string; payload: string }): string {
  return `sha256=${createHmac('sha256', params.secret)
    .update(`${params.timestamp}.${params.payload}`)
    .digest('hex')}`;
}

export function verifyWebhookSignature(params: {
  secret: string;
  timestamp: string;
  payload: string;
  signature: string;
}): boolean {
  const expected = signWebhookPayload(params);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(params.signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function buildWebhookHeaders(params: {
  eventId: string;
  deliveryId: string;
  timestamp: string;
  signature: string;
}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'SwimPay-Event-Id': params.eventId,
    'SwimPay-Delivery-Id': params.deliveryId,
    'SwimPay-Timestamp': params.timestamp,
    'SwimPay-Signature': params.signature
  };
}

function isDeliveryClaimable(delivery: WebhookDelivery, nowMs: number): boolean {
  if (delivery.status !== WEBHOOK_DELIVERY_STATUSES.PENDING && delivery.status !== WEBHOOK_DELIVERY_STATUSES.FAILED) {
    return false;
  }

  if (delivery.attemptCount >= delivery.maxAttempts) {
    return false;
  }

  return !delivery.nextRetryAt || Date.parse(delivery.nextRetryAt) <= nowMs;
}

function isStaleDelivering(delivery: WebhookDelivery, staleBeforeMs: number): boolean {
  return delivery.status === WEBHOOK_DELIVERY_STATUSES.DELIVERING && Date.parse(delivery.updatedAt) <= staleBeforeMs;
}

function buildRetryDelayIntervalSql(attemptNumberExpression: string): string {
  const cases = WEBHOOK_RETRY_DELAYS_MS.map((delayMs, index) => {
    const attemptNumber = index + 1;
    const delaySeconds = Math.trunc(delayMs / 1000);
    return `WHEN ${attemptNumber} THEN INTERVAL '${delaySeconds} seconds'`;
  }).join(' ');

  return `CASE ${attemptNumberExpression} ${cases} ELSE NULL END`;
}

function assertSafePublicWebhookEvent(event: PublicWebhookEvent): void {
  assertPublicWebhookEventType(event.type);
  if (containsRawPiiMarker(event.data)) {
    throw new Error('Webhook event data must not contain raw PII fields.');
  }
}

function assertPublicWebhookEventType(eventType: string): asserts eventType is PublicWebhookEventType {
  if (!isPublicWebhookEventType(eventType)) {
    throw new Error('Unsupported public webhook event type.');
  }
}

function isPublicWebhookEventType(eventType: string): eventType is PublicWebhookEventType {
  return PUBLIC_WEBHOOK_EVENT_TYPES.has(eventType);
}

function signPayloadHash(payload: string): string {
  return createHmac('sha256', 'swimpay_payload_hash_v1').update(payload).digest('hex');
}

function buildDeliveryError(response: { status: number; body?: string | undefined }): string {
  const body = sanitizeErrorMessage(response.body);
  return body ? `HTTP ${response.status}: ${body}` : `HTTP ${response.status}`;
}

function sanitizeNetworkError(error: unknown): string {
  return `Network error: ${error instanceof Error ? error.name : 'UnknownError'}`;
}

function sanitizeErrorMessage(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 160 ? `${cleaned.slice(0, 160)}...` : cleaned;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function containsRawPiiMarker(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsRawPiiMarker(item));
  }

  if (!isRecord(value)) {
    return false;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      /raw[_-]?(notification|text|phone|card)|notification_raw|phone_raw|raw_phone|buyer_phone$|receiver_(phone|card|identifier(?!_masked))|card_(number|pan)|cardNumber|cardPan|full_card|^pan$|cvv|cvc|expiry|expiration|pin|sms_code/iu.test(
        key
      )
    ) {
      return true;
    }

    if (containsRawPiiMarker(nestedValue)) {
      return true;
    }
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === '23505';
}

interface WebhookEndpointRow {
  id: string;
  merchant_id: string;
  url: string;
  secret_hash: string;
  secret_encrypted?: string | null | undefined;
  enabled_events: PublicWebhookEventType[];
  status: WebhookEndpoint['status'];
  endpoint_status?: WebhookEndpoint['status'] | undefined;
}

interface WebhookDeliveryRow {
  id: string;
  merchant_id: string;
  endpoint_id: string;
  event_id: string;
  event_type: PublicWebhookEventType;
  payload_hash: string;
  payload_json?: PublicWebhookEvent | string | undefined;
  status: WebhookDeliveryStatus;
  attempt_count: number;
  max_attempts?: number | undefined;
  next_retry_at?: Date | string | null | undefined;
  last_error?: string | null | undefined;
  last_http_status?: number | null | undefined;
  created_at: Date | string;
  delivered_at?: Date | string | null | undefined;
  updated_at?: Date | string | undefined;
  replay_of_delivery_id?: string | null | undefined;
  url?: string | undefined;
  secret_hash?: string | undefined;
  secret_encrypted?: string | null | undefined;
  enabled_events?: PublicWebhookEventType[] | undefined;
  endpoint_status?: WebhookEndpoint['status'] | undefined;
}

function toEndpoint(row: WebhookEndpointRow, secretEncryptionKey?: string): WebhookEndpoint {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    url: row.url,
    secret: row.secret_encrypted ? decryptSecret(row.secret_encrypted, secretEncryptionKey ?? '') : row.secret_hash,
    enabledEvents: Array.isArray(row.enabled_events) ? row.enabled_events : [],
    status: row.endpoint_status ?? row.status
  };
}

function toDelivery(row: WebhookDeliveryRow, endpoint: WebhookEndpoint): WebhookDelivery {
  const payload = parsePayload(row.payload_json);
  return {
    id: row.id,
    merchantId: row.merchant_id,
    endpointId: row.endpoint_id,
    endpointUrl: endpoint.url,
    endpointSecret: endpoint.secret,
    endpointStatus: endpoint.status,
    eventId: row.event_id,
    eventType: row.event_type,
    payload,
    payloadHash: row.payload_hash,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts ?? DEFAULT_MAX_ATTEMPTS,
    nextRetryAt: toOptionalIso(row.next_retry_at),
    lastError: row.last_error ?? undefined,
    lastHttpStatus: row.last_http_status ?? undefined,
    createdAt: toIso(row.created_at),
    deliveredAt: toOptionalIso(row.delivered_at),
    updatedAt: toIso(row.updated_at ?? row.created_at),
    replayOfDeliveryId: row.replay_of_delivery_id ?? undefined
  };
}

function parsePayload(value: PublicWebhookEvent | string | undefined): PublicWebhookEvent {
  if (!value) {
    throw new Error('Webhook delivery payload_json is required.');
  }

  return typeof value === 'string' ? (JSON.parse(value) as PublicWebhookEvent) : value;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toOptionalIso(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return toIso(value);
}
