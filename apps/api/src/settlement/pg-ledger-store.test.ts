/**
 * PgLedgerStore integration test.
 *
 * Runs ONLY when DATABASE_URL points at a Postgres (otherwise skipped). This is the
 * real verification harness for the durable ledger — author-unverified in the
 * environment it was written in (no DB there). Apply migration 033 first, or rely
 * on the inline DDL below (a subset, sufficient for the ledger tables).
 *
 *   DATABASE_URL=postgres://… npx vitest run apps/api/src/settlement/pg-ledger-store.test.ts
 */

import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UnbalancedTransactionError } from './ledger.js';
import { PgLedgerStore } from './pg-ledger-store.js';

const url = process.env.DATABASE_URL;

const DDL = `
CREATE TABLE IF NOT EXISTS settlement_accounts (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, currency TEXT NOT NULL,
  type TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS settlement_transactions (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL, transition TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS settlement_entries (
  id TEXT PRIMARY KEY, txn_id TEXT NOT NULL, account_id TEXT NOT NULL,
  amount_minor BIGINT NOT NULL, currency TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
`;

describe.skipIf(!url)('PgLedgerStore (integration — requires DATABASE_URL)', () => {
  let pool: pg.Pool;
  let store: PgLedgerStore;
  let seq = 0;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, max: 4 });
    await pool.query(DDL);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE settlement_entries, settlement_transactions, settlement_accounts');
    seq = 0;
    store = new PgLedgerStore(pool, {
      generateTxnId: () => `txn_${++seq}`,
      generateEntryId: () => `ent_${++seq}`,
      now: () => '2026-06-16T10:00:00.000Z',
    });
    await store.openAccount({ id: 'a', owner: 'system', currency: 'USDT', type: 'ramp_in' });
    await store.openAccount({ id: 'b', owner: 'o1', currency: 'USDT', type: 'escrow' });
  });

  const funded = { orderId: 'o1', transition: 'FUNDED', idempotencyKey: 'o1:FUNDED', legs: [{ accountId: 'a', amountMinor: -100 }, { accountId: 'b', amountMinor: 100 }] };

  it('posts a balanced transaction and derives balances', async () => {
    await store.post(funded);
    expect(await store.balance('b')).toBe(100);
    expect(await store.balance('a')).toBe(-100);
    expect(await store.conservationViolations()).toEqual([]);
  });

  it('is idempotent on replay (unique idempotency_key)', async () => {
    await store.post(funded);
    await store.post(funded);
    expect(await store.balance('b')).toBe(100);
    expect(await store.transactionsForOrder('o1')).toHaveLength(1);
  });

  it('rejects an unbalanced transaction', async () => {
    await expect(
      store.post({ orderId: 'o1', transition: 'X', idempotencyKey: 'bad', legs: [{ accountId: 'a', amountMinor: -100 }, { accountId: 'b', amountMinor: 90 }] }),
    ).rejects.toBeInstanceOf(UnbalancedTransactionError);
  });
});
