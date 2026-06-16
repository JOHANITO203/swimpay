import { describe, expect, it } from 'vitest';
import { SimulatedRails, type RailLeg } from './settlement-rails.js';

function refGen() {
  let n = 0;
  return () => `sim_${++n}`;
}

const fiatLeg: RailLeg = { legId: 'l1', kind: 'fiat', amountMinor: 58_788, currency: 'XOF', destination: '+221770000000' };
const chainLeg: RailLeg = { legId: 'l2', kind: 'on_chain', amountMinor: 100, currency: 'USDT', destination: '0xabc' };

describe('SimulatedRails', () => {
  it('is explicitly labelled as simulated (never mistaken for live)', () => {
    expect(new SimulatedRails({ generateRef: refGen() }).simulated).toBe(true);
  });

  it('produces a ramp-sourced proof for a fiat payout', async () => {
    const rails = new SimulatedRails({ generateRef: refGen() });
    const out = await rails.payout('o1', fiatLeg);
    expect(out.ok).toBe(true);
    expect(out.proof?.source).toBe('ramp');
    expect(out.proof?.amountMinor).toBe(58_788);
    expect(out.proof?.destination).toBe('+221770000000');
  });

  it('produces a chain-sourced proof for an on-chain leg', async () => {
    const rails = new SimulatedRails({ generateRef: refGen() });
    const out = await rails.fund('o1', chainLeg);
    expect(out.ok).toBe(true);
    expect(out.proof?.source).toBe('chain');
  });

  it('fails the configured legs (to exercise partial/retry)', async () => {
    const rails = new SimulatedRails({ generateRef: refGen(), failLegs: new Set(['l1']) });
    const failed = await rails.payout('o1', fiatLeg);
    expect(failed.ok).toBe(false);
    expect(failed.proof).toBeUndefined();

    const ok = await rails.payout('o1', chainLeg);
    expect(ok.ok).toBe(true);
  });

  it('refunds with a proof', async () => {
    const rails = new SimulatedRails({ generateRef: refGen() });
    expect((await rails.refund('o1', chainLeg)).ok).toBe(true);
  });
});
