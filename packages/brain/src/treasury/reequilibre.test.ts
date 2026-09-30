import { describe, expect, it } from 'vitest';
import {
  planifieReequilibrage,
  type CaisseAvecBudget,
  type EtatTresorerie,
} from './reequilibre.js';
import type { RailPolicy } from '../router/route.js';

const caisse = (operator: string, balanceMinor: number, budgetMinor: number): CaisseAvecBudget => ({
  operator,
  balanceMinor,
  budgetMinor,
});

const rail = (
  nom: string,
  costPercentBp: number | null,
  priority = 10,
  costFixedMinor: number | null = 0,
): RailPolicy => ({
  operation: 'payout',
  currency: 'XOF',
  rail: nom,
  operator: '*',
  enabled: true,
  costFixedMinor,
  costPercentBp,
  priority,
});

// julaya 1 %, hub2 2 % — les deux rails du simulateur, en points de base.
const JULAYA = rail('julaya', 100, 10);
const HUB2 = rail('hub2', 200, 20);

describe('le cas nominal — une caisse deborde, une est a sec', () => {
  it('un seul mouvement, du surplus vers le manque, jusqu au budget', () => {
    const etat: EtatTresorerie = {
      // orange deborde de 2 M ; wave (500 k) est sous son seuil (60 % de 2 M = 1,2 M).
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA, HUB2],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toHaveLength(1);
    expect(plan.mouvements[0]).toMatchObject({
      fromOperator: 'orange',
      toOperator: 'wave',
      amountMinor: 1_500_000, // budget 2 M − solde 500 k : on recharge jusqu au budget
      rail: 'julaya', // le moins cher des deux
      coutEstimeMinor: 15_000, // 1 % de 1,5 M
    });
    expect(plan.coutTotalEstimeMinor).toBe(15_000);
    expect(plan.caissesInsolvables).toEqual([]);
  });

  it('plusieurs sources : la caisse se recharge par morceaux, sources en ordre alphabetique', () => {
    const etat: EtatTresorerie = {
      caisses: [
        caisse('moov', 1_400_000, 1_000_000), // dispo 400 k
        caisse('orange', 4_200_000, 3_000_000), // dispo 1,2 M
        caisse('wave', 500_000, 2_000_000), // besoin 1,5 M
      ],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements.map((m) => [m.fromOperator, m.amountMinor])).toEqual([
      ['moov', 400_000],
      ['orange', 1_100_000],
    ]);
    expect(plan.coutTotalEstimeMinor).toBe(4_000 + 11_000);
    expect(plan.caissesInsolvables).toEqual([]);
  });
});

describe('rien a faire — zero mouvement quand tout est dans les bornes', () => {
  it('caisse au budget, caisse entre seuil et budget : aucun mouvement', () => {
    const etat: EtatTresorerie = {
      caisses: [
        caisse('orange', 3_000_000, 3_000_000), // pile au budget : ni source ni basse
        caisse('wave', 1_500_000, 2_000_000), // 75 % du budget, au-dessus du seuil de 60 %
      ],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.coutTotalEstimeMinor).toBe(0);
    expect(plan.caissesInsolvables).toEqual([]);
    expect(plan.reasons).toEqual([]);
  });
});

describe('les previsions — la facture donne la tresorerie de demain (17 §2.1)', () => {
  const caisses = [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)];

  it('une grosse entree prevue sous l horizon ANNULE la recharge', () => {
    const etat: EtatTresorerie = {
      caisses,
      railPolicies: [JULAYA],
      // 1,8 M attendus dans 2 jours : le solde projete (2,3 M) repasse le seuil.
      previsions: [{ operator: 'wave', amountMinor: 1_800_000, horizonJours: 2 }],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.coutTotalEstimeMinor).toBe(0);
    expect(plan.reasons.some((r) => r.includes('wave') && r.includes('annulee'))).toBe(true);
  });

  it('une prevision au-dela de l horizon ne compte pas : la recharge part quand meme', () => {
    const etat: EtatTresorerie = {
      caisses,
      railPolicies: [JULAYA],
      // 10 jours, horizon par defaut 3 : attendre, c est etre a sec entre-temps.
      previsions: [{ operator: 'wave', amountMinor: 1_800_000, horizonJours: 10 }],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toHaveLength(1);
    expect(plan.mouvements[0]?.amountMinor).toBe(1_500_000);
  });

  it('une prevision partielle REDUIT la recharge : on ne complete que ce que les factures n apportent pas', () => {
    /* Choix documente : besoin = budget − (solde + prevu). Ici wave a 200 k,
       800 k arrivent sous l horizon → solde projete 1 M, toujours sous le
       seuil (1,2 M) → on recharge budget − projete = 1 M au lieu de 1,8 M.
       Payer un rail pour les 800 k deja en route serait une perte seche. */
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 200_000, 2_000_000)],
      railPolicies: [JULAYA],
      previsions: [{ operator: 'wave', amountMinor: 800_000, horizonJours: 1 }],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toHaveLength(1);
    expect(plan.mouvements[0]?.amountMinor).toBe(1_000_000);
    expect(plan.reasons.some((r) => r.includes('wave') && r.includes('reduite'))).toBe(true);
  });

  it('les previsions ne creent jamais un excedent cote source : on ne puise pas dans l argent promis', () => {
    const etat: EtatTresorerie = {
      // orange est pile au budget ; une prevision enorme ne le rend pas source.
      caisses: [caisse('orange', 3_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA],
      previsions: [{ operator: 'orange', amountMinor: 10_000_000, horizonJours: 1 }],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.caissesInsolvables).toEqual(['wave']);
  });
});

