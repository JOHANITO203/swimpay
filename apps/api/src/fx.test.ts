import { describe, expect, it, vi } from 'vitest';
import { FxRateService } from './fx.js';

function fetchReturning(rate: number) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ base: 'EUR', date: '2026-06-05', rates: { USD: rate } }), { status: 200 })
  );
}

describe('FxRateService', () => {
  it('quotes a convertible amount to USD cents with half-up rounding', async () => {
    const fetchImpl = fetchReturning(1.0852);
    const service = new FxRateService({ fetchImpl, clock: () => new Date('2026-06-05T10:00:00Z') });
    const result = await service.quoteToUsd('EUR', 999, 2); // €9.99
    expect(result).toEqual({
      kind: 'ok',
      quote: { rate: '1.0852', rateTimestamp: '2026-06-05T10:00:00.000Z', amountMinorUsd: 1084 } // 9.99*1.0852=10.84114 → 1084
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves from cache within the TTL', async () => {
    const fetchImpl = fetchReturning(2);
    let nowMs = Date.parse('2026-06-05T10:00:00Z');
    const service = new FxRateService({ fetchImpl, clock: () => new Date(nowMs) });
    await service.quoteToUsd('EUR', 100, 2);
    nowMs += 30 * 60_000; // +30min < 1h TTL
    await service.quoteToUsd('EUR', 100, 2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves a stale rate (≤24h) when the provider fails, and rejects beyond', async () => {
    let failing = false;
    const fetchImpl = vi.fn(async () => {
      if (failing) throw new Error('network down');
      return new Response(JSON.stringify({ rates: { USD: 1.5 } }), { status: 200 });
    });
    let nowMs = Date.parse('2026-06-05T10:00:00Z');
    const service = new FxRateService({ fetchImpl, clock: () => new Date(nowMs) });
    await service.quoteToUsd('EUR', 100, 2);

    failing = true;
    nowMs += 2 * 60 * 60_000; // +2h: TTL expired, stale OK
    expect((await service.quoteToUsd('EUR', 100, 2)).kind).toBe('ok');

    nowMs += 23 * 60 * 60_000; // +25h total: stale max exceeded
    const result = await service.quoteToUsd('EUR', 100, 2);
    expect(result).toEqual({ kind: 'unavailable', reason: 'fx_rate_unavailable' });
  });

  it('handles zero-decimal source currencies (JPY)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(0.0065), clock: () => new Date('2026-06-05T10:00:00Z') });
    const result = await service.quoteToUsd('JPY', 500, 0); // ¥500 → $3.25
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorUsd: 325 } });
  });

  it('avoids the float two-step under-rounding on half-cent boundaries', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(1.45), clock: () => new Date('2026-06-05T10:00:00Z') });
    const result = await service.quoteToUsd('EUR', 10, 2); // €0.10 × 1.45 = $0.145 → 15 cents (half-up)
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorUsd: 15 } });
  });

  it('normalizes currency case for the cache key', async () => {
    const fetchImpl = fetchReturning(2);
    const service = new FxRateService({ fetchImpl, clock: () => new Date('2026-06-05T10:00:00Z') });
    await service.quoteToUsd('eur', 100, 2);
    await service.quoteToUsd('EUR', 100, 2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caches rates per currency', async () => {
    const fetchImpl = fetchReturning(2);
    const service = new FxRateService({ fetchImpl, clock: () => new Date('2026-06-05T10:00:00Z') });
    await service.quoteToUsd('EUR', 100, 2);
    await service.quoteToUsd('GBP', 100, 2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
