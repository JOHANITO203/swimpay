import { createHmac, timingSafeEqual } from 'node:crypto';
import { PUBLIC_EVENT_SIGNAL_DISCLOSURE } from '@swimpay/events';

export type PublicWebhookEventType =
  | 'payment.signal_detected'
  | 'payment.confirmed'
  | 'payment.needs_review'
  | 'payment.rejected'
  | 'order.expired';

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying' | 'cancelled';

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
  status: 'active' | 'disabled';
}

export interface WebhookDelivery {
  id: string;
  merchantId: string;
  endpointId: string;
  endpointUrl: string;
  endpointSecret: string;
  eventId: string;
  eventType: PublicWebhookEventType;
  payload: PublicWebhookEvent;
  payloadHash: string;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  nextRetryAt?: string | undefined;
  lastError?: string | undefined;
  createdAt: string;
  deliveredAt?: string | undefined;
  replayOfDeliveryId?: string | undefined;
}

export interface WebhookDeliveryCreateInput {
  merchantId: string;
  endpoint: WebhookEndpoint;
  event: PublicWebhookEvent;
  createdAt: string;
  replayOfDeliveryId?: string | undefined;
  allowReplayDuplicate?: boolean | undefined;
}

export type WebhookDeliveryCreateResult =
  | { kind: 'created'; delivery: WebhookDelivery }
  | { kind: 'duplicate_endpoint_event' };

export interface WebhookRepository {
  listActiveEndpoints(merchantId: string, eventType: PublicWebhookEventType): Promise<WebhookEndpoint[]>;
  createDelivery(input: WebhookDeliveryCreateInput): Promise<WebhookDeliveryCreateResult>;
  listDueDeliveries(now: string): Promise<WebhookDelivery[]>;
  markDelivered(deliveryId: string, deliveredAt: string): Promise<void>;
  markRetrying(deliveryId: string, nextRetryAt: string, lastError: string): Promise<void>;
  markFailed(deliveryId: string, lastError: string): Promise<void>;
  getDelivery(deliveryId: string): Promise<WebhookDelivery | null>;
}

export interface WebhookHttpClient {
  postJson(params: {
    url: string;
    headers: Record<string, string>;
    body: string;
  }): Promise<{ status: number; body?: string | undefined }>;
}

export interface WebhookDeliveryWorkerOptions {
  repository: WebhookRepository;
  httpClient: WebhookHttpClient;
}

export const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000
] as const;

export class WebhookDeliveryWorker {
  public constructor(private readonly options: WebhookDeliveryWorkerOptions) {}

  public async enqueueEvent(event: PublicWebhookEvent): Promise<{ created: number; skippedDuplicates: number }> {
    const endpoints = await this.options.repository.listActiveEndpoints(event.merchant_id, event.type);
    let created = 0;
    let skippedDuplicates = 0;

    for (const endpoint of endpoints) {
      const result = await this.options.repository.createDelivery({
        merchantId: event.merchant_id,
        endpoint,
        event,
        createdAt: event.created_at
      });

      if (result.kind === 'created') {
        created += 1;
      } else {
        skippedDuplicates += 1;
      }
    }

    return { created, skippedDuplicates };
  }

  public async deliverDue(now: string): Promise<{ delivered: number; retrying: number; failed: number }> {
    const deliveries = await this.options.repository.listDueDeliveries(now);
    let delivered = 0;
    let retrying = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      const body = stableStringify(delivery.payload);
      const signature = signWebhookPayload({
        secret: delivery.endpointSecret,
        timestamp: now,
        payload: body
      });
      const response = await this.options.httpClient.postJson({
        url: delivery.endpointUrl,
        headers: buildWebhookHeaders({
          eventId: delivery.eventId,
          timestamp: now,
          signature
        }),
        body
      });

      if (response.status >= 200 && response.status < 300) {
        await this.options.repository.markDelivered(delivery.id, now);
        delivered += 1;
        continue;
      }

      const error = buildDeliveryError(response);
      const nextAttemptCount = delivery.attemptCount + 1;
      const retryDelay = RETRY_DELAYS_MS[nextAttemptCount - 1];
      if (retryDelay === undefined) {
        await this.options.repository.markFailed(delivery.id, error);
        failed += 1;
        continue;
      }

      await this.options.repository.markRetrying(delivery.id, new Date(Date.parse(now) + retryDelay).toISOString(), error);
      retrying += 1;
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
      replayOfDeliveryId: original.id,
      allowReplayDuplicate: true
    });

    if (replay.kind !== 'created') {
      throw new Error('Replay delivery creation was unexpectedly treated as duplicate.');
    }

    return { kind: 'created', deliveryId: replay.delivery.id };
  }
}

