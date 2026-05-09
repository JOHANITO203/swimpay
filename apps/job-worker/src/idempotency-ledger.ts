import pg from 'pg';

const { Pool } = pg;

export type WorkerIdempotencyStatus = 'processing' | 'processed' | 'failed' | 'skipped';

export interface WorkerIdempotencyClaimInput {
  serviceName: string;
  idempotencyKey: string;
  eventType?: string | undefined;
  eventId?: string | undefined;
  now: string;
}

export interface WorkerIdempotencyCompleteInput {
  serviceName: string;
  idempotencyKey: string;
  now: string;
  result?: Record<string, unknown> | undefined;
}

export interface WorkerIdempotencyFailInput {
  serviceName: string;
  idempotencyKey: string;
  now: string;
  errorMessage: string;
}

export interface WorkerIdempotencyLedger {
  claim(input: WorkerIdempotencyClaimInput): Promise<{ kind: 'claimed' } | { kind: 'duplicate'; status: WorkerIdempotencyStatus }>;
  complete(input: WorkerIdempotencyCompleteInput): Promise<void>;
  fail(input: WorkerIdempotencyFailInput): Promise<void>;
}

export async function runWithWorkerIdempotency<T>(
  ledger: WorkerIdempotencyLedger,
  input: WorkerIdempotencyClaimInput,
  run: () => Promise<T>
): Promise<{ kind: 'processed'; value: T } | { kind: 'skipped' }> {
  const claim = await ledger.claim(input);
  if (claim.kind === 'duplicate') {
    return { kind: 'skipped' };
  }

  try {
    const value = await run();
    await ledger.complete({
      serviceName: input.serviceName,
      idempotencyKey: input.idempotencyKey,
      now: input.now,
      result: { value: String(value) }
    });
    return { kind: 'processed', value };
  } catch (error) {
    await ledger.fail({
      serviceName: input.serviceName,
      idempotencyKey: input.idempotencyKey,
      now: input.now,
      errorMessage: error instanceof Error ? error.message : 'Unknown worker side-effect error.'
    });
    throw error;
  }
}

export class InMemoryWorkerIdempotencyLedger implements WorkerIdempotencyLedger {
  public readonly records = new Map<
    string,
    {
      status: WorkerIdempotencyStatus;
      updatedAt: string;
      result?: Record<string, unknown> | undefined;
      errorMessage?: string | undefined;
    }
  >();
  private readonly staleAfterMs: number;

  public constructor(options: { staleAfterMs?: number | undefined } = {}) {
    this.staleAfterMs = options.staleAfterMs ?? 10 * 60_000;
  }

  public async claim(input: WorkerIdempotencyClaimInput) {
    const key = this.key(input.serviceName, input.idempotencyKey);
    const existing = this.records.get(key);
    if (existing) {
      const stale = existing.status === 'processing' && Date.parse(existing.updatedAt) <= Date.parse(input.now) - this.staleAfterMs;
      if (!stale && existing.status !== 'failed' && existing.status !== 'skipped') {
        return { kind: 'duplicate' as const, status: existing.status };
      }
    }

    this.records.set(key, {
      status: 'processing',
      updatedAt: input.now
    });
    return { kind: 'claimed' as const };
  }

  public async complete(input: WorkerIdempotencyCompleteInput): Promise<void> {
    this.records.set(this.key(input.serviceName, input.idempotencyKey), {
      status: 'processed',
      updatedAt: input.now,
      result: input.result
    });
  }

  public async fail(input: WorkerIdempotencyFailInput): Promise<void> {
    this.records.set(this.key(input.serviceName, input.idempotencyKey), {
      status: 'failed',
      updatedAt: input.now,
      errorMessage: input.errorMessage
    });
  }

  private key(serviceName: string, idempotencyKey: string): string {
    return `${serviceName}:${idempotencyKey}`;
  }
}

export class PgWorkerIdempotencyLedger implements WorkerIdempotencyLedger {
  private readonly pool: pg.Pool;
  private readonly staleAfterMs: number;

  public constructor(connectionString: string, options: { staleAfterMs?: number | undefined } = {}) {
    this.pool = new Pool({ connectionString, max: 2 });
    this.staleAfterMs = options.staleAfterMs ?? 10 * 60_000;
  }

  public async claim(input: WorkerIdempotencyClaimInput) {
    const staleBefore = new Date(Date.parse(input.now) - this.staleAfterMs).toISOString();
    const result = await this.pool.query(
      `INSERT INTO worker_idempotency_ledger (
        service_name, idempotency_key, event_type, event_id, status, claimed_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'processing', $5::timestamptz, $5::timestamptz)
      ON CONFLICT (service_name, idempotency_key) DO UPDATE
      SET status = 'processing',
          event_type = EXCLUDED.event_type,
          event_id = EXCLUDED.event_id,
          error_message = NULL,
          claimed_at = EXCLUDED.claimed_at,
          updated_at = EXCLUDED.updated_at
      WHERE worker_idempotency_ledger.status IN ('failed', 'skipped')
         OR (
           worker_idempotency_ledger.status = 'processing'
           AND worker_idempotency_ledger.updated_at <= $6::timestamptz
         )
      RETURNING status`,
      [input.serviceName, input.idempotencyKey, input.eventType ?? null, input.eventId ?? null, input.now, staleBefore]
    );

    if ((result.rowCount ?? 0) > 0) {
      return { kind: 'claimed' as const };
    }

    const existing = await this.pool.query(
      `SELECT status
       FROM worker_idempotency_ledger
       WHERE service_name = $1 AND idempotency_key = $2`,
      [input.serviceName, input.idempotencyKey]
    );
    return {
      kind: 'duplicate' as const,
      status: normalizeStatus((existing.rows[0] as { status?: string } | undefined)?.status)
    };
  }

  public async complete(input: WorkerIdempotencyCompleteInput): Promise<void> {
    await this.pool.query(
      `UPDATE worker_idempotency_ledger
       SET status = 'processed',
           result_json = $3::jsonb,
           completed_at = $4::timestamptz,
           updated_at = $4::timestamptz
       WHERE service_name = $1 AND idempotency_key = $2`,
      [input.serviceName, input.idempotencyKey, JSON.stringify(input.result ?? {}), input.now]
    );
  }

  public async fail(input: WorkerIdempotencyFailInput): Promise<void> {
    await this.pool.query(
      `UPDATE worker_idempotency_ledger
       SET status = 'failed',
           error_message = $3,
           updated_at = $4::timestamptz
       WHERE service_name = $1 AND idempotency_key = $2`,
      [input.serviceName, input.idempotencyKey, input.errorMessage, input.now]
    );
  }
}

function normalizeStatus(value: unknown): WorkerIdempotencyStatus {
  return value === 'processing' || value === 'processed' || value === 'failed' || value === 'skipped'
    ? value
    : 'processing';
}
