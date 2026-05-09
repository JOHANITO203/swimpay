import pg from 'pg';

const { Pool } = pg;

export const MerchantMetricsRanges = ['today', '7d', '30d'] as const;
export type MerchantMetricsRange = (typeof MerchantMetricsRanges)[number];

export const MerchantMetricsBuckets = ['day'] as const;
export type MerchantMetricsBucket = (typeof MerchantMetricsBuckets)[number];

export interface MerchantMetricsSummary {
  range: MerchantMetricsRange;
  currency: string;
  confirmedPaymentCount: number;
  confirmedAmountMinor: number;
  pendingReviewCount: number;
  rejectedPaymentCount: number;
  expiredPaymentCount: number;
  failedCount: number;
  confirmationRate: number;
  averageManualConfirmationDelaySeconds: number;
}

export interface MerchantMetricsTimeseriesPoint {
  date: string;
  confirmedPaymentCount: number;
  confirmedAmountMinor: number;
  pendingReviewCount: number;
  rejectedPaymentCount: number;
  expiredPaymentCount: number;
  confirmationRate: number;
}

export interface MerchantMetricsTimeseries {
  range: MerchantMetricsRange;
  bucket: MerchantMetricsBucket;
  points: MerchantMetricsTimeseriesPoint[];
}

export interface MerchantMetricsRepository {
  getSummary(input: {
    merchantId: string;
    range: MerchantMetricsRange;
    now: Date;
  }): Promise<MerchantMetricsSummary>;
  getTimeseries(input: {
    merchantId: string;
    range: MerchantMetricsRange;
    bucket: MerchantMetricsBucket;
    now: Date;
  }): Promise<MerchantMetricsTimeseries>;
}

export function parseMerchantMetricsRange(value: unknown): MerchantMetricsRange {
  return MerchantMetricsRanges.includes(value as MerchantMetricsRange) ? (value as MerchantMetricsRange) : '30d';
}

export function parseMerchantMetricsBucket(value: unknown): MerchantMetricsBucket {
  return MerchantMetricsBuckets.includes(value as MerchantMetricsBucket) ? (value as MerchantMetricsBucket) : 'day';
}

export function computeConfirmationRate(input: {
  confirmedPaymentCount: number;
  rejectedPaymentCount: number;
  expiredPaymentCount: number;
  failedCount: number;
}): number {
  const denominator =
    input.confirmedPaymentCount + input.rejectedPaymentCount + input.expiredPaymentCount + input.failedCount;
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((input.confirmedPaymentCount / denominator) * 100);
}