describe('les plafonds mensuels — la capacite se respecte et se consomme', () => {
  it('rail le moins cher plafonne → le mouvement part entier sur le 2e rail plus cher', () => {
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA, HUB2],
    };
    const plan = planifieReequilibrage(etat, {
      plafondMensuelParRail: { julaya: 1_000_000 },
      consommeParRail: { julaya: 800_000 }, // il ne reste que 200 k sur julaya
    });
    expect(plan.mouvements).toHaveLength(1);
    expect(plan.mouvements[0]).toMatchObject({
      rail: 'hub2',
      amountMinor: 1_500_000,
      coutEstimeMinor: 30_000, // 2 % au lieu de 1 % : le plafond a un prix
    });
    expect(plan.caissesInsolvables).toEqual([]);
  });

  it('le plan consomme sa propre capacite : le 1er mouvement sature julaya, le 2e bascule sur hub2', () => {
    const etat: EtatTresorerie = {
      caisses: [
        caisse('moov', 100_000, 1_000_000), // besoin 900 k, servi d abord (ordre alphabetique)
        caisse('orange', 6_000_000, 3_000_000), // dispo 3 M
        caisse('wave', 400_000, 2_000_000), // besoin 1,6 M
      ],
      railPolicies: [JULAYA, HUB2],
    };
    const plan = planifieReequilibrage(etat, { plafondMensuelParRail: { julaya: 1_000_000 } });
    expect(plan.mouvements.map((m) => [m.toOperator, m.rail, m.amountMinor])).toEqual([
      ['moov', 'julaya', 900_000], // 900 k ≤ 1 M : passe
      ['wave', 'hub2', 1_600_000], // 900 k + 1,6 M > 1 M : julaya est sature par le plan lui-meme
    ]);
    expect(plan.coutTotalEstimeMinor).toBe(9_000 + 32_000);
  });
});

describe('les insolvables — signalees, jamais tues', () => {
  it('aucune source excedentaire → la caisse est signalee, le plan reste vide', () => {
    // La vague de retraits (17 §7.4) : tout se vide en meme temps, rien a puiser.
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 3_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.some((r) => r.includes('aucune source excedentaire'))).toBe(true);
  });

  it('cout inconnu → mouvement REFUSE, meme avec l argent en face (on ne paie pas a l aveugle)', () => {
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      // La politique existe et est active, mais aucune grille de cout.
      railPolicies: [rail('julaya', null, 10, null)],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.coutTotalEstimeMinor).toBe(0);
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.some((r) => r.includes('aucune grille de cout'))).toBe(true);
  });

  it('aucune politique du tout → insolvable aussi, avec sa raison propre', () => {
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.some((r) => r.includes('aucune politique de rail'))).toBe(true);
  });
});

