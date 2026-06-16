import { describe, expect, it } from 'vitest';
import { InMemoryLedgerStore } from './ledger-store.js';
import type { LedgerDeps } from './ledger.js';

function deps(): LedgerDeps {
  let t = 0;
  let e = 0;
  return { generateTxnId: () => `txn_${++t}`, generateEntryId: () => `ent_${++e}`, now: () => '2026-06-16T10:00:00.000Z' };
}

async function seeded(): Promise<InMemoryLedgerStore> {
  const s = new InMemoryLedgerStore(deps());
  await s.openAccount({ id: 'a', owner: 'system', currency: 'USDT', type: 'ramp_in' });
  await s.openAccount({ id: 'b', owner: 'o1', currency: 'USDT', type: 'escrow' });
  return s;
}

const funded = { orderId: 'o1', transition: 'FUNDED', idempotencyKey: 'o1:FUNDED', legs: [{ accountId: 'a', amountMinor: -100 }, { accountId: 'b', amountMinor: 100 }] };

describe('InMemoryLedgerStore', () => {
  it('posts balanced, derives balances, conserves', async () => {
    const s = await seeded();
    await s.post(funded);
    expect(await s.balance('b')).toBe(100);
    expect(await s.balance('a')).toBe(-100);
    expect(await s.conservationViolations()).toEqual([]);
  });

  it('is idempotent on replay', async () => {
    const s = await seeded();
    await s.post(funded);
    await s.post(funded);
    expect(await s.balance('b')).toBe(100);
    expect(await s.transactionsForOrder('o1')).toHaveLength(1);
  });
});
