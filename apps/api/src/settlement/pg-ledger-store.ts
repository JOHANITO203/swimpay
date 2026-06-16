/**
 * PgLedgerStore — durable, concurrency-safe ledger on Postgres.
 *
 * Upholds the same invariants as the in-memory Ledger, but with real durability
 * and concurrency control:
 *   - Each post() runs in ONE DB transaction (BEGIN/COMMIT/ROLLBACK).
 *   - Touched accounts are locked with SELECT … FOR UPDATE → no interleaving races.
 *   - Idempotency is enforced by the UNIQUE(idempotency_key) constraint AND a
 *     fast-path pre-check; a concurrent duplicate (23505) is treated as a replay.
 *   - Balances are derived via indexed SUM (never stored).
 *
 * Schema: migration 033_programmable_settlement_ledger.sql.
 *
 * NOTE: this is REAL code (not simulated), but it has NOT been integration-tested
 * against a live Postgres in this environment (no DB available here) — same status
 * as the repo's other Pg repositories. Run the DB integration suite before trust.
 */

import pg from 'pg';
import {
  LedgerError,
  UnbalancedTransactionError,
  UnknownAccountError,
  type Account,
  type Entry,
  type LedgerDeps,
  type PostInput,
  type Transaction,
} from './ledger.js';
import type { LedgerStore } from './ledger-store.js';

const UNIQUE_VIOLATION = '23505';

function toSafeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(n)) throw new LedgerError(`amount out of safe integer range: ${String(value)}`);
  return n;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export class PgLedgerStore implements LedgerStore {
  public constructor(private readonly pool: pg.Pool, private readonly deps: LedgerDeps) {}

  public async openAccount(account: Account): Promise<void> {
    await this.pool.query(
      `INSERT INTO settlement_accounts (id, owner, currency, type)
       VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [account.id, account.owner, account.currency.toUpperCase(), account.type],
    );
  }

  public async post(input: PostInput): Promise<Transaction> {
    if (input.legs.length === 0) throw new UnbalancedTransactionError('transaction has no legs');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fast-path idempotency: replay returns the original.
      const seen = await client.query('SELECT id FROM settlement_transactions WHERE idempotency_key = $1', [input.idempotencyKey]);
      if (seen.rowCount && seen.rowCount > 0) {
        const txn = await this.loadTransaction(client, seen.rows[0].id as string);
        await client.query('COMMIT');
        return txn;
      }

      // Lock the touched accounts (no interleaving) and resolve their currencies.
      const ids = [...new Set(input.legs.map((l) => l.accountId))];
      const accounts = await client.query('SELECT id, currency FROM settlement_accounts WHERE id = ANY($1::text[]) FOR UPDATE', [ids]);
      const currencyById = new Map<string, string>(accounts.rows.map((r: { id: string; currency: string }) => [r.id, r.currency]));

      const perCurrency = new Map<string, number>();
      for (const leg of input.legs) {
        const currency = currencyById.get(leg.accountId);
        if (!currency) throw new UnknownAccountError(`unknown account: ${leg.accountId}`);
        if (!Number.isSafeInteger(leg.amountMinor)) throw new LedgerError(`amountMinor must be a safe integer (got ${leg.amountMinor})`);
        perCurrency.set(currency, (perCurrency.get(currency) ?? 0) + leg.amountMinor);
      }
      for (const [currency, sum] of perCurrency) {
        if (sum !== 0) throw new UnbalancedTransactionError(`unbalanced in ${currency}: net ${sum} (must be 0)`);
      }

      const txnId = this.deps.generateTxnId();
      const createdAt = this.deps.now();
      try {
        await client.query(
          'INSERT INTO settlement_transactions (id, order_id, transition, idempotency_key, created_at) VALUES ($1, $2, $3, $4, $5)',
          [txnId, input.orderId, input.transition, input.idempotencyKey, createdAt],
        );
      } catch (error) {
        // Concurrent duplicate: another tx inserted the same key first → treat as replay.
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
          await client.query('ROLLBACK');
          return this.loadByIdempotencyKey(input.idempotencyKey);
        }
        throw error;
      }

      const entries: Entry[] = [];
      for (const leg of input.legs) {
        const entryId = this.deps.generateEntryId();
        const currency = currencyById.get(leg.accountId)!;
        await client.query(
          'INSERT INTO settlement_entries (id, txn_id, account_id, amount_minor, currency, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [entryId, txnId, leg.accountId, leg.amountMinor, currency, createdAt],
        );
        entries.push({ id: entryId, accountId: leg.accountId, amountMinor: leg.amountMinor, currency, txnId });
      }

      await client.query('COMMIT');
      return { id: txnId, orderId: input.orderId, transition: input.transition, idempotencyKey: input.idempotencyKey, entries, createdAt };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  public async balance(accountId: string): Promise<number> {
    const r = await this.pool.query('SELECT COALESCE(SUM(amount_minor), 0) AS bal FROM settlement_entries WHERE account_id = $1', [accountId]);
    return toSafeInt(r.rows[0].bal);
  }

  public async transactionsForOrder(orderId: string): Promise<Array<{ id: string; transition: string }>> {
    const r = await this.pool.query('SELECT id, transition FROM settlement_transactions WHERE order_id = $1 ORDER BY created_at', [orderId]);
    return r.rows.map((row: { id: string; transition: string }) => ({ id: row.id, transition: row.transition }));
  }

  public async conservationViolations(): Promise<Array<{ currency: string; net: number }>> {
    const r = await this.pool.query(
      'SELECT currency, COALESCE(SUM(amount_minor), 0) AS net FROM settlement_entries GROUP BY currency HAVING COALESCE(SUM(amount_minor), 0) <> 0',
    );
    return r.rows.map((row: { currency: string; net: string }) => ({ currency: row.currency, net: toSafeInt(row.net) }));
  }

  private async loadByIdempotencyKey(key: string): Promise<Transaction> {
    const r = await this.pool.query('SELECT id FROM settlement_transactions WHERE idempotency_key = $1', [key]);
    if (!r.rowCount) throw new LedgerError(`idempotency replay lost: ${key}`);
    return this.loadTransaction(this.pool, r.rows[0].id as string);
  }

  private async loadTransaction(executor: pg.Pool | pg.PoolClient, txnId: string): Promise<Transaction> {
    const t = await executor.query('SELECT id, order_id, transition, idempotency_key, created_at FROM settlement_transactions WHERE id = $1', [txnId]);
    const row = t.rows[0] as { id: string; order_id: string; transition: string; idempotency_key: string; created_at: unknown };
    const e = await executor.query('SELECT id, account_id, amount_minor, currency FROM settlement_entries WHERE txn_id = $1', [txnId]);
    const entries: Entry[] = e.rows.map((er: { id: string; account_id: string; amount_minor: unknown; currency: string }) => ({
      id: er.id,
      accountId: er.account_id,
      amountMinor: toSafeInt(er.amount_minor),
      currency: er.currency,
      txnId,
    }));
    return { id: row.id, orderId: row.order_id, transition: row.transition, idempotencyKey: row.idempotency_key, createdAt: toIso(row.created_at), entries };
  }
}
