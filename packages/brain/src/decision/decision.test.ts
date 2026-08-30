import { describe, expect, it } from 'vitest';
import {
  CODE_DEVISE_NON_TARIFEE,
  CODE_TARIFICATION_REFUSEE,
  decideOperation,
  type DecisionOperation,
} from './decision.js';
import {
  GRILLE_DEFAUT,
  type ContexteCommercial,
  type Extremite,
  type Grille,
} from '../pricing/grille.js';
import type { Caisse, CheminContext } from '../router/chemin.js';
import type { RailPolicy } from '../router/route.js';

// Les memes caisses que chemin.test.ts : orange et wave configurees a 1 %,
// mtn ouverte mais sans couts — le garde-fou « on ne paie pas a l aveugle ».
const CAISSES: Caisse[] = [
  { operator: 'orange', balanceMinor: 2_000_000, payoutCostBp: 100, captureCostBp: 100 },
  { operator: 'wave', balanceMinor: 500_000, payoutCostBp: 100, captureCostBp: 100 },
  { operator: 'mtn', balanceMinor: 1_000_000 },
];

const RAILS: RailPolicy[] = [
  { operation: 'payout', currency: 'XOF', rail: 'julaya', operator: '*', enabled: true, costPercentBp: 100, costFixedMinor: 0, priority: 10 },
  { operation: 'payin', currency: 'XOF', rail: 'paydunya', operator: '*', enabled: true, costPercentBp: 225, costFixedMinor: 0, priority: 10 },
];

const ctx: CheminContext = { caisses: CAISSES, railPolicies: RAILS };
const sp: Extremite = { type: 'swimpay' };
const banque: Extremite = { type: 'banque' };
const mob = (operator: string): Extremite => ({ type: 'mobile', operator });

const demande = (
  origine: Extremite,
  destination: Extremite,
  contexte: ContexteCommercial,
  amountMinor: number,
) => ({ origine, destination, contexte, amountMinor, currency: 'XOF' });

function acceptee(d: DecisionOperation) {
  if (d.kind !== 'acceptee') {
    throw new Error(`attendu une acceptation, recu : ${JSON.stringify(d)}`);
  }
  return d;
}

function refusee(d: DecisionOperation) {
  if (d.kind !== 'refusee') {
    throw new Error(`attendu un refus, recu : ${JSON.stringify(d)}`);
  }
  return d;
}

