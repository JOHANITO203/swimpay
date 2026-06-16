/**
 * PaymentOrder — the one programmable object the whole core revolves around.
 *
 * A payer (human | agent_ai | peer — irrelevant to the machine) issues an order;
 * the engine drives it through the state machine; each transition produces one
 * balanced ledger transaction. Orders are immutable values: a transition returns
 * a NEW order. The machine here enforces only STRUCTURAL legality of moves; the
 * business guards (limits, KYC, allowlist, conditions) live in the rules engine.
 *
 * RECONCILED is the only terminal success — never declare done at SETTLED.
 */

export type OrderState =
  | 'QUOTED'
  | 'AUTHORIZED'
  | 'FUNDED'
  | 'HELD'
  | 'RELEASING'
  | 'SETTLED'
  | 'RECONCILED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'FAILED';

export type PayerType = 'human' | 'agent_ai' | 'peer';
export type BeneficiaryMethod = 'mobile_money' | 'bank' | 'stablecoin';

export interface Beneficiary {
  id: string;
  method: BeneficiaryMethod;
  /** Share of the net amount in basis points (1% = 100 bps), OR a fixed amount. Exactly one. */
  shareBps?: number;
  fixedMinor?: number;
}

export interface OrderRules {
  maxAmountMinor?: number;
  beneficiaryAllowlist?: string[];
  kycTierRequired?: number;
  /** Identifier the engine/reconciliation resolves (e.g. 'delivery_confirmed'). Presence ⇒ escrow hold. */
  releaseCondition?: string;
  expiresAt?: string;
  killable?: boolean;
}

export interface Quote {
  rate: string;
  feeMinor: number;
  source: string;
  timestamp: string;
  expiresAt: string;
}

export interface PaymentOrder {
  id: string;
  idempotencyKey: string;
  createdAt: string;
  payer: { id: string; type: PayerType };
  amountInMinor: number;
  currencyIn: string;
  currencyOut: string;
  quote: Quote | null;
  beneficiaries: Beneficiary[];
  rules: OrderRules;
  channel: 'direct' | 'bridge';
  state: OrderState;
  ledgerTxnIds: string[];
}

export class OrderError extends Error {}
export class IllegalTransitionError extends OrderError {}

const TRANSITIONS: Readonly<Record<OrderState, readonly OrderState[]>> = {
  QUOTED: ['AUTHORIZED', 'REJECTED', 'EXPIRED'],
  AUTHORIZED: ['FUNDED', 'EXPIRED', 'REJECTED', 'FAILED'],
  FUNDED: ['HELD', 'RELEASING', 'FAILED'],
  HELD: ['RELEASING', 'REFUNDING', 'EXPIRED', 'FAILED'],
  RELEASING: ['SETTLED', 'FAILED'],
  SETTLED: ['RECONCILED', 'FAILED'],
  REFUNDING: ['REFUNDED', 'FAILED'],
  // terminal
  RECONCILED: [],
  REJECTED: [],
  EXPIRED: [],
  REFUNDED: [],
  FAILED: [],
};

const TERMINAL: ReadonlySet<OrderState> = new Set(['RECONCILED', 'REJECTED', 'EXPIRED', 'REFUNDED', 'FAILED']);

export function isTerminal(state: OrderState): boolean {
  return TERMINAL.has(state);
}

export function canTransition(from: OrderState, to: OrderState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Returns a NEW order in the target state, or throws if the move is illegal. */
export function applyTransition(order: PaymentOrder, to: OrderState): PaymentOrder {
  if (!canTransition(order.state, to)) {
    throw new IllegalTransitionError(`illegal transition ${order.state} → ${to}`);
  }
  return { ...order, state: to };
}

export function channelFor(currencyIn: string, currencyOut: string): 'direct' | 'bridge' {
  return currencyIn.toUpperCase() === currencyOut.toUpperCase() ? 'direct' : 'bridge';
}

/** After FUNDED, an order with a release condition waits in HELD; otherwise it releases directly. */
export function stateAfterFunded(order: PaymentOrder): 'HELD' | 'RELEASING' {
  return order.rules.releaseCondition ? 'HELD' : 'RELEASING';
}

export interface CreateOrderInput {
  id: string;
  idempotencyKey: string;
  createdAt: string;
  payer: { id: string; type: PayerType };
  amountInMinor: number;
  currencyIn: string;
  currencyOut: string;
  beneficiaries: Beneficiary[];
  rules?: OrderRules;
  quote?: Quote | null;
}

export function createOrder(input: CreateOrderInput): PaymentOrder {
  if (!Number.isSafeInteger(input.amountInMinor) || input.amountInMinor <= 0) {
    throw new OrderError('amountInMinor must be a positive integer');
  }
  if (input.beneficiaries.length === 0) {
    throw new OrderError('order needs at least one beneficiary');
  }
  for (const b of input.beneficiaries) {
    const hasShare = typeof b.shareBps === 'number';
    const hasFixed = typeof b.fixedMinor === 'number';
    if (hasShare === hasFixed) {
      throw new OrderError(`beneficiary ${b.id} must have exactly one of shareBps | fixedMinor`);
    }
    if (hasShare && (b.shareBps! < 0 || b.shareBps! > 10_000)) {
      throw new OrderError(`beneficiary ${b.id} shareBps out of range`);
    }
  }
  return {
    id: input.id,
    idempotencyKey: input.idempotencyKey,
    createdAt: input.createdAt,
    payer: input.payer,
    amountInMinor: input.amountInMinor,
    currencyIn: input.currencyIn.toUpperCase(),
    currencyOut: input.currencyOut.toUpperCase(),
    quote: input.quote ?? null,
    beneficiaries: input.beneficiaries,
    rules: input.rules ?? {},
    channel: channelFor(input.currencyIn, input.currencyOut),
    state: 'QUOTED',
    ledgerTxnIds: [],
  };
}
