/**
 * Settlement API service — the new SDK payment-flow surface.
 *
 * Reshapes the SDK from the historical *receive-only* model (detect an incoming
 * payment) to the *programmable payment order* model (drive a payer→beneficiary
 * flow). One call creates an order and runs it through the deterministic engine
 * to its resting state (RECONCILED / HELD / REJECTED / REFUNDED / FAILED).
 *
 * HONESTY: the physical edges are SIMULATED (SimulatedRails). Every response
 * carries `simulation: true` and `rail_mode: 'simulated'` so nothing is mistaken
 * for live settlement. The deterministic core (ledger/rules/swarm/reconciliation)
 * is real. State is held in-memory per server instance (not yet DB-backed).
 */

import type { FxRouteResult } from '../fx.js';
import { InMemoryLedgerStore, type LedgerStore } from './ledger-store.js';
import {
  createOrder,
  OrderError,
  type Beneficiary,
  type OrderRules,
  type PayerType,
  type PaymentOrder,
} from './payment-order.js';
import { Reconciler } from './reconciliation.js';
import type { RuleContext } from './rules-engine.js';
import { SimulatedRails } from './settlement-rails.js';
import { SettlementEngine, type Converter, type SettlementResult } from './settlement-engine.js';

export interface FxQuoter {
  quote(source: string, target: string, amountMinor: number, sourceMinorDigits: number, targetMinorDigits: number): Promise<FxRouteResult>;
}

/** Converter backed by FxRateService; identity for same-currency, null when unavailable. */
export class FxRateConverter implements Converter {
  public constructor(private readonly fx: FxQuoter | null) {}

  public async convert(amountMinor: number, from: string, to: string, fromDigits: number, toDigits: number) {
    if (from.toUpperCase() === to.toUpperCase()) {
      return { amountOutMinor: amountMinor, rate: '1', source: 'identity' };
    }
    if (!this.fx) return null;
    const r = await this.fx.quote(from, to, amountMinor, fromDigits, toDigits);
    if (r.kind !== 'ok') return null;
    return { amountOutMinor: r.quote.amountMinorTarget, rate: r.quote.rate, source: r.quote.source };
  }
}

export interface SettlementCreateInput {
  payer: { id: string; type: PayerType };
  amountInMinor: number;
  currencyIn: string;
  currencyOut: string;
  beneficiaries: Beneficiary[];
  rules?: OrderRules;
  /** SIMULATION input: resolves a release condition (in prod this comes from reconciliation). */
  releaseConditionMet?: boolean;
  /** Swarm shard cap in currencyOut minor units (config; large ⇒ no sharding). */
  technicalCapMinor?: number;
  idempotencyKey?: string;
}

export interface SettlementServiceDeps {
  fxQuoter: FxQuoter | null;
  minorDigits: (currency: string) => number;
  now: () => string;
  generateId: (prefix: string) => string;
  defaultTechnicalCapMinor?: number;
  simulatedKycTier?: number;
  /** Durable store (PgLedgerStore) in production; defaults to in-memory. */
  ledgerStore?: LedgerStore;
}

export class SettlementService {
  public readonly simulation = true as const;
  private readonly ledger: LedgerStore;
  private readonly reconciler: Reconciler;
  private readonly converter: Converter;
  private readonly results = new Map<string, SettlementResult>();
  private readonly d: SettlementServiceDeps;

  public constructor(deps: SettlementServiceDeps) {
    this.d = deps;
    this.ledger = deps.ledgerStore ?? new InMemoryLedgerStore({
      generateTxnId: () => deps.generateId('txn'),
      generateEntryId: () => deps.generateId('ent'),
      now: deps.now,
    });
    this.reconciler = new Reconciler();
    this.converter = new FxRateConverter(deps.fxQuoter);
  }

  private engineFor(technicalCapMinor: number): SettlementEngine {
    return new SettlementEngine({
      ledger: this.ledger,
      rails: new SimulatedRails({ generateRef: () => this.d.generateId('rail') }),
      reconciler: this.reconciler,
      converter: this.converter,
      minorDigits: this.d.minorDigits,
      technicalCapMinor,
    });
  }

  public async createAndSettle(input: SettlementCreateInput): Promise<SettlementResult> {
    const id = this.d.generateId('ord');
    const order = createOrder({
      id,
      idempotencyKey: input.idempotencyKey ?? id,
      createdAt: this.d.now(),
      payer: input.payer,
      amountInMinor: input.amountInMinor,
      currencyIn: input.currencyIn,
      currencyOut: input.currencyOut,
      beneficiaries: input.beneficiaries,
      ...(input.rules ? { rules: input.rules } : {}),
    });

    const ctx: RuleContext = {
      now: this.d.now(),
      kycTier: this.d.simulatedKycTier ?? 3,
      conditionMet: () => input.releaseConditionMet ?? true,
    };

    const cap = input.technicalCapMinor ?? this.d.defaultTechnicalCapMinor ?? Number.MAX_SAFE_INTEGER;
    const result = await this.engineFor(cap).settle(order, ctx);
    this.results.set(id, result);
    return result;
  }

