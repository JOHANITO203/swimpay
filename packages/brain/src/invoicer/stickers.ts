/**
 * Le stock de stickers fiscaux — l'invariant I9 (doc 14 §invariants) : « le
 * solde de stickers est lu a chaque reponse, et alerte avant rupture ».
 *
 * Pourquoi ce module existe : chaque certification FNE consomme un sticker
 * prepaye a 20 F TTC (docs/pivot/08_DGI_FNE_API.md §6.1), et l'API ne previent
 * de rien — elle rend seulement `balance_sticker` dans chaque reponse (§5).
 * Un marchand qui decouvre le portefeuille vide au moment de facturer est un
 * marchand bloque en caisse (§9.9). La seule prevention possible est
 * d'estimer les jours restants a partir du journal des soldes observes.
 *
 * Module PUR : pas d'horloge, pas d'IO. L'ancre temporelle est la DERNIERE
 * observation, jamais l'heure courante — le verdict est deterministe pour un
 * historique donne. La fraicheur des observations est garantie par I9
 * lui-meme : tant que le marchand facture, une observation arrive a chaque
 * reponse. `joursRestants` se compte donc depuis la derniere observation ;
 * l'anciennete de celle-ci se juge cote appelant.
 *
 * Philosophie du repo : REFUSER plutot que deviner. Pas assez d'observations
 * pour estimer -> 'inconnu', jamais une consommation inventee. Une seule
 * exception, qui n'estime rien : un solde a zero est 'epuise' meme sans
 * historique — c'est un fait observe, pas une prediction.
 *
 * Le piege de la recharge : le solde REMONTE quand le marchand recharge son
 * portefeuille (« il y a un portefeuille a recharger », §9.9). Une moyenne
 * naive (premier solde - dernier solde) / duree rendrait une consommation
 * negative — donc des jours restants absurdes. On ne compte que les segments
 * ou le solde baisse ou stagne ; un segment montant est ecarte EN ENTIER,
 * delta ET duree : la consommation qui a pu s'y produire pendant la recharge
 * est inconnue, on ne l'invente pas.
 *
 * Les factures gratuites (franchise <= 5 000 F, voir `facturesGratuites`) ne
 * consomment pas de sticker : elles ne font pas bouger `balance_sticker`,
 * donc l'estimation par deltas de solde les ignore d'elle-meme. L'appelant
 * n'a RIEN a filtrer avant d'appeler `evalueStock` ; `facturesGratuites` sert
 * a prevoir ou expliquer un cout, pas a corriger l'estimation.
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. Les types du contrat
// ─────────────────────────────────────────────────────────────────────────

/**
 * Une lecture de `balance_sticker`, extraite d'une reponse de certification.
 * C'est un JOURNAL : chaque reponse en ajoute une, on ne remplace jamais.
 */
export interface StickerObservation {
  /** Le marchand dont c'est le solde. Une serie melant deux marchands est refusee. */
  readonly merchantId: string;
  /** Le solde rendu par la DGI. Entier >= 0 ; tout autre chose est aberrant. */
  readonly balance: number;
  readonly observedAt: Date;
}

export type StockLevel = 'ok' | 'alerte' | 'critique' | 'epuise' | 'inconnu';

export interface StockVerdict {
  readonly level: StockLevel;
  /**
   * Le dernier solde observe. `undefined` quand il n'y a aucune observation :
   * on n'invente pas un zero, ce serait confondre « jamais lu » et « vide ».
   */
  readonly balance: number | undefined;
  /**
   * Estimation en jours depuis la derniere observation, fractionnaire.
   * Absente quand rien ne permet de la calculer honnetement.
   */
  readonly joursRestants?: number | undefined;
  /** Le pourquoi du verdict, pour l'ecran du marchand et pour les logs. */
  readonly reason: string;
}

export interface StockOptions {
  /** Fenetre glissante d'estimation, en jours, ancree sur la DERNIERE observation. */
  readonly fenetreJours?: number | undefined;
  /** 'alerte' des que joursRestants <= ce seuil (borne incluse). */
  readonly seuilAlerteJours?: number | undefined;
  /** 'critique' des que joursRestants <= ce seuil (borne incluse). */
  readonly seuilCritiqueJours?: number | undefined;
}

