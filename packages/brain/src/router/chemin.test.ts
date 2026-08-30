import { describe, expect, it } from 'vitest';
import { choisitChemin, type Caisse, type CheminContext } from './chemin.js';
import type { RailPolicy } from './route.js';

const CAISSES: Caisse[] = [
  { operator: 'orange', balanceMinor: 2_000_000, payoutCostBp: 100, captureCostBp: 100 },
  { operator: 'wave', balanceMinor: 500_000, payoutCostBp: 100, captureCostBp: 100 },
  // MTN : compte ouvert mais couts jamais configures.
  { operator: 'mtn', balanceMinor: 1_000_000 },
];

const RAILS: RailPolicy[] = [
  { operation: 'payout', currency: 'XOF', rail: 'julaya', operator: '*', enabled: true, costPercentBp: 100, costFixedMinor: 0, priority: 10 },
  { operation: 'payout', currency: 'XOF', rail: 'paydunya', operator: '*', enabled: true, costPercentBp: 200, costFixedMinor: 0, priority: 20 },
  { operation: 'payin', currency: 'XOF', rail: 'paydunya', operator: '*', enabled: true, costPercentBp: 225, costFixedMinor: 0, priority: 10 },
];

const ctx: CheminContext = { caisses: CAISSES, railPolicies: RAILS };
const sp = { type: 'swimpay' } as const;
const mob = (operator: string) => ({ type: 'mobile', operator } as const);
const banque = { type: 'banque' } as const;

describe('l ordre des chemins, du moins cher au plus cher', () => {
  it('1. deux comptes SwimPay → ecriture, cout zero', () => {
    const d = choisitChemin({ origine: sp, destination: sp, amountMinor: 50_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('ecriture');
    if (d.kind === 'ecriture') expect(d.estimatedCostMinor).toBe(0);
  });

  it('2. entree depuis un mobile → capture sur le reseau du payeur (QR adaptatif)', () => {
    const d = choisitChemin({ origine: mob('wave'), destination: sp, amountMinor: 50_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('capture');
    if (d.kind === 'capture') {
      expect(d.operator).toBe('wave');
      expect(d.estimatedCostMinor).toBe(500); // 1 % de capture
    }
  });

  it('3. sortie vers un mobile, caisse suffisante → caisse, rien ne traverse', () => {
    const d = choisitChemin({ origine: sp, destination: mob('orange'), amountMinor: 100_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('caisse');
    if (d.kind === 'caisse') {
      expect(d.operator).toBe('orange');
      expect(d.estimatedCostMinor).toBe(1_000);
    }
  });

  it('4. caisse a sec → LA SOUPAPE : le rail le moins cher, un cout au lieu d un refus', () => {
    // Wave n'a que 500 000, on demande 800 000.
    const d = choisitChemin({ origine: sp, destination: mob('wave'), amountMinor: 800_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('rail');
    if (d.kind === 'rail') {
      expect(d.rail).toBe('julaya'); // le moins cher des deux payouts
      expect(d.enSecours).toBe(true);
      expect(d.estimatedCostMinor).toBe(8_000); // 1 %
    }
  });

  it('4 bis. operateur sans caisse du tout → rail aussi', () => {
    const d = choisitChemin({ origine: sp, destination: mob('moov'), amountMinor: 40_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('rail');
  });
});

describe('les garde-fous — on ne paie jamais a l aveugle', () => {
  it('caisse pleine mais cout payout inconnu → la soupape, pas la caisse', () => {
    // MTN a 1 000 000 en caisse mais payoutCostBp n'est pas configure.
    const d = choisitChemin({ origine: sp, destination: mob('mtn'), amountMinor: 200_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('rail'); // on prefere un rail au prix connu a une caisse au prix inconnu
  });

  it('cout inconnu ET aucun rail → refus type, jamais un versement aveugle', () => {
    const sansRails: CheminContext = { caisses: CAISSES, railPolicies: [] };
    const d = choisitChemin({ origine: sp, destination: mob('mtn'), amountMinor: 200_000, currency: 'XOF' }, sansRails);
    expect(d.kind).toBe('refuse');
    if (d.kind === 'refuse') expect(d.code).toBe('cout_caisse_inconnu');
  });

  it('pas de compte marchand chez l operateur du payeur → le payin passe par un rail', () => {
    const d = choisitChemin({ origine: mob('moov'), destination: sp, amountMinor: 30_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('rail');
    if (d.kind === 'rail') {
      expect(d.rail).toBe('paydunya');
      expect(d.enSecours).toBe(false); // voie normale, pas un secours
    }
  });

  it('montant invalide, operateur manquant → refus types', () => {
    const a = choisitChemin({ origine: sp, destination: mob('wave'), amountMinor: 0, currency: 'XOF' }, ctx);
    expect(a.kind === 'refuse' && a.code).toBe('montant_invalide');
    const b = choisitChemin({ origine: sp, destination: { type: 'mobile' }, amountMinor: 10_000, currency: 'XOF' }, ctx);
    expect(b.kind === 'refuse' && b.code).toBe('operateur_manquant');
  });

  it('destination banque → rail (pas de caisse bancaire en V1)', () => {
    const d = choisitChemin({ origine: sp, destination: banque, amountMinor: 1_000_000, currency: 'XOF' }, ctx);
    expect(d.kind).toBe('rail');
    if (d.kind === 'rail') expect(d.rail).toBe('julaya');
  });
});

describe('preuve : la formule marge = prix − cout, sur l exemple du document', () => {
  it('checkout de 50 000 F : facture 900, coute 500, marge 400', async () => {
    const { calculeFrais } = await import('../pricing/grille.js');
    const prix = calculeFrais('checkout_en_ligne', 50_000);
    const chemin = choisitChemin(
      { origine: mob('orange'), destination: sp, amountMinor: 50_000, currency: 'XOF' },
      ctx,
    );
    expect(prix.feeMinor).toBe(900);
    expect(chemin.kind).toBe('capture');
    if (chemin.kind === 'capture') {
      expect(prix.feeMinor - chemin.estimatedCostMinor).toBe(400);
    }
  });

  it('paie interne : facture 750 par salaire, coute 0 — la marge des chaines', async () => {
    const { calculeFrais } = await import('../pricing/grille.js');
    const prix = calculeFrais('paie_salaires', 150_000);
    // L'employe est client SwimPay : le salaire est une ecriture.
    const chemin = choisitChemin({ origine: sp, destination: sp, amountMinor: 150_000, currency: 'XOF' }, ctx);
    expect(prix.feeMinor).toBe(750);
    expect(chemin.kind).toBe('ecriture');
    if (chemin.kind === 'ecriture') {
      expect(prix.feeMinor - chemin.estimatedCostMinor).toBe(750);
    }
  });
});