export class PgMerchantMetricsRepository implements MerchantMetricsRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  public async getSummary(input: {
    merchantId: string;
    range: MerchantMetricsRange;
    now: Date;
  }): Promise<MerchantMetricsSummary> {
    const { startAt, endAt } = metricWindow(input.range, input.now);
    const result = await this.pool.query(
      `
      WITH order_metrics AS (
        SELECT
          COUNT(*) FILTER (WHERE status IN ('manual_confirmed', 'fulfilled'))::int AS confirmed_payment_count,
          COALESCE(SUM(amount_minor) FILTER (WHERE status IN ('manual_confirmed', 'fulfilled')), 0)::bigint AS confirmed_amount_minor,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_payment_count,
          COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_payment_count
        FROM orders
        WHERE merchant_id = $1
          AND updated_at >= $2::timestamptz
          AND updated_at < $3::timestamptz
      ),
      pending_reviews AS (
        SELECT COUNT(*)::int AS pending_review_count
        FROM review_queue
        WHERE merchant_id = $1
          AND status = 'open'
      ),
      failed_deliveries AS (
        SELECT COUNT(*)::int AS failed_count
        FROM webhook_deliveries
        WHERE merchant_id = $1
          AND status IN ('failed', 'dead')
          AND updated_at >= $2::timestamptz
          AND updated_at < $3::timestamptz
      ),
      manual_delay AS (
        SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))), 0)::int
          AS average_manual_confirmation_delay_seconds
        FROM review_queue
        WHERE merchant_id = $1
          AND status = 'confirmed'
          AND resolved_at IS NOT NULL
          AND resolved_at >= $2::timestamptz
          AND resolved_at < $3::timestamptz
      )
      SELECT
        order_metrics.confirmed_payment_count,
        order_metrics.confirmed_amount_minor,
        pending_reviews.pending_review_count,
        order_metrics.rejected_payment_count,
        order_metrics.expired_payment_count,
        failed_deliveries.failed_count,
        manual_delay.average_manual_confirmation_delay_seconds
      FROM order_metrics, pending_reviews, failed_deliveries, manual_delay
      `,
      [input.merchantId, startAt.toISOString(), endAt.toISOString()]
    );
    const row = result.rows[0] as Record<string, string | number | null> | undefined;
    const confirmedPaymentCount = toInt(row?.confirmed_payment_count);
    const rejectedPaymentCount = toInt(row?.rejected_payment_count);
    const expiredPaymentCount = toInt(row?.expired_payment_count);
    const failedCount = toInt(row?.failed_count);
    return {
      range: input.range,
      currency: 'RUB',
      confirmedPaymentCount,
      confirmedAmountMinor: toInt(row?.confirmed_amount_minor),
      pendingReviewCount: toInt(row?.pending_review_count),
      rejectedPaymentCount,
      expiredPaymentCount,
      failedCount,
      confirmationRate: computeConfirmationRate({
        confirmedPaymentCount,
        rejectedPaymentCount,
        expiredPaymentCount,
        failedCount
      }),
      averageManualConfirmationDelaySeconds: toInt(row?.average_manual_confirmation_delay_seconds)
    };
  }

  public async getTimeseries(input: {
    merchantId: string;
    range: MerchantMetricsRange;
    bucket: MerchantMetricsBucket;
    now: Date;
  }): Promise<MerchantMetricsTimeseries> {
    const { startAt, endAt } = metricWindow(input.range, input.now);
    const result = await this.pool.query(
      `
      WITH days AS (
        SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS day
      ),
      order_metrics AS (
        SELECT
          updated_at::date AS day,
          COUNT(*) FILTER (WHERE status IN ('manual_confirmed', 'fulfilled'))::int AS confirmed_payment_count,
          COALESCE(SUM(amount_minor) FILTER (WHERE status IN ('manual_confirmed', 'fulfilled')), 0)::bigint AS confirmed_amount_minor,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_payment_count,
          COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_payment_count
        FROM orders
        WHERE merchant_id = $1
          AND updated_at >= $2::timestamptz
          AND updated_at < $3::timestamptz
        GROUP BY updated_at::date
      ),
      review_metrics AS (
        SELECT created_at::date AS day, COUNT(*)::int AS pending_review_count
        FROM review_queue
        WHERE merchant_id = $1
          AND status = 'open'
          AND created_at >= $2::timestamptz
          AND created_at < $3::timestamptz
        GROUP BY created_at::date
      ),
      failed_metrics AS (
        SELECT updated_at::date AS day, COUNT(*)::int AS failed_count
        FROM webhook_deliveries
        WHERE merchant_id = $1
          AND status IN ('failed', 'dead')
          AND updated_at >= $2::timestamptz
          AND updated_at < $3::timestamptz
        GROUP BY updated_at::date
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(order_metrics.confirmed_payment_count, 0)::int AS confirmed_payment_count,
        COALESCE(order_metrics.confirmed_amount_minor, 0)::bigint AS confirmed_amount_minor,
        COALESCE(review_metrics.pending_review_count, 0)::int AS pending_review_count,
        COALESCE(order_metrics.rejected_payment_count, 0)::int AS rejected_payment_count,
        COALESCE(order_metrics.expired_payment_count, 0)::int AS expired_payment_count,
        COALESCE(failed_metrics.failed_count, 0)::int AS failed_count
      FROM days
      LEFT JOIN order_metrics ON order_metrics.day = days.day
      LEFT JOIN review_metrics ON review_metrics.day = days.day
      LEFT JOIN failed_metrics ON failed_metrics.day = days.day
      ORDER BY days.day ASC
      `,
      [input.merchantId, startAt.toISOString(), endAt.toISOString()]
    );
    return {
      range: input.range,
      bucket: input.bucket,
      points: result.rows.map((row: Record<string, string | number | null>) => {
        const confirmedPaymentCount = toInt(row.confirmed_payment_count);
        const rejectedPaymentCount = toInt(row.rejected_payment_count);
        const expiredPaymentCount = toInt(row.expired_payment_count);
        const failedCount = toInt(row.failed_count);
        return {
          date: String(row.date),
          confirmedPaymentCount,
          confirmedAmountMinor: toInt(row.confirmed_amount_minor),
          pendingReviewCount: toInt(row.pending_review_count),
          rejectedPaymentCount,
          expiredPaymentCount,
          confirmationRate: computeConfirmationRate({
            confirmedPaymentCount,
            rejectedPaymentCount,
            expiredPaymentCount,
            failedCount
          })
        };
      })
    };
  }
}

function metricWindow(range: MerchantMetricsRange, now: Date): { startAt: Date; endAt: Date } {
  const endAt = new Date(now.getTime());
  if (range === 'today') {
    const startAt = new Date(Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth(), endAt.getUTCDate()));
    return { startAt, endAt };
  }
  const days = range === '7d' ? 7 : 30;
  const startAt = new Date(Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth(), endAt.getUTCDate()));
  startAt.setUTCDate(startAt.getUTCDate() - (days - 1));
  return { startAt, endAt };
}

function toInt(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
