/**
 * FX quotes — multi-source router:
 *   - ECB via frankfurter.dev (no API key, ~30 currencies, EUR pivot, no RUB/XOF)
 *   - CBR XML_daily.asp (official daily XML, no key; Value/Nominal = RUB per unit, comma decimal)
 *   - UEMOA fixed peg: XOF/EUR = 655.957 (legal parity)
 *
 * At most 2 pivot hops. Single final Math.round — no intermediate rounding.
 * Cache: fresh ≤ 1h, stale tolerated ≤ 24h. A rate is never invented or hardcoded.
 * quoteToUsd is kept as a thin delegate so all existing callers remain byte-compatible.
 */

export const UEMOA_XOF_PER_EUR = 655.957; // fixed legal parity

export interface FxQuote {
  rate: string;
  rateTimestamp: string;
  amountMinorUsd: number;
}

export type FxQuoteResult =
  | { kind: 'ok'; quote: FxQuote }
  | { kind: 'unavailable'; reason: 'fx_rate_unavailable' };

export interface FxRouteQuote {
  rate: string;            // composed rate as decimal string
  rateTimestamp: string;  // ISO timestamp of the OLDEST fetched rate leg used (fetch time, not call time)
  amountMinorTarget: number;
  source: string;          // legs joined in path order, e.g. 'ecb', 'cbr+uemoa_peg', 'identity'
}

export type FxRouteResult =
  | { kind: 'ok'; quote: FxRouteQuote }
  | { kind: 'unavailable'; reason: 'fx_rate_unavailable' };

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

interface CachedCbrEntry {
  ratePerUnit: number; // RUB per 1 unit of the listed currency
  fetchedAt: number;
}

// ECB currencies that frankfurter.dev covers (EUR pivot, no RUB, no XOF)
const ECB_CURRENCIES = new Set([
  'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY', 'HKD', 'NZD',
  'SEK', 'NOK', 'DKK', 'MXN', 'SGD', 'HUF', 'PLN', 'CZK', 'RON', 'BGN',
  'HRK', 'ISK', 'TRY', 'BRL', 'ZAR', 'INR', 'KRW', 'IDR', 'MYR', 'PHP',
  'THB',
]);

function isEcbCurrency(c: string): boolean {
  return ECB_CURRENCIES.has(c.toUpperCase());
}

export class FxRateService {
  private readonly baseUrl: string;
  private readonly cbrBaseUrl: string;
  private readonly ttlMs: number;
  private readonly staleMaxMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly cbrFetchImpl: typeof fetch;
  private readonly clock: () => Date;
  // ECB cache keyed by 'SOURCE->TARGET' (e.g. 'EUR->USD')
  private readonly cache = new Map<string, CachedRate>();
  // CBR cache keyed by CharCode (e.g. 'USD', 'EUR'); one fetch fills all
  private readonly cbrCache = new Map<string, CachedCbrEntry>();