export class FetchWebhookHttpClient implements WebhookHttpClient {
  public async postJson(params: { url: string; headers: Record<string, string>; body: string }) {
    const response = await fetch(params.url, {
      method: 'POST',
      headers: params.headers,
      body: params.body
    });

    return {
      status: response.status,
      body: await response.text()
    };
  }
}

export class InMemoryWebhookRepository implements WebhookRepository {
  public readonly endpoints: WebhookEndpoint[] = [];
  public readonly deliveries: WebhookDelivery[] = [];

  public constructor(private readonly idGenerator: { deliveryId: () => string }) {}

  public async listActiveEndpoints(merchantId: string, eventType: PublicWebhookEventType): Promise<WebhookEndpoint[]> {
    return this.endpoints.filter(
      (endpoint) =>
        endpoint.merchantId === merchantId && endpoint.status === 'active' && endpoint.enabledEvents.includes(eventType)
    );
  }

  public async createDelivery(input: WebhookDeliveryCreateInput): Promise<WebhookDeliveryCreateResult> {
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
      eventId: input.event.id,
      eventType: input.event.type,
      payload,
      payloadHash: signPayloadHash(stableStringify(payload)),
      status: 'pending',
      attemptCount: 0,
      nextRetryAt: input.createdAt,
      createdAt: input.createdAt,
      replayOfDeliveryId: input.replayOfDeliveryId
    };

    this.deliveries.push(delivery);
    return { kind: 'created', delivery };
  }

  public async listDueDeliveries(now: string): Promise<WebhookDelivery[]> {
    const nowMs = Date.parse(now);
    return this.deliveries.filter((delivery) => {
      if (delivery.status !== 'pending' && delivery.status !== 'retrying') {
        return false;
      }

      return !delivery.nextRetryAt || Date.parse(delivery.nextRetryAt) <= nowMs;
    });
  }

  public async markDelivered(deliveryId: string, deliveredAt: string): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    delivery.status = 'delivered';
    delivery.attemptCount += 1;
    delivery.deliveredAt = deliveredAt;
    delivery.nextRetryAt = undefined;
    delivery.lastError = undefined;
  }

  public async markRetrying(deliveryId: string, nextRetryAt: string, lastError: string): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    delivery.status = 'retrying';
    delivery.attemptCount += 1;
    delivery.nextRetryAt = nextRetryAt;
    delivery.lastError = lastError;
  }

  public async markFailed(deliveryId: string, lastError: string): Promise<void> {
    const delivery = this.requireDelivery(deliveryId);
    delivery.status = 'failed';
    delivery.attemptCount += 1;
    delivery.nextRetryAt = undefined;
    delivery.lastError = lastError;
  }

  public async getDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    return this.deliveries.find((delivery) => delivery.id === deliveryId) ?? null;
  }

  private requireDelivery(deliveryId: string): WebhookDelivery {
    const delivery = this.deliveries.find((item) => item.id === deliveryId);
    if (!delivery) {
      throw new Error(`Webhook delivery ${deliveryId} was not found.`);
    }

    return delivery;
  }
}

export function createPaymentWebhookEvent<TData extends Record<string, unknown>>(params: {
  eventId: string;
  type: PublicWebhookEventType;
  createdAt: string;
  merchantId: string;
  data: TData;
}): PublicWebhookEvent<TData> {
  return {
    id: params.eventId,
    type: params.type,
    created_at: params.createdAt,
    merchant_id: params.merchantId,
    data: {
      ...params.data,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    }
  };
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
  timestamp: string;
  signature: string;
}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'SwimPay-Event-Id': params.eventId,
    'SwimPay-Timestamp': params.timestamp,
    'SwimPay-Signature': params.signature
  };
}

function signPayloadHash(payload: string): string {
  return createHmac('sha256', 'swimpay_payload_hash_v1').update(payload).digest('hex');
}

function buildDeliveryError(response: { status: number; body?: string | undefined }): string {
  const body = response.body?.trim();
  return body ? `HTTP ${response.status}: ${body}` : `HTTP ${response.status}`;
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
