/**
 * Le sélecteur de chemin — le bord droit de la formule.
 *
 *     marge = prix facture (grille) − cout du chemin le moins cher (ICI)
 *
 * Ce module decide PAR OU l'argent passe, du moins cher au plus cher :
 *
 *   1. ECRITURE     les deux bouts sont des comptes SwimPay : rien ne bouge,
 *                   une ligne dans le livre. Cout zero.
 *   2. CAPTURE      l'argent ENTRE depuis un mobile : on capture sur le meme
 *                   reseau que le payeur (le QR adaptatif de LO). Jamais de
 *                   conversion inter-reseaux a l'entree.
 *   3. CAISSE       l'argent SORT vers un mobile : on paie depuis notre caisse
 *                   de l'operateur vise. Rien ne traverse — le netting regle
 *                   les desequilibres plus tard, sur le net.
 *   4. RAIL         la caisse ne suffit pas : la soupape. On passe par le rail
 *                   le moins cher qui a de la capacite (delegue a route.ts).
 *                   L'echec devient un cout, jamais un refus — c'est ce que la
 *                   simulation a montre (18 §11 : 167 refus sans soupape, 0
 *                   avec).
 *
 * Les memes refus que partout dans le Cerveau : on ne devine pas. Un cout de
 * caisse non configure refuse le chemin caisse (la lecon « paie sous le
 * cout ») ; aucun chemin possible rend un refus type, jamais une exception
 * avalee.
 */

import {
  route,
  type RailPolicy,
  type RouteOptions,
  type RouteRefusal,
} from './route.js';
import type { Extremite } from '../pricing/grille.js';

/** L'etat d'une caisse d'operateur au moment de la decision. */
export interface Caisse {
  operator: string;
  /** Solde disponible, en entiers XOF. */
  balanceMinor: number;
  /**
   * Cout de decaissement par cette caisse, en points de base. Le payout par
   * l'API d'un operateur n'est pas gratuit et son taux exact n'est pas public
   * (docs/pivot/20 §7) : tant qu'il n'est pas configure, la caisse ne verse
   * pas — on ne paie pas a l'aveugle.
   */
  payoutCostBp?: number | undefined;
  /** Cout de capture (encaissement) par cette caisse, en points de base. */
  captureCostBp?: number | undefined;
}

export interface CheminRequest {
  origine: Extremite;
  destination: Extremite;
  amountMinor: number;
  currency: string;
}

export interface CheminContext {
  caisses: readonly Caisse[];
  railPolicies: readonly RailPolicy[];
  routeOptions?: RouteOptions | undefined;
}

export type CheminDecision =
  | { kind: 'ecriture'; estimatedCostMinor: 0; reason: string }
  | {
      kind: 'capture';
      operator: string;
      estimatedCostMinor: number;
      reason: string;
    }
  | {
      kind: 'caisse';
      operator: string;
      estimatedCostMinor: number;
      reason: string;
    }
  | {
      kind: 'rail';
      rail: string;
      estimatedCostMinor: number;
      /** La soupape a joue : la caisse ne pouvait pas, le rail prend. */
      enSecours: boolean;
      reason: string;
    }
  | { kind: 'refuse'; code: CheminRefusal; reason: string };

export type CheminRefusal =
  | 'montant_invalide'
  | 'operateur_manquant'
  | 'cout_caisse_inconnu'
  | 'topologie_non_geree'
  | RouteRefusal;

