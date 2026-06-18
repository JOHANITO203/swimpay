import { describe, expect, it } from 'vitest';
import {
  composeQuote,
  findCorridor,
  listActiveCorridors,
  PublishedRampFeeSource,
  StaticNetworkFeeSource,
  type Corridor,
  type FxQuoter,
  type NetworkFeeSource,
  type RampFeeSource,
} from './cost-oracle.js';

const USD_XOF: Corridor = { from: 'USD', to: 'XOF', rampId: 'yellow_card' };

// Deterministic FX stub: target = round(amount * rate * 10^td/10^fd).
function fxOk(rate: number): FxQuoter {
  return {
    async quote(_from, _to, amountMinor, fromDigits, targetDigits) {
      const target = Math.round(amountMinor * rate * (10 ** targetDigits / 10 ** fromDigits));
      if (target <= 0) return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
      return {
        kind: 'ok',
        quote: { rate: String(rate), rateTimestamp: '2026-06-16T00:00:00.000Z', amountMinorTarget: target, source: 'ecb+uemoa_peg' },
      };
    },
  };
}
const fxDown: FxQuoter = { async quote() { return { kind: 'unavailable', reason: 'fx_rate_unavailable' }; } };

function netOk(feeMinor: number): NetworkFeeSource {
  return { estimate: () => ({ available: true, feeMinor, source: 'test_net', asOf: '2026-06', detail: 'net' }) };
}
const rampYC: RampFeeSource = {
  fee: () => ({ available: true, pct: 0.02, fixedMinor: 0, source: 'yc', asOf: '2026-06', detail: '2%' }),
};
const rampDown: RampFeeSource = {
  fee: () => ({ available: false, pct: null, fixedMinor: null, source: 'x', asOf: null, detail: 'n/a' }),
};

describe('cost-oracle: corridor registry', () => {
  it('exposes the active corridors (USD/EUR/RUB → XOF)', () => {
    expect(findCorridor('USD', 'XOF')).not.toBeNull();
    expect(findCorridor('EUR', 'XOF')).not.toBeNull();
    expect(findCorridor('RUB', 'XOF')).not.toBeNull(); // RUB is an intended corridor (screening at settlement)
    expect(findCorridor('USD', 'EUR')).toBeNull(); // not a configured corridor
    expect(listActiveCorridors().find((c) => c.from === 'RUB')?.rampId).toBe('yellow_card');
  });
});

describe('cost-oracle: composeQuote', () => {
  it('composes a fully-available quote (fees deducted before delivery)', async () => {
    // $100 = 10000 minor; rate 600 XOF/USD; network 2 ($0.02); ramp 2% → $2.00.
    const q = await composeQuote(USD_XOF, 10_000, 2, 0, { fx: fxOk(600), network: netOk(2), ramp: rampYC });

    expect(q.available).toBe(true);
    expect(q.referenceAmountMinor).toBe(60_000);           // 10000 * 600 / 100
    expect(q.totalCostMinor).toBe(202);                    // 2 (net) + 200 (2% of 10000)
    expect(q.amountDeliveredMinor).toBe(58_788);           // (10000-202) * 600 / 100
    expect(q.legs.map((l) => l.kind)).toEqual(['fx', 'network', 'ramp']);
    expect(q.legs.every((l) => l.available)).toBe(true);
    expect(q.caveats.length).toBeGreaterThan(0);           // ramp spread caveat surfaced
  });

  it('is honestly partial when the ramp leg is unavailable (never invents)', async () => {
    const q = await composeQuote(USD_XOF, 10_000, 2, 0, { fx: fxOk(600), network: netOk(2), ramp: rampDown });

    expect(q.available).toBe(false);
    expect(q.totalCostMinor).toBeNull();
    expect(q.amountDeliveredMinor).toBeNull();
    expect(q.referenceAmountMinor).toBe(60_000);           // FX still reported
    const ramp = q.legs.find((l) => l.kind === 'ramp');
    expect(ramp?.available).toBe(false);
    expect(ramp?.feeMinor).toBeNull();
  });

  it('degrades when FX is down', async () => {
    const q = await composeQuote(USD_XOF, 10_000, 2, 0, { fx: fxDown, network: netOk(2), ramp: rampYC });

    expect(q.available).toBe(false);
    expect(q.referenceAmountMinor).toBeNull();
    expect(q.legs.find((l) => l.kind === 'fx')?.available).toBe(false);
  });

  it('is not deliverable when fees exceed the amount', async () => {
    // $0.10 = 10 minor; network fee 20 (> amount) → net negative → no delivery.
    const q = await composeQuote(USD_XOF, 10, 2, 0, { fx: fxOk(600), network: netOk(20), ramp: rampYC });

    expect(q.available).toBe(false);
    expect(q.totalCostMinor).toBe(20);                     // cost still computed honestly
    expect(q.amountDeliveredMinor).toBeNull();
  });
});

describe('cost-oracle: PublishedRampFeeSource (honest, dated)', () => {
  const src = new PublishedRampFeeSource();

  it('returns Yellow Card published ~2% mobile money fee', () => {
    const yc = src.fee('yellow_card', 'USD');
    expect(yc.available).toBe(true);
    expect(yc.pct).toBe(0.02);
    expect(yc.source).toBe('yellow_card_published');
    expect(yc.asOf).toBe('2026-06');
  });

  it('never invents an undisclosed schedule (Bitnob unavailable)', () => {
    expect(src.fee('bitnob', 'USD').available).toBe(false);
    expect(src.fee('unknown_ramp', 'USD').available).toBe(false);
  });
});

describe('cost-oracle: StaticNetworkFeeSource', () => {
  it('returns a labelled estimate, not a live quote', () => {
    const est = new StaticNetworkFeeSource().estimate(USD_XOF);
    expect(est.available).toBe(true);
    expect(est.feeMinor).toBeGreaterThan(0);
    expect(est.source).toBe('l2_typical_estimate');
  });
});
