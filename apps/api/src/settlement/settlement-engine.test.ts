import { beforeEach, describe, expect, it } from 'vitest';
import { type LedgerDeps } from './ledger.js';
import { InMemoryLedgerStore } from './ledger-store.js';
import { createOrder, type CreateOrderInput, type OrderRules } from './payment-order.js';
import { Reconciler } from './reconciliation.js';
import { defaultRules, type Rule } from './rules-engine.js';
import { SimulatedRails } from './settlement-rails.js';
import { computeSplit, SettlementEngine, type Converter } from './settlement-engine.js';

function ledgerDeps(): LedgerDeps {
  let t = 0;
  let e = 0;
  return { generateTxnId: () => `txn_${++t}`, generateEntryId: () => `ent_${++e}`, now: () => '2026-06-16T10:00:00.000Z' };
}

function railRef(prefix = 'sim') {
  let n = 0;
  return () => `${prefix}_${++n}`;
}

const DIGITS: Record<string, number> = { USD: 2, USDT: 2, EUR: 2, XOF: 0 };
const minorDigits = (c: string) => DIGITS[c.toUpperCase()] ?? 2;

const identityConverter: Converter = {
  async convert(amountMinor) {
    return { amountOutMinor: amountMinor, rate: '1', source: 'identity' };
  },
};
const bridgeConverter: Converter = {
  async convert(amountMinor, _from, _to, fd, td) {
    const rate = 600;
    return { amountOutMinor: Math.round(amountMinor * rate * (10 ** td / 10 ** fd)), rate: String(rate), source: 'stub' };
  },
};

const now = '2026-06-16T10:00:00.000Z';
const okCtx = { now, kycTier: 3, conditionMet: () => true };

function order(overrides: Partial<CreateOrderInput> = {}) {
  return createOrder({
    id: 'o1',
    idempotencyKey: 'o1',
    createdAt: now,
    payer: { id: 'agent', type: 'agent_ai' },
    amountInMinor: 200,
    currencyIn: 'USDT',
    currencyOut: 'USDT',
    beneficiaries: [{ id: 'b1', method: 'mobile_money', shareBps: 10_000 }],
    ...overrides,
  });
}

function buildEngine(opts: { failLegs?: Set<string>; converter?: Converter; rules?: Rule[]; cap?: number } = {}) {
  const ledger = new InMemoryLedgerStore(ledgerDeps());
  const reconciler = new Reconciler();
  const rails = new SimulatedRails({ generateRef: railRef(), ...(opts.failLegs ? { failLegs: opts.failLegs } : {}) });
  const engine = new SettlementEngine({
    ledger,
    rails,
    reconciler,
    converter: opts.converter ?? identityConverter,
    minorDigits,
    technicalCapMinor: opts.cap ?? 50,
    ...(opts.rules ? { rules: opts.rules } : {}),
  });
  return { ledger, reconciler, rails, engine };
}

