import { describe, expect, it } from 'vitest';
import {
  MetricNames,
  RuntimeStatusTracker,
  buildHealthSnapshot,
  buildWebhookQueueStatus,
  createStructuredLogger,
  createWorkerStatus,
  InMemoryMetricsRegistry,
  redactSensitiveFields
} from './index.js';

describe('runtime observability foundation', () => {
  it('redacts nested sensitive fields without mutating the original object', () => {
    const original = {
      phone: '+79991234567',
      buyer_phone: '+79990000000',
      sender_phone: '+79991111111',
      normalized_phone: '79991234567',
      notification_text: 'raw notification',
      raw_notification: 'raw body',
      raw_body: 'raw http body',
      raw_title: 'raw title',
      sender_card_number: '2202201234567890',
      card_number: '2202201234567890',
      cardNumber: '2202201234567890',
      cardPan: '2202201234567890',
      full_card: '2202201234567890',
      pan: '2202201234567890',
      cvv: '123',
      expiry: '12/29',
      pin: '0000',
      sms_code: '111111',
      api_key: 'sk_live_secret',
      token: 'bearer-token',
      password: 'p4ss',
      nested: {
        secret: 'secret-value',
        signature: 'sha256=secret'
      },
      safe_id: 'ord_01'
    };

    const redacted = redactSensitiveFields(original);

    expect(redacted).toEqual({
      phone: '[REDACTED]',
      buyer_phone: '[REDACTED]',
      sender_phone: '[REDACTED]',
      normalized_phone: '[REDACTED]',
      notification_text: '[REDACTED]',
      raw_notification: '[REDACTED]',
      raw_body: '[REDACTED]',
      raw_title: '[REDACTED]',
      sender_card_number: '[REDACTED]',
      card_number: '[REDACTED]',
      cardNumber: '[REDACTED]',
      cardPan: '[REDACTED]',
      full_card: '[REDACTED]',
      pan: '[REDACTED]',
      cvv: '[REDACTED]',
      expiry: '[REDACTED]',
      pin: '[REDACTED]',
      sms_code: '[REDACTED]',
      api_key: '[REDACTED]',
      token: '[REDACTED]',
      password: '[REDACTED]',
      nested: {
        secret: '[REDACTED]',
        signature: '[REDACTED]'
      },
      safe_id: 'ord_01'
    });
    expect(original.nested.secret).toBe('secret-value');
  });

  it('creates structured log entries with safe context and correlation ids', () => {
    const entries: unknown[] = [];
    const logger = createStructuredLogger({
      service: 'swimpay-api',
      environment: 'test',
      now: () => '2026-05-02T12:00:00.000Z',
      sink: (entry) => entries.push(entry)
    });

    logger.info('order_created', {
      correlation_id: 'corr_01',
      event_id: 'evt_01',
      merchant_id: 'mch_01',
      raw_notification: 'raw notification text'
    });

    expect(entries).toEqual([
      {
        timestamp: '2026-05-02T12:00:00.000Z',
        level: 'info',
        service: 'swimpay-api',
        environment: 'test',
        message: 'order_created',
        correlation_id: 'corr_01',
        event_id: 'evt_01',
        merchant_id: 'mch_01',
        raw_notification: '[REDACTED]'
      }
    ]);
  });

  it('keeps counters and gauges in a safe JSON metrics snapshot', () => {
    const metrics = new InMemoryMetricsRegistry();

    metrics.increment(MetricNames.ORDERS_CREATED_TOTAL);
    metrics.increment(MetricNames.SIGNALS_NEEDS_REVIEW_TOTAL, 2);
    metrics.setGauge(MetricNames.WEBHOOK_DELIVERIES_PENDING, 3);

    expect(metrics.snapshot()).toEqual({
      counters: {
        orders_created_total: 1,
        signals_needs_review_total: 2
      },
      gauges: {
        webhook_deliveries_pending: 3
      }
    });
    expect(JSON.stringify(metrics.snapshot())).not.toContain('+7999');
  });

  it('builds safe health and worker status snapshots', () => {
    const health = buildHealthSnapshot({
      service: 'swimpay-api',
      version: '0.1.0',
      environment: 'test',
      startedAtMs: Date.parse('2026-05-02T12:00:00.000Z'),
      now: () => new Date('2026-05-02T12:01:30.000Z'),
      dependencies: {
        database: 'ok',
        nats: 'skipped',
        valkey: 'error'
      }
    });

    const tracker = new RuntimeStatusTracker();
    tracker.recordProcessed('evt_01', '2026-05-02T12:01:00.000Z');
    tracker.recordError(new Error('failed with secret=abc pan=2202201234567890 sms_code=111111'), '2026-05-02T12:01:10.000Z');
    const worker = createWorkerStatus({
      service: 'swimpay-signal-worker',
      workerState: 'nats_consumers_registered',
      configuredConsumers: ['local_signal_received'],
      tracker
    });

    expect(health).toEqual({
      service: 'swimpay-api',
      version: '0.1.0',
      environment: 'test',
      dependencies: {
        database: 'ok',
        nats: 'skipped',
        valkey: 'error'
      },
      uptime_seconds: 90,
      timestamp: '2026-05-02T12:01:30.000Z'
    });
    expect(worker).toEqual({
      service: 'swimpay-signal-worker',
      worker: 'nats_consumers_registered',
      configured_consumers: ['local_signal_received'],
      last_processed_event_id: 'evt_01',
      last_processed_at: '2026-05-02T12:01:00.000Z',
      last_error: {
        name: 'Error',
        message: 'failed with [REDACTED]=[REDACTED] [REDACTED]=[REDACTED] [REDACTED]=[REDACTED]',
        occurred_at: '2026-05-02T12:01:10.000Z'
      }
    });
    expect(worker.last_error?.message).not.toContain('2202201234567890');
    expect(worker.last_error?.message).not.toContain('111111');
  });

  it('summarizes webhook queue state without exposing payload data', () => {
    expect(
      buildWebhookQueueStatus([
        { status: 'pending', nextRetryAt: '2026-05-02T12:10:00.000Z' },
        { status: 'failed', nextRetryAt: '2026-05-02T12:05:00.000Z' },
        { status: 'dead' },
        { status: 'delivered' }
      ])
    ).toEqual({
      pending_count: 1,
      retryable_count: 1,
      dead_count: 1,
      next_retry_at: '2026-05-02T12:05:00.000Z'
    });
  });
});
