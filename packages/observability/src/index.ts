export const REDACTED_VALUE = '[REDACTED]' as const;

export const MetricNames = {
  ORDERS_CREATED_TOTAL: 'orders_created_total',
  PAYMENT_SESSIONS_CREATED_TOTAL: 'payment_sessions_created_total',
  SIGNALS_RECEIVED_TOTAL: 'signals_received_total',
  SIGNALS_PARSED_TOTAL: 'signals_parsed_total',
  SIGNALS_REJECTED_TOTAL: 'signals_rejected_total',
  SIGNALS_NEEDS_REVIEW_TOTAL: 'signals_needs_review_total',
  SIGNALS_DUPLICATE_TOTAL: 'signals_duplicate_total',
  UNSAFE_CASHBACK_BLOCKED_TOTAL: 'unsafe_cashback_blocked_total',
  UNSAFE_REFUND_BLOCKED_TOTAL: 'unsafe_refund_blocked_total',
  UNSAFE_OUTGOING_BLOCKED_TOTAL: 'unsafe_outgoing_blocked_total',
  UNSAFE_PROMO_BLOCKED_TOTAL: 'unsafe_promo_blocked_total',
  UNSAFE_FAILED_BLOCKED_TOTAL: 'unsafe_failed_blocked_total',
  AMOUNT_ONLY_REVIEW_TOTAL: 'amount_only_review_total',
  UNTRUSTED_BANK_REVIEW_TOTAL: 'untrusted_bank_review_total',
  REVIEWS_CREATED_TOTAL: 'reviews_created_total',
  REVIEWS_CONFIRMED_TOTAL: 'reviews_confirmed_total',
  REVIEWS_REJECTED_TOTAL: 'reviews_rejected_total',
  WEBHOOK_DELIVERIES_PENDING: 'webhook_deliveries_pending',
  WEBHOOK_DELIVERIES_DELIVERED_TOTAL: 'webhook_deliveries_delivered_total',
  WEBHOOK_DELIVERIES_FAILED_TOTAL: 'webhook_deliveries_failed_total',
  WEBHOOK_DELIVERIES_DEAD_TOTAL: 'webhook_deliveries_dead_total',
  WEBHOOK_DELIVERY_ATTEMPTS_TOTAL: 'webhook_delivery_attempts_total',
  NATS_EVENTS_CONSUMED_TOTAL: 'nats_events_consumed_total',
  NATS_EVENTS_ACKED_TOTAL: 'nats_events_acked_total',
  NATS_EVENTS_NACKED_TOTAL: 'nats_events_nacked_total',
  WORKER_ERRORS_TOTAL: 'worker_errors_total',
  TEMPLATE_OBSERVED_TOTAL: 'template_observed_total',
  TEMPLATE_DRIFT_DETECTED_TOTAL: 'template_drift_detected_total',
  TEMPLATE_UNKNOWN_TOTAL: 'template_unknown_total',
  RECEIVER_REGISTRATIONS_TOTAL: 'receiver_registrations_total',
  RECEIVER_HEARTBEATS_TOTAL: 'receiver_heartbeats_total',
  RECEIVER_SIGNALS_ACCEPTED_TOTAL: 'receiver_signals_accepted_total',
  RECEIVER_SIGNALS_REJECTED_TOTAL: 'receiver_signals_rejected_total',
  RECEIVER_SIGNATURE_INVALID_TOTAL: 'receiver_signature_invalid_total'
} as const;

export type MetricName = (typeof MetricNames)[keyof typeof MetricNames];

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
}

export interface MetricsRegistry {
  increment(name: MetricName, amount?: number): void;
  setGauge(name: MetricName, value: number): void;
  snapshot(): MetricsSnapshot;
}

export class InMemoryMetricsRegistry implements MetricsRegistry {
  private readonly counters = new Map<MetricName, number>();
  private readonly gauges = new Map<MetricName, number>();

  public increment(name: MetricName, amount = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + amount);
  }

  public setGauge(name: MetricName, value: number): void {
    this.gauges.set(name, value);
  }

  public counterValue(name: MetricName): number {
    return this.counters.get(name) ?? 0;
  }

  public gaugeValue(name: MetricName): number {
    return this.gauges.get(name) ?? 0;
  }

  public snapshot(): MetricsSnapshot {
    return {
      counters: Object.fromEntries([...this.counters.entries()].sort(([left], [right]) => left.localeCompare(right))),
      gauges: Object.fromEntries([...this.gauges.entries()].sort(([left], [right]) => left.localeCompare(right)))
    };
  }

  public reset(): void {
    this.counters.clear();
    this.gauges.clear();
  }
}

export const defaultMetricsRegistry = new InMemoryMetricsRegistry();

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type StructuredLogEntry = {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  message: string;
} & Record<string, unknown>;

export interface StructuredLogger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createStructuredLogger(params: {
  service: string;
  environment: string;
  now?: (() => string) | undefined;
  sink?: ((entry: StructuredLogEntry) => void) | undefined;
}): StructuredLogger {
  const sink = params.sink ?? ((entry) => console.log(JSON.stringify(entry)));
  const now = params.now ?? (() => new Date().toISOString());

  const write = (level: LogLevel, message: string, fields: Record<string, unknown> = {}) => {
    const redacted = redactSensitiveFields(fields);
    sink({
      timestamp: now(),
      level,
      service: params.service,
      environment: params.environment,
      message,
      ...redacted
    });
  };

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields)
  };
}