describe('une decision par nature — les neuf lignes de la grille', () => {
  it('transfert meme reseau : gratuit pour le client, un cout de caisse pour nous', () => {
    const d = acceptee(decideOperation(demande(mob('orange'), mob('orange'), 'p2p', 10_000), ctx));
    expect(d.nature).toBe('transfert_meme_reseau');
    expect(d.frais.feeMinor).toBe(0);
    expect(d.chemin.kind).toBe('caisse');
    expect(d.margeEstimeeMinor).toBe(-100); // l appat coute 1 % de payout
    expect(d.fneRequise).toBe(false);
  });

  it('transfert inter-reseaux : 1 %, ici tout juste a l equilibre', () => {
    const d = acceptee(decideOperation(demande(mob('orange'), mob('wave'), 'p2p', 30_000), ctx));
    expect(d.nature).toBe('transfert_inter_reseaux');
    expect(d.frais.feeMinor).toBe(300);
    expect(d.chemin.kind).toBe('caisse');
    expect(d.margeEstimeeMinor).toBe(0);
    expect(d.fneRequise).toBe(false);
  });

  it('mobile vers banque : 1,5 % facture, 1 % de rail, la marge est la', () => {
    const d = acceptee(decideOperation(demande(mob('orange'), banque, 'p2p', 200_000), ctx));
    expect(d.nature).toBe('mobile_vers_banque');
    expect(d.frais.feeMinor).toBe(3_000);
    expect(d.chemin.kind).toBe('rail');
    if (d.chemin.kind === 'rail') expect(d.chemin.rail).toBe('julaya');
    expect(d.margeEstimeeMinor).toBe(1_000);
    expect(d.fneRequise).toBe(false);
  });

  it('banque vers mobile : gratuit — on encourage l alimentation, on paie le payout', () => {
    const d = acceptee(decideOperation(demande(banque, mob('orange'), 'p2p', 50_000), ctx));
    expect(d.nature).toBe('banque_vers_mobile');
    expect(d.frais.feeMinor).toBe(0);
    expect(d.margeEstimeeMinor).toBe(-500);
    expect(d.fneRequise).toBe(false);
  });

  it('retrait vers reseau : gratuit, l operateur facturera son cash-out', () => {
    const d = acceptee(decideOperation(demande(sp, mob('orange'), 'retrait', 25_000), ctx));
    expect(d.nature).toBe('retrait_vers_reseau');
    expect(d.frais.feeMinor).toBe(0);
    expect(d.margeEstimeeMinor).toBe(-250);
    expect(d.fneRequise).toBe(false);
  });

  it('encaissement de vente : 1 %, capture au meme taux, la marge vient d ailleurs', () => {
    const d = acceptee(decideOperation(demande(mob('wave'), sp, 'vente', 50_000), ctx));
    expect(d.nature).toBe('encaissement_vente');
    expect(d.frais.feeMinor).toBe(500);
    expect(d.chemin.kind).toBe('capture');
    expect(d.margeEstimeeMinor).toBe(0);
    expect(d.fneRequise).toBe(true); // boucle A : la facture est emise et certifiee
  });

  it('checkout 50 000 F — l exemple du document : frais 900, cout 500, marge 400', () => {
    const d = acceptee(decideOperation(demande(mob('orange'), sp, 'checkout', 50_000), ctx));
    expect(d.nature).toBe('checkout_en_ligne');
    expect(d.frais.feeMinor).toBe(900);
    expect(d.chemin.kind).toBe('capture');
    if (d.chemin.kind === 'capture') {
      expect(d.chemin.operator).toBe('orange');
      expect(d.chemin.estimatedCostMinor).toBe(500);
    }
    expect(d.margeEstimeeMinor).toBe(400);
    expect(d.fneRequise).toBe(true);
  });

  it('paie interne 150 000 F — l autre exemple : frais 750, ecriture a 0, marge 750', () => {
    const d = acceptee(decideOperation(demande(sp, sp, 'salaire', 150_000), ctx));
    expect(d.nature).toBe('paie_salaires');
    expect(d.frais.feeMinor).toBe(750);
    expect(d.chemin.kind).toBe('ecriture');
    expect(d.margeEstimeeMinor).toBe(750);
    expect(d.fneRequise).toBe(false); // un bulletin de paie n est pas une facture FNE
  });

  it('paiement fournisseur : 0,5 % facture, et la piece recue doit etre appariee', () => {
    const d = acceptee(decideOperation(demande(sp, mob('orange'), 'fournisseur', 100_000), ctx));
    expect(d.nature).toBe('paiement_fournisseur');
    expect(d.frais.feeMinor).toBe(500);
    expect(d.chemin.kind).toBe('caisse');
    expect(d.margeEstimeeMinor).toBe(-500);
    expect(d.fneRequise).toBe(true); // boucle B : facture recue ↔ decaissement
  });
});

describe('la marge negative est une information, jamais un refus', () => {
  it('accepte l operation qui perd de l argent et la signe correctement', () => {
    // Meme reseau : facture 0, mais le payout par la caisse coute 1 %.
    const d = acceptee(decideOperation(demande(mob('wave'), mob('wave'), 'p2p', 40_000), ctx));
    expect(d.kind).toBe('acceptee');
    expect(d.margeEstimeeMinor).toBe(-400);
    expect(d.margeEstimeeMinor).toBeLessThan(0);
  });
});

describe('le prix ne depend jamais du chemin', () => {
  it('la meme vente est facturee pareil, que la capture soit directe ou par rail', () => {
    // Wave : capture directe a 1 %. Moov : pas de caisse, payin par rail a 2,25 %.
    const directe = acceptee(decideOperation(demande(mob('wave'), sp, 'vente', 50_000), ctx));
    const parRail = acceptee(decideOperation(demande(mob('moov'), sp, 'vente', 50_000), ctx));
    expect(directe.frais.feeMinor).toBe(500);
    expect(parRail.frais.feeMinor).toBe(500); // prix identique
    expect(directe.chemin.estimatedCostMinor).toBe(500);
    expect(parRail.chemin.estimatedCostMinor).toBe(1_125); // seul le cout bouge
    expect(directe.margeEstimeeMinor).toBe(0);
    expect(parRail.margeEstimeeMinor).toBe(-625);
  });
});

