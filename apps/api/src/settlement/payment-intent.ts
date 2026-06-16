/**
 * Payment intent — the non-custodial crypto-only flow (pilot for payers A & B).
 *
 * SwimPay NEVER holds funds. It issues an instruction ("send X USDC to the
 * merchant's address"), the payer (A = AI agent via 402, B = crypto-comfortable
 * human via checkout) pays DIRECTLY to the merchant, and SwimPay confirms the
 * transfer by READING the chain. No keys, no escrow, no custody, no fiat rail.
 *
 * Pricing can be in any fiat (display); settlement is in stablecoin. The FX quote
 * converts price→USD (the stablecoin proxy); a rate is never invented.
 *
 * Limitation (pilot): matching is by (merchant address, amount ≥, block window).
 * Two concurrent identical-amount intents to the same merchant could collide —
 * mitigate later with per-intent unique amounts or fresh deposit addresses.
 */

import type { ChainReader } from './chain-reader.js';

export interface FxQuoter {
  quote(source: string, target: string, amountMinor: number, sourceMinorDigits: number, targetMinorDigits: number): Promise<
    | { kind: 'ok'; quote: { rate: string; rateTimestamp: string; amountMinorTarget: number; source: string } }
    | { kind: 'unavailable'; reason: string }
  >;
}

export type IntentState = 'AWAITING_PAYMENT' | 'CONFIRMED' | 'EXPIRED';
export type PayerType = 'agent_ai' | 'human';

export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
  chain: string;
}

export interface PaymentIntent {
  id: string;
  merchantId: string;
  merchantAddress: string;
  payerType: PayerType;
  priceCurrency: string;
  priceAmountMinor: number;
  settlementAmountMinor: number; // token base units (e.g. USDC 6 decimals)
  token: TokenConfig;
  quote: { rate: string; source: string; timestamp: string } | null;
  fromBlock: number;
  state: IntentState;
  createdAt: string;
  expiresAt: string;
  confirmation: { txHash: string; blockNumber: number; at: string } | null;
}

export class IntentError extends Error {}

export interface CreateIntentInput {
  merchantId: string;
  merchantAddress: string;
  payerType: PayerType;
  priceCurrency: string;
  priceAmountMinor: number;
}

export interface PaymentIntentServiceDeps {
  fxQuoter: FxQuoter | null;
  minorDigits: (currency: string) => number;
  now: () => string;
  generateId: (prefix: string) => string;
  chainReader: ChainReader;
  token: TokenConfig;
  minConfirmations: number;
  ttlMs?: number;
}

export class PaymentIntentService {
  /** Read-only chain access; SwimPay never holds funds in this flow. */
  public readonly custodial = false as const;
  private readonly intents = new Map<string, PaymentIntent>();
  private readonly d: PaymentIntentServiceDeps;
  private readonly ttlMs: number;

  public constructor(deps: PaymentIntentServiceDeps) {
    this.d = deps;
    this.ttlMs = deps.ttlMs ?? 30 * 60_000;
  }

  public async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    const priceCurrency = input.priceCurrency.toUpperCase();
    if (!Number.isSafeInteger(input.priceAmountMinor) || input.priceAmountMinor <= 0) {
      throw new IntentError('priceAmountMinor must be a positive integer');
    }

    // Quote price → USD (the stablecoin proxy). Identity when already USD.
    let usdMinor: number;
    let quote: PaymentIntent['quote'] = null;
    if (priceCurrency === 'USD') {
      usdMinor = input.priceAmountMinor;
      quote = { rate: '1', source: 'identity', timestamp: this.d.now() };
    } else {
      if (!this.d.fxQuoter) throw new IntentError('quote_unavailable');
      const r = await this.d.fxQuoter.quote(priceCurrency, 'USD', input.priceAmountMinor, this.d.minorDigits(priceCurrency), 2);
      if (r.kind !== 'ok') throw new IntentError('quote_unavailable');
      usdMinor = r.quote.amountMinorTarget;
      quote = { rate: r.quote.rate, source: r.quote.source, timestamp: r.quote.rateTimestamp };
    }

    // USD (2 decimals) → token base units (e.g. USDC 6 decimals).
    const scale = 10 ** (this.d.token.decimals - 2);
    const settlementAmountMinor = usdMinor * scale;
    if (!Number.isSafeInteger(settlementAmountMinor) || settlementAmountMinor <= 0) {
      throw new IntentError('settlement amount out of range');
    }

    const fromBlock = await this.d.chainReader.currentBlock();
    const createdAt = this.d.now();
    const expiresAt = new Date(Date.parse(createdAt) + this.ttlMs).toISOString();

    const intent: PaymentIntent = {
      id: this.d.generateId('intent'),
      merchantId: input.merchantId,
      merchantAddress: input.merchantAddress,
      payerType: input.payerType,
      priceCurrency,
      priceAmountMinor: input.priceAmountMinor,
      settlementAmountMinor,
      token: this.d.token,
      quote,
      fromBlock,
      state: 'AWAITING_PAYMENT',
      createdAt,
      expiresAt,
      confirmation: null,
    };
    this.intents.set(intent.id, intent);
    return intent;
  }

  public getIntent(id: string): PaymentIntent | null {
    return this.intents.get(id) ?? null;
  }

  /** Re-check the chain and advance the intent state. Idempotent once terminal. */
  public async refresh(id: string): Promise<PaymentIntent | null> {
    const intent = this.intents.get(id);
    if (!intent) return null;
    if (intent.state !== 'AWAITING_PAYMENT') return intent;

    const current = await this.d.chainReader.currentBlock();
    const proof = await this.d.chainReader.findIncomingTransfer({
      token: intent.token.address,
      to: intent.merchantAddress,
      minAmountMinor: intent.settlementAmountMinor,
      fromBlock: intent.fromBlock,
    });

    if (proof && current - proof.blockNumber >= this.d.minConfirmations) {
      intent.state = 'CONFIRMED';
      intent.confirmation = { txHash: proof.txHash, blockNumber: proof.blockNumber, at: this.d.now() };
    } else if (Date.parse(this.d.now()) > Date.parse(intent.expiresAt)) {
      intent.state = 'EXPIRED';
    }
    this.intents.set(id, intent);
    return intent;
  }

  /** The payment instruction handed to the payer (402 for agents, checkout for humans). */
  public instructionFor(intent: PaymentIntent) {
    return {
      intent_id: intent.id,
      custody: 'non_custodial' as const,
      chain: intent.token.chain,
      token: intent.token.symbol,
      token_address: intent.token.address,
      token_decimals: intent.token.decimals,
      to: intent.merchantAddress,
      amount_base_units: intent.settlementAmountMinor,
      reference: intent.id,
      price: { currency: intent.priceCurrency, amount_minor: intent.priceAmountMinor },
      quote: intent.quote,
      state: intent.state,
      expires_at: intent.expiresAt,
      confirmation: intent.confirmation,
    };
  }
}
