/**
 * La grille tarifaire — le prix selon la NATURE de l'operation.
 *
 * La regle, etablie avec LO apres plusieurs allers-retours :
 *
 *     marge = prix facture (marche + prime FNE) − cout du chemin le moins cher
 *
 * Ce module ne tient QUE le bord gauche : le prix client. Il ne sait pas par
 * ou l'argent passe, et c'est voulu — le prix suit la nature commerciale de
 * l'operation, jamais le chemin technique. Le bord droit vit dans
 * `router/chemin.ts`. Aucun des deux ne doit connaitre l'autre.
 *
 * Consequence directe d'une lecon de LO (« meme si l'invitation transforme
 * l'employe en destinataire gratuit, on facture le service et les frais ») :
 * un paiement entre deux clients SwimPay coute ~0 a executer, mais il est
 * facture au prix de sa nature. Le on-us baisse le COUT, pas le PRIX.
 *
 * Les valeurs par defaut viennent de docs/pivot/19 et 20 (marche verifie en
 * source primaire quand il l'est). Ce sont des PARAMETRES : la grille se
 * remplace entierement a la construction, rien n'est en dur dans le moteur.
 */

/** Les natures d'operation que SwimPay facture. La liste est fermee. */
export type OperationNature =
  /** Transfert entre deux numeros du meme reseau. L'appat : gratuit. */
  | 'transfert_meme_reseau'
  /** Transfert entre deux reseaux differents (le swap). Decroit avec le PI-SPI. */
  | 'transfert_inter_reseaux'
  /** D'un wallet vers un compte bancaire. Tresorerie PME, peu sensible au prix. */
  | 'mobile_vers_banque'
  /** De la banque vers un wallet. Gratuit : on encourage l'alimentation. */
  | 'banque_vers_mobile'
  /** Le client sort son argent vers son propre numero, pour retirer chez l'operateur. */
  | 'retrait_vers_reseau'
  /** Le marchand encaisse une vente (QR, lien). */
  | 'encaissement_vente'
  /** Paiement en ligne sur un site marchand. Le marche y est haut. */
  | 'checkout_en_ligne'
  /** Versement de salaires, unitaire ou en lot. */
  | 'paie_salaires'
  /** Reglement d'un fournisseur. */
  | 'paiement_fournisseur';

export interface NatureTarif {
  /** Part proportionnelle, en points de base (100 bp = 1 %). */
  percentBp: number;
  /** Part fixe, en entiers XOF. */
  fixedMinor: number;
  /** Les frais ne depassent jamais ce plafond. Absent : pas de plafond. */
  capMinor?: number | undefined;
  /** Les frais ne descendent jamais sous ce plancher (sauf tarif nul). */
  floorMinor?: number | undefined;
}

export type Grille = Readonly<Record<OperationNature, NatureTarif>>;

/**
 * La grille par defaut, figee le 30 aout 2026.
 *
 * Justification de chaque ligne, en face du marche verifie :
 * - meme reseau : Orange P2P est a 0 F, Wave a 1 %. On ne gagne rien ici, on
 *   fait ENTRER. C'est le moteur d'acquisition de masse.
 * - inter-reseaux : le marche est a ~1 % et le PI-SPI le rendra gratuit. On
 *   suit le marche tant qu'il vit ; ce n'est pas une rente, c'est un hamecon.
 * - mobile → banque : Wave→banque suit ~1 %, les rails prennent 1,5 a 2 %.
 *   Une PME qui consolide sa tresorerie ne compare pas au centime : haut de
 *   fourchette.
 * - banque → mobile : gratuite chez Julaya. La faire payer decouragerait
 *   l'alimentation des soldes, dont tout le netting depend.
 *  - retrait : le client paiera de toute facon le cash-out de son operateur.
 *   Le facturer en plus ferait payer deux fois et viderait la retention.
 * - encaissement : Wave est a ~1 % et fixe le reflexe du marche. On s'aligne,
 *   la facture FNE fait la difference, l'abonnement fait la marge.
 * - checkout : marche a 2,25–3,5 % (PayDunya, CinetPay, Hub2 verifies). 1,8 %
 *   reste nettement sous le marche ET laisse une marge meme quand l'acheteur
 *   n'est pas client.
 * - paie et fournisseur : Julaya 0,5–1,5 %, PayDunya 2 %. 0,5 % est le bas du
 *   marche ; la vraie marge vient des employes qui deviennent clients.
 */
export const GRILLE_DEFAUT: Grille = {
  transfert_meme_reseau: { percentBp: 0, fixedMinor: 0 },
  transfert_inter_reseaux: { percentBp: 100, fixedMinor: 0, capMinor: 500 },
  mobile_vers_banque: { percentBp: 150, fixedMinor: 0 },
  banque_vers_mobile: { percentBp: 0, fixedMinor: 0 },
  retrait_vers_reseau: { percentBp: 0, fixedMinor: 0 },
  encaissement_vente: { percentBp: 100, fixedMinor: 0 },
  checkout_en_ligne: { percentBp: 180, fixedMinor: 0 },
  paie_salaires: { percentBp: 50, fixedMinor: 0 },
  paiement_fournisseur: { percentBp: 50, fixedMinor: 0 },
};

