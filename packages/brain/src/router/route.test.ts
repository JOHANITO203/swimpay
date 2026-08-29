import { describe, expect, it } from 'vitest';
import { estimateCost, route, type RailPolicy } from './route.js';

const p = (over: Partial<RailPolicy> = {}): RailPolicy => ({
  operation: 'payout',
  currency: 'XOF',
  rail: 'paydunya',
  operator: '*',
  enabled: true,
  costFixedMinor: 100,
  costPercentBp: 150,
  priority: 100,
  ...over,
});

describe('Le cout estime', () => {
  it('additionne la part fixe et la part proportionnelle', () => {
    // 100 F fixes + 1,5 % de 50 000 = 100 + 750
    expect(estimateCost(p(), 50_000)).toBe(850);
  });

  it('rend indefini quand aucune grille n est configuree', () => {
    expect(estimateCost(p({ costFixedMinor: null, costPercentBp: null }), 50_000)).toBeUndefined();
  });

  it('accepte une grille purement fixe ou purement proportionnelle', () => {
    expect(estimateCost(p({ costPercentBp: null }), 50_000)).toBe(100);
    expect(estimateCost(p({ costFixedMinor: null }), 50_000)).toBe(750);
  });
});

describe('Le routeur — le garde-fou avant le choix', () => {
  it('refuse un versement sur un rail sans grille de cout', () => {
    const d = route({ operation: 'payout', currency: 'XOF', amountMinor: 50_000 }, [
      p({ costFixedMinor: null, costPercentBp: null }),
    ]);
    expect(d).toMatchObject({ kind: 'refuse', code: 'missing_cost_grid' });
  });

  it('laisse passer un encaissement sans grille : on ne perd rien a encaisser', () => {
    const d = route({ operation: 'payin', currency: 'XOF', amountMinor: 50_000 }, [
      p({ operation: 'payin', costFixedMinor: null, costPercentBp: null }),
    ]);
    expect(d).toMatchObject({ kind: 'route', rail: 'paydunya' });
  });

  it('refuse quand aucune politique ne couvre la demande', () => {
    const d = route({ operation: 'payout', currency: 'EUR', amountMinor: 1_000 }, [p()]);
    expect(d).toMatchObject({ kind: 'refuse', code: 'no_policy' });
  });

  it('refuse quand tout est desactive, sans choisir malgre tout', () => {
    const d = route({ operation: 'payout', currency: 'XOF', amountMinor: 1_000 }, [
      p({ enabled: false }),
    ]);
    expect(d).toMatchObject({ kind: 'refuse', code: 'all_disabled' });
  });
});

describe('Le routeur — le choix', () => {
  it('suit la priorite croissante', () => {
    const d = route({ operation: 'payout', currency: 'XOF', amountMinor: 1_000 }, [
      p({ rail: 'lent', priority: 200 }),
      p({ rail: 'rapide', priority: 10 }),
    ]);
    expect(d).toMatchObject({ kind: 'route', rail: 'rapide' });
  });

  it('prefere la politique de l operateur exact au joker', () => {
    const d = route(
      { operation: 'payout', currency: 'XOF', amountMinor: 1_000, operator: 'wave-ci' },
      [p({ rail: 'general', operator: '*' }), p({ rail: 'dedie', operator: 'wave-ci' })],
    );
    expect(d).toMatchObject({ kind: 'route', rail: 'dedie' });
  });

  it('ecarte un rail dont le taux d echec depasse le seuil', () => {
    const d = route(
      { operation: 'payout', currency: 'XOF', amountMinor: 1_000 },
      [p({ rail: 'casse', priority: 10 }), p({ rail: 'sain', priority: 100 })],
      { health: [{ rail: 'casse', failureRateBp: 7_000, samples: 50 }] },
    );
    expect(d).toMatchObject({ kind: 'route', rail: 'sain' });
    if (d.kind === 'route') expect(d.reason).toContain('casse');
  });

  it('ne juge pas la sante sur trop peu d observations', () => {
    const d = route(
      { operation: 'payout', currency: 'XOF', amountMinor: 1_000 },
      [p({ rail: 'suspect', priority: 10 }), p({ rail: 'sain', priority: 100 })],
      { health: [{ rail: 'suspect', failureRateBp: 10_000, samples: 3 }] },
    );
    expect(d).toMatchObject({ kind: 'route', rail: 'suspect' });
  });

  it('refuse plutot que de router vers un rail que la sante condamne', () => {
    const d = route(
      { operation: 'payout', currency: 'XOF', amountMinor: 1_000 },
      [p({ rail: 'casse' })],
      { health: [{ rail: 'casse', failureRateBp: 9_000, samples: 100 }] },
    );
    expect(d).toMatchObject({ kind: 'refuse', code: 'rail_unhealthy' });
  });

  it('refuse un versement dont les frais depassent le montant verse', () => {
    // 150 F de frais pour 100 F verses : la grille existe, elle est absurde.
    const d = route({ operation: 'payout', currency: 'XOF', amountMinor: 100 }, [
      p({ costFixedMinor: 150, costPercentBp: 0, priority: 1 }),
    ]);
    expect(d).toMatchObject({ kind: 'refuse', code: 'cost_exceeds_amount' });
  });

  it('rend le cout estime avec la decision', () => {
    const d = route({ operation: 'payout', currency: 'XOF', amountMinor: 100_000 }, [p()]);
    expect(d).toMatchObject({ kind: 'route', estimatedCostMinor: 1_600 });
  });
});