describe('settlement engine — end to end', () => {
  it('drives a direct order to RECONCILED, sharded by the swarm, money conserved', async () => {
    const { ledger, engine } = buildEngine({ cap: 50 }); // 200 / 50 = 4 shards
    const res = await engine.settle(order(), okCtx);

    expect(res.state).toBe('RECONCILED');
    expect(res.reconciled).toBe(true);
    expect(res.conservationViolations).toEqual([]);
    expect(res.pendingLegIds).toEqual([]);
    expect(await ledger.balance('ramp_out:o1')).toBe(200);
    expect(await ledger.balance('escrow_in:o1')).toBe(0);
    expect(await ledger.balance('benef:o1:b1')).toBe(0);
  });

  it('splits across multiple beneficiaries exactly (no minor unit lost)', async () => {
    const { ledger, engine } = buildEngine({ cap: 1000 });
    const o = order({
      amountInMinor: 1000,
      beneficiaries: [
        { id: 'seller', method: 'mobile_money', shareBps: 9000 },
        { id: 'courier', method: 'mobile_money', shareBps: 1000 },
      ],
    });
    const res = await engine.settle(o, okCtx);

    expect(res.state).toBe('RECONCILED');
    expect(await ledger.balance('ramp_out:o1')).toBe(1000);
    expect(res.conservationViolations).toEqual([]);
  });

  it('refuses at authorization (over plafond) → REJECTED, no money moves', async () => {
    const { ledger, engine } = buildEngine();
    const res = await engine.settle(order({ rules: { maxAmountMinor: 50 } as OrderRules }), okCtx);

    expect(res.state).toBe('REJECTED');
    expect(await ledger.balance('escrow_in:o1')).toBe(0);
    expect(res.conservationViolations).toEqual([]);
  });

  it('holds while a release condition is unmet (parks in HELD, not reconciled)', async () => {
    const { engine } = buildEngine();
    const res = await engine.settle(order({ rules: { releaseCondition: 'delivery' } }), { now, conditionMet: () => false });
    expect(res.state).toBe('HELD');
    expect(res.reconciled).toBe(false);
  });

  it('releases once the condition is met → RECONCILED', async () => {
    const { engine } = buildEngine({ cap: 1000 });
    const res = await engine.settle(order({ rules: { releaseCondition: 'delivery' } }), okCtx);
    expect(res.state).toBe('RECONCILED');
  });

  it('partial swarm: a failed shard stays pending, money conserved, then retry → RECONCILED', async () => {
    const { ledger, engine } = buildEngine({ cap: 50, failLegs: new Set(['o1:out:b1:1']) });
    const res = await engine.settle(order(), okCtx);

    expect(res.state).toBe('SETTLED');
    expect(res.reconciled).toBe(false);
    expect(res.pendingLegIds).toContain('o1:out:b1:1');
    expect(res.conservationViolations).toEqual([]); // undelivered shard still on beneficiary
    expect(await ledger.balance('benef:o1:b1')).toBe(50);

    // Retry with healthy rails → the pending shard delivers, order reconciles.
    // Distinct ref prefix: real proof references (tx hashes) are globally unique.
    const healthy = new SimulatedRails({ generateRef: railRef('retry') });
    const retried = await engine.deliverPending(res.order, healthy);
    expect(retried.state).toBe('RECONCILED');
    expect(await ledger.balance('ramp_out:o1')).toBe(200);
    expect(await ledger.balance('benef:o1:b1')).toBe(0);
  });

  it('refunds the payer when release is denied, money conserved', async () => {
    const denyRelease: Rule = { name: 'deny_release', points: ['release'], cost: 0, evaluate: () => ({ kind: 'deny', reason: 'blocked' }) };
    const { ledger, engine } = buildEngine({ rules: [...defaultRules(), denyRelease] });
    const res = await engine.settle(order({ rules: { releaseCondition: 'delivery' } }), okCtx);

    expect(res.state).toBe('REFUNDED');
    expect(await ledger.balance('payer_refund:o1')).toBe(200);
    expect(await ledger.balance('escrow_in:o1')).toBe(0);
    expect(res.conservationViolations).toEqual([]);
  });

  it('bridges a cross-currency order (USD→XOF), conserving each currency independently', async () => {
    const { ledger, engine } = buildEngine({ converter: bridgeConverter, cap: 1_000_000 });
    const o = order({ amountInMinor: 10_000, currencyIn: 'USD', currencyOut: 'XOF' });
    const res = await engine.settle(o, okCtx);

    expect(res.state).toBe('RECONCILED');
    expect(res.conservationViolations).toEqual([]); // both USD and XOF net to zero
    expect(await ledger.balance('ramp_out:o1')).toBe(60_000); // 100 USD @ 600
    expect(await ledger.balance('escrow_out:o1')).toBe(0);
  });
});

describe('computeSplit', () => {
  it('distributes shares with the remainder going to the last share (loss-free)', () => {
    const split = computeSplit(1000, [
      { id: 'a', method: 'bank', shareBps: 3333 },
      { id: 'b', method: 'bank', shareBps: 6667 },
    ]);
    expect(split.get('a')! + split.get('b')!).toBe(1000);
  });

  it('takes fixed amounts first, then shares the rest', () => {
    const split = computeSplit(1000, [
      { id: 'fee', method: 'bank', fixedMinor: 100 },
      { id: 'main', method: 'bank', shareBps: 10_000 },
    ]);
    expect(split.get('fee')).toBe(100);
    expect(split.get('main')).toBe(900);
  });
});
