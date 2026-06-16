import { describe, expect, it } from 'vitest';
import { createOrder, type CreateOrderInput, type OrderRules } from './payment-order.js';
import {
  defaultRules,
  evaluateRules,
  planSwarm,
  SwarmError,
  type RuleContext,
} from './rules-engine.js';

function order(rules: OrderRules = {}, amountInMinor = 10_000) {
  const input: CreateOrderInput = {
    id: 'o1',
    idempotencyKey: 'o1',
    createdAt: '2026-06-16T10:00:00.000Z',
    payer: { id: 'agent', type: 'agent_ai' },
    amountInMinor,
    currencyIn: 'USD',
    currencyOut: 'XOF',
    beneficiaries: [{ id: 'b1', method: 'mobile_money', shareBps: 10_000 }],
    rules,
  };
  return createOrder(input);
}

const now = '2026-06-16T10:00:00.000Z';
const okCtx: RuleContext = { now, kycTier: 3, conditionMet: () => true };

describe('rules engine — authorization', () => {
  it('allows a clean order', () => {
    expect(evaluateRules(order(), 'authorization', okCtx).decision).toBe('allow');
  });

  it('kill-switch denies everything', () => {
    expect(evaluateRules(order(), 'authorization', { ...okCtx, killed: true }).decision).toBe('deny');
  });

  it('plafond denies an amount over the cap (evaluated on the aggregate)', () => {
    const r = evaluateRules(order({ maxAmountMinor: 5_000 }, 10_000), 'authorization', okCtx);
    expect(r.decision).toBe('deny');
    expect(r.reasons).toContain('amount_exceeds_cap');
  });

  it('allowlist denies a beneficiary that is not listed', () => {
    expect(evaluateRules(order({ beneficiaryAllowlist: ['someone_else'] }), 'authorization', okCtx).decision).toBe('deny');
    expect(evaluateRules(order({ beneficiaryAllowlist: ['b1'] }), 'authorization', okCtx).decision).toBe('allow');
  });

  it('kyc denies when the tier is insufficient or missing (deny-by-default)', () => {
    expect(evaluateRules(order({ kycTierRequired: 2 }), 'authorization', { now }).decision).toBe('deny'); // no tier
    expect(evaluateRules(order({ kycTierRequired: 2 }), 'authorization', { now, kycTier: 1 }).decision).toBe('deny');
    expect(evaluateRules(order({ kycTierRequired: 2 }), 'authorization', { now, kycTier: 2 }).decision).toBe('allow');
  });

  it('screening and velocity deny', () => {
    expect(evaluateRules(order(), 'authorization', { ...okCtx, screeningFlagged: true }).decision).toBe('deny');
    expect(
      evaluateRules(order(), 'authorization', { ...okCtx, velocity: { countInWindow: 10, amountInWindowMinor: 0, maxCount: 10 } }).decision
    ).toBe('deny');
  });

  it('expiration denies a past-due order', () => {
    expect(evaluateRules(order({ expiresAt: '2026-06-16T09:00:00.000Z' }), 'authorization', okCtx).decision).toBe('deny');
  });

  it('short-circuits on the cheapest deny (kill-switch before kyc)', () => {
    const r = evaluateRules(order({ kycTierRequired: 9 }), 'authorization', { now, killed: true });
    expect(r.decision).toBe('deny');
    expect(r.reasons).toEqual(['kill_switch']); // not kyc — kill-switch is cheaper, wins first
  });
});

describe('rules engine — release', () => {
  it('holds while the release condition is unmet, allows once met', () => {
    const o = order({ releaseCondition: 'delivery_confirmed' });
    expect(evaluateRules(o, 'release', { now, conditionMet: () => false }).decision).toBe('hold');
    expect(evaluateRules(o, 'release', { now, conditionMet: () => true }).decision).toBe('allow');
  });
});

describe('planSwarm — execution sharding (never identity)', () => {
  it('shards 1000 into 20 caps of 50', () => {
    const shards = planSwarm(1000, 50);
    expect(shards).toHaveLength(20);
    expect(shards.every((s) => s === 50)).toBe(true);
    expect(shards.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('handles a remainder shard and always sums to the total', () => {
    const shards = planSwarm(1000, 300);
    expect(shards).toEqual([300, 300, 300, 100]);
    expect(shards.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('returns a single shard when amount ≤ cap (no swarm)', () => {
    expect(planSwarm(40, 50)).toEqual([40]);
  });

  it('rejects bad inputs', () => {
    expect(() => planSwarm(0, 50)).toThrow(SwarmError);
    expect(() => planSwarm(100, 0)).toThrow(SwarmError);
  });

  it('cannot be used to slip under a compliance cap: the aggregate is denied before any shard', () => {
    // The full $1000 order is over the $50 *compliance* cap → denied at authorization.
    // Sharding never even happens. (Structuring is structurally impossible here.)
    const o = order({ maxAmountMinor: 50 }, 1000);
    expect(evaluateRules(o, 'authorization', okCtx).decision).toBe('deny');
  });
});

describe('defaultRules', () => {
  it('exposes the full catalogue', () => {
    expect(defaultRules().map((r) => r.name)).toEqual([
      'kill_switch', 'expiration', 'plafond', 'velocity', 'allowlist', 'screening', 'kyc', 'release_condition',
    ]);
  });
});
