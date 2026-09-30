import { describe, expect, it } from 'vitest';
import { decideMatch, route, normalizeCiMsisdn, computeTotals, identifierHash } from '@swimpay/brain';

const T = (s: string) => new Date(s);
const MIDI = T('2026-08-29T12:00:00Z');

/* Les huit soupcons de la revue du 29 aout 2026. Six etaient reels et sont
   corriges ; deux etaient des faux et le code faisait deja bien. Ce fichier
   reste comme garde de non-regression. */
describe('REVUE — les huit soupcons', () => {
  it('A. un paiement ECHOUE ne rapproche pas une vente', () => {
    const d = decideMatch(
      { amountMinor: 50_000, reference: 'VTE-1', occurredAt: MIDI,
        status: 'failed', operation: 'payin' },
      [{ id: 'a', amountMinor: 50_000, reference: 'VTE-1', occurredAt: MIDI }],
    );
    expect(d.kind).not.toBe('match');
  });

  it('B. un VERSEMENT sortant ne rapproche pas une vente entrante', () => {
    const d = decideMatch(
      { amountMinor: 50_000, reference: 'VTE-2', occurredAt: MIDI,
        status: 'succeeded', operation: 'payout' },
      [{ id: 'a', amountMinor: 50_000, reference: 'VTE-2', occurredAt: MIDI }],
    );
    expect(d.kind).not.toBe('match');
  });

  it('C. une reference qui ne differe que par la casse rapproche bien', () => {
    const d = decideMatch(
      { amountMinor: 50_000, reference: 'vte-3', occurredAt: MIDI,
        status: 'succeeded', operation: 'payin' },
      [{ id: 'a', amountMinor: 99_000, reference: 'VTE-3', occurredAt: MIDI }],
    );
    // La reference designe la vente ; l ecart de montant part en file.
    expect(d).toMatchObject({ kind: 'exception', exception: 'amount_mismatch' });
  });

  it('D. un versement dont le cout depasse le montant devrait etre refuse', () => {
    const d = route({ operation: 'payout', currency: 'XOF', amountMinor: 100 }, [
      { operation: 'payout', currency: 'XOF', rail: 'cher', operator: '*', enabled: true,
        costFixedMinor: 150, costPercentBp: 0, priority: 1 },
    ]);
    expect(d.kind).toBe('refuse');
  });

  it('E. FAUX SOUPCON — un 8 chiffres doit bien etre rejete', () => {
    // LO a tranche : tous les numeros sont passes a 10 chiffres, les anciens
    // n existent plus. Le rejet etait donc le bon comportement des le depart.
    expect(() => normalizeCiMsisdn('07123456')).toThrow(/10 chiffres depuis 2021/);
  });

  it('F. une cle HMAC vide devrait etre refusee', () => {
    expect(() => identifierHash('', 'msisdn', '+2250707123456')).toThrow();
  });

  it('G. une quantite fractionnaire ne devrait pas creer un centime fantome', () => {
    // 333 F le kilo, 1,5 kg = 499,5 F HT. En XOF il n y a pas de demi-franc.
    const t = computeTotals([
      { description: 'Riz', unitPriceMinor: 333, quantity: 1.5, taxes: 'TVA' },
    ]);
    expect(Number.isInteger(t.totalHtMinor)).toBe(true);
    expect(t.totalHtMinor + t.totalTvaMinor).toBe(t.totalTtcMinor);
  });

  it('H. un montant astronomique ne devrait pas passer en silence', () => {
    expect(() =>
      computeTotals([
        { description: 'X', unitPriceMinor: Number.MAX_SAFE_INTEGER, quantity: 1000, taxes: 'TVA' },
      ]),
    ).toThrow();
  });
});
