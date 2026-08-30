/**
 * Le reequilibrage des caisses — le netting de fond (docs/pivot/17 §1).
 *
 * On tient une reserve par operateur ; les operations quotidiennes les font
 * deriver — celle d'Orange gonfle, celle de Wave se vide. Ce module decide des
 * mouvements qui ramenent chaque caisse basse a son budget en puisant dans
 * celles qui debordent : on paie le rail sur le NET, pas sur le brut. C'est la
 * version production de reequilibre() et rapprovisionne() du simulateur
 * (design/pivot/sondes/netting.mjs), avec les regles du Cerveau en plus.
 *
 * Ce module rend un PLAN, il n'execute rien. L'orchestrateur portera
 * l'execution (idempotence, reprise) ; ici, memes entrees, memes sorties,
 * aucun effet, aucun hasard.
 *
 * Le levier que personne d'autre n'a (17 §2.1) : la facture FNE est emise
 * avant d'etre payee, donc on voit la tresorerie de demain. Une caisse sous
 * son seuil mais dont les entrees prevues sous l'horizon couvrent le manque
 * n'est pas rechargee — on ne paie pas un rail pour de l'argent deja en route.
 *
 * La limite assumee (17 §7.4) : pendant une vague de retraits, toutes les
 * caisses se vident EN MEME TEMPS et il n'y a plus rien a puiser nulle part.
 * Ce module le DIT — caissesInsolvables — au lieu de le masquer. La soupape
 * par operation (18 §11) vit dans chemin.ts, pas ici ; la ligne de credit est
 * une decision produit, pas un reglage.
 *
 * Les refus habituels du Cerveau : un mouvement dont le cout est inconnu est
 * interdit ; une donnee invalide ecarte la caisse et se voit dans reasons ;
 * jamais d'exception avalee, jamais de devinette.
 */

import { estimateCost, type RailPolicy } from '../router/route.js';
import type { Caisse } from '../router/chemin.js';

/** Une caisse d'operateur avec sa cible de tresorerie. */
export interface CaisseAvecBudget extends Caisse {
  /** La cible : le solde vise apres recharge, en entiers XOF. */
  budgetMinor: number;
}

/**
 * Une entree annoncee par une facture emise et pas encore payee (17 §2.1).
 * L'horizon dit dans combien de jours l'argent doit arriver sur l'operateur.
 */
export interface PrevisionEntree {
  operator: string;
  amountMinor: number;
  horizonJours: number;
}

export interface EtatTresorerie {
  caisses: readonly CaisseAvecBudget[];
  railPolicies: readonly RailPolicy[];
  previsions?: readonly PrevisionEntree[] | undefined;
}

export interface OptionsReequilibrage {
  /** Seuil de declenchement, en pourcent du budget. Defaut : 60. */
  seuilBasPct?: number | undefined;
  /** Deja consomme ce mois-ci, par rail, en entiers XOF. */
  consommeParRail?: Readonly<Record<string, number>> | undefined;
  /**
   * Plafond mensuel par rail, en entiers XOF. Un rail absent est repute sans
   * plafond : le plafond est une contrainte declaree, pas une grille de cout —
   * son absence ne bloque pas, contrairement au cout, qui bloque toujours.
   */
  plafondMensuelParRail?: Readonly<Record<string, number>> | undefined;
  /**
   * Au-dela de cet horizon, une prevision ne compte plus : attendre un
   * paiement a dix jours, c'est etre a sec entre-temps. Defaut : 3 jours,
   * valeur prudente a caler sur les delais de paiement mesures.
   */
  horizonMaxJours?: number | undefined;
  /** Devise des politiques de rail considerees. Defaut : XOF. */
  currency?: string | undefined;
}

export interface MouvementPlanifie {
  fromOperator: string;
  toOperator: string;
  amountMinor: number;
  rail: string;
  coutEstimeMinor: number;
  reason: string;
}

export interface PlanReequilibrage {
  mouvements: readonly MouvementPlanifie[];
  coutTotalEstimeMinor: number;
  /**
   * Les caisses qu'on ne peut PAS ramener a leur budget : aucune source
   * excedentaire, aucun rail avec politique, grille de cout ou capacite.
   * Signalees, jamais tues — c'est a l'exploitant de decider (ligne de
   * credit, ralentissement des retraits, 17 §7.4).
   */
  caissesInsolvables: readonly string[];
  reasons: readonly string[];
}

