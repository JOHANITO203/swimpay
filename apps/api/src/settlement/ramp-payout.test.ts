import { describe, expect, it } from 'vitest';
import {
  RampPayoutError,
  RampPayoutRouter,
  SimulatedRampPayoutRails,
  type PayoutRequest,
  type RampRoute,
} from './ramp-payout.js';

function idGen() {
  let n = 0;
  return (p: string) => `${p}_${++n}`;
}

const reqXOF = (over: Partial<PayoutRequest> = {}): PayoutRequest => ({
  reference: 'order_1',
  amountMinor: 65_595, // payout amount in destinationCurrency minor units
  tokenSymbol: 'USDC',
  destinationCurrency: 'XOF',
  beneficiary: { kind: 'mobile_money', provider: 'wave', phone: '+221770000000' },
  ...over,
});

describe('SimulatedRampPayoutRails', () => {
  it('initiates a PENDING payout for a supported currency', async () => {
    const rails = new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF', 'NGN'], generateId: idGen() });
    expect(rails.simulated).toBe(true);
    const r = await rails.payout(reqXOF());
    expect(r).toMatchObject({ provider: 'honeycoin', status: 'PENDING', destinationCurrency: 'XOF', reference: 'order_1' });
    expect(r.payoutId).toMatch(/^payout_/);
  });

  it('rejects an unsupported currency', async () => {
    const rails = new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF'], generateId: idGen() });
    await expect(rails.payout(reqXOF({ destinationCurrency: 'NGN' }))).rejects.toBeInstanceOf(RampPayoutError);
  });

  it('is idempotent by reference', async () => {
    const rails = new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF'], generateId: idGen() });
    const a = await rails.payout(reqXOF());
    const b = await rails.payout(reqXOF());
    expect(a.payoutId).toBe(b.payoutId);
  });

  it('reflects delivery — the authoritative fiat-leg proof for reconciliation', async () => {
    const rails = new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF'], generateId: idGen() });
    const r = await rails.payout(reqXOF());
    rails.markDelivered(r.payoutId, 65_595); // ~XOF minor delivered (illustrative)
    const s = await rails.getStatus(r.payoutId);
    expect(s.status).toBe('DELIVERED');
    expect(s.amountLocalMinor).toBe(65_595);
  });

  it('delivers by reference (mirrors a ramp webhook keyed on our reference)', async () => {
    const rails = new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF'], generateId: idGen() });
    const r = await rails.payout(reqXOF());
    rails.markDeliveredByReference('order_1', 65_595);
    expect((await rails.getStatus(r.payoutId)).status).toBe('DELIVERED');
  });
});

describe('RampPayoutRouter', () => {
  const LARGE = 5_000_000_000; // large-ticket threshold (destinationCurrency minor units)
  const honeycoin = () => new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF', 'NGN'], generateId: idGen() });
  const conduit = (failRefs: string[] = []) =>
    new SimulatedRampPayoutRails({ provider: 'conduit', currencies: ['XOF', 'NGN'], generateId: idGen(), failReferences: failRefs });

  // Policy: small/standard → HoneyCoin; large → Conduit first (cheaper at volume), HoneyCoin fallback.
  const routes = (hc = honeycoin(), cd = conduit()): RampRoute[] => [
    { rails: cd, priority: 1, appliesTo: (r) => r.amountMinor >= LARGE },
    { rails: hc, priority: 2 },
  ];

  it('routes small tickets to HoneyCoin only (avoids the fixed-fee rail)', () => {
    const router = new RampPayoutRouter(routes());
    const names = router.candidates(reqXOF({ amountMinor: 100_000_000 })).map((x) => x.provider);
    expect(names).toEqual(['honeycoin']);
  });

  it('prefers Conduit for large tickets, with HoneyCoin as fallback', () => {
    const router = new RampPayoutRouter(routes());
    const names = router.candidates(reqXOF({ amountMinor: LARGE })).map((x) => x.provider);
    expect(names).toEqual(['conduit', 'honeycoin']);
  });

  it('falls back to the next rail when the preferred one is unavailable', async () => {
    const router = new RampPayoutRouter(routes(honeycoin(), conduit(['order_big'])));
    const res = await router.payout(reqXOF({ reference: 'order_big', amountMinor: LARGE }));
    expect(res.provider).toBe('honeycoin'); // Conduit failed → fell back to HoneyCoin
  });

  it('throws when no rail supports the currency', async () => {
    const router = new RampPayoutRouter([
      { rails: new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF'], generateId: idGen() }), priority: 1 },
    ]);
    await expect(router.payout(reqXOF({ destinationCurrency: 'KES' }))).rejects.toBeInstanceOf(RampPayoutError);
  });

  it('polls a payout status through the router (the owning rail answers)', async () => {
    const hc = honeycoin();
    const router = new RampPayoutRouter([{ rails: hc, priority: 1 }]);
    const r = await router.payout(reqXOF());
    hc.markDeliveredByReference('order_1', 65_595);
    expect((await router.getStatus(r.payoutId)).status).toBe('DELIVERED');
  });
});
