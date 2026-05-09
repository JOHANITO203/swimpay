import pg from 'pg';
import { randomUUID } from 'node:crypto';
import type { SafeEventLogger } from '@swimpay/events';

const { Pool } = pg;

export interface NoNotificationFallbackConfig {
  enabled: boolean;
  pollIntervalMs: number;
  batchSize: number;
  minimumElapsedSeconds: number;
}

export interface NoNotificationFallbackProcessor {
  processDueManualChecks(now: string, limit: number, minimumElapsedSeconds: number): Promise<NoNotificationFallbackProcessResult>;
}

export interface NoNotificationFallbackProcessResult {
  requested: number;
  skipped: number;
}

interface DuePaymentSessionRow {
  payment_session_id: string;
  merchant_id: string;
  order_id: string;
}

export function parseNoNotificationFallbackConfig(env: Record<string, string | undefined>): NoNotificationFallbackConfig {
  return {
    enabled: env.NO_NOTIFICATION_FALLBACK_WORKER_ENABLED === 'true',
    pollIntervalMs: parsePositiveInt(env.NO_NOTIFICATION_FALLBACK_POLL_INTERVAL_MS, 30_000),
    batchSize: parsePositiveInt(env.NO_NOTIFICATION_FALLBACK_BATCH_SIZE, 25),
    minimumElapsedSeconds: parsePositiveInt(env.NO_NOTIFICATION_FALLBACK_MIN_SECONDS, 120)
  };
}

export class NoNotificationFallbackPollingLoop {
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;

  public constructor(
    private readonly options: {
      processor: NoNotificationFallbackProcessor;
      config: NoNotificationFallbackConfig;
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
      const result = await this.options.processor.processDueManualChecks(
        this.options.now(),
        this.options.config.batchSize,
        this.options.config.minimumElapsedSeconds
      );
      this.options.logger?.info('no_notification_fallback_poll_completed', {
        requested: result.requested,
        skipped: result.skipped
      });
    } catch (error) {
      this.options.logger?.error('no_notification_fallback_poll_failed', {
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

export class PgNoNotificationFallbackRepository implements NoNotificationFallbackProcessor {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 3 });
  }

  public async processDueManualChecks(
    now: string,
    limit: number,
    minimumElapsedSeconds: number
  ): Promise<NoNotificationFallbackProcessResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const due = await client.query<DuePaymentSessionRow>(
        `SELECT ps.id AS payment_session_id, ps.merchant_id, ps.order_id
           FROM payment_sessions ps
          WHERE ps.status IN ('receiver_armed', 'awaiting_payment', 'buyer_claimed_paid')
            AND ps.receiver_armed_at IS NOT NULL
            AND ps.receiver_armed_at <= ($1::timestamptz - ($2::int * interval '1 second'))
            AND ps.no_notification_manual_check_requested_at IS NULL
            AND ps.expected_payment_fingerprint IS NOT NULL
            AND ps.payment_method IS NOT NULL
            AND ps.valid_until > $1::timestamptz
            AND NOT EXISTS (
              SELECT 1 FROM review_queue rq
               WHERE rq.payment_session_id = ps.id
                 AND rq.status = 'open'
            )
            AND NOT EXISTS (
              SELECT 1 FROM signal_matches sm
               WHERE sm.payment_session_id = ps.id
            )
          ORDER BY ps.receiver_armed_at ASC
          LIMIT $3
          FOR UPDATE SKIP LOCKED`,
        [now, minimumElapsedSeconds, limit]
      );

      let requested = 0;
      for (const row of due.rows) {
        const reviewId = randomUUID();
        const auditEventId = randomUUID();

        await client.query(
          `INSERT INTO review_queue (
            id, merchant_id, order_id, payment_session_id, signal_id, reason_code, status, created_at
          ) VALUES ($1, $2, $3, $4, NULL, $5, 'open', $6)
          ON CONFLICT DO NOTHING`,
          [
            reviewId,
            row.merchant_id,
            row.order_id,
            row.payment_session_id,
            'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
            now
          ]
        );

        await client.query(
          `UPDATE payment_sessions
              SET status = 'needs_review',
                  no_notification_manual_check_requested_at = $1,
                  updated_at = $1
            WHERE id = $2
              AND merchant_id = $3
              AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
          [now, row.payment_session_id, row.merchant_id]
        );

        await client.query(
          `UPDATE orders
              SET status = 'needs_review',
                  updated_at = $1
            WHERE id = $2
              AND merchant_id = $3
              AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
          [now, row.order_id, row.merchant_id]
        );

        await client.query(
          `INSERT INTO audit_events (
            id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
          ) VALUES ($1, $2, 'no_notification_manual_check_requested', 'payment_session', $3, 'system', $4::jsonb, $5)`,
          [
            auditEventId,
            row.merchant_id,
            row.payment_session_id,
            JSON.stringify({
              review_id: reviewId,
              reason_label: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
              confirmation_type: 'manual_bank_check',
              does_not_confirm_payment: true,
              emits_webhook: false,
              official_bank_confirmation: false
            }),
            now
          ]
        );

        requested += 1;
      }

      await client.query('COMMIT');
      return { requested, skipped: (due.rowCount ?? due.rows.length) - requested };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
