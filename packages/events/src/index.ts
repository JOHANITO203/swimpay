import {
  RetentionPolicy,
  StorageType,
  connect,
  consumerOpts,
  StringCodec,
  type JetStreamClient,
  type JetStreamSubscription,
  type NatsConnection
} from 'nats';
import { MetricNames, type MetricsRegistry } from '@swimpay/observability';

export const EventTypes = {
  ORDER_CREATED: 'order.created',
  ORDER_EXPIRED: 'order.expired',
  ORDER_REJECTED: 'order.rejected',
  PAYMENT_SESSION_CREATED: 'payment_session.created',
  PAYMENT_SESSION_EXPIRED: 'payment_session.expired',
  PAYMENT_SESSION_REJECTED: 'payment_session.rejected',
  PAYMENT_SESSION_RECEIVER_ARMING_REQUESTED: 'payment_session.receiver_arming_requested',
  PAYMENT_SESSION_RECEIVER_ARMED: 'payment_session.receiver_armed',
  RECEIVER_HEARTBEAT_RECEIVED: 'receiver.heartbeat_received',
  RECEIVER_HEALTH_DEGRADED: 'receiver.health_degraded',
  SIGNAL_RECEIVED: 'signal.received',
  SIGNAL_VERIFIED: 'signal.verified',
  SIGNAL_PARSED: 'signal.parsed',
  SIGNAL_REJECTED: 'signal.rejected',
  SIGNAL_QUALITY_SCORED: 'signal.quality_scored',
  TEMPLATE_OBSERVED: 'template.observed',
  TEMPLATE_DRIFT_DETECTED: 'template.drift_detected',
  MATCH_CANDIDATES_FOUND: 'match.candidates_found',
  MATCH_COLLISION_DETECTED: 'match.collision_detected',
  MATCH_SCORED: 'match.scored',
  DECISION_AUTO_CONFIRMED: 'decision.auto_confirmed',
  DECISION_NEEDS_REVIEW: 'decision.needs_review',
  DECISION_REJECTED: 'decision.rejected',
  REVIEW_CREATED: 'review.created',
  REVIEW_CONFIRMED: 'review.confirmed',
  REVIEW_REJECTED: 'review.rejected',
  WEBHOOK_DELIVERY_REQUESTED: 'webhook.delivery_requested',
  WEBHOOK_DELIVERED: 'webhook.delivered',
  WEBHOOK_FAILED: 'webhook.failed',
  WEBHOOK_DEAD: 'webhook.dead'
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

const EVENT_TYPE_VALUES = new Set<string>(Object.values(EventTypes));

export interface InternalEventEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: EventType;
  created_at: string;
  source: string;
  data: TData;
  metadata?: {
    correlation_id?: string | undefined;
    causation_id?: string | undefined;
  } | undefined;
}

export interface EventEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  version: 1;
  occurredAt: string;
  merchantId?: string;
  idempotencyKey: string;
  data: TData;
}

export const PUBLIC_EVENT_SIGNAL_DISCLOSURE = {
  confirmation_type: 'notification_signal',
  official_bank_confirmation: false
} as const;

export const SWIMPAY_EVENTS_STREAM_SUBJECTS = [
  'order.*',
  'payment_session.*',
  'receiver.*',
  'signal.*',
  'template.*',
  'match.*',
  'decision.*',
  'review.*',
  'webhook.*'
] as const;

export interface NatsRuntimeConfig {
  url: string;
  streamName: string;
  durablePrefix: string;
  connectTimeoutMs: number;
}

export interface SwimPayStreamConfig {
  name: string;
  subjects: readonly string[];
  retention: 'limits';
  storage: 'file';
  maxAgeSeconds: number;
  maxBytes: number;
}

export interface DurableConsumerDefinition {
  serviceName: 'swimpay-signal-worker' | 'swimpay-job-worker' | string;
  durableName: string;
  subject: EventType;
  eventType: EventType;
  maxDeliver: number;
  ackWaitMs: number;
}

export interface DurableConsumerOptionsSummary {
  durableName: string;
  subject: EventType;
  ackPolicy: 'explicit';
  ackWaitMs: number;
  maxDeliver: number;
}

export interface AckableJetStreamMessage {
  data: Uint8Array;
  ack(): void;
  nak(millis?: number): void;
  term(reason?: string): void;
}

export type DurableEventHandler = (event: InternalEventEnvelope) => Promise<{ kind: 'ok' }>;

export interface SafeEventLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

const DEFAULT_NATS_URL = 'nats://localhost:4222';
const DEFAULT_STREAM_NAME = 'SWIMPAY_EVENTS';
const DEFAULT_DURABLE_PREFIX = 'swimpay';
const DEFAULT_CONNECT_TIMEOUT_MS = 2_000;
const DEFAULT_ACK_WAIT_MS = 30_000;
const DEFAULT_MAX_DELIVER = 5;