export function redactSensitiveFields<T>(value: T): T {
  return redactValue(value) as T;
}

export function isSensitiveFieldName(key: string): boolean {
  return /^(phone|raw_phone|buyer_phone|sender_phone|normalized_phone|sender_card_number|buyer_source_card_number|card_number|cardNumber|cardPan|full_card|pan|cvv|cvc|expiry|expiration|pin|sms_code|notification_text|raw_notification|raw_body|raw_title|api_key|secret|token|password|signature)$/iu.test(
    key
  );
}

export type DependencyStatus = 'ok' | 'error' | 'skipped';

export interface HealthSnapshot {
  service: string;
  version: string;
  environment: string;
  dependencies: {
    database: DependencyStatus;
    nats: DependencyStatus;
    valkey: DependencyStatus;
  };
  uptime_seconds: number;
  timestamp: string;
}

export function buildHealthSnapshot(params: {
  service: string;
  version: string;
  environment: string;
  dependencies: HealthSnapshot['dependencies'];
  startedAtMs: number;
  now?: (() => Date) | undefined;
}): HealthSnapshot {
  const now = params.now?.() ?? new Date();
  const uptimeSeconds = Math.max(0, Math.floor((now.getTime() - params.startedAtMs) / 1_000));

  return {
    service: params.service,
    version: params.version,
    environment: params.environment,
    dependencies: params.dependencies,
    uptime_seconds: uptimeSeconds,
    timestamp: now.toISOString()
  };
}

export interface RuntimeErrorSummary {
  name: string;
  message: string;
  occurred_at: string;
}

export class RuntimeStatusTracker {
  private lastProcessedEventId: string | undefined;
  private lastProcessedAt: string | undefined;
  private lastError: RuntimeErrorSummary | undefined;

  public recordProcessed(eventId: string, processedAt: string): void {
    this.lastProcessedEventId = eventId;
    this.lastProcessedAt = processedAt;
  }

  public recordError(error: unknown, occurredAt: string): void {
    this.lastError = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: sanitizeDiagnosticText(error instanceof Error ? error.message : String(error)),
      occurred_at: occurredAt
    };
  }

  public snapshot(): {
    last_processed_event_id?: string | undefined;
    last_processed_at?: string | undefined;
    last_error?: RuntimeErrorSummary | undefined;
  } {
    return {
      last_processed_event_id: this.lastProcessedEventId,
      last_processed_at: this.lastProcessedAt,
      last_error: this.lastError
    };
  }
}

export function createWorkerStatus(params: {
  service: string;
  workerState: string;
  configuredConsumers: readonly string[];
  tracker?: RuntimeStatusTracker | undefined;
}) {
  const snapshot = params.tracker?.snapshot();
  return {
    service: params.service,
    worker: params.workerState,
    configured_consumers: [...params.configuredConsumers],
    ...(snapshot?.last_processed_event_id ? { last_processed_event_id: snapshot.last_processed_event_id } : {}),
    ...(snapshot?.last_processed_at ? { last_processed_at: snapshot.last_processed_at } : {}),
    ...(snapshot?.last_error ? { last_error: snapshot.last_error } : {})
  };
}

export function buildWebhookQueueStatus(
  deliveries: readonly { status: string; nextRetryAt?: string | undefined; next_retry_at?: string | undefined }[]
) {
  const retryDates = deliveries
    .filter((delivery) => delivery.status === 'failed')
    .map((delivery) => delivery.nextRetryAt ?? delivery.next_retry_at)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    pending_count: deliveries.filter((delivery) => delivery.status === 'pending').length,
    retryable_count: deliveries.filter((delivery) => delivery.status === 'failed').length,
    dead_count: deliveries.filter((delivery) => delivery.status === 'dead').length,
    next_retry_at: retryDates[0] ?? null
  };
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (!isPlainRecord(value)) {
    return typeof value === 'string' ? sanitizeDiagnosticText(value) : value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      isSensitiveFieldName(key) ? REDACTED_VALUE : redactValue(nestedValue)
    ])
  );
}

function sanitizeDiagnosticText(value: string): string {
  const sensitiveKey =
    '(phone|raw_phone|buyer_phone|sender_phone|normalized_phone|sender_card_number|buyer_source_card_number|card_number|cardNumber|cardPan|full_card|pan|cvv|cvc|expiry|expiration|pin|sms_code|notification_text|raw_notification|raw_body|raw_title|api_key|secret|token|password|signature)';

  return value
    .replace(new RegExp(`\\b${sensitiveKey}\\s*=\\s*[^\\s,;]+`, 'giu'), `${REDACTED_VALUE}=${REDACTED_VALUE}`)
    .replace(new RegExp(`\\b${sensitiveKey}\\b`, 'giu'), REDACTED_VALUE)
    .replace(/\b\d{12,19}\b/gu, REDACTED_VALUE);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