/**
 * Les defauts sont un choix PRODUIT, pas une regle DGI : aucun bareme ni seuil
 * n'est publie. A presenter au marchand comme notre reglage, jamais comme une
 * exigence officielle.
 */
export const FENETRE_JOURS_DEFAUT = 14;
export const SEUIL_ALERTE_JOURS_DEFAUT = 10;
export const SEUIL_CRITIQUE_JOURS_DEFAUT = 3;

const MS_PAR_JOUR = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────
// 2. Le verdict de stock
// ─────────────────────────────────────────────────────────────────────────

/** Fabrique le seul verdict qui avoue ne pas savoir. */
function inconnu(balance: number | undefined, reason: string): StockVerdict {
  return { level: 'inconnu', balance, joursRestants: undefined, reason };
}

/** Arrondi d'AFFICHAGE seulement : les comparaisons se font sur la valeur exacte. */
function affiche(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/**
 * Evalue le stock d'un marchand a partir de son journal d'observations.
 *
 * Methode : moyenne glissante de la consommation sur `fenetreJours` (defaut
 * 14), ancree sur la derniere observation, calculee sur les seuls segments
 * decroissants ou stables (voir l'en-tete du fichier pour la recharge), puis
 * jours restants = solde / consommation journaliere.
 */
export function evalueStock(
  observations: readonly StickerObservation[],
  options: StockOptions = {},
): StockVerdict {
  const premiere = observations[0];
  if (premiere === undefined) {
    return inconnu(undefined, 'aucune observation : le solde de ce marchand n a jamais ete lu');
  }

  // Une serie melant plusieurs marchands est un bug d'appel : le verdict
  // serait faux pour chacun d'eux. On refuse plutot que d'en choisir un.
  for (const o of observations) {
    if (o.merchantId !== premiere.merchantId) {
      return inconnu(undefined, 'observations de plusieurs marchands melangees : verdict refuse');
    }
    if (!Number.isInteger(o.balance) || o.balance < 0) {
      return inconnu(undefined, `solde aberrant observe (${String(o.balance)}) : verdict refuse`);
    }
    if (!Number.isFinite(o.observedAt.getTime())) {
      return inconnu(undefined, 'date d observation invalide : verdict refuse');
    }
  }

  // Tri chronologique, defensif et sans muter l'entree. Le tri natif est
  // stable : deux observations au meme instant gardent leur ordre d'arrivee.
  const triees = [...observations].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
  const derniere = triees[triees.length - 1];
  if (derniere === undefined) {
    // Impossible apres le test de longueur ; exige par noUncheckedIndexedAccess.
    return inconnu(undefined, 'aucune observation : le solde de ce marchand n a jamais ete lu');
  }
  const balance = derniere.balance;

  // La rupture constatee prime sur tout : elle ne depend d'aucune option ni
  // d'aucune estimation. Zero est un fait, pas une prediction.
  if (balance === 0) {
    return {
      level: 'epuise',
      balance: 0,
      joursRestants: 0,
      reason: 'dernier solde observe a zero : rupture constatee, pas estimee',
    };
  }

  const fenetreJours = options.fenetreJours ?? FENETRE_JOURS_DEFAUT;
  const seuilAlerte = options.seuilAlerteJours ?? SEUIL_ALERTE_JOURS_DEFAUT;
  const seuilCritique = options.seuilCritiqueJours ?? SEUIL_CRITIQUE_JOURS_DEFAUT;

  // Des options invalides ne s'auto-corrigent pas en silence : un seuil faux
  // deviendrait une alerte qui ne part jamais. Le verdict avoue.
  if (!Number.isFinite(fenetreJours) || fenetreJours <= 0) {
    return inconnu(balance, 'options invalides : fenetreJours doit etre un nombre > 0');
  }
  if (
    !Number.isFinite(seuilAlerte) ||
    !Number.isFinite(seuilCritique) ||
    seuilCritique < 0 ||
    seuilCritique > seuilAlerte
  ) {
    return inconnu(balance, 'options invalides : il faut 0 <= seuilCritiqueJours <= seuilAlerteJours');
  }

  // La fenetre glissante, ancree sur la derniere observation.
  const debutFenetre = derniere.observedAt.getTime() - fenetreJours * MS_PAR_JOUR;
  const fenetre = triees.filter((o) => o.observedAt.getTime() >= debutFenetre);

  // La consommation, sur les seuls segments decroissants ou stables.
  let consomme = 0;
  let dureeMs = 0;
  let recharges = 0;
  for (let i = 1; i < fenetre.length; i += 1) {
    const avant = fenetre[i - 1];
    const apres = fenetre[i];
    if (avant === undefined || apres === undefined) continue;
    const delta = avant.balance - apres.balance;
    if (delta < 0) {
      // Recharge : delta ET duree ecartes (voir l'en-tete du fichier).
      recharges += 1;
      continue;
    }
    consomme += delta;
    dureeMs += apres.observedAt.getTime() - avant.observedAt.getTime();
  }

  if (fenetre.length < 2 || dureeMs <= 0) {
    // Une seule observation exploitable, des observations simultanees, ou une
    // fenetre faite uniquement de recharges : aucune consommation mesurable.
    return inconnu(
      balance,
      'historique insuffisant dans la fenetre pour estimer la consommation : on ne devine pas',
    );
  }

  if (consomme === 0) {
    // Zero sticker consomme sur toute la fenetre : aucune rupture previsible
    // par ce modele. Limite documentee : un marchand qui reprend son activite
    // apres une pause paraitra 'ok' — I9 corrige des la premiere reponse.
    return {
      level: 'ok',
      balance,
      joursRestants: undefined,
      reason: 'aucune consommation observee sur la fenetre : pas de rupture previsible',
    };
  }

  // Une SEULE division, sur des entiers (balance, consomme, dureeMs le sont) :
  // la double division balance / (consomme / dureeJours) rate la borne incluse
  // d'un ulp quand la duree n'est pas un nombre de jours representable —
  // ex. 3 stickers en 1,8 jour, solde 5 : exactement 3,0 jours, mais la double
  // division rend 3.0000000000000004, donc 'alerte' au lieu de 'critique'.
  const joursRestants = (balance * dureeMs) / (consomme * MS_PAR_JOUR);
  // Pour l'affichage du pourquoi seulement ; jamais compare a un seuil.
  const dureeJours = dureeMs / MS_PAR_JOUR;
  const parJour = consomme / dureeJours;

  let level: 'ok' | 'alerte' | 'critique';
  if (joursRestants <= seuilCritique) level = 'critique';
  else if (joursRestants <= seuilAlerte) level = 'alerte';
  else level = 'ok';

  const noteRecharge = recharges > 0 ? ` (${String(recharges)} remontee(s) de solde ecartee(s))` : '';
  return {
    level,
    balance,
    joursRestants,
    reason:
      `environ ${affiche(joursRestants)} jours restants : ` +
      `${affiche(parJour)} stickers/jour observes sur ${affiche(dureeJours)} jours${noteRecharge}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. La franchise
// ─────────────────────────────────────────────────────────────────────────

/**
 * Le seuil de la franchise, en XOF entiers. Source : 08_DGI_FNE_API.md §6.1
 * (« gratuit pour les factures <= 5 000 FCFA ») et §9.9 (existence confirmee
 * par un praticien le 29 aout 2026). BORNE INCLUSE : le releve officiel ecrit
 * « <= 5 000 », donc une facture de 5 000 F exactement ne consomme pas de
 * sticker.
 */
export const FRANCHISE_STICKER_MINOR = 5000;

/**
 * Une facture sous la franchise ne consomme pas de sticker.
 *
 * Le doc ne precise pas si le seuil se lit sur le HT ou le TTC : dans le
 * doute, passer le TTC (le plus grand des deux) — l'erreur eventuelle va
 * alors dans le sens prudent, un sticker provisionne pour rien plutot qu'une
 * rupture non prevue. Meme prudence sur les entrees : un montant aberrant
 * (negatif, non entier) n'est JAMAIS presume gratuit.
 */
export function facturesGratuites(amountMinor: number): boolean {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) return false;
  return amountMinor <= FRANCHISE_STICKER_MINOR;
}
