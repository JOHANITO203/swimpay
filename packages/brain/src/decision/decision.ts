/**
 * La decision unifiee — la formule assemblee, sans rien recalculer.
 *
 *     marge = prix facture (grille, selon la NATURE) − cout du chemin le moins cher
 *
 * Les deux bords de la formule vivent dans deux modules qui s'ignorent
 * volontairement : pricing/grille tient le prix (la nature commerciale),
 * router/chemin tient le cout (le trajet technique). Ce module les COMPOSE et
 * rend une seule valeur typee. Le prix ne depend jamais du chemin : un on-us
 * (deux comptes SwimPay) baisse le cout, jamais le prix.
 *
 * La marge peut etre negative. C'est une information, pas un motif de refus :
 * LO veut VOIR les operations qui perdent de l'argent (le transfert meme
 * reseau est gratuit et coute pourtant un payout), pas les cacher.
 *
 * Les refus restent des valeurs typees, comme partout dans le Cerveau : une
 * TarificationError attrapee devient un refus d'etape 'tarification', un
 * chemin refuse devient un refus d'etape 'chemin' avec son code d'origine
 * intact. Rien ne fuit en exception, rien n'est devine.
 */

import {
  calculeFrais,
  classifieNature,
  TarificationError,
  type ContexteCommercial,
  type Extremite,
  type FraisCalcules,
  type Grille,
  type OperationNature,
} from '../pricing/grille.js';
import {
  choisitChemin,
  type CheminContext,
  type CheminDecision,
} from '../router/chemin.js';

/** Ce que l'appelant demande : d'ou, vers ou, pourquoi, combien. */
export interface DemandeOperation {
  origine: Extremite;
  destination: Extremite;
  contexte: ContexteCommercial;
  amountMinor: number;
  currency: string;
  /** Absente : la grille par defaut du module pricing s'applique. */
  grille?: Grille | undefined;
}

/**
 * Un chemin retenu. La variante refus est exclue par construction : un refus
 * de chemin devient un refus de DECISION, jamais un chemin range dans une
 * decision acceptee.
 */
export type CheminRetenu = Exclude<CheminDecision, { kind: 'refuse' }>;

export type DecisionOperation =
  | {
      kind: 'acceptee';
      nature: OperationNature;
      frais: FraisCalcules;
      chemin: CheminRetenu;
      /**
       * feeMinor − estimatedCostMinor, en entiers XOF. Peut etre negative :
       * on accepte et on montre, on ne cache pas.
       */
      margeEstimeeMinor: number;
      /** Vrai : une piece fiscale doit accompagner l'operation (voir exigeFne). */
      fneRequise: boolean;
    }
  | {
      kind: 'refusee';
      /** L'etape qui a refuse : le prix, ou le trajet. */
      etape: 'tarification' | 'chemin';
      code: string;
      reason: string;
    };

/**
 * Le code unique des refus de tarification.
 *
 * TarificationError porte un message, pas un code type : ses causes (montant
 * invalide, frais qui mangeraient le montant, extremite inclassable) sont
 * toutes des erreurs d'entree, et les distinguer en parsant le message serait
 * fragile. Un seul code couvre la famille ; le detail vit dans reason.
 */
export const CODE_TARIFICATION_REFUSEE = 'tarification_refusee';

/**
 * Le code des refus de devise.
 *
 * La grille tarife en entiers XOF : ses parts fixes, plafonds et planchers
 * (500 F de cap sur le swap, par exemple) sont des montants XOF. Les appliquer
 * a un montant d'une autre devise produirait un prix faux en silence. Les
 * politiques de rail portent bien une devise, mais les chemins ecriture,
 * capture et caisse ne les consultent jamais : sans cette garde, un salaire
 * interne en USD serait accepte au prix XOF. On refuse — on ne tarife pas a
 * l'aveugle, pas plus qu'on ne paie a l'aveugle.
 */
export const CODE_DEVISE_NON_TARIFEE = 'devise_non_tarifee';

/** La seule devise que la grille sait tarifer (voir CODE_DEVISE_NON_TARIFEE). */
const DEVISE_GRILLE = 'XOF';

/**
 * Une piece fiscale (FNE) accompagne-t-elle l'operation ?
 *
 * Le doc 14 (algorithme V1) decrit deux boucles : A — ce que le marchand
 * VEND, la facture est emise et certifiee par nous ; B — ce qu'il ACHETE, la
 * facture recue est rapprochee du decaissement. Une vente, un checkout et un
 * reglement fournisseur touchent l'une des deux : la decision porte le signal
 * pour que l'operation reparte liee a sa piece (emise en boucle A pour vente
 * et checkout, recue et appariee en boucle B pour fournisseur).
 *
 * p2p, retrait et salaire deplacent de l'argent sans transaction commerciale
 * facturable — un bulletin de paie n'est pas une facture FNE. Pas de piece,
 * pas de signal.
 */
function exigeFne(contexte: ContexteCommercial): boolean {
  return contexte === 'vente' || contexte === 'checkout' || contexte === 'fournisseur';
}

/**
 * Decide une operation de bout en bout : nature → prix → chemin → marge.
 *
 * L'ordre compte. La tarification passe d'abord parce qu'elle est le contrat
 * client (ce qu'on facture) ; le chemin vient ensuite parce qu'il est notre
 * affaire (ce que ca nous coute). Un refus de tarification s'annonce donc
 * avant meme de chercher un trajet.
 */
export function decideOperation(
  demande: DemandeOperation,
  contexte: CheminContext,
): DecisionOperation {
  // La grille ne connait que le XOF : toute autre devise est refusee avant
  // meme de classifier, sinon un prix XOF serait pose sur un montant etranger.
  if (demande.currency !== DEVISE_GRILLE) {
    return {
      kind: 'refusee',
      etape: 'tarification',
      code: CODE_DEVISE_NON_TARIFEE,
      reason: `devise ${demande.currency} : la grille ne tarife qu'en ${DEVISE_GRILLE}`,
    };
  }

  // Bord gauche : la nature commerciale, puis le prix. Seule TarificationError
  // est un refus attendu ; toute autre erreur est un bug et DOIT remonter.
  let nature: OperationNature;
  let frais: FraisCalcules;
  try {
    nature = classifieNature(demande.origine, demande.destination, demande.contexte);
    frais = calculeFrais(nature, demande.amountMinor, demande.grille);
  } catch (err) {
    if (err instanceof TarificationError) {
      return {
        kind: 'refusee',
        etape: 'tarification',
        code: CODE_TARIFICATION_REFUSEE,
        reason: err.message,
      };
    }
    throw err;
  }

  // Bord droit : le trajet le moins cher. Un refus remonte avec son code
  // d'origine intact — celui qui lit doit voir la cause exacte, pas une
  // traduction.
  const chemin = choisitChemin(
    {
      origine: demande.origine,
      destination: demande.destination,
      amountMinor: demande.amountMinor,
      currency: demande.currency,
    },
    contexte,
  );
  if (chemin.kind === 'refuse') {
    return { kind: 'refusee', etape: 'chemin', code: chemin.code, reason: chemin.reason };
  }

  return {
    kind: 'acceptee',
    nature,
    frais,
    chemin,
    margeEstimeeMinor: frais.feeMinor - chemin.estimatedCostMinor,
    fneRequise: exigeFne(demande.contexte),
  };
}
