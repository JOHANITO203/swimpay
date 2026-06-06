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

function cbrFetchReturning(rates: Record<string, { nominal: number; value: string }>) {
  const valutes = Object.entries(rates)
    .map(([code, r]) => `<Valute ID="X"><NumCode>0</NumCode><CharCode>${code}</CharCode><Nominal>${r.nominal}</Nominal><Name>x</Name><Value>${r.value}</Value></Valute>`)
    .join('');
  return vi.fn(async () =>
    new Response(`<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="06.06.2026" name="Foreign Currency Market">${valutes}</ValCurs>`, { status: 200 })
  );
}

describe('FxRateService.quote (multi-source router)', () => {
  const clock = () => new Date('2026-06-06T10:00:00Z');

  it('quotes EUR->USD via ECB (existing path through the generic API)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quote('EUR', 'USD', 999, 2, 2); // €9.99
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 1084, source: 'ecb' } });
  });

  it('quotes USD->RUB via CBR (Value/Nominal, comma decimal)', async () => {
    const service = new FxRateService({
      fetchImpl: fetchReturning(1.0852),
      cbrFetchImpl: cbrFetchReturning({ USD: { nominal: 1, value: '79,5000' } }),
      clock
    });
    const result = await service.quote('USD', 'RUB', 1000, 2, 2); // $10.00 -> 795.00 RUB
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 79500, source: 'cbr' } });
  });

  it('quotes RUB->USD via CBR inverse', async () => {
    const service = new FxRateService({
      fetchImpl: fetchReturning(1.0852),
      cbrFetchImpl: cbrFetchReturning({ USD: { nominal: 1, value: '80,0000' } }),
      clock
    });
    const result = await service.quote('RUB', 'USD', 80000, 2, 2); // 800 RUB -> $10.00
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 1000 } });
  });

  it('quotes EUR->XOF via the fixed UEMOA peg (zero-decimal target)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quote('EUR', 'XOF', 1000, 2, 0); // €10.00 -> 6560 XOF (655.957*10 = 6559.57 -> 6560)
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 6560, source: 'uemoa_peg' } });
  });

  it('quotes USD->XOF with two hops and a SINGLE final rounding', async () => {
    // USD->EUR via ECB inverse (1/1.0852), EUR->XOF peg. $10 -> 9.21489€... -> 6044.55... -> 6045 XOF.
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quote('USD', 'XOF', 1000, 2, 0);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 6045, source: 'ecb+uemoa_peg' } });
  });

  it('quotes RUB->XOF (CBR inverse -> EUR -> peg) with handled JPY-style nominals', async () => {
    const service = new FxRateService({
      fetchImpl: fetchReturning(1.0852),
      cbrFetchImpl: cbrFetchReturning({ EUR: { nominal: 1, value: '86,2750' }, JPY: { nominal: 100, value: '52,9000' } }),
      clock
    });
    // 8627.50 RUB -> 100 EUR -> 65595.7 -> 65596 XOF
    const result = await service.quote('RUB', 'XOF', 862750, 2, 0);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 65596 } });
    // JPY nominal=100: 1 JPY = 0.529 RUB
    const jpy = await service.quote('JPY', 'RUB', 1000, 0, 2); // 1000 JPY -> 529.00 RUB
    expect(jpy).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 52900 } });
  });

  it('returns unavailable for unreachable targets and same-currency is identity', async () => {
    const failing = vi.fn(async () => { throw new Error('down'); });
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), cbrFetchImpl: failing, clock });
    expect((await service.quote('USD', 'RUB', 1000, 2, 2)).kind).toBe('unavailable');
    expect(await service.quote('USD', 'USD', 1234, 2, 2)).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 1234, rate: '1' } });
  });

  it('keeps quoteToUsd behavior identical (delegation)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quoteToUsd('EUR', 999, 2);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorUsd: 1084 } });
  });

  it('quotes XOF->USD with label uemoa_peg+ecb (source label fix)', async () => {
    // 6560 XOF (zero decimal), EUR/USD=1.0852, rate = (1/655.957)*1.0852
    // Math.round(6560 * (1/655.957) * 1.0852 * (100/1)) = 1085
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quote('XOF', 'USD', 6560, 0, 2);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 1085, source: 'uemoa_peg+ecb' } });
  });

  it('quotes XOF->RUB with label uemoa_peg+cbr (source label fix)', async () => {
    // 65596 XOF (zero decimal), EUR=86.2750 RUB/1 unit, rate = (1/655.957)*86.275
    // Math.round(65596 * (1/655.957) * 86.275 * (100/1)) = 862754
    const service = new FxRateService({
      fetchImpl: fetchReturning(1.0852),
      cbrFetchImpl: cbrFetchReturning({ EUR: { nominal: 1, value: '86,2750' } }),
      clock,
    });
    const result = await service.quote('XOF', 'RUB', 65596, 0, 2);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 862754, source: 'uemoa_peg+cbr' } });
  });
});

describe('FxRateService.quote — fetch-time rateTimestamp', () => {
  it('rateTimestamp reflects the stale fetch time, not the call time, when serving from cache after TTL expiry', async () => {
    const T0_ISO = '2026-06-05T10:00:00.000Z';
    const T0 = Date.parse(T0_ISO);
    let nowMs = T0;
    let failing = false;
    const fetchImpl = vi.fn(async () => {
      if (failing) throw new Error('network down');
      return new Response(JSON.stringify({ rates: { USD: 1.5 } }), { status: 200 });
    });
    const service = new FxRateService({ fetchImpl, clock: () => new Date(nowMs) });

    // Fresh fetch at T0
    const fresh = await service.quote('EUR', 'USD', 1000, 2, 2);
    expect(fresh).toMatchObject({ kind: 'ok', quote: { rateTimestamp: T0_ISO } });

    // TTL expires, provider fails → stale rate served with T0 fetch time
    failing = true;
    nowMs = T0 + 2 * 60 * 60_000; // +2h
    const stale = await service.quote('EUR', 'USD', 1000, 2, 2);
    expect(stale).toMatchObject({ kind: 'ok', quote: { rateTimestamp: T0_ISO } });
  });
});
