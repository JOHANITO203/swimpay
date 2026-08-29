/**
 * Le Routeur.
 *
 * v1 volontairement simple : une table de politique dit quel rail sert quelle
 * operation, et le routeur choisit. Ce qui compte n'est pas l'intelligence du
 * choix — il n'y a qu'un rail — mais les deux garde-fous qui l'entourent.
 *
 * Garde-fou 1 : AUCUN versement ne part sans grille de cout configuree pour
 * son rail. C'est la lecon « paie sous le cout » : un routeur qui choisit un
 * rail dont on ignore le prix fait perdre de l'argent a chaque operation, en
 * silence, et on s'en apercoit au bilan.
 *
 * Garde-fou 2 : un rail coupe ne fait pas echouer la demande dans le vide.
 * Elle tombe en file d'exception, avec sa cle d'idempotence, et se rejoue.
 */

export type RailOperation = 'payin' | 'payout';

export interface RailPolicy {
  operation: RailOperation;
  currency: string;
  rail: string;
  /** '*' quand la politique vaut pour tous les operateurs. */
  operator: string;
  enabled: boolean;
  /** Part fixe du cout, en entiers XOF. */
  costFixedMinor?: number | null;
  /** Part proportionnelle, en points de base (100 bp = 1 %). */
  costPercentBp?: number | null;
  priority: number;
}

export interface RouteRequest {
  operation: RailOperation;
  currency: string;
  amountMinor: number;
  operator?: string | undefined;
}

export type RouteDecision =
  | { kind: 'route'; rail: string; policy: RailPolicy; estimatedCostMinor: number; reason: string }
  | { kind: 'refuse'; reason: string; code: RouteRefusal };

export type RouteRefusal =
  | 'no_policy'
  | 'all_disabled'
  | 'missing_cost_grid'
  | 'cost_exceeds_amount'
  | 'rail_unhealthy';

export interface RailHealth {
  rail: string;
  /** Taux d'echec sur la fenetre glissante, en points de base. */
  failureRateBp: number;
  samples: number;
}

export interface RouteOptions {
  /** Sante observee par rail. Un rail trop fragile est ecarte. */
  health?: readonly RailHealth[] | undefined;
  /** Seuil d'ecartement, en points de base. Defaut : 50 % d'echecs. */
  unhealthyAboveBp?: number | undefined;
  /** En dessous de ce nombre d'observations, on ne juge pas la sante. */
  minSamples?: number | undefined;
}

/** Le cout estime d'une operation sur une politique donnee. */
export function estimateCost(policy: RailPolicy, amountMinor: number): number | undefined {
  const fixe = policy.costFixedMinor;
  const bp = policy.costPercentBp;
  if ((fixe === null || fixe === undefined) && (bp === null || bp === undefined)) {
    return undefined;
  }
  return Math.round((fixe ?? 0) + (amountMinor * (bp ?? 0)) / 10_000);
}

/**
 * Choisit le rail.
 *
 * L'ordre : on filtre sur l'operation, la devise et l'operateur, on ecarte ce
 * qui est desactive puis ce qui est en mauvaise sante, on trie par priorite,
 * et on exige une grille de cout AVANT de laisser partir un versement.
 */
export function route(
  request: RouteRequest,
  policies: readonly RailPolicy[],
  options: RouteOptions = {},
): RouteDecision {
  const seuil = options.unhealthyAboveBp ?? 5_000;
  const mini = options.minSamples ?? 20;

  const applicables = policies.filter(
    (p) =>
      p.operation === request.operation &&
      p.currency === request.currency &&
      (p.operator === '*' || p.operator === request.operator),
  );
  if (applicables.length === 0) {
    return {
      kind: 'refuse',
      code: 'no_policy',
      reason: `aucune politique pour ${request.operation} ${request.currency}${
        request.operator ? ` / ${request.operator}` : ''
      }`,
    };
  }

  const actives = applicables.filter((p) => p.enabled);
  if (actives.length === 0) {
    return { kind: 'refuse', code: 'all_disabled', reason: 'toutes les politiques sont desactivees' };
  }

  const malades = new Set(
    (options.health ?? [])
      .filter((h) => h.samples >= mini && h.failureRateBp > seuil)
      .map((h) => h.rail),
  );
  const sains = actives.filter((p) => !malades.has(p.rail));
  if (sains.length === 0) {
    return {
      kind: 'refuse',
      code: 'rail_unhealthy',
      reason: `tous les rails candidats sont au-dessus du seuil d echec (${seuil / 100} %)`,
    };
  }

  // Priorite croissante : 10 passe avant 100. A egalite, l'operateur explicite
  // l'emporte sur le joker.
  const trie = [...sains].sort(
    (a, b) => a.priority - b.priority || (a.operator === '*' ? 1 : 0) - (b.operator === '*' ? 1 : 0),
  );
  const choisi = trie[0]!;

  const cout = estimateCost(choisi, request.amountMinor);
  if (request.operation === 'payout' && cout !== undefined && cout >= request.amountMinor) {
    /* Verifier que la grille EXISTE ne suffit pas : il faut la lire. Un
       versement de 100 F qui en coute 150 appauvrit a chaque operation, et
       personne ne le voit avant le bilan. */
    return {
      kind: 'refuse',
      code: 'cost_exceeds_amount',
      reason: `${cout} de frais pour ${request.amountMinor} verses sur ${choisi.rail}`,
    };
  }
  if (request.operation === 'payout' && cout === undefined) {
    // On refuse de verser a l'aveugle. C'est le garde-fou qui coute le moins
    // cher de toute la chaine.
    return {
      kind: 'refuse',
      code: 'missing_cost_grid',
      reason: `aucune grille de cout pour ${choisi.rail} : versement refuse`,
    };
  }

  return {
    kind: 'route',
    rail: choisi.rail,
    policy: choisi,
    estimatedCostMinor: cout ?? 0,
    reason:
      malades.size > 0
        ? `${choisi.rail} retenu, ${[...malades].join(', ')} ecarte(s) pour taux d echec`
        : `${choisi.rail} retenu par priorite ${choisi.priority}`,
  };
}