export function isKnownEventType(value: string): value is EventType {
  return EVENT_TYPE_VALUES.has(value);
}

export function validateInternalEventEnvelope(value: unknown): { valid: true } | { valid: false; reason: string } {
  if (!isRecord(value)) {
    return { valid: false, reason: 'envelope_not_object' };
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return { valid: false, reason: 'event_id_required' };
  }

  if (typeof value.type !== 'string' || !isKnownEventType(value.type)) {
    return { valid: false, reason: 'known_event_type_required' };
  }

  if (typeof value.created_at !== 'string' || Number.isNaN(Date.parse(value.created_at))) {
    return { valid: false, reason: 'created_at_required' };
  }

  if (typeof value.source !== 'string' || value.source.trim().length === 0) {
    return { valid: false, reason: 'source_required' };
  }

  if (!isRecord(value.data)) {
    return { valid: false, reason: 'data_object_required' };
  }

  if (containsRawPiiMarker(value.data)) {
    return { valid: false, reason: 'raw_pii_field_present' };
  }

  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    return { valid: false, reason: 'metadata_object_required' };
  }

  return { valid: true };
}

export function parseNatsRuntimeConfig(env: Record<string, string | undefined>): NatsRuntimeConfig {
  return {
    url: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
    streamName: env.NATS_STREAM_NAME?.trim() || DEFAULT_STREAM_NAME,
    durablePrefix: sanitizeDurablePart(env.NATS_DURABLE_PREFIX?.trim() || DEFAULT_DURABLE_PREFIX),
    connectTimeoutMs: parsePositiveInt(env.NATS_CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS)
  };
}

export function buildSwimPayStreamConfig(name = DEFAULT_STREAM_NAME): SwimPayStreamConfig {
  return {
    name,
    subjects: SWIMPAY_EVENTS_STREAM_SUBJECTS,
    retention: 'limits',
    storage: 'file',
    maxAgeSeconds: 60 * 60 * 24 * 14,
    maxBytes: 512 * 1024 * 1024
  };
}

export function createDurableConsumerDefinition(input: {
  serviceName: DurableConsumerDefinition['serviceName'];
  durablePrefix: string;
  eventType: EventType | string;
  maxDeliver?: number | undefined;
  ackWaitMs?: number | undefined;
}): DurableConsumerDefinition {
  if (!isKnownEventType(input.eventType)) {
    throw new Error(`Unknown SwimPay event type: ${input.eventType}`);
  }

  const durableName = [
    sanitizeDurablePart(input.durablePrefix || DEFAULT_DURABLE_PREFIX),
    sanitizeDurablePart(input.serviceName),
    sanitizeDurablePart(input.eventType)
  ].join('_');

  return {
    serviceName: input.serviceName,
    durableName,
    subject: input.eventType,
    eventType: input.eventType,
    maxDeliver: input.maxDeliver ?? DEFAULT_MAX_DELIVER,
    ackWaitMs: input.ackWaitMs ?? DEFAULT_ACK_WAIT_MS
  };
}

export function buildConsumerOptions(definition: DurableConsumerDefinition): DurableConsumerOptionsSummary {
  return {
    durableName: definition.durableName,
    subject: definition.subject,
    ackPolicy: 'explicit',
    ackWaitMs: definition.ackWaitMs,
    maxDeliver: definition.maxDeliver
  };
}

export async function processJetStreamMessage(params: {
  message: AckableJetStreamMessage;
  expectedEventType: EventType;
  handler: DurableEventHandler;
  logger?: SafeEventLogger | undefined;
  metrics?: MetricsRegistry | undefined;
}): Promise<void> {
  const envelope = decodeEventEnvelope(params.message.data);
  const validation = validateInternalEventEnvelope(envelope);

  if (!validation.valid) {
    params.message.term(validation.reason);
    throw new Error(`Invalid JetStream event payload: ${validation.reason}`);
  }

  const event = envelope as InternalEventEnvelope;
  params.metrics?.increment(MetricNames.NATS_EVENTS_CONSUMED_TOTAL);

  if (event.type !== params.expectedEventType) {
    params.message.term('unexpected_event_type');
    throw new Error(`Unexpected event type: ${event.type}`);
  }

  try {
    await params.handler(event);
    params.message.ack();
    params.metrics?.increment(MetricNames.NATS_EVENTS_ACKED_TOTAL);
    params.logger?.info('jetstream_event_acked', safeEventLogFields(event));
  } catch (error) {
    params.message.nak();
    params.metrics?.increment(MetricNames.NATS_EVENTS_NACKED_TOTAL);
    params.metrics?.increment(MetricNames.WORKER_ERRORS_TOTAL);
    params.logger?.error('jetstream_event_handler_failed', {
      ...safeEventLogFields(event),
      error_name: error instanceof Error ? error.name : 'UnknownError'
    });
    throw error;
  }
}