interface ChoixRail {
  rail: string;
  coutMinor: number;
  priority: number;
}

/**
 * Le rail le moins cher qui a la capacite pour CE mouvement. Un mouvement va
 * entier sur un rail : pas de decoupage sur plusieurs rails en v1, le plan
 * reste lisible et auditable (meme regle que le simulateur). A cout egal, la
 * priorite puis le nom departagent — le plan est le meme a chaque appel.
 */
function choisitRail(
  candidats: readonly RailPolicy[],
  montantMinor: number,
  consomme: ReadonlyMap<string, number>,
  plafonds: Readonly<Record<string, number>>,
): ChoixRail | undefined {
  let meilleur: ChoixRail | undefined;
  for (const p of candidats) {
    const deja = consomme.get(p.rail) ?? 0;
    /* Consommation illisible = Infinity. Sans cette garde, un rail SANS
       plafond declare passerait quand meme (Infinity > Infinity est faux) :
       capacite inconnue, le rail ne sert pas, plafond ou non. */
    if (!Number.isFinite(deja)) continue;
    const plafond = plafonds[p.rail] ?? Number.POSITIVE_INFINITY;
    if (deja + montantMinor > plafond) continue;
    const cout = estimateCost(p, montantMinor);
    if (cout === undefined) continue; // deja filtre en amont ; ceinture
    // Un mouvement qui coute plus qu'il ne deplace appauvrit — meme garde-fou
    // que route.ts sur les payouts.
    if (cout >= montantMinor) continue;
    if (
      meilleur === undefined ||
      cout < meilleur.coutMinor ||
      (cout === meilleur.coutMinor && p.priority < meilleur.priority) ||
      (cout === meilleur.coutMinor && p.priority === meilleur.priority && p.rail < meilleur.rail)
    ) {
      meilleur = { rail: p.rail, coutMinor: cout, priority: p.priority };
    }
  }
  return meilleur;
}

const estEntierPositifOuNul = (n: number): boolean => Number.isInteger(n) && n >= 0;

/**
 * Planifie le reequilibrage : quelles caisses recharger, depuis lesquelles,
 * par quels rails, pour quel cout. Pur et deterministe — les caisses sont
 * traitees par ordre d'operateur, l'ordre du tableau d'entree ne compte pas.
 *
 * Choix documente sur les previsions : le declencheur est le solde PROJETE
 * (solde + entrees prevues sous l'horizon). Une prevision qui ramene le
 * projete au-dessus du seuil ANNULE la recharge — entre le seuil et le budget
 * la caisse est dans les bornes, payer un rail pour de l'argent deja en route
 * serait une perte seche. Une prevision trop petite pour atteindre le seuil
 * REDUIT la recharge : on ne complete que ce que les factures n'apportent pas
 * (besoin = budget − solde projete). Les previsions ne comptent JAMAIS cote
 * source : on ne puise que dans l'argent present, pas dans l'argent promis.
 */