describe('le determinisme — memes entrees, memes sorties, quel que soit l ordre du tableau', () => {
  const railPolicies = [HUB2, JULAYA]; // volontairement dans le desordre
  const previsions = [
    { operator: 'moov', amountMinor: 200_000, horizonJours: 1 },
    { operator: 'mtn', amountMinor: 5_000_000, horizonJours: 2 },
  ];
  const caisses = [
    caisse('wave', 400_000, 2_000_000),
    caisse('orange', 6_000_000, 3_000_000),
    caisse('moov', 100_000, 1_000_000),
    caisse('mtn', 100_000, 4_000_000), // sauvee par sa prevision de 5 M
  ];
  const options = {
    plafondMensuelParRail: { julaya: 1_000_000 },
    consommeParRail: { julaya: 300_000 },
  };

  it('double appel : egalite profonde', () => {
    const etat: EtatTresorerie = { caisses, railPolicies, previsions };
    const a = planifieReequilibrage(etat, options);
    const b = planifieReequilibrage(etat, options);
    expect(a).toEqual(b);
  });

  it('caisses melangees : le meme plan, ordonne par operateur', () => {
    const etat: EtatTresorerie = { caisses, railPolicies, previsions };
    const melange: EtatTresorerie = {
      caisses: [...caisses].reverse(),
      railPolicies,
      previsions,
    };
    const a = planifieReequilibrage(etat, options);
    const b = planifieReequilibrage(melange, options);
    expect(b).toEqual(a);
    // Les destinations sortent en ordre alphabetique : la stabilite se lit.
    const destinations = a.mouvements.map((m) => m.toOperator);
    expect(destinations).toEqual([...destinations].sort());
  });

  it('tous les montants du plan sont des entiers — le XOF n a pas de centime', () => {
    const etat: EtatTresorerie = { caisses, railPolicies, previsions };
    const plan = planifieReequilibrage(etat, options);
    expect(plan.mouvements.length).toBeGreaterThan(0);
    for (const m of plan.mouvements) {
      expect(Number.isInteger(m.amountMinor)).toBe(true);
      expect(Number.isInteger(m.coutEstimeMinor)).toBe(true);
    }
    expect(Number.isInteger(plan.coutTotalEstimeMinor)).toBe(true);
  });
});

describe('les donnees illisibles — ecartees et signalees, jamais devinees', () => {
  it('solde flottant → caisse ecartee du plan, visible dans reasons', () => {
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 5_000_000.5, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat);
    // orange etait la seule source possible : wave devient insolvable.
    expect(plan.mouvements).toEqual([]);
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.some((r) => r.includes('orange') && r.includes('ecartee'))).toBe(true);
  });

  it('prevision invalide → ignoree dans le sens prudent : on recharge PLUS, pas moins', () => {
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA],
      previsions: [{ operator: 'wave', amountMinor: 1_800_000.75, horizonJours: 1 }],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements[0]?.amountMinor).toBe(1_500_000); // recharge pleine
    expect(plan.reasons.some((r) => r.includes('prevision') && r.includes('ecartee'))).toBe(true);
  });
});