  public getResult(id: string): SettlementResult | null {
    return this.results.get(id) ?? null;
  }

  public async retryPending(id: string): Promise<SettlementResult | null> {
    const existing = this.results.get(id);
    if (!existing) return null;
    const result = await this.engineFor(Number.MAX_SAFE_INTEGER).deliverPending(existing.order);
    this.results.set(id, result);
    return result;
  }

  public async transactionsForOrder(id: string): Promise<Array<{ id: string; transition: string }>> {
    return this.ledger.transactionsForOrder(id);
  }
}

// ─── Request validation & response shaping (the SDK contract) ─────────────────

export type SettlementValidation =
  | { valid: true; value: SettlementCreateInput }
  | { valid: false; message: string };

const PAYER_TYPES: ReadonlySet<string> = new Set(['human', 'agent_ai', 'peer']);
const METHODS: ReadonlySet<string> = new Set(['mobile_money', 'bank', 'stablecoin']);

export function parseSettlementRequest(body: unknown, payerId: string): SettlementValidation {
  const b = (body ?? {}) as Record<string, unknown>;

  const amountInMinor = b.amount_minor;
  if (typeof amountInMinor !== 'number' || !Number.isSafeInteger(amountInMinor) || amountInMinor <= 0) {
    return { valid: false, message: 'amount_minor must be a positive integer' };
  }
  if (typeof b.currency_in !== 'string' || typeof b.currency_out !== 'string' || !b.currency_in || !b.currency_out) {
    return { valid: false, message: 'currency_in and currency_out are required' };
  }
  if (!Array.isArray(b.beneficiaries) || b.beneficiaries.length === 0) {
    return { valid: false, message: 'at least one beneficiary is required' };
  }

  const beneficiaries: Beneficiary[] = [];
  for (const raw of b.beneficiaries as unknown[]) {
    const r = (raw ?? {}) as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id) return { valid: false, message: 'beneficiary.id is required' };
    if (typeof r.method !== 'string' || !METHODS.has(r.method)) return { valid: false, message: `beneficiary.method must be one of ${[...METHODS].join(', ')}` };
    const beneficiary: Beneficiary = { id: r.id, method: r.method as Beneficiary['method'] };
    if (typeof r.share_bps === 'number') beneficiary.shareBps = r.share_bps;
    if (typeof r.fixed_minor === 'number') beneficiary.fixedMinor = r.fixed_minor;
    beneficiaries.push(beneficiary);
  }

  const payerType = typeof b.payer_type === 'string' && PAYER_TYPES.has(b.payer_type) ? (b.payer_type as PayerType) : 'agent_ai';

  const rules: OrderRules = {};
  const rawRules = (b.rules ?? {}) as Record<string, unknown>;
  if (typeof rawRules.max_amount_minor === 'number') rules.maxAmountMinor = rawRules.max_amount_minor;
  if (Array.isArray(rawRules.beneficiary_allowlist)) rules.beneficiaryAllowlist = (rawRules.beneficiary_allowlist as unknown[]).filter((x): x is string => typeof x === 'string');
  if (typeof rawRules.kyc_tier_required === 'number') rules.kycTierRequired = rawRules.kyc_tier_required;
  if (typeof rawRules.release_condition === 'string') rules.releaseCondition = rawRules.release_condition;
  if (typeof rawRules.expires_at === 'string') rules.expiresAt = rawRules.expires_at;

  const value: SettlementCreateInput = {
    payer: { id: payerId, type: payerType },
    amountInMinor,
    currencyIn: b.currency_in,
    currencyOut: b.currency_out,
    beneficiaries,
    ...(Object.keys(rules).length ? { rules } : {}),
    ...(typeof b.release_condition_met === 'boolean' ? { releaseConditionMet: b.release_condition_met } : {}),
    ...(typeof b.technical_cap_minor === 'number' ? { technicalCapMinor: b.technical_cap_minor } : {}),
  };
  return { valid: true, value };
}

export function toSettlementResponse(result: SettlementResult, transactions: Array<{ id: string; transition: string }>) {
  const o = result.order;
  return {
    simulation: true,
    rail_mode: 'simulated' as const,
    order: {
      id: o.id,
      state: o.state,
      payer: o.payer,
      amount_in_minor: o.amountInMinor,
      currency_in: o.currencyIn,
      currency_out: o.currencyOut,
      channel: o.channel,
      beneficiaries: o.beneficiaries.map((b) => ({ id: b.id, method: b.method, share_bps: b.shareBps ?? null, fixed_minor: b.fixedMinor ?? null })),
      rules: o.rules,
    },
    settlement: {
      reconciled: result.reconciled,
      pending_leg_ids: result.pendingLegIds,
      conservation_ok: result.conservationViolations.length === 0,
    },
    ledger: { transactions },
    ...(result.decision ? { decision: result.decision } : {}),
  };
}
