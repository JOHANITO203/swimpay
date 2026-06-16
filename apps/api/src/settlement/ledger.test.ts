import { beforeEach, describe, expect, it } from 'vitest';
import {
  Ledger,
  UnbalancedTransactionError,
  UnknownAccountError,
  type LedgerDeps,
} from './ledger.js';

function makeDeps(): LedgerDeps {
  let t = 0;
  let e = 0;
  return {
    generateTxnId: () => `txn_${++t}`,
    generateEntryId: () => `ent_${++e}`,
    now: () => '2026-06-16T10:00:00.000Z',
  };
}

describe('Ledger', () => {
  let ledger: Ledger;

  beforeEach(() => {
    ledger = new Ledger(makeDeps());
    ledger.openAccount({ id: 'ramp_in', owner: 'system', currency: 'USDT', type: 'ramp_in' });
    ledger.openAccount({ id: 'escrow_o1', owner: 'order1', currency: 'USDT', type: 'escrow' });
    ledger.openAccount({ id: 'fee', owner: 'system', currency: 'USDT', type: 'fee' });
    ledger.openAccount({ id: 'beneficiary', owner: 'm1', currency: 'USDT', type: 'beneficiary' });
    ledger.openAccount({ id: 'ramp_out', owner: 'system', currency: 'USDT', type: 'ramp_out' });
  });

  it('posts a balanced transaction and derives balances', () => {
    ledger.post({
      orderId: 'order1',
      transition: 'FUNDED',
      idempotencyKey: 'order1:FUNDED',
      legs: [
        { accountId: 'ramp_in', amountMinor: -100 },
        { accountId: 'escrow_o1', amountMinor: +100 },
      ],
    });

    expect(ledger.balance('escrow_o1')).toBe(100);
    expect(ledger.balance('ramp_in')).toBe(-100);
    expect(ledger.conservationViolations()).toEqual([]);
  });

  it('rejects an unbalanced transaction', () => {
    expect(() =>
      ledger.post({
        orderId: 'order1',
        transition: 'FUNDED',
        idempotencyKey: 'bad',
        legs: [
          { accountId: 'ramp_in', amountMinor: -100 },
          { accountId: 'escrow_o1', amountMinor: +90 },
        ],
      })
    ).toThrow(UnbalancedTransactionError);
  });

  it('rejects an unknown account', () => {
    expect(() =>
      ledger.post({
        orderId: 'order1',
        transition: 'X',
        idempotencyKey: 'k',
        legs: [
          { accountId: 'nope', amountMinor: -1 },
          { accountId: 'escrow_o1', amountMinor: +1 },
        ],
      })
    ).toThrow(UnknownAccountError);
  });

  it('is idempotent: re-posting the same key never double-counts (replay-safe)', () => {
    const input = {
      orderId: 'order1',
      transition: 'FUNDED',
      idempotencyKey: 'order1:FUNDED',
      legs: [
        { accountId: 'ramp_in', amountMinor: -100 },
        { accountId: 'escrow_o1', amountMinor: +100 },
      ],
    };
    const a = ledger.post(input);
    const b = ledger.post(input); // replay

    expect(b.id).toBe(a.id);
    expect(ledger.balance('escrow_o1')).toBe(100); // not 200
    expect(ledger.transactionsForOrder('order1')).toHaveLength(1);
  });

  it('models a full payout: fund → release (split + fee) → off-ramp, conserving money', () => {
    ledger.post({
      orderId: 'order1',
      transition: 'FUNDED',
      idempotencyKey: 'order1:FUNDED',
      legs: [
        { accountId: 'ramp_in', amountMinor: -100 },
        { accountId: 'escrow_o1', amountMinor: +100 },
      ],
    });
    ledger.post({
      orderId: 'order1',
      transition: 'RELEASE',
      idempotencyKey: 'order1:RELEASE',
      legs: [
        { accountId: 'escrow_o1', amountMinor: -100 },
        { accountId: 'fee', amountMinor: +2 },
        { accountId: 'beneficiary', amountMinor: +98 },
      ],
    });
    ledger.post({
      orderId: 'order1',
      transition: 'SETTLE',
      idempotencyKey: 'order1:SETTLE',
      legs: [
        { accountId: 'beneficiary', amountMinor: -98 },
        { accountId: 'ramp_out', amountMinor: +98 },
      ],
    });

    expect(ledger.balance('escrow_o1')).toBe(0);
    expect(ledger.balance('fee')).toBe(2);
    expect(ledger.balance('ramp_out')).toBe(98);
    expect(ledger.balance('beneficiary')).toBe(0);
    expect(ledger.conservationViolations()).toEqual([]);
  });

  it('corrects via reversing transaction, never by editing (append-only)', () => {
    ledger.post({
      orderId: 'order1',
      transition: 'FUNDED',
      idempotencyKey: 'order1:FUNDED',
      legs: [
        { accountId: 'ramp_in', amountMinor: -100 },
        { accountId: 'escrow_o1', amountMinor: +100 },
      ],
    });
    // Refund: reverse it.
    ledger.post({
      orderId: 'order1',
      transition: 'REFUND',
      idempotencyKey: 'order1:REFUND',
      legs: [
        { accountId: 'escrow_o1', amountMinor: -100 },
        { accountId: 'ramp_in', amountMinor: +100 },
      ],
    });

    expect(ledger.balance('escrow_o1')).toBe(0);
    expect(ledger.balance('ramp_in')).toBe(0);
    expect(ledger.transactionsForOrder('order1')).toHaveLength(2); // both kept
  });

  it('balances each currency independently in a cross-currency (bridge) transaction', () => {
    ledger.openAccount({ id: 'escrow_usd', owner: 'order2', currency: 'USD', type: 'escrow' });
    ledger.openAccount({ id: 'bridge_usd', owner: 'system', currency: 'USD', type: 'fx_bridge' });
    ledger.openAccount({ id: 'bridge_usdt', owner: 'system', currency: 'USDT', type: 'fx_bridge' });
    ledger.openAccount({ id: 'escrow_usdt', owner: 'order2', currency: 'USDT', type: 'escrow' });

    // Convert 100 USD → 100 USDT: each currency nets to zero via its own bridge leg.
    ledger.post({
      orderId: 'order2',
      transition: 'CONVERT',
      idempotencyKey: 'order2:CONVERT',
      legs: [
        { accountId: 'escrow_usd', amountMinor: -100 },
        { accountId: 'bridge_usd', amountMinor: +100 },
        { accountId: 'bridge_usdt', amountMinor: -100 },
        { accountId: 'escrow_usdt', amountMinor: +100 },
      ],
    });

    expect(ledger.balance('escrow_usdt')).toBe(100);
    expect(ledger.conservationViolations()).toEqual([]);
  });
});