describe('revue adversariale — les cas que le module doit refuser, pas absorber', () => {
  const nominal = [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)];

  it('consommation invalide SANS plafond declare : le rail ne sert pas, le mouvement bascule', () => {
    /* Le piege : deja = Infinity et plafond = Infinity, or Infinity > Infinity
       est faux — sans garde explicite, le rail a capacite inconnue passe. */
    const etat: EtatTresorerie = { caisses: nominal, railPolicies: [JULAYA, HUB2] };
    const plan = planifieReequilibrage(etat, { consommeParRail: { julaya: 500.5 } });
    expect(plan.mouvements).toHaveLength(1);
    expect(plan.mouvements[0]?.rail).toBe('hub2');
    expect(plan.reasons.some((r) => r.includes('julaya') && r.includes('invalide'))).toBe(true);
  });

  it('consommation invalide et SEUL rail : insolvable, pas de recharge a capacite inconnue', () => {
    const etat: EtatTresorerie = { caisses: nominal, railPolicies: [JULAYA] };
    const plan = planifieReequilibrage(etat, { consommeParRail: { julaya: Number.NaN } });
    expect(plan.mouvements).toEqual([]);
    expect(plan.caissesInsolvables).toEqual(['wave']);
  });

  it('plafond declare mais illisible : le rail est bloque, le mouvement part sur le suivant', () => {
    const etat: EtatTresorerie = { caisses: nominal, railPolicies: [JULAYA, HUB2] };
    const plan = planifieReequilibrage(etat, { plafondMensuelParRail: { julaya: 1_000_000.5 } });
    expect(plan.mouvements).toHaveLength(1);
    expect(plan.mouvements[0]?.rail).toBe('hub2');
    expect(plan.reasons.some((r) => r.includes('julaya') && r.includes('plafond'))).toBe(true);
  });

  it('sources epuisees apres recharge partielle : la raison dit les sources, pas les rails', () => {
    const etat: EtatTresorerie = {
      // orange n a que 500 k de surplus ; wave a besoin de 1,5 M. Aucun rail
      // n a refuse quoi que ce soit : le message ne doit pas accuser la capacite.
      caisses: [caisse('orange', 3_500_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toHaveLength(1);
    expect(plan.mouvements[0]?.amountMinor).toBe(500_000);
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.some((r) => r.includes('epuisees'))).toBe(true);
    expect(plan.reasons.some((r) => r.includes('capacite'))).toBe(false);
  });

  it('options illisibles (seuil NaN) : aucun plan — un NaN rend toute comparaison fausse', () => {
    const etat: EtatTresorerie = {
      // wave est a 95 % de son budget : AUCUNE recharge legitime possible.
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 1_900_000, 2_000_000)],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat, { seuilBasPct: Number.NaN });
    expect(plan.mouvements).toEqual([]);
    expect(plan.reasons.some((r) => r.includes('options illisibles'))).toBe(true);
  });

  it('horizon negatif : meme refus global', () => {
    const plan = planifieReequilibrage(
      { caisses: nominal, railPolicies: [JULAYA] },
      { horizonMaxJours: -1 },
    );
    expect(plan.mouvements).toEqual([]);
    expect(plan.reasons.some((r) => r.includes('options illisibles'))).toBe(true);
  });

  it('caisse a operateur vide : ecartee, jamais source d un mouvement inexecutable', () => {
    const etat: EtatTresorerie = {
      caisses: [caisse('', 5_000_000, 3_000_000), caisse('wave', 500_000, 2_000_000)],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.some((r) => r.includes('operateur vide'))).toBe(true);
  });

  it('cout fixe superieur au besoin : deplacer appauvrirait, le mouvement est refuse', () => {
    const etat: EtatTresorerie = {
      caisses: [caisse('orange', 5_000, 3_000), caisse('wave', 500, 1_000)],
      // 600 F de frais fixes pour deplacer 500 F : perte nette a chaque coup.
      railPolicies: [rail('julaya', 0, 10, 600)],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.caissesInsolvables).toEqual(['wave']);
  });

  it('solde PILE au seuil : dans les bornes, aucun mouvement — un franc de moins et la recharge part', () => {
    const pile = planifieReequilibrage({
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 1_200_000, 2_000_000)],
      railPolicies: [JULAYA],
    });
    expect(pile.mouvements).toEqual([]);
    const dessous = planifieReequilibrage({
      caisses: [caisse('orange', 5_000_000, 3_000_000), caisse('wave', 1_199_999, 2_000_000)],
      railPolicies: [JULAYA],
    });
    expect(dessous.mouvements[0]?.amountMinor).toBe(800_001);
  });

  it('operateur duplique : les deux caisses sont ecartees, signalees une seule fois', () => {
    const etat: EtatTresorerie = {
      caisses: [
        caisse('orange', 5_000_000, 3_000_000),
        caisse('orange', 100_000, 3_000_000),
        caisse('wave', 500_000, 2_000_000),
      ],
      railPolicies: [JULAYA],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]); // orange ecarte : plus aucune source
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.filter((r) => r.includes('duplique'))).toHaveLength(1);
  });

  it('politique restreinte a un operateur : elle ne sert que SA destination', () => {
    const pWave: RailPolicy = { ...JULAYA, operator: 'wave' };
    const etat: EtatTresorerie = {
      caisses: [
        caisse('moov', 5_000_000, 3_000_000),
        caisse('orange', 500_000, 2_000_000),
        caisse('wave', 500_000, 2_000_000),
      ],
      railPolicies: [pWave],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements.map((m) => m.toOperator)).toEqual(['wave']);
    expect(plan.caissesInsolvables).toEqual(['orange']);
  });

  it('politique desactivee : aucune politique active, insolvable', () => {
    const etat: EtatTresorerie = {
      caisses: nominal,
      railPolicies: [{ ...JULAYA, enabled: false }],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
    expect(plan.caissesInsolvables).toEqual(['wave']);
    expect(plan.reasons.some((r) => r.includes('aucune politique'))).toBe(true);
  });

  it('prevision PILE a l horizon (3 j par defaut) : elle compte encore', () => {
    const etat: EtatTresorerie = {
      caisses: nominal,
      railPolicies: [JULAYA],
      previsions: [{ operator: 'wave', amountMinor: 1_800_000, horizonJours: 3 }],
    };
    const plan = planifieReequilibrage(etat);
    expect(plan.mouvements).toEqual([]);
  });
});