/** Les abonnements mensuels, en XOF. Hors moteur transactionnel. */
export const ABONNEMENTS_DEFAUT = {
  particulier: 0,
  commercant: 5_000,
  pme: 15_000,
  comptable_par_dossier: 1_500,
} as const;

export class TarificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TarificationError';
  }
}

export interface FraisCalcules {
  nature: OperationNature;
  amountMinor: number;
  feeMinor: number;
  /** Ce que le client paie au total : montant + frais. */
  totalMinor: number;
  /** Vrai quand le plafond a mordu — utile a afficher (« max 500 F »). */
  capped: boolean;
}

/**
 * Calcule les frais client d'une operation.
 *
 * Refus plutot que devinette : un montant invalide est une erreur de saisie,
 * pas un cas limite a absorber. Et tout est en entiers — le franc CFA n'a pas
 * de centime, un flottant ici finirait en litige d'un franc.
 */
export function calculeFrais(
  nature: OperationNature,
  amountMinor: number,
  grille: Grille = GRILLE_DEFAUT,
): FraisCalcules {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new TarificationError(`montant invalide : ${amountMinor}`);
  }
  const tarif = grille[nature];
  if (!tarif) {
    // Ne peut arriver que si une grille partielle est passee en JS non type.
    throw new TarificationError(`nature inconnue de la grille : ${nature}`);
  }

  let fee = Math.round(tarif.fixedMinor + (amountMinor * tarif.percentBp) / 10_000);
  let capped = false;
  if (tarif.capMinor !== undefined && fee > tarif.capMinor) {
    fee = tarif.capMinor;
    capped = true;
  }
  // Le plancher ne s'applique jamais a un tarif nul : « gratuit » veut dire
  // gratuit, pas « au moins le plancher ».
  if (tarif.floorMinor !== undefined && fee > 0 && fee < tarif.floorMinor) {
    fee = tarif.floorMinor;
  }
  if (fee >= amountMinor && fee > 0) {
    // Frais superieurs au montant : l'operation n'a pas de sens economique
    // pour le client. On refuse explicitement plutot que d'encaisser un
    // ressentiment (petit swap de 300 F avec plancher, par exemple).
    throw new TarificationError(
      `frais (${fee}) >= montant (${amountMinor}) pour ${nature} : operation refusee`,
    );
  }

  return { nature, amountMinor, feeMinor: fee, totalMinor: amountMinor + fee, capped };
}

// ── Classification ──────────────────────────────────────────────────────────

/** Un bout d'operation : d'ou l'argent part, ou il arrive. */
export interface Extremite {
  type: 'swimpay' | 'mobile' | 'banque';
  /** Requis quand type = 'mobile' : orange, wave, mtn, moov… */
  operator?: string | undefined;
}

/** Le contexte commercial, quand la topologie seule ne suffit pas. */
export type ContexteCommercial =
  /** Transfert simple entre personnes. */
  | 'p2p'
  /** Vente encaissee par un marchand (QR, lien). */
  | 'vente'
  /** Paiement sur un site en ligne. */
  | 'checkout'
  /** Versement de salaire. */
  | 'salaire'
  /** Reglement fournisseur. */
  | 'fournisseur'
  /** Le titulaire sort son propre argent. */
  | 'retrait';

/**
 * Determine la nature facturable d'une operation.
 *
 * Deux informations independantes y entrent : la TOPOLOGIE (d'ou vers ou) et
 * le CONTEXTE commercial (pourquoi). Un meme trajet Orange→Orange est gratuit
 * en p2p et facture 1 % en vente — c'est le contexte qui tranche, parce que le
 * prix suit le service rendu, pas le trajet.
 */
export function classifieNature(
  origine: Extremite,
  destination: Extremite,
  contexte: ContexteCommercial,
): OperationNature {
  // Le contexte commercial prime sur la topologie.
  if (contexte === 'vente') return 'encaissement_vente';
  if (contexte === 'checkout') return 'checkout_en_ligne';
  if (contexte === 'salaire') return 'paie_salaires';
  if (contexte === 'fournisseur') return 'paiement_fournisseur';
  if (contexte === 'retrait') {
    if (destination.type === 'banque') return 'mobile_vers_banque';
    return 'retrait_vers_reseau';
  }

  // p2p : la topologie decide.
  if (destination.type === 'banque') return 'mobile_vers_banque';
  if (origine.type === 'banque') return 'banque_vers_mobile';

  const opOrigine = operateurDe(origine);
  const opDest = operateurDe(destination);
  return opOrigine === opDest ? 'transfert_meme_reseau' : 'transfert_inter_reseaux';
}

function operateurDe(e: Extremite): string {
  if (e.type === 'mobile') {
    if (!e.operator) {
      throw new TarificationError('extremite mobile sans operateur : classification impossible');
    }
    return e.operator;
  }
  // Un compte SwimPay n'a pas d'operateur : le trajet interne est traite comme
  // inter-reseaux au pire cas SEULEMENT si l'autre bout est un mobile — et
  // comme meme-reseau si les deux bouts sont SwimPay (c'est une ecriture).
  return e.type === 'swimpay' ? 'swimpay' : 'banque';
}