describe('les refus — voie tarification', () => {
  it('montant invalide : refus type, pas d exception qui fuit', () => {
    const d = refusee(decideOperation(demande(mob('orange'), mob('orange'), 'p2p', 0), ctx));
    expect(d.etape).toBe('tarification');
    expect(d.code).toBe(CODE_TARIFICATION_REFUSEE);
    expect(d.reason).toContain('montant invalide');
  });

  it('frais qui mangent le montant (plancher sur petit swap) : refus tarification', () => {
    const grillePlancher: Grille = {
      ...GRILLE_DEFAUT,
      transfert_inter_reseaux: { percentBp: 100, fixedMinor: 0, capMinor: 500, floorMinor: 500 },
    };
    const d = refusee(
      decideOperation(
        { ...demande(mob('orange'), mob('wave'), 'p2p', 300), grille: grillePlancher },
        ctx,
      ),
    );
    expect(d.etape).toBe('tarification');
    expect(d.code).toBe(CODE_TARIFICATION_REFUSEE);
    expect(d.reason).toContain('frais');
  });

  it('extremite mobile sans operateur : la classification refuse avant le chemin', () => {
    const d = refusee(decideOperation(demande({ type: 'mobile' }, mob('wave'), 'p2p', 10_000), ctx));
    expect(d.etape).toBe('tarification');
    expect(d.reason).toContain('operateur');
  });
});

describe('les bords que la composition doit tenir', () => {
  it('devise autre que XOF : la grille ne sait pas la tarifer — refus, pas un prix invente', () => {
    // Le chemin ecriture ne consulte jamais les politiques de rail (seul
    // endroit ou la devise est verifiee) : sans garde, un salaire en USD
    // serait accepte avec un prix calcule par la grille XOF.
    const d = refusee(
      decideOperation({ ...demande(sp, sp, 'salaire', 150_000), currency: 'USD' }, ctx),
    );
    expect(d.etape).toBe('tarification');
    expect(d.code).toBe(CODE_DEVISE_NON_TARIFEE);
    expect(d.reason).toContain('USD');
  });

  it('montant non entier : refus tarification — pas de flottant sur de l argent', () => {
    const d = refusee(decideOperation(demande(mob('orange'), mob('wave'), 'p2p', 10_000.5), ctx));
    expect(d.etape).toBe('tarification');
    expect(d.code).toBe(CODE_TARIFICATION_REFUSEE);
    expect(d.reason).toContain('montant invalide');
  });

  it('vente depuis un mobile sans operateur : la tarification passe, le chemin refuse', () => {
    // classifieNature ne consulte l operateur qu en p2p : en vente, l extremite
    // incomplete traverse la tarification, et c est le chemin qui refuse avec
    // son propre code — la propagation vaut pour tous les codes, pas trois.
    const d = refusee(decideOperation(demande({ type: 'mobile' }, sp, 'vente', 20_000), ctx));
    expect(d.etape).toBe('chemin');
    expect(d.code).toBe('operateur_manquant');
  });

  it('caisse a sec : la soupape traverse la decision intacte, cap du prix compris', () => {
    // Wave n a que 500 000 : le payout de 600 000 part en rail, en secours.
    // Le prix est plafonne a 500 F, le cout du rail ne l est pas : la marge
    // profondement negative doit se VOIR, avec le drapeau enSecours.
    const d = acceptee(decideOperation(demande(mob('orange'), mob('wave'), 'p2p', 600_000), ctx));
    expect(d.frais.feeMinor).toBe(500);
    expect(d.frais.capped).toBe(true);
    expect(d.chemin.kind).toBe('rail');
    if (d.chemin.kind === 'rail') {
      expect(d.chemin.rail).toBe('julaya');
      expect(d.chemin.enSecours).toBe(true);
    }
    expect(d.margeEstimeeMinor).toBe(-5_500); // 500 de prix, 6 000 de cout
  });
});

describe('les refus — voie chemin, codes propages tels quels', () => {
  const sansRails: CheminContext = { caisses: CAISSES, railPolicies: [] };

  it('aucune politique de rail : code no_policy, intact depuis route.ts', () => {
    const d = refusee(decideOperation(demande(mob('orange'), banque, 'p2p', 100_000), sansRails));
    expect(d.etape).toBe('chemin');
    expect(d.code).toBe('no_policy');
    expect(d.reason).toContain('aucune politique');
  });

  it('caisse pleine mais cout inconnu, sans secours : code cout_caisse_inconnu', () => {
    const d = refusee(decideOperation(demande(sp, mob('mtn'), 'p2p', 200_000), sansRails));
    expect(d.etape).toBe('chemin');
    expect(d.code).toBe('cout_caisse_inconnu');
    expect(d.reason).toContain('mtn');
  });

  it('rail sans grille de cout : code missing_cost_grid — on ne verse pas a l aveugle', () => {
    const railSansCout: CheminContext = {
      caisses: CAISSES,
      railPolicies: [
        { operation: 'payout', currency: 'XOF', rail: 'mystere', operator: '*', enabled: true, priority: 10 },
      ],
    };
    const d = refusee(decideOperation(demande(sp, banque, 'p2p', 100_000), railSansCout));
    expect(d.etape).toBe('chemin');
    expect(d.code).toBe('missing_cost_grid');
    expect(d.reason).toContain('mystere');
  });
});
