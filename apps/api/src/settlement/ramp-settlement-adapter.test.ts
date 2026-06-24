import { describe, expect, it } from 'vitest';
import { type LedgerDeps } from './ledger.js';
import { InMemoryLedgerStore } from './ledger-store.js';
import { createOrder } from './payment-order.js';
import { Reconciler } from './reconciliation.js';
import { RampPayoutRouter, SimulatedRampPayoutRails, type RampRoute } from './ramp-payout.js';
import { RampSettlementAdapter } from './ramp-settlement-adapter.js';
import { SimulatedRails } from './settlement-rails.js';
import { SettlementEngine, type Converter } from './settlement-engine.js';

function ledgerDeps(): LedgerDeps {
  let t = 0;
  let e = 0;
  return { generateTxnId: () => `txn_${++t}`, generateEntryId: () => `ent_${++e}`, now: () => '2026-06-16T10:00:00.000Z' };
}
function seq(prefix: string) {
  let n = 0;
  return () => `${prefix}_${++n}`;
}
function seqId(prefix: string) {
  let n = 0;
  return (p: string) => `${p}_${prefix}_${++n}`;
}

const DIGITS: Record<string, number> = { USDT: 2, XOF: 0 };
const minorDigits = (c: string) => DIGITS[c.toUpperCase()] ?? 2;

// USDT(2dp) → XOF(0dp): rate 600. 200 (=$2.00) → 200 * 600 / 100 = 1200 XOF.
const bridgeConverter: Converter = {
  async convert(amountMinor, _f, _t, fd, td) {
    const rate = 600;
    return { amountOutMinor: Math.round(amountMinor * rate * (10 ** td / 10 ** fd)), rate: '600', source: 'stub' };
  },
};

const now = '2026-06-16T10:00:00.000Z';
const okCtx = { now, kycTier: 3, conditionMet: () => true };

function bridgeOrder() {
  return createOrder({
    id: 'o1',
    idempotencyKey: 'o1',
    createdAt: now,
    payer: { id: 'agent', type: 'agent_ai' },
    amountInMinor: 200,
    currencyIn: 'USDT',
    currencyOut: 'XOF',
    beneficiaries: [{ id: 'b1', method: 'mobile_money', shareBps: 10_000 }],
  });
}

function build() {
  const ledger = new InMemoryLedgerStore(ledgerDeps());
  const reconciler = new Reconciler();
  const base = new SimulatedRails({ generateRef: seq('fund') }); // entrée/refund only
  const ramp = new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF', 'NGN'], generateId: seqId('hc') });
  const routes: RampRoute[] = [{ rails: ramp, priority: 1 }];
  const adapter = new RampSettlementAdapter(new RampPayoutRouter(routes), base, {
    beneficiaryChannel: (dest) => ({ kind: 'mobile_money', provider: 'wave', phone: `+221${dest}` }),
  });
  const engine = new SettlementEngine({
    ledger,
    rails: adapter,
    reconciler,
    converter: bridgeConverter,
    minorDigits,
    technicalCapMinor: 2000, // one shard for 1200 XOF
  });
  return { ledger, reconciler, ramp, engine };
}

describe('ramp settlement adapter — engine end to end (USDT → XOF via off-ramp)', () => {
  it('settles to SETTLED with the sortie PENDING until the ramp delivers', async () => {
    const { engine } = build();
    const res = await engine.settle(bridgeOrder(), okCtx);

    expect(res.state).toBe('SETTLED'); // not RECONCILED yet — off-ramp is async
    expect(res.reconciled).toBe(false);
    expect(res.pendingLegIds).toEqual(['o1:out:b1:0']); // the off-ramp shard awaits delivery
    expect(res.conservationViolations).toEqual([]);
  });

  it('reaches RECONCILED once the ramp confirms delivery (deliverPending), money conserved', async () => {
    const { ledger, ramp, engine } = build();
    const res = await engine.settle(bridgeOrder(), okCtx);
    expect(res.state).toBe('SETTLED');

    // The ramp settles the payout — webhook keyed on our leg reference.
    ramp.markDeliveredByReference('o1:out:b1:0', 1200);

    const done = await engine.deliverPending(res.order);
    expect(done.state).toBe('RECONCILED');
    expect(done.reconciled).toBe(true);
    expect(done.pendingLegIds).toEqual([]);
    expect(done.conservationViolations).toEqual([]);
    expect(await ledger.balance('ramp_out:o1')).toBe(1200); // XOF delivered out
    expect(await ledger.balance('benef:o1:b1')).toBe(0); // fully paid out
    expect(await ledger.balance('escrow_out:o1')).toBe(0);
  });

  it('stays pending (retriable) and never reconciles while the ramp has not delivered', async () => {
    const { engine } = build();
    const res = await engine.settle(bridgeOrder(), okCtx);
    // No delivery → deliverPending leaves it SETTLED with the shard still pending.
    const again = await engine.deliverPending(res.order);
    expect(again.state).toBe('SETTLED');
    expect(again.pendingLegIds).toEqual(['o1:out:b1:0']);
  });

  it('falls back to a second ramp when the primary is unavailable', async () => {
    const ledger = new InMemoryLedgerStore(ledgerDeps());
    const reconciler = new Reconciler();
    const base = new SimulatedRails({ generateRef: seq('fund') });
    const downPrimary = new SimulatedRampPayoutRails({ provider: 'conduit', currencies: ['XOF'], generateId: seqId('cd'), failReferences: ['o1:out:b1:0'] });
    const backup = new SimulatedRampPayoutRails({ provider: 'honeycoin', currencies: ['XOF'], generateId: seqId('hc') });
    const adapter = new RampSettlementAdapter(
      new RampPayoutRouter([
        { rails: downPrimary, priority: 1 },
        { rails: backup, priority: 2 },
      ]),
      base,
      { beneficiaryChannel: (dest) => ({ kind: 'mobile_money', provider: 'wave', phone: `+221${dest}` }) },
    );
    const engine = new SettlementEngine({ ledger, rails: adapter, reconciler, converter: bridgeConverter, minorDigits, technicalCapMinor: 2000 });

    const res = await engine.settle(bridgeOrder(), okCtx);
    expect(res.state).toBe('SETTLED'); // primary failed at init → router fell back to backup (pending)

    backup.markDeliveredByReference('o1:out:b1:0', 1200); // the backup ramp settles it
    const done = await engine.deliverPending(res.order);
    expect(done.state).toBe('RECONCILED');
    expect(await ledger.balance('ramp_out:o1')).toBe(1200);
  });
});
