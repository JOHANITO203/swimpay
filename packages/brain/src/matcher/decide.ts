import type { NormalizedRailEvent } from '@swimpay/rails';

/**
 * Le Rapprocheur — la decision.
 *
 * Relier chaque paiement a chaque vente. C'est le produit (« ta caisse est
 * comptee ») et le socle de la facture automatique : sans rapprochement, pas
 * de facture pre-remplie.
 *
 * Cette fonction est PURE. Elle recoit un paiement et la liste des ventes
 * candidates, elle rend une decision. Aucun acces base, aucune horloge cachee,
 * aucun effet de bord — donc elle se teste exhaustivement, et le jour ou les
 * poids deviennent apprenants, c'est ici seulement que ca change.
 *
 * La regle qui gouverne tout : dans le doute, on ne tranche PAS. Une file
 * d'exception coute une minute au marchand ; un faux rapprochement lui coute
 * sa comptabilite.
 */

/** Une vente candidate, reduite a ce dont la decision a besoin. */
export interface CandidateSale {
  id: string;
  amountMinor: number;
  reference?: string | null | undefined;
  occurredAt: Date;
}

export type MatchMethod = 'auto_ref' | 'auto_heur' | 'manual' | 'cash';

export type ExceptionKind =
  | 'unmatched_payment'
  | 'ambiguous_match'
  | 'amount_mismatch';

export type MatchDecision =
  | {
      kind: 'match';
      saleId: string;
      score: number;
      method: MatchMethod;
      reason: string;
    }
  | {
      kind: 'exception';
      exception: ExceptionKind;
      candidateIds: string[];
      reason: string;
    };

export interface DecideOptions {
  /** Fenetre de recherche autour du paiement. Defaut : 48 h de part et d'autre. */
  windowMs?: number | undefined;
}

const FENETRE_PAR_DEFAUT_MS = 48 * 60 * 60 * 1000;

/**
 * Decide du sort d'un paiement face aux ventes en attente du meme marchand.
 *
 * Les regles sont appliquees dans l'ordre de la spec. L'ordre n'est pas un
 * detail : la reference l'emporte sur le montant, parce qu'elle est portee par
 * le QR dynamique ou le lien et qu'elle ne ment pas.
 */
export function decideMatch(
  payment: Pick<NormalizedRailEvent, 'amountMinor' | 'reference' | 'occurredAt'>,
  candidates: readonly CandidateSale[],
  options: DecideOptions = {},
): MatchDecision {
  const fenetre = options.windowMs ?? FENETRE_PAR_DEFAUT_MS;

  // On ne considere que ce qui est dans la fenetre. Une vente d'il y a une
  // semaine n'est pas un candidat, c'est un piege.
  const dansLaFenetre = candidates.filter(
    (c) => Math.abs(c.occurredAt.getTime() - payment.occurredAt.getTime()) <= fenetre,
  );

  // Regle 1 — la reference. Un QR dynamique ou un lien porte sa reference ;
  // quand elle revient, il n'y a rien a deviner.
  const ref = payment.reference?.trim();
  if (ref) {
    const parRef = dansLaFenetre.filter((c) => c.reference?.trim() === ref);
    if (parRef.length === 1) {
      const vente = parRef[0]!;
      // La reference designe la vente, mais un montant qui ne tombe pas juste
      // reste un ecart : on rapproche, et l'ecart part quand meme en file.
      if (vente.amountMinor !== payment.amountMinor) {
        return {
          kind: 'exception',
          exception: 'amount_mismatch',
          candidateIds: [vente.id],
          reason: `reference ${ref} mais ${payment.amountMinor} recu pour ${vente.amountMinor} attendu`,
        };
      }
      return {
        kind: 'match',
        saleId: vente.id,
        score: 100,
        method: 'auto_ref',
        reason: `reference ${ref}`,
      };
    }
    if (parRef.length > 1) {
      // Deux ventes qui portent la meme reference : c'est un defaut de notre
      // cote, jamais du payeur. On ne choisit pas a sa place.
      return {
        kind: 'exception',
        exception: 'ambiguous_match',
        candidateIds: parRef.map((c) => c.id),
        reason: `${parRef.length} ventes portent la reference ${ref}`,
      };
    }
    // Reference presente mais inconnue : on continue sur le montant. Le payeur
    // a pu saisir un libelle libre.
  }

  // Regle 2 — le montant exact.
  const memeMontant = dansLaFenetre.filter((c) => c.amountMinor === payment.amountMinor);
  if (memeMontant.length === 1) {
    return {
      kind: 'match',
      saleId: memeMontant[0]!.id,
      score: 95,
      method: 'auto_heur',
      reason: 'montant exact, candidat unique dans la fenetre',
    };
  }
  if (memeMontant.length > 1) {
    // Deux cafes a 1 000 dans la meme heure : personne ne peut dire lequel a
    // ete paye. Le marchand, lui, le sait.
    return {
      kind: 'exception',
      exception: 'ambiguous_match',
      candidateIds: memeMontant.map((c) => c.id),
      reason: `${memeMontant.length} ventes du meme montant dans la fenetre`,
    };
  }

  // Regle 3 — aucun montant exact. Un candidat unique proche est un ecart a
  // trancher (frais preleves, arrondi) ; plusieurs, ou aucun, c'est orphelin.
  if (dansLaFenetre.length === 1) {
    return {
      kind: 'exception',
      exception: 'amount_mismatch',
      candidateIds: [dansLaFenetre[0]!.id],
      reason: `${payment.amountMinor} recu, ${dansLaFenetre[0]!.amountMinor} attendu`,
    };
  }

  return {
    kind: 'exception',
    exception: 'unmatched_payment',
    candidateIds: dansLaFenetre.map((c) => c.id),
    reason:
      dansLaFenetre.length === 0
        ? 'aucune vente en attente dans la fenetre'
        : `${dansLaFenetre.length} ventes en attente, aucune du bon montant`,
  };
}

/**
 * Une vente reglee en especes est rapprochee a la saisie : il n'y a pas de
 * paiement a attendre, le marchand a l'argent en main.
 */
export function decideCash(saleId: string): MatchDecision {
  return {
    kind: 'match',
    saleId,
    score: 100,
    method: 'cash',
    reason: 'vente en especes, encaissee a la saisie',
  };
}
