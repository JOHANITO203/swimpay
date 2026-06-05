/**
 * FX quotes to USD for display-price detected currencies (frankfurter.dev, ECB
 * reference rates, no API key). In-process cache: fresh ≤ 1h, stale tolerated
 * ≤ 24h when the provider is down, then orders are rejected — a rate is never
 * invented or hardcoded.
 */

export interface FxQuote {
  rate: string;
  rateTimestamp: string;
  amountMinorUsd: number;
}

export type FxQuoteResult =
  | { kind: 'ok'; quote: FxQuote }
  | { kind: 'unavailable'; reason: 'fx_rate_unavailable' };

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

export class FxRateService {
  private readonly baseUrl: string;
  private readonly ttlMs: number;
  private readonly staleMaxMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly clock: () => Date;
  private readonly cache = new Map<string, CachedRate>();

  public constructor(options: {
    baseUrl?: string | undefined;
    ttlMs?: number | undefined;
    staleMaxMs?: number | undefined;
    fetchImpl?: typeof fetch | undefined;
    clock?: (() => Date) | undefined;
  } = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.frankfurter.dev/v1';
    this.ttlMs = options.ttlMs ?? 60 * 60_000;
    this.staleMaxMs = options.staleMaxMs ?? 24 * 60 * 60_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.clock = options.clock ?? (() => new Date());
  }

  public async quoteToUsd(currency: string, amountMinor: number, minorDigits: number): Promise<FxQuoteResult> {
    const source = currency.toUpperCase();
    const nowMs = this.clock().getTime();
    let cached = this.cache.get(source);

    if (!cached || nowMs - cached.fetchedAt > this.ttlMs) {
      const fetched = await this.fetchRate(source);
      if (fetched !== null) {
        cached = { rate: fetched, fetchedAt: nowMs };
        this.cache.set(source, cached);
      }
    }

    if (!cached || nowMs - cached.fetchedAt > this.staleMaxMs) {
      return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    }

    // Math.round is half-up for positive values — the documented rounding rule.
    // Single multiply by (100 / 10**minorDigits) instead of (/10**d then *100):
    // the two-step form under-rounds some half-cent boundaries by 1¢. Residual
    // error from the rate's double representation (e.g. "1.005" stored slightly
    // below 1.005) is irreducible without decimal arithmetic and acceptable on
    // this review-only rail — the exact rate string is exposed in the webhook.
    const amountMinorUsd = Math.round(amountMinor * cached.rate * (100 / 10 ** minorDigits));
    if (!Number.isSafeInteger(amountMinorUsd) || amountMinorUsd <= 0) {
      return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    }

    return {
      kind: 'ok',
      quote: {
        rate: String(cached.rate),
        rateTimestamp: new Date(cached.fetchedAt).toISOString(),
        amountMinorUsd
      }
    };
  }

  private async fetchRate(source: string): Promise<number | null> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/latest?base=${encodeURIComponent(source)}&symbols=USD`);
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { rates?: Record<string, unknown> };
      const rate = body.rates?.USD;
      return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
    } catch {
      return null;
    }
  }
}
