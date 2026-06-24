/**
 * Ramp payout (off-ramp) — the EXIT: confirmed USDC → local fiat (XOF/NGN) on the
 * merchant's mobile money / bank, via a licensed African ramp.
 *
 * The deterministic agent ORCHESTRATES this (decide → instruct → confirm → account); it
 * does NOT do the regulated conversion itself — a licensed ramp (HoneyCoin primary; Conduit/
 * BVNK fallback at volume) holds the local liquidity + the license. The payout STATUS the
 * ramp returns is the authoritative fiat-leg proof fed back into reconciliation.
 *
 * This module is the SCAFFOLD: a provider-agnostic interface + a deterministic simulated
 * rail + a router (with the size-based fallback we chose). The real `HoneyCoinRampRails`
 * (and Conduit/BVNK) implement the same interface against their APIs and plug in once the
 * KYB / partner account exists — no rewrite, just another adapter.
 */

export class RampPayoutError extends Error {}

export type PayoutStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

export type BeneficiaryChannel =
  | { kind: 'mobile_money'; provider: string; phone: string } // wave, orange, mtn, free_money…
  | { kind: 'bank'; accountNumber: string; bankCode: string };

export interface PayoutRequest {
  /** Our order/intent id — idempotency key + reconciliation cross-reference. */
  reference: string;
  /** USDC base units to convert (e.g. 100_000_000 = 100 USDC). */
  amountBaseUnits: number;
  tokenSymbol: string; // 'USDC'
  destinationCurrency: string; // 'XOF' | 'NGN'
  beneficiary: BeneficiaryChannel;
}

export interface PayoutResult {
  payoutId: string;
  provider: string;
  status: PayoutStatus;
  destinationCurrency: string;
  reference: string;
  /** Local amount delivered, minor units — known once DELIVERED. */
  amountLocalMinor?: number;
}

/** A rentable off-ramp (HoneyCoin, Conduit, BVNK, Bitnob…) behind one shape. */
export interface RampPayoutRails {
  readonly provider: string;
  readonly simulated: boolean;
  supports(currency: string): boolean;
  payout(req: PayoutRequest): Promise<PayoutResult>;
  getStatus(payoutId: string): Promise<PayoutResult>;
}

/**
 * Deterministic simulated rail — stands in for a real ramp until the API/KYB exists.
 * Tests drive delivery via markDelivered/markFailed (mirrors InMemoryChainReader.seed*).
 */
export class SimulatedRampPayoutRails implements RampPayoutRails {
  public readonly simulated = true as const;
  public readonly provider: string;
  private readonly currencies: Set<string>;
  private readonly genId: (prefix: string) => string;
  private readonly failReferences: Set<string>;
  private readonly byRef = new Map<string, PayoutResult>();
  private readonly byId = new Map<string, PayoutResult>();

  public constructor(opts: {
    provider: string;
    currencies: string[];
    generateId: (prefix: string) => string;
    /** References whose payout() throws — simulate this rail being unavailable. */
    failReferences?: string[];
  }) {
    this.provider = opts.provider;
    this.currencies = new Set(opts.currencies.map((c) => c.toUpperCase()));
    this.genId = opts.generateId;
    this.failReferences = new Set(opts.failReferences ?? []);
  }

  public supports(currency: string): boolean {
    return this.currencies.has(currency.toUpperCase());
  }

  public async payout(req: PayoutRequest): Promise<PayoutResult> {
    if (!this.supports(req.destinationCurrency)) {
      throw new RampPayoutError(`${this.provider} does not support ${req.destinationCurrency}`);
    }
    if (this.failReferences.has(req.reference)) {
      throw new RampPayoutError(`${this.provider} payout failed (simulated rail unavailable)`);
    }
    const existing = this.byRef.get(req.reference);
    if (existing) return existing; // idempotent by reference
    const result: PayoutResult = {
      payoutId: this.genId('payout'),
      provider: this.provider,
      status: 'PENDING',
      destinationCurrency: req.destinationCurrency.toUpperCase(),
      reference: req.reference,
    };
    this.byRef.set(req.reference, result);
    this.byId.set(result.payoutId, result);
    return result;
  }

  public async getStatus(payoutId: string): Promise<PayoutResult> {
    const r = this.byId.get(payoutId);
    if (!r) throw new RampPayoutError(`unknown payout ${payoutId}`);
    return r;
  }

  // --- simulation helpers (not part of the interface) ---
  public markDelivered(payoutId: string, amountLocalMinor: number): void {
    const r = this.byId.get(payoutId);
    if (!r) throw new RampPayoutError(`unknown payout ${payoutId}`);
    r.status = 'DELIVERED';
    r.amountLocalMinor = amountLocalMinor;
  }

  public markFailed(payoutId: string): void {
    const r = this.byId.get(payoutId);
    if (!r) throw new RampPayoutError(`unknown payout ${payoutId}`);
    r.status = 'FAILED';
  }
}

export interface RampRoute {
  rails: RampPayoutRails;
  /** Lower = tried first among eligible routes. */
  priority: number;
  /** Optional gate (e.g. ticket-size policy: send large tickets to the cheaper rail). */
  appliesTo?: (req: PayoutRequest) => boolean;
}

/**
 * Routes a payout to the right rail and falls back on failure.
 * Our policy: small/standard tickets → HoneyCoin (no fixed fee); large tickets → Conduit/
 * BVNK first (cheaper at volume), HoneyCoin as fallback. Encoded via priority + appliesTo.
 */
export class RampPayoutRouter {
  public constructor(private readonly routes: RampRoute[]) {}

  /** Eligible rails for a request, in try-order (primary first, then fallbacks). */
  public candidates(req: PayoutRequest): RampPayoutRails[] {
    return this.routes
      .filter((r) => r.rails.supports(req.destinationCurrency))
      .filter((r) => !r.appliesTo || r.appliesTo(req))
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.rails);
  }

  /** Try each eligible rail in order; fall back to the next when one is unavailable. */
  public async payout(req: PayoutRequest): Promise<PayoutResult> {
    const rails = this.candidates(req);
    if (rails.length === 0) {
      throw new RampPayoutError(`no rail for ${req.destinationCurrency} / this ticket`);
    }
    let lastError: unknown;
    for (const rail of rails) {
      try {
        return await rail.payout(req);
      } catch (err) {
        lastError = err; // rail unavailable → fall back to next
      }
    }
    throw lastError instanceof Error ? lastError : new RampPayoutError('all rails failed');
  }
}