/** Choisit le chemin le moins cher pour une operation donnee. */
export function choisitChemin(req: CheminRequest, ctx: CheminContext): CheminDecision {
  if (!Number.isInteger(req.amountMinor) || req.amountMinor <= 0) {
    return { kind: 'refuse', code: 'montant_invalide', reason: `montant : ${req.amountMinor}` };
  }

  // 1. Les deux bouts chez nous : une ecriture, rien d'autre.
  if (req.origine.type === 'swimpay' && req.destination.type === 'swimpay') {
    return {
      kind: 'ecriture',
      estimatedCostMinor: 0,
      reason: 'les deux comptes sont SwimPay : ecriture interne, aucun rail',
    };
  }

  // 2. L'argent ENTRE depuis un mobile : capture sur le reseau du payeur.
  if (req.origine.type === 'mobile' && req.destination.type === 'swimpay') {
    const op = req.origine.operator;
    if (!op) {
      return { kind: 'refuse', code: 'operateur_manquant', reason: 'origine mobile sans operateur' };
    }
    const caisse = ctx.caisses.find((c) => c.operator === op);
    if (caisse?.captureCostBp !== undefined) {
      return {
        kind: 'capture',
        operator: op,
        estimatedCostMinor: Math.round((req.amountMinor * caisse.captureCostBp) / 10_000),
        reason: `capture ${op}→${op} : le QR s'adapte au reseau du payeur`,
      };
    }
    // Pas de compte marchand chez cet operateur (ou cout inconnu) : un rail
    // fait le payin. C'est la voie normale tant que l'API n'est pas signee.
    return versLeRail(req, ctx, 'payin', op, false);
  }

  // 3. L'argent SORT vers un mobile : la caisse de l'operateur vise d'abord.
  if (req.destination.type === 'mobile') {
    const op = req.destination.operator;
    if (!op) {
      return { kind: 'refuse', code: 'operateur_manquant', reason: 'destination mobile sans operateur' };
    }
    const caisse = ctx.caisses.find((c) => c.operator === op);
    if (caisse && caisse.balanceMinor >= req.amountMinor) {
      if (caisse.payoutCostBp === undefined) {
        /* La caisse a l'argent mais on ignore ce que son payout coute. On ne
           verse pas a l'aveugle — c'est le meme garde-fou que route.ts. La
           soupape peut encore servir. */
        const rail = versLeRail(req, ctx, 'payout', op, true);
        return rail.kind === 'refuse'
          ? { kind: 'refuse', code: 'cout_caisse_inconnu', reason: `cout payout ${op} non configure et aucun rail de secours` }
          : rail;
      }
      return {
        kind: 'caisse',
        operator: op,
        estimatedCostMinor: Math.round((req.amountMinor * caisse.payoutCostBp) / 10_000),
        reason: `caisse ${op} suffisante (${caisse.balanceMinor}) : rien ne traverse`,
      };
    }
    // 4. La soupape : caisse absente ou a sec, le rail prend. Un cout, pas un refus.
    return versLeRail(req, ctx, 'payout', op, true);
  }

  // L'argent ENTRE depuis une banque (l'alimentation d'un compte SwimPay par
  // virement). C'est un PAYIN — la premiere version le laissait tomber dans le
  // fallback payout, a contresens : defaut releve par la verification
  // adversariale de decision.ts.
  if (req.origine.type === 'banque' && req.destination.type === 'swimpay') {
    return versLeRail(req, ctx, 'payin', undefined, false);
  }

  // Destination banque : pas de caisse bancaire en V1, le rail fait le virement.
  if (req.destination.type === 'banque') {
    return versLeRail(req, ctx, 'payout', undefined, false);
  }

  // Tout le reste est une topologie qu'on ne sait pas executer : on le DIT,
  // on ne route pas au hasard.
  return {
    kind: 'refuse',
    code: 'topologie_non_geree',
    reason: `aucun chemin pour ${req.origine.type} → ${req.destination.type}`,
  };
}

function versLeRail(
  req: CheminRequest,
  ctx: CheminContext,
  operation: 'payin' | 'payout',
  operator: string | undefined,
  enSecours: boolean,
): CheminDecision {
  const decision = route(
    { operation, currency: req.currency, amountMinor: req.amountMinor, operator },
    ctx.railPolicies,
    ctx.routeOptions ?? {},
  );
  if (decision.kind === 'refuse') {
    return { kind: 'refuse', code: decision.code, reason: decision.reason };
  }
  return {
    kind: 'rail',
    rail: decision.rail,
    estimatedCostMinor: decision.estimatedCostMinor,
    enSecours,
    reason: enSecours ? `soupape : ${decision.reason}` : decision.reason,
  };
}
