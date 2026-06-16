/**
 * Rules engine — deterministic guards on order transitions.
 *
 * A rule is a guard: before a transition creates a ledger transaction, every
 * attached rule is evaluated. One DENY → no transition → no money moves.
 *   evaluate(order, ctx) → allow | deny(reason) | hold(reason)
 *   - deny  : will never pass as-is → REJETÉ / EXPIRÉ.
 *   - hold  : will pass once something changes (condition pending) → stay HELD.
 * deny-by-default, ANDed, cheapest rules first (short-circuit on first deny).
 * Pure & deterministic: all external facts arrive via RuleContext.
 *
 * Swarm: compliance rules ALWAYS evaluate on the PARENT aggregate (the full
 * order amount). Only after the aggregate is authorized may execution be sharded
 * into technical-cap-sized legs (planSwarm). The swarm shards EXECUTION, never
 * IDENTITY — so it can never be used to slip under a compliance cap (structuring).
 */

import type { PaymentOrder } from './payment-order.js';

export type RuleDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'hold'; reason: string };

export type EvaluationPoint = 'authorization' | 'release';

export interface RuleContext {
  now: string;
  /** Payer's verified KYC tier (from the licensed ramp), measured on the aggregate. */
  kycTier?: number;
  killed?: boolean;
  velocity?: { countInWindow: number; amountInWindowMinor: number; maxCount?: number; maxAmountMinor?: number };
  screeningFlagged?: boolean;
  /** Resolves a release condition to met/unmet. */
  conditionMet?: (condition: string) => boolean;
}

export interface Rule {
  name: string;
  points: readonly EvaluationPoint[];
  /** Lower = evaluated earlier (local/instant before external calls). */
  cost: number;
  evaluate(order: PaymentOrder, ctx: RuleContext): RuleDecision;
}

const allow: RuleDecision = { kind: 'allow' };
const deny = (reason: string): RuleDecision => ({ kind: 'deny', reason });
const hold = (reason: string): RuleDecision => ({ kind: 'hold', reason });

// ─── Catalogue ─────────────────────────────────────────────────────────────────

export const killSwitchRule: Rule = {
  name: 'kill_switch',
  points: ['authorization'],
  cost: 0,
  evaluate: (_order, ctx) => (ctx.killed ? deny('kill_switch') : allow),
};

export const expirationRule: Rule = {
  name: 'expiration',
  points: ['authorization', 'release'],
  cost: 1,
  evaluate: (order, ctx) => {
    const exp = order.rules.expiresAt;
    if (exp && Date.parse(ctx.now) > Date.parse(exp)) return deny('expired');
    return allow;
  },
};

export const plafondRule: Rule = {
  name: 'plafond',
  points: ['authorization'],
  cost: 2,
  evaluate: (order) => {
    const cap = order.rules.maxAmountMinor;
    // Evaluated on the AGGREGATE (full order amount) — the anti-structuring guard.
    if (typeof cap === 'number' && order.amountInMinor > cap) return deny('amount_exceeds_cap');
    return allow;
  },
};

export const velocityRule: Rule = {
  name: 'velocity',
  points: ['authorization'],
  cost: 3,
  evaluate: (_order, ctx) => {
    const v = ctx.velocity;
    if (!v) return allow;
    if (typeof v.maxCount === 'number' && v.countInWindow >= v.maxCount) return deny('velocity_count_exceeded');
    if (typeof v.maxAmountMinor === 'number' && v.amountInWindowMinor >= v.maxAmountMinor) return deny('velocity_amount_exceeded');
    return allow;
  },
};

export const allowlistRule: Rule = {
  name: 'allowlist',
  points: ['authorization'],
  cost: 4,
  evaluate: (order) => {
    const list = order.rules.beneficiaryAllowlist;
    if (!list) return allow;
    const set = new Set(list);
    for (const b of order.beneficiaries) {
      if (!set.has(b.id)) return deny('beneficiary_not_allowlisted');
    }
    return allow;
  },
};

export const screeningRule: Rule = {
  name: 'screening',
  points: ['authorization'],
  cost: 5,
  evaluate: (_order, ctx) => (ctx.screeningFlagged ? deny('screening_flagged') : allow),
};

export const kycRule: Rule = {
  name: 'kyc',
  points: ['authorization'],
  cost: 6,
  evaluate: (order, ctx) => {
    const required = order.rules.kycTierRequired;
    if (typeof required !== 'number') return allow;
    // deny-by-default: missing tier when one is required.
    if (typeof ctx.kycTier !== 'number' || ctx.kycTier < required) return deny('kyc_insufficient');
    return allow;
  },
};

export const releaseConditionRule: Rule = {
  name: 'release_condition',
  points: ['release'],
  cost: 1,
  evaluate: (order, ctx) => {
    const cond = order.rules.releaseCondition;
    if (!cond) return allow;
    const met = ctx.conditionMet?.(cond) ?? false;
    return met ? allow : hold('condition_pending');
  },
};

export function defaultRules(): Rule[] {
  return [
    killSwitchRule,
    expirationRule,
    plafondRule,
    velocityRule,
    allowlistRule,
    screeningRule,
    kycRule,
    releaseConditionRule,
  ];
}

// ─── Evaluation ─────────────────────────────────────────────────────────────────

export interface EvaluationResult {
  decision: 'allow' | 'deny' | 'hold';
  reasons: string[];
}

/**
 * Evaluate all rules that apply at `point`, cheapest-first, deny-by-default.
 * First DENY short-circuits. Otherwise any HOLD makes the result a hold; else allow.
 */
export function evaluateRules(
  order: PaymentOrder,
  point: EvaluationPoint,
  ctx: RuleContext,
  rules: Rule[] = defaultRules(),
): EvaluationResult {
  const applicable = rules.filter((r) => r.points.includes(point)).sort((a, b) => a.cost - b.cost);
  const holds: string[] = [];
  for (const rule of applicable) {
    const d = rule.evaluate(order, ctx);
    if (d.kind === 'deny') return { decision: 'deny', reasons: [d.reason] };
    if (d.kind === 'hold') holds.push(d.reason);
  }
  return holds.length > 0 ? { decision: 'hold', reasons: holds } : { decision: 'allow', reasons: [] };
}

// ─── Swarm planning ─────────────────────────────────────────────────────────────

export class SwarmError extends Error {}

/**
 * Split an authorized aggregate into technical-cap-sized shards. MUST be called
 * only AFTER the aggregate has been authorized (compliance rules evaluated on the
 * full amount). Shards sum exactly to the total; count = ceil(amount / cap).
 */
export function planSwarm(amountInMinor: number, technicalCapMinor: number): number[] {
  if (!Number.isSafeInteger(amountInMinor) || amountInMinor <= 0) throw new SwarmError('amount must be a positive integer');
  if (!Number.isSafeInteger(technicalCapMinor) || technicalCapMinor <= 0) throw new SwarmError('cap must be a positive integer');
  if (amountInMinor <= technicalCapMinor) return [amountInMinor];

  const fullShards = Math.floor(amountInMinor / technicalCapMinor);
  const remainder = amountInMinor - fullShards * technicalCapMinor;
  const shards = new Array<number>(fullShards).fill(technicalCapMinor);
  if (remainder > 0) shards.push(remainder);
  return shards;
}
