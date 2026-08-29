import { describe, expect, it } from 'vitest';
import { decideCash, decideMatch, type CandidateSale } from './decide.js';

const T = (iso: string) => new Date(iso);
const MIDI = T('2026-08-29T12:00:00.000Z');

const vente = (
  id: string,
  amountMinor: number,
  extra: Partial<CandidateSale> = {},
): CandidateSale => ({
  id,
  amountMinor,
  occurredAt: MIDI,
  ...extra,
});

const paiement = (amountMinor: number, reference?: string, occurredAt = MIDI) => ({
  amountMinor,
  reference,
  occurredAt,
});

describe('Le Rapprocheur — ce qu il tranche seul', () => {
  it('rapproche a 100 quand la reference du paiement designe une vente', () => {
    const d = decideMatch(paiement(50_000, 'VTE-42'), [
      vente('a', 50_000, { reference: 'VTE-42' }),
      vente('b', 50_000, { reference: 'VTE-43' }),
    ]);
    expect(d).toMatchObject({ kind: 'match', saleId: 'a', score: 100, method: 'auto_ref' });
  });

  it('rapproche a 95 sur un montant exact quand le candidat est unique', () => {
    const d = decideMatch(paiement(50_000), [vente('a', 50_000), vente('b', 30_000)]);
    expect(d).toMatchObject({ kind: 'match', saleId: 'a', score: 95, method: 'auto_heur' });
  });

  it('rapproche une vente en especes des la saisie', () => {
    expect(decideCash('a')).toMatchObject({ kind: 'match', saleId: 'a', method: 'cash' });
  });
});

describe('Le Rapprocheur — ce qu il refuse de trancher', () => {
  it('ne choisit pas entre deux ventes du meme montant', () => {
    const d = decideMatch(paiement(1_000), [vente('a', 1_000), vente('b', 1_000)]);
    expect(d).toMatchObject({ kind: 'exception', exception: 'ambiguous_match' });
    if (d.kind === 'exception') expect(d.candidateIds).toEqual(['a', 'b']);
  });

  it('ne choisit pas non plus quand deux ventes portent la meme reference', () => {
    const d = decideMatch(paiement(1_000, 'DOUBLON'), [
      vente('a', 1_000, { reference: 'DOUBLON' }),
      vente('b', 2_000, { reference: 'DOUBLON' }),
    ]);
    expect(d).toMatchObject({ kind: 'exception', exception: 'ambiguous_match' });
  });

  it('signale l ecart quand la reference est bonne mais le montant non', () => {
    const d = decideMatch(paiement(49_750, 'VTE-7'), [
      vente('a', 50_000, { reference: 'VTE-7' }),
    ]);
    expect(d).toMatchObject({ kind: 'exception', exception: 'amount_mismatch' });
    if (d.kind === 'exception') expect(d.candidateIds).toEqual(['a']);
  });

  it('signale l ecart sur un candidat unique dont le montant differe', () => {
    const d = decideMatch(paiement(49_750), [vente('a', 50_000)]);
    expect(d).toMatchObject({ kind: 'exception', exception: 'amount_mismatch' });
  });

  it('declare orphelin un paiement sans aucune vente en attente', () => {
    const d = decideMatch(paiement(50_000), []);
    expect(d).toMatchObject({ kind: 'exception', exception: 'unmatched_payment' });
  });

  it('declare orphelin quand plusieurs ventes existent mais aucune du bon montant', () => {
    const d = decideMatch(paiement(77_000), [vente('a', 50_000), vente('b', 30_000)]);
    expect(d).toMatchObject({ kind: 'exception', exception: 'unmatched_payment' });
  });

  it('ignore une vente hors de la fenetre de 48 heures', () => {
    const vieille = vente('a', 50_000, { occurredAt: T('2026-08-26T12:00:00.000Z') });
    const d = decideMatch(paiement(50_000), [vieille]);
    expect(d).toMatchObject({ kind: 'exception', exception: 'unmatched_payment' });
  });

  it('garde une vente juste dans la fenetre', () => {
    const limite = vente('a', 50_000, { occurredAt: T('2026-08-27T12:00:00.000Z') });
    const d = decideMatch(paiement(50_000), [limite]);
    expect(d).toMatchObject({ kind: 'match', saleId: 'a' });
  });

  it('retombe sur le montant quand la reference du paiement est inconnue', () => {
    const d = decideMatch(paiement(50_000, 'LIBELLE-LIBRE'), [
      vente('a', 50_000, { reference: 'VTE-9' }),
    ]);
    expect(d).toMatchObject({ kind: 'match', saleId: 'a', method: 'auto_heur' });
  });

  it('ne prend pas un paiement partiel pour un rapprochement', () => {
    // 30 000 verses sur une vente de 50 000 : la v1 ne sait pas faire, et le
    // dit, plutot que de rapprocher a moitie.
    const d = decideMatch(paiement(30_000), [vente('a', 50_000)]);
    expect(d).toMatchObject({ kind: 'exception', exception: 'amount_mismatch' });
  });
});