export class NatsJetStreamRuntime {
  private connection: NatsConnection | null = null;
  private jetStream: JetStreamClient | null = null;
  private readonly subscriptions: JetStreamSubscription[] = [];
  private readonly codec = StringCodec();

  public constructor(
    private readonly config: NatsRuntimeConfig,
    private readonly logger: SafeEventLogger = noopLogger,
    private readonly metrics?: MetricsRegistry | undefined
  ) {}

  public async connect(): Promise<void> {
    this.connection = await connect({
      servers: this.config.url,
      timeout: this.config.connectTimeoutMs,
      waitOnFirstConnect: true,
      name: 'swimpay-runtime'
    });
    this.jetStream = this.connection.jetstream();
  }

  public async ensureStream(): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection is not open.');
    }

    const manager = await this.connection.jetstreamManager();
    const stream = buildSwimPayStreamConfig(this.config.streamName);

    try {
      await manager.streams.info(stream.name);
    } catch {
      await manager.streams.add({
        name: stream.name,
        subjects: [...stream.subjects],
        retention: RetentionPolicy.Limits,
        storage: StorageType.File,
        max_age: stream.maxAgeSeconds * 1_000_000_000,
        max_bytes: stream.maxBytes
      });
    }
  }

  public async publish(envelope: InternalEventEnvelope): Promise<void> {
    const validation = validateInternalEventEnvelope(envelope);
    if (!validation.valid) {
      throw new Error(`Cannot publish invalid event envelope: ${validation.reason}`);
    }

    const jetStream = this.requireJetStream();
    await jetStream.publish(envelope.type, this.codec.encode(JSON.stringify(envelope)));
    this.logger.info('jetstream_event_published', safeEventLogFields(envelope));
  }

  public async subscribe(definition: DurableConsumerDefinition, handler: DurableEventHandler): Promise<void> {
    const jetStream = this.requireJetStream();
    const options = consumerOpts();
    options.durable(definition.durableName);
    options.deliverTo(`${definition.durableName}.deliver`);
    options.manualAck();
    options.ackExplicit();
    options.deliverAll();
    options.filterSubject(definition.subject);
    options.maxDeliver(definition.maxDeliver);
    options.ackWait(definition.ackWaitMs);
    options.callback((error, message) => {
      if (error) {
        this.logger.error('jetstream_consumer_error', {
          durable_name: definition.durableName,
          subject: definition.subject,
          error_name: error.name
        });
        return;
      }

      if (!message) {
        this.logger.warn('jetstream_consumer_empty_message', {
          durable_name: definition.durableName,
          subject: definition.subject
        });
        return;
      }

      void processJetStreamMessage({
        message,
        expectedEventType: definition.eventType,
        handler,
        logger: this.logger,
        metrics: this.metrics
      }).catch(() => {
        // processJetStreamMessage already nacks/terms and logs safe metadata.
      });
    });

    const subscription = await jetStream.subscribe(definition.subject, options);
    this.subscriptions.push(subscription);
    this.logger.info('jetstream_consumer_registered', {
      durable_name: definition.durableName,
      subject: definition.subject,
      service_name: definition.serviceName
    });
  }

  public health(): { status: 'connected' | 'disconnected'; stream: string; consumer_count: number } {
    return {
      status: this.connection && !this.connection.isClosed() ? 'connected' : 'disconnected',
      stream: this.config.streamName,
      consumer_count: this.subscriptions.length
    };
  }

  public async close(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      subscription.unsubscribe();
    }

    if (this.connection && !this.connection.isClosed()) {
      await this.connection.drain();
    }

    this.connection = null;
    this.jetStream = null;
  }

  private requireJetStream(): JetStreamClient {
    if (!this.jetStream) {
      throw new Error('NATS JetStream is not connected.');
    }

    return this.jetStream;
  }
}

function decodeEventEnvelope(data: Uint8Array): unknown {
  try {
    return JSON.parse(Buffer.from(data).toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

function safeEventLogFields(envelope: InternalEventEnvelope): Record<string, unknown> {
  return {
    event_id: envelope.id,
    event_type: envelope.type,
    source: envelope.source,
    correlation_id: envelope.metadata?.correlation_id
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeDurablePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'swimpay';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function containsRawPiiMarker(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsRawPiiMarker(item));
  }

  if (!isRecord(value)) {
    return false;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (/raw[_-]?(notification|text|phone)|notification_raw|phone_raw|raw_phone|buyer_phone$/iu.test(key)) {
      return true;
    }

    if (containsRawPiiMarker(nestedValue)) {
      return true;
    }
  }

  return false;
}

const noopLogger: SafeEventLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};