export function planifieReequilibrage(
  etat: EtatTresorerie,
  options: OptionsReequilibrage = {},
): PlanReequilibrage {
  const seuilPct = options.seuilBasPct ?? 60;
  const horizonMax = options.horizonMaxJours ?? 3;
  /* Un NaN rend toute comparaison fausse : un seuil illisible rechargerait
     chaque caisse sous son budget, un horizon illisible compterait n'importe
     quelle prevision — un plan silencieusement faux. On refuse de planifier. */
  if (!Number.isFinite(seuilPct) || seuilPct < 0 || !Number.isFinite(horizonMax) || horizonMax < 0) {
    return {
      mouvements: [],
      coutTotalEstimeMinor: 0,
      caissesInsolvables: [],
      reasons: [
        `options illisibles (seuilBasPct=${seuilPct}, horizonMaxJours=${horizonMax}) : aucun plan etabli`,
      ],
    };
  }
  const currency = options.currency ?? 'XOF';
  const plafondsDeclares = options.plafondMensuelParRail ?? {};

  const reasons: string[] = [];
  const caissesInsolvables: string[] = [];
  const mouvements: MouvementPlanifie[] = [];

  /* La capacite se consomme au fil du plan lui-meme : un mouvement planifie
     sature le rail pour les suivants, comme il le fera en vrai. */
  const consomme = new Map<string, number>();
  for (const [rail, montant] of Object.entries(options.consommeParRail ?? {})) {
    if (estEntierPositifOuNul(montant)) {
      consomme.set(rail, montant);
    } else {
      // Consommation illisible = capacite inconnue : le rail ne sert pas.
      consomme.set(rail, Number.POSITIVE_INFINITY);
      reasons.push(`rail ${rail} ecarte : consommation mensuelle invalide (${montant})`);
    }
  }
  const plafonds: Record<string, number> = {};
  for (const [rail, plafond] of Object.entries(plafondsDeclares)) {
    if (estEntierPositifOuNul(plafond)) {
      plafonds[rail] = plafond;
    } else {
      // Plafond declare mais illisible : on refuse le rail plutot que deviner.
      plafonds[rail] = 0;
      reasons.push(`rail ${rail} ecarte : plafond mensuel invalide (${plafond})`);
    }
  }

  /* Validation des caisses. Une caisse aux donnees illisibles est ecartee du
     plan — ni rechargee, ni source — et signalee. On ne la met pas dans
     caissesInsolvables : on ne sait meme pas si elle a besoin d'etre rechargee. */
  const parOperateur = new Map<string, CaisseAvecBudget>();
  const doublons = new Set<string>();
  for (const caisse of etat.caisses) {
    if (parOperateur.has(caisse.operator)) doublons.add(caisse.operator);
    parOperateur.set(caisse.operator, caisse);
  }
  const valides: CaisseAvecBudget[] = [];
  for (const caisse of [...parOperateur.values()].sort((a, b) =>
    a.operator < b.operator ? -1 : a.operator > b.operator ? 1 : 0,
  )) {
    if (caisse.operator === '') {
      // Un mouvement vers ou depuis un operateur sans nom est inexecutable.
      reasons.push('caisse ecartee : operateur vide');
      continue;
    }
    if (doublons.has(caisse.operator)) {
      reasons.push(`caisse ${caisse.operator} ecartee : operateur duplique dans l'etat`);
      continue;
    }
    if (!estEntierPositifOuNul(caisse.balanceMinor) || !estEntierPositifOuNul(caisse.budgetMinor)) {
      reasons.push(`caisse ${caisse.operator} ecartee : solde ou budget non entier ou negatif`);
      continue;
    }
    valides.push(caisse);
  }

  /* Les entrees prevues sous l'horizon, sommees par operateur. Une prevision
     invalide est ignoree ET signalee : l'ignorer recharge PLUS, jamais moins —
     c'est le sens prudent de l'erreur. */
  const prevuParOperateur = new Map<string, number>();
  for (const prevision of etat.previsions ?? []) {
    if (
      prevision.operator === '' ||
      !Number.isInteger(prevision.amountMinor) ||
      prevision.amountMinor <= 0 ||
      !Number.isFinite(prevision.horizonJours) ||
      prevision.horizonJours < 0
    ) {
      reasons.push(`prevision ${prevision.operator || '?'} ecartee : donnees invalides`);
      continue;
    }
    if (prevision.horizonJours > horizonMax) continue; // trop loin pour proteger la caisse
    prevuParOperateur.set(
      prevision.operator,
      (prevuParOperateur.get(prevision.operator) ?? 0) + prevision.amountMinor,
    );
  }

  /* Les sources : les caisses au-dessus de leur budget. On ne les vide jamais
     sous leur budget — reequilibrer, ce n'est pas creer un nouveau creux. */
  const dispoParSource = new Map<string, number>();
  for (const caisse of valides) {
    const dispo = caisse.balanceMinor - caisse.budgetMinor;
    if (dispo > 0) dispoParSource.set(caisse.operator, dispo);
  }

  for (const caisse of valides) {
    const seuilBasMinor = Math.floor((caisse.budgetMinor * seuilPct) / 100);
    if (caisse.balanceMinor >= seuilBasMinor) continue; // dans les bornes

    const prevu = prevuParOperateur.get(caisse.operator) ?? 0;
    const soldeProjete = caisse.balanceMinor + prevu;
    if (soldeProjete >= seuilBasMinor) {
      reasons.push(
        `caisse ${caisse.operator} : recharge annulee, ${prevu} F attendus sous ${horizonMax} j couvrent le besoin`,
      );
      continue;
    }
    if (prevu > 0) {
      reasons.push(
        `caisse ${caisse.operator} : recharge reduite, ${prevu} F attendus sous ${horizonMax} j completent le solde`,
      );
    }

    let besoin = caisse.budgetMinor - soldeProjete;
    if (besoin <= 0) continue; // seuilPct > 100 : rien a recharger au-dela du budget

    /* Les politiques capables d'atteindre CET operateur. Le mouvement se juge
       par sa destination : c'est un versement vers l'operateur de la caisse a
       recharger — la jambe de sortie cote source est portee par le meme rail
       (hypothese heritee du simulateur, a raffiner sur les rails reels). */
    const applicables = etat.railPolicies.filter(
      (p) =>
        p.operation === 'payout' &&
        p.currency === currency &&
        p.enabled &&
        (p.operator === '*' || p.operator === caisse.operator),
    );
    if (applicables.length === 0) {
      caissesInsolvables.push(caisse.operator);
      reasons.push(
        `caisse ${caisse.operator} insolvable : aucune politique de rail active pour ${currency}, manque ${besoin} F`,
      );
      continue;
    }
    const candidats = applicables.filter((p) => estimateCost(p, besoin) !== undefined);
    if (candidats.length === 0) {
      // On ne paie pas a l'aveugle : sans grille, le mouvement est interdit.
      caissesInsolvables.push(caisse.operator);
      reasons.push(
        `caisse ${caisse.operator} insolvable : aucune grille de cout sur les rails candidats, mouvement refuse, manque ${besoin} F`,
      );
      continue;
    }

    let sourcesVues = 0;
    let railARefuse = false;
    for (const source of valides) {
      if (besoin <= 0) break;
      const dispoRestant = dispoParSource.get(source.operator) ?? 0;
      if (dispoRestant <= 0) continue;
      sourcesVues += 1;

      const pris = Math.min(dispoRestant, besoin);
      const choix = choisitRail(candidats, pris, consomme, plafonds);
      // Aucun rail n'accepte ce morceau entier (capacite, ou cout superieur au
      // montant) : source suivante — un morceau plus petit peut encore passer.
      if (choix === undefined) {
        railARefuse = true;
        continue;
      }

      dispoParSource.set(source.operator, dispoRestant - pris);
      consomme.set(choix.rail, (consomme.get(choix.rail) ?? 0) + pris);
      besoin -= pris;
      mouvements.push({
        fromOperator: source.operator,
        toOperator: caisse.operator,
        amountMinor: pris,
        rail: choix.rail,
        coutEstimeMinor: choix.coutMinor,
        reason: `recharge ${caisse.operator} : solde sous ${seuilPct} % du budget, ${pris} F depuis ${source.operator} par ${choix.rail}`,
      });
    }

    if (besoin > 0) {
      caissesInsolvables.push(caisse.operator);
      // La raison distingue les trois manques reels : pas de surplus a puiser,
      // un rail qui a refuse un morceau, ou des surplus tout simplement epuises.
      reasons.push(
        sourcesVues === 0
          ? `caisse ${caisse.operator} insolvable : aucune source excedentaire, manque ${besoin} F`
          : railARefuse
            ? `caisse ${caisse.operator} insolvable : aucun rail n'accepte le morceau restant (capacite ou cout), manque ${besoin} F`
            : `caisse ${caisse.operator} insolvable : sources excedentaires epuisees, manque ${besoin} F`,
      );
    }
  }

  let coutTotalEstimeMinor = 0;
  for (const m of mouvements) coutTotalEstimeMinor += m.coutEstimeMinor;

  return { mouvements, coutTotalEstimeMinor, caissesInsolvables, reasons };
}