  public constructor(options: {
    baseUrl?: string | undefined;
    cbrBaseUrl?: string | undefined;
    ttlMs?: number | undefined;
    staleMaxMs?: number | undefined;
    fetchImpl?: typeof fetch | undefined;
    cbrFetchImpl?: typeof fetch | undefined;
    clock?: (() => Date) | undefined;
  } = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.frankfurter.dev/v1';
    this.cbrBaseUrl = options.cbrBaseUrl ?? 'https://www.cbr.ru/scripts';
    this.ttlMs = options.ttlMs ?? 60 * 60_000;
    this.staleMaxMs = options.staleMaxMs ?? 24 * 60 * 60_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cbrFetchImpl = options.cbrFetchImpl ?? (options.fetchImpl ?? fetch);
    this.clock = options.clock ?? (() => new Date());
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Generic multi-source router quote.
   * amountMinor: amount in the minor unit of the source currency.
   * sourceMinorDigits / targetMinorDigits: decimal places (e.g. USD=2, XOF=0, JPY=0).
   * Single final rounding; no intermediate rounding.
   */
  public async quote(
    source: string,
    target: string,
    amountMinor: number,
    sourceMinorDigits: number,
    targetMinorDigits: number,
  ): Promise<FxRouteResult> {
    const src = source.toUpperCase();
    const tgt = target.toUpperCase();

    const unit = await this.unitRate(src, tgt);
    if (unit === null) {
      return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    }

    // Use amountMinor * rate * (targetScale / sourceScale) in a single multiply to
    // avoid the float two-step under-rounding that occurs when dividing first then
    // multiplying: e.g. (10/100)*1.45 = 0.14499... whereas 10*1.45*(100/100) = 14.5.
    const amountMinorTarget = Math.round(amountMinor * unit.rate * (10 ** targetMinorDigits / 10 ** sourceMinorDigits));

    if (!Number.isSafeInteger(amountMinorTarget) || amountMinorTarget <= 0) {
      return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    }

    return {
      kind: 'ok',
      quote: {
        rate: String(unit.rate),
        rateTimestamp: new Date(unit.oldestFetchedAtMs).toISOString(),
        amountMinorTarget,
        source: unit.source,
      },
    };
  }

  /**
   * Legacy quoteToUsd — delegates to quote() and maps back to the old FxQuoteResult
   * shape so all existing callers/tests remain byte-compatible.
   */
  public async quoteToUsd(currency: string, amountMinor: number, minorDigits: number): Promise<FxQuoteResult> {
    const result = await this.quote(currency, 'USD', amountMinor, minorDigits, 2);
    if (result.kind !== 'ok') {
      return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    }
    return {
      kind: 'ok',
      quote: {
        rate: result.quote.rate,
        rateTimestamp: result.quote.rateTimestamp,
        amountMinorUsd: result.quote.amountMinorTarget,
      },
    };
  }

  // ─── Internal router ───────────────────────────────────────────────────────

  /**
   * Returns the composed rate (no rounding), the source label, and the oldest
   * fetchedAt timestamp (ms) across all non-peg, non-identity legs used.
   * - identity  → oldestFetchedAtMs = call time (nowMs)
   * - peg-only  → oldestFetchedAtMs = call time (peg is a constant, not fetched)
   * - fetched legs → MIN of all legs' fetchedAt
   * Returns null if the route is unreachable or a required data source is down.
   */
  private async unitRate(
    src: string,
    tgt: string,
  ): Promise<{ rate: number; source: string; oldestFetchedAtMs: number } | null> {
    const nowMs = this.clock().getTime();

    // Identity
    if (src === tgt) {
      return { rate: 1, source: 'identity', oldestFetchedAtMs: nowMs };
    }

    // XOF source: convert XOF → EUR (÷ peg), then EUR → target
    if (src === 'XOF') {
      if (tgt === 'EUR') {
        return { rate: 1 / UEMOA_XOF_PER_EUR, source: 'uemoa_peg', oldestFetchedAtMs: nowMs };
      }
      const eurToTgt = await this.unitRate('EUR', tgt);
      if (eurToTgt === null) return null;
      const combined = (1 / UEMOA_XOF_PER_EUR) * eurToTgt.rate;
      const leg = eurToTgt.source === 'identity' ? 'uemoa_peg' : `uemoa_peg+${eurToTgt.source}`;
      // peg is constant — oldest comes from the fetched EUR→target leg
      return { rate: combined, source: leg, oldestFetchedAtMs: eurToTgt.oldestFetchedAtMs };
    }

    // XOF target: compose S → EUR, then × peg
    if (tgt === 'XOF') {
      if (src === 'EUR') {
        return { rate: UEMOA_XOF_PER_EUR, source: 'uemoa_peg', oldestFetchedAtMs: nowMs };
      }
      const srcToEur = await this.unitRate(src, 'EUR');
      if (srcToEur === null) return null;
      const combined = srcToEur.rate * UEMOA_XOF_PER_EUR;
      // Label: prepend the ECB/CBR leg, append the peg
      const peg = srcToEur.source === 'identity' ? 'uemoa_peg' : `${srcToEur.source}+uemoa_peg`;
      return { rate: combined, source: peg, oldestFetchedAtMs: srcToEur.oldestFetchedAtMs };
    }

    // RUB source: 1 / cbrRatePerUnit(target) if listed; else RUB→EUR→target
    if (src === 'RUB') {
      if (tgt === 'EUR') {
        // RUB→EUR: CBR lists EUR per nominal → invert
        const rubPerEur = await this.cbrRatePerUnitWithAge('EUR');
        if (rubPerEur === null) return null;
        return { rate: 1 / rubPerEur.ratePerUnit, source: 'cbr', oldestFetchedAtMs: rubPerEur.fetchedAt };
      }
      // Try CBR direct inverse for the target
      const rubPerTgt = await this.cbrRatePerUnitWithAge(tgt);
      if (rubPerTgt !== null) {
        return { rate: 1 / rubPerTgt.ratePerUnit, source: 'cbr', oldestFetchedAtMs: rubPerTgt.fetchedAt };
      }
      // Fallback: RUB→EUR (CBR) then EUR→target (ECB or peg)
      const rubPerEur = await this.cbrRatePerUnitWithAge('EUR');
      if (rubPerEur === null) return null;
      const eurToTgt = await this.unitRate('EUR', tgt);
      if (eurToTgt === null) return null;
      const combined = (1 / rubPerEur.ratePerUnit) * eurToTgt.rate;
      const leg = eurToTgt.source === 'identity' ? 'cbr' : `cbr+${eurToTgt.source}`;
      return { rate: combined, source: leg, oldestFetchedAtMs: Math.min(rubPerEur.fetchedAt, eurToTgt.oldestFetchedAtMs) };
    }

    // RUB target: cbrRatePerUnit(source) if listed; else source→EUR→RUB
    if (tgt === 'RUB') {
      if (src === 'EUR') {
        const rubPerEur = await this.cbrRatePerUnitWithAge('EUR');
        if (rubPerEur === null) return null;
        return { rate: rubPerEur.ratePerUnit, source: 'cbr', oldestFetchedAtMs: rubPerEur.fetchedAt };
      }
      // Try CBR direct listing for the source
      const rubPerSrc = await this.cbrRatePerUnitWithAge(src);
      if (rubPerSrc !== null) {
        return { rate: rubPerSrc.ratePerUnit, source: 'cbr', oldestFetchedAtMs: rubPerSrc.fetchedAt };
      }
      // Fallback: source→EUR (ECB) then EUR→RUB (CBR)
      const srcToEur = await this.unitRate(src, 'EUR');
      if (srcToEur === null) return null;
      const rubPerEur = await this.cbrRatePerUnitWithAge('EUR');
      if (rubPerEur === null) return null;
      const combined = srcToEur.rate * rubPerEur.ratePerUnit;
      const leg = srcToEur.source === 'identity' ? 'cbr' : `${srcToEur.source}+cbr`;
      return { rate: combined, source: leg, oldestFetchedAtMs: Math.min(srcToEur.oldestFetchedAtMs, rubPerEur.fetchedAt) };
    }

    // ECB direct (both currencies in ECB graph)
    if (isEcbCurrency(src) && isEcbCurrency(tgt)) {
      const result = await this.fetchEcbRateWithAge(src, tgt);
      if (result === null) return null;
      return { rate: result.rate, source: 'ecb', oldestFetchedAtMs: result.fetchedAt };
    }

    // No path found
    return null;
  }

  // ─── ECB fetch (generalised) ───────────────────────────────────────────────

  /**
   * Fetch ECB rate for src→tgt, returning rate + the fetchedAt timestamp of
   * the cached entry (i.e. when the data was actually fetched, not call time).
   *
   * Strategy:
   *   - src === 'EUR'  → fetch base=EUR&symbols=tgt directly (rates[tgt])
   *   - tgt === 'USD'  → fetch base=src&symbols=USD directly (rates[USD])
   *                      (covers the legacy quoteToUsd path and JPY→USD)
   *   - tgt === 'EUR'  → fetch base=EUR&symbols=src (rates[src]) then invert
   *                      (covers USD→EUR used as ECB leg in USD→XOF)
   *   - otherwise      → (EUR→tgt) / (EUR→src) via two EUR-based fetches
   *
   * All values are cached under 'BASE->SYMBOL' keys to share across calls.
   */
  private async fetchEcbRateWithAge(source: string, target: string): Promise<{ rate: number; fetchedAt: number } | null> {
    const src = source.toUpperCase();
    const tgt = target.toUpperCase();
    const nowMs = this.clock().getTime();

    if (src === 'EUR') {
      return this.fetchEcbCachedRateWithAge('EUR', tgt, nowMs);
    }

    if (tgt === 'USD') {
      return this.fetchEcbCachedRateWithAge(src, 'USD', nowMs);
    }

    if (tgt === 'EUR') {
      const entry = await this.fetchEcbCachedRateWithAge('EUR', src, nowMs);
      if (entry === null) return null;
      return { rate: 1 / entry.rate, fetchedAt: entry.fetchedAt };
    }

    // Cross-rate: (EUR → tgt) / (EUR → src)
    const entryEurToSrc = await this.fetchEcbCachedRateWithAge('EUR', src, nowMs);
    const entryEurToTgt = await this.fetchEcbCachedRateWithAge('EUR', tgt, nowMs);
    if (entryEurToSrc === null || entryEurToTgt === null) return null;
    return {
      rate: entryEurToTgt.rate / entryEurToSrc.rate,
      fetchedAt: Math.min(entryEurToSrc.fetchedAt, entryEurToTgt.fetchedAt),
    };
  }

  /**
   * Fetch and cache the rate for a specific base→symbol pair.
   * Returns the cached entry (rate + the time it was actually fetched), or null if unavailable.
   * The cache key is 'BASE->SYMBOL'.
   */
  private async fetchEcbCachedRateWithAge(base: string, symbol: string, nowMs: number): Promise<{ rate: number; fetchedAt: number } | null> {
    const key = `${base}->${symbol}`;
    let cached = this.cache.get(key);

    if (!cached || nowMs - cached.fetchedAt > this.ttlMs) {
      const fetched = await this.fetchRate(base, symbol);
      if (fetched !== null) {
        cached = { rate: fetched, fetchedAt: nowMs };
        this.cache.set(key, cached);
      }
    }

    if (!cached || nowMs - cached.fetchedAt > this.staleMaxMs) {
      return null;
    }
    return { rate: cached.rate, fetchedAt: cached.fetchedAt };
  }

  private async fetchRate(source: string, target: string): Promise<number | null> {
    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/latest?base=${encodeURIComponent(source)}&symbols=${encodeURIComponent(target)}`
      );
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { rates?: Record<string, unknown> };
      const rate = body.rates?.[target];
      return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
    } catch {
      return null;
    }
  }

  // ─── CBR fetch ─────────────────────────────────────────────────────────────

  /**
   * Returns RUB per 1 unit of `code`, along with the fetchedAt timestamp of
   * the cached entry (when the data was actually fetched, not call time).
   * One document fetch populates ALL codes in the cache.
   */
  private async cbrRatePerUnitWithAge(code: string): Promise<{ ratePerUnit: number; fetchedAt: number } | null> {
    const nowMs = this.clock().getTime();
    const cached = this.cbrCache.get(code);
    if (!cached || nowMs - cached.fetchedAt > this.ttlMs) {
      await this.refreshCbr(nowMs);
    }
    const entry = this.cbrCache.get(code);
    if (!entry || nowMs - entry.fetchedAt > this.staleMaxMs) {
      return null;
    }
    return { ratePerUnit: entry.ratePerUnit, fetchedAt: entry.fetchedAt };
  }

  private async refreshCbr(nowMs: number): Promise<void> {
    try {
      const response = await this.cbrFetchImpl(`${this.cbrBaseUrl}/XML_daily.asp`);
      if (!response.ok) return;
      const xml = await response.text();
      for (const m of xml.matchAll(
        /<Valute[^>]*>[\s\S]*?<CharCode>([A-Z]{3})<\/CharCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d.,]+)<\/Value>[\s\S]*?<\/Valute>/g
      )) {
        const code = m[1] as string;
        const nominal = Number.parseInt(m[2] as string, 10);
        const value = Number.parseFloat((m[3] as string).replace(',', '.'));
        if (nominal > 0 && Number.isFinite(value) && value > 0) {
          this.cbrCache.set(code, { ratePerUnit: value / nominal, fetchedAt: nowMs });
        }
      }
    } catch {
      // stale window applies; never invent a rate
    }
  }
}
