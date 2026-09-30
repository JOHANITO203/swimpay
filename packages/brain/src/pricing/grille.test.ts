import { describe, expect, it } from 'vitest';
import {
  ABONNEMENTS_DEFAUT,
  calculeFrais,
  classifieNature,
  GRILLE_DEFAUT,
  TarificationError,
  type Extremite,
  type OperationNature,
} from './grille.js';

const sp: Extremite = { type: 'swimpay' };
const orange: Extremite = { type: 'mobile', operator: 'orange' };
const wave: Extremite = { type: 'mobile', operator: 'wave' };
const banque: Extremite = { type: 'banque' };

describe('la grille par defaut — chaque nature, au franc', () => {
  const cas: Array<[OperationNature, number, number]> = [
    // [nature, montant, frais attendus]
    ['transfert_meme_reseau', 100_000, 0],
    ['transfert_inter_reseaux', 20_000, 200], // 1 %
    ['transfert_inter_reseaux', 100_000, 500], // 1 % = 1000, plafonne a 500
    ['mobile_vers_banque', 1_000_000, 15_000], // 1,5 %
    ['banque_vers_mobile', 5_000_000, 0],
    ['retrait_vers_reseau', 75_000, 0],
    ['encaissement_vente', 50_000, 500], // 1 %
    ['checkout_en_ligne', 50_000, 900], // 1,8 % — l'exemple du document investisseur
    ['paie_salaires', 150_000, 750], // 0,5 %
    ['paiement_fournisseur', 200_000, 1_000], // 0,5 %
  ];
  for (const [nature, montant, attendu] of cas) {
    it(`${nature} sur ${montant} → ${attendu} F`, () => {
      const f = calculeFrais(nature, montant);
      expect(f.feeMinor).toBe(attendu);
      expect(f.totalMinor).toBe(montant + attendu);
    });
  }

  it('couvre TOUTES les natures de la grille — aucune oubliee', () => {
    const testees = new Set(cas.map(([n]) => n));
    for (const nature of Object.keys(GRILLE_DEFAUT) as OperationNature[]) {
      expect(testees.has(nature), `nature non testee : ${nature}`).toBe(true);
    }
  });

  it('signale quand le plafond a mordu', () => {
    expect(calculeFrais('transfert_inter_reseaux', 100_000).capped).toBe(true);
    expect(calculeFrais('transfert_inter_reseaux', 20_000).capped).toBe(false);
  });

  it('le swap est plafonne : 500 F sur 50 000 comme sur 5 000 000', () => {
    expect(calculeFrais('transfert_inter_reseaux', 50_000).feeMinor).toBe(500);
    expect(calculeFrais('transfert_inter_reseaux', 5_000_000).feeMinor).toBe(500);
  });
});

describe('les refus', () => {
  it('montant nul, negatif ou non entier', () => {
    expect(() => calculeFrais('encaissement_vente', 0)).toThrow(TarificationError);
    expect(() => calculeFrais('encaissement_vente', -5)).toThrow(TarificationError);
    expect(() => calculeFrais('encaissement_vente', 10.5)).toThrow(TarificationError);
  });

  it('des frais superieurs au montant refusent l operation', () => {
    const grille = { ...GRILLE_DEFAUT, transfert_inter_reseaux: { percentBp: 100, fixedMinor: 500 } };
    // 300 F de transfert, 500 F de part fixe : absurde pour le client.
    expect(() => calculeFrais('transfert_inter_reseaux', 300, grille)).toThrow(TarificationError);
  });

  it('le plancher ne transforme jamais un gratuit en payant', () => {
    const grille = {
      ...GRILLE_DEFAUT,
      retrait_vers_reseau: { percentBp: 0, fixedMinor: 0, floorMinor: 25 },
    };
    expect(calculeFrais('retrait_vers_reseau', 10_000, grille).feeMinor).toBe(0);
  });
});

describe('classification — la topologie et le contexte', () => {
  it('le contexte commercial prime sur le trajet', () => {
    // Meme trajet orange→orange : gratuit en p2p, facture en vente.
    expect(classifieNature(orange, orange, 'p2p')).toBe('transfert_meme_reseau');
    expect(classifieNature(orange, orange, 'vente')).toBe('encaissement_vente');
    expect(classifieNature(orange, sp, 'checkout')).toBe('checkout_en_ligne');
    expect(classifieNature(sp, wave, 'salaire')).toBe('paie_salaires');
    expect(classifieNature(sp, wave, 'fournisseur')).toBe('paiement_fournisseur');
  });

  it('p2p : la topologie decide', () => {
    expect(classifieNature(orange, wave, 'p2p')).toBe('transfert_inter_reseaux');
    expect(classifieNature(orange, banque, 'p2p')).toBe('mobile_vers_banque');
    expect(classifieNature(banque, wave, 'p2p')).toBe('banque_vers_mobile');
    // Deux comptes SwimPay : le transfert gratuit qui fait entrer les clients.
    expect(classifieNature(sp, sp, 'p2p')).toBe('transfert_meme_reseau');
  });

  it('le retrait distingue banque et reseau', () => {
    expect(classifieNature(sp, wave, 'retrait')).toBe('retrait_vers_reseau');
    expect(classifieNature(sp, banque, 'retrait')).toBe('mobile_vers_banque');
  });

  it('un mobile sans operateur ne se classifie pas', () => {
    expect(() => classifieNature({ type: 'mobile' }, wave, 'p2p')).toThrow(TarificationError);
  });
});

describe('coherence de la strategie', () => {
  it('tout ce qui fait ENTRER ou RESTER est gratuit', () => {
    // L'acquisition de masse : interne, alimentation, retrait — zero frais.
    for (const nature of ['transfert_meme_reseau', 'banque_vers_mobile', 'retrait_vers_reseau'] as const) {
      expect(GRILLE_DEFAUT[nature].percentBp).toBe(0);
      expect(GRILLE_DEFAUT[nature].fixedMinor).toBe(0);
    }
  });

  it('le checkout porte le taux le plus haut — c est la que le marche paie', () => {
    const max = Math.max(...Object.values(GRILLE_DEFAUT).map((t) => t.percentBp));
    expect(GRILLE_DEFAUT.checkout_en_ligne.percentBp).toBe(max);
  });

  it('les abonnements : la PME est le coeur du revenu', () => {
    expect(ABONNEMENTS_DEFAUT.pme).toBeGreaterThan(ABONNEMENTS_DEFAUT.commercant);
    expect(ABONNEMENTS_DEFAUT.particulier).toBe(0);
  });
});
