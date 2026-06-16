import { beforeEach, describe, expect, it } from 'vitest';
import { Reconciler, type ExpectedLeg, type Proof } from './reconciliation.js';

const fiatLeg: ExpectedLeg = { id: 'leg1', orderId: 'o1', kind: 'fiat', amountMinor: 58_788, currency: 'XOF', destination: '+221770000000' };
const chainLeg: ExpectedLeg = { id: 'leg2', orderId: 'o1', kind: 'on_chain', amountMinor: 100, currency: 'USDT', destination: '0xabc' };

function rampProof(over: Partial<Proof> = {}): Proof {
  return { reference: 'cb_1', source: 'ramp', kind: 'fiat', amountMinor: 58_788, currency: 'XOF', destination: '+221770000000', ...over };
}

describe('Reconciler', () => {
  let rec: Reconciler;
  beforeEach(() => {
    rec = new Reconciler();
    rec.registerExpected(fiatLeg);
  });

  it('confirms a fiat leg from an authoritative ramp proof', () => {
    const r = rec.applyProof(rampProof());
    expect(r.status).toBe('confirmed');
    expect(rec.legStatus('leg1')).toBe('confirmed');
  });

  it('confirms an on-chain leg from a chain proof', () => {
    rec.registerExpected(chainLeg);
    const r = rec.applyProof({ reference: 'tx_1', source: 'chain', kind: 'on_chain', amountMinor: 100, currency: 'USDT', destination: '0xabc' });
    expect(r.status).toBe('confirmed');
  });

  it('treats a notification as corroboration only — never confirms on its own', () => {
    const r = rec.applyProof(rampProof({ reference: 'notif_1', source: 'notification' }));
    expect(r.status).toBe('corroborated');
    expect(rec.legStatus('leg1')).toBe('expected'); // still not confirmed
  });

  it('flags an amount mismatch beyond tolerance', () => {
    const r = rec.applyProof(rampProof({ amountMinor: 50_000 }));
    expect(r.status).toBe('discrepancy');
    if (r.status === 'discrepancy') expect(r.type).toBe('amount_mismatch');
    expect(rec.legStatus('leg1')).toBe('expected');
  });

  it('honors a configured amount tolerance', () => {
    const tol = new Reconciler({ amountToleranceMinor: 5 });
    tol.registerExpected(fiatLeg);
    expect(tol.applyProof(rampProof({ amountMinor: 58_785 })).status).toBe('confirmed');
  });

  it('flags an unexpected proof with no matching leg', () => {
    const r = rec.applyProof(rampProof({ destination: '+221779999999' }));
    expect(r.status).toBe('discrepancy');
    if (r.status === 'discrepancy') expect(r.type).toBe('unexpected');
  });

  it('is idempotent: a duplicate proof reference never double-confirms', () => {
    expect(rec.applyProof(rampProof()).status).toBe('confirmed');
    const dup = rec.applyProof(rampProof());
    expect(dup.status).toBe('discrepancy');
    if (dup.status === 'discrepancy') expect(dup.type).toBe('duplicate');
  });

  it('marks the order RECONCILED only when every leg is confirmed (swarm: partial → pending)', () => {
    rec.registerExpected(chainLeg); // order o1 now has two legs
    expect(rec.allConfirmed('o1')).toBe(false);

    rec.applyProof(rampProof()); // confirm leg1
    expect(rec.allConfirmed('o1')).toBe(false);
    expect(rec.pendingLegs('o1').map((l) => l.id)).toEqual(['leg2']);

    rec.applyProof({ reference: 'tx_1', source: 'chain', kind: 'on_chain', amountMinor: 100, currency: 'USDT', destination: '0xabc' });
    expect(rec.allConfirmed('o1')).toBe(true);
    expect(rec.pendingLegs('o1')).toHaveLength(0);
  });
});
