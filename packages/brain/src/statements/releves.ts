import type { IncomingPayment } from '../matcher/decide.js';

/**
 * L import de releves d operateurs — la voie d entree du Rapprocheur qui ne
 * depend d aucune API (montage du doc 16 §3.4, voie 2). Le marchand depose le
 * releve CSV que son operateur lui remet ; on en tire des paiements que
 * decideMatch consomme tels quels, plus la liste de ce qu on a refuse de lire.
 *
 * Deux partis pris, herites du reste du Cerveau :
 *
 * - Le mapping par operateur est une DONNEE (ProfilReleve), pas du code.
 *   Ajouter Orange, Wave, MTN ou Moov, c est ecrire un profil, pas toucher
 *   au parseur.
 *
 * - Une ligne illisible est REJETEE AVEC SA RAISON, jamais devinee — et ne
 *   fait jamais echouer le fichier entier. Le rapprochement travaille sur ce
 *   qui est sur ; un humain regarde les rejets. La seule faute globale est un
 *   fichier dont l en-tete ne correspond pas au profil : la, chaque ligne
 *   serait un rejet, donc c est le fichier qu on refuse, d un bloc et type.
 */

/** Le mapping d un operateur : ou lire quoi, et dans quel format. */
export interface ProfilReleve {
  /** Nom du profil, repris dans les messages : « orange-money-ci », « wave-ci »… */
  name: string;
  delimiter: ',' | ';' | '\t';
  /**
   * Noms des colonnes TELS QU ECRITS dans l en-tete du fichier. La comparaison
   * se fait sans casse ni espaces de bord : la colonne est designee par son
   * nom, jamais par sa position — c est pour ca que l en-tete est requis.
   */
  colonnes: {
    date: string;
    montant: string;
    reference?: string | undefined;
    sens?: string | undefined;
    statut?: string | undefined;
  };
  formatDate: 'iso' | 'jj/mm/aaaa' | 'jj/mm/aaaa hh:mm';
  /**
   * Valeur de la colonne sens qui designe un encaissement (« CREDIT », « C »,
   * « Reception »…). Obligatoire des que colonnes.sens est declaree : sans
   * elle, on devinerait le sens, et on ne devine pas.
   */
  valeurCredit?: string | undefined;
  /**
   * Valeur de la colonne statut qui designe une operation aboutie
   * (« SUCCESSFUL », « SUCCES »…). Obligatoire des que colonnes.statut est
   * declaree, pour la meme raison que valeurCredit.
   */
  valeurStatutReussi?: string | undefined;
}

/** Un paiement lisible, pret pour decideMatch, avec sa ligne d origine. */
export interface PaiementImporte extends IncomingPayment {
  /** Numero de ligne dans le fichier, 1-base, en-tete compris. */
  ligne: number;
}

export interface LigneRejetee {
  ligne: number;
  raison: string;
  /** La ligne telle quelle, pour que l humain juge sur piece. */
  brut: string;
}

export type ResultatImport =
  | {
      kind: 'ok';
      paiements: readonly PaiementImporte[];
      rejets: readonly LigneRejetee[];
      /** paiements + rejets. Les lignes vides et les ignorees n y sont pas. */
      total: number;
      /**
       * Debits et statuts non aboutis : lisibles mais pas consommables — le
       * Rapprocheur ne travaille que sur les encaissements reussis. Comptees
       * pour l audit, pas detaillees : ce ne sont pas des erreurs.
       */
      ignorees: number;
    }
  | {
      /**
       * L en-tete attendu par le profil n est pas dans le fichier : mauvais
       * fichier ou mauvais profil. On refuse d un bloc plutot que de produire
       * un rejet par ligne — le probleme est global, le signal doit l etre.
       */
      kind: 'entete_invalide';
      raison: string;
      colonnesManquantes: readonly string[];
    }
  | {
      /** Le profil lui-meme est incoherent : c est une donnee, on la verifie. */
      kind: 'profil_invalide';
      raison: string;
    };

/** Noms de colonnes et valeurs d enumeration se comparent sans casse. */
function normalise(valeur: string): string {
  return valeur.trim().toLowerCase();
}

type LectureChamps = { ok: true; champs: string[] } | { ok: false; raison: string };

/**
 * Decoupe une ligne en champs. Un champ ouvert par un guillemet peut contenir
 * le delimiteur ; deux guillemets consecutifs y valent un guillemet litteral.
 * Un guillemet jamais referme rend la ligne illisible — on ne complete pas.
 */
function decoupe(ligne: string, delimiteur: string): LectureChamps {
  const champs: string[] = [];
  let courant = '';
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]!;
    if (entreGuillemets) {
      if (c === '"') {
        if (ligne[i + 1] === '"') {
          courant += '"';
          i++;
        } else {
          entreGuillemets = false;
        }
      } else {
        courant += c;
      }
    } else if (c === '"' && courant.trim() === '') {
      // Guillemet ouvrant seulement en tete de champ ; ailleurs il est litteral.
      courant = '';
      entreGuillemets = true;
    } else if (c === delimiteur) {
      champs.push(courant.trim());
      courant = '';
    } else {
      courant += c;
    }
  }
  if (entreGuillemets) return { ok: false, raison: 'guillemet ouvert jamais referme' };
  champs.push(courant.trim());
  return { ok: true, champs };
}

type LectureMontant =
  | { ok: true; valeurMinor: number; negatif: boolean }
  | { ok: false; raison: string };

/**
 * Lit un montant XOF entier. Les separateurs de milliers (espace, insecable)
 * et un suffixe monetaire (FCFA, XOF, F) sont tolere s ; une virgule ou un
 * point ne le sont PAS : le franc CFA n a pas de centime, des decimales
 * signalent un mauvais mapping, pas un montant.
 */
function litMontant(brut: string): LectureMontant {
  let v = brut.trim();
  if (v === '') return { ok: false, raison: 'montant vide' };
  v = v.replace(/\s*(?:F\s?CFA|FCFA|CFA|XOF|F)\s*$/i, '');
  if (/[.,]/.test(v)) {
    return {
      ok: false,
      raison: `montant "${brut}" : virgule ou point interdit, le XOF n a pas de centime`,
    };
  }
  let negatif = false;
  if (v.startsWith('-')) {
    negatif = true;
    v = v.slice(1);
  } else if (v.startsWith('+')) {
    v = v.slice(1);
  }
  v = v.trim();
  const compact = v.replace(/\s/g, '');
  if (!/^\d+$/.test(compact)) return { ok: false, raison: `montant illisible "${brut}"` };
  // Des espaces internes ne sont admis qu en separateurs de milliers, par
  // groupes de trois. Ecraser tous les espaces lirait « 1500 2000 » (deux
  // nombres accoles : colonnes fusionnees ou decalees) comme 15002000 —
  // un montant invente.
  if (/\s/.test(v) && !/^\d{1,3}(?:\s\d{3})+$/.test(v)) {
    return {
      ok: false,
      raison: `montant "${brut}" : espaces qui ne sont pas un groupement de milliers`,
    };
  }
  const valeurMinor = Number(compact);
  if (!Number.isSafeInteger(valeurMinor)) {
    return { ok: false, raison: `montant hors bornes "${brut}"` };
  }
  return { ok: true, valeurMinor, negatif };
}

/**
 * Construit une date UTC et refuse ce que le calendrier refuse (31/02…).
 * Abidjan vit en GMT toute l annee : lire l heure du releve comme UTC est
 * exact, et rend le parseur independant du fuseau de la machine qui tourne.
 */
function dateUtc(
  annee: number,
  mois: number,
  jour: number,
  heure: number,
  minute: number,
  seconde: number,
  ms: number,
): Date | undefined {
  if (heure > 23 || minute > 59 || seconde > 59) return undefined;
  const d = new Date(Date.UTC(annee, mois - 1, jour, heure, minute, seconde, ms));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) {
    return undefined;
  }
  return d;
}

// La fraction n est admise qu apres les secondes : « 09:15.5 » est une
// fraction de minute ISO (15 min 30 s), la lire comme 500 ms serait deviner.
const RE_ISO =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const RE_JMA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const RE_JMA_HM = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;

function litDate(brut: string, format: ProfilReleve['formatDate']): Date | undefined {
  const v = brut.trim();
  if (format === 'iso') {
    const m = RE_ISO.exec(v);
    if (!m) return undefined;
    const frac = m[7];
    const base = dateUtc(
      Number(m[1]!),
      Number(m[2]!),
      Number(m[3]!),
      Number(m[4] ?? '0'),
      Number(m[5] ?? '0'),
      Number(m[6] ?? '0'),
      frac === undefined ? 0 : Number(frac.padEnd(3, '0')),
    );
    if (base === undefined) return undefined;
    const tz = m[8];
    if (tz === undefined || tz === 'Z') return base;
    const tzHeures = Number(tz.slice(1, 3));
    const tzMinutes = Number(tz.slice(4, 6));
    // Aucun fuseau reel au-dela de ±14:00, aucune minute au-dela de 59 : un
    // decalage impossible est une donnee fausse, pas une conversion a faire.
    if (tzHeures > 14 || tzMinutes > 59) return undefined;
    const signe = tz.startsWith('-') ? -1 : 1;
    const decalageMs = signe * (tzHeures * 60 + tzMinutes) * 60_000;
    return new Date(base.getTime() - decalageMs);
  }
  const m = (format === 'jj/mm/aaaa' ? RE_JMA : RE_JMA_HM).exec(v);
  if (!m) return undefined;
  return dateUtc(Number(m[3]!), Number(m[2]!), Number(m[1]!), Number(m[4] ?? '0'), Number(m[5] ?? '0'), 0, 0);
}

/** Une colonne resolue : son nom declare et sa position dans l en-tete. */
interface ColonneResolue {
  nom: string;
  idx: number;
}

interface IndexColonnes {
  date: ColonneResolue;
  montant: ColonneResolue;
  reference?: ColonneResolue | undefined;
  sens?: ColonneResolue | undefined;
  statut?: ColonneResolue | undefined;
}

type LectureColonnes =
  | { ok: true; colonnes: IndexColonnes }
  | { ok: false; manquantes: string[]; doublons: string[] };

function resoudColonnes(entete: readonly string[], profil: ProfilReleve): LectureColonnes {
  const noms = entete.map(normalise);
  const manquantes: string[] = [];
  const doublons: string[] = [];
  const resoud = (nom: string | undefined): ColonneResolue | undefined => {
    if (nom === undefined) return undefined;
    const cible = normalise(nom);
    const premiere = noms.indexOf(cible);
    if (premiere === -1) {
      manquantes.push(nom);
      return undefined;
    }
    if (noms.indexOf(cible, premiere + 1) !== -1) {
      // Deux colonnes du meme nom : choisir l une serait deviner.
      doublons.push(nom);
      return undefined;
    }
    return { nom, idx: premiere };
  };
  const date = resoud(profil.colonnes.date);
  const montant = resoud(profil.colonnes.montant);
  const reference = resoud(profil.colonnes.reference);
  const sens = resoud(profil.colonnes.sens);
  const statut = resoud(profil.colonnes.statut);
  if (manquantes.length > 0 || doublons.length > 0 || date === undefined || montant === undefined) {
    return { ok: false, manquantes, doublons };
  }
  return { ok: true, colonnes: { date, montant, reference, sens, statut } };
}

/**
 * Parse un releve complet. Pure : du texte entre, des valeurs sortent, aucun
 * acces fichier ni reseau, aucune exception pour une donnee sale.
 *
 * Ce qui sort en paiement est TOUJOURS un encaissement reussi (operation
 * payin, statut succeeded) : c est la seule chose que le Rapprocheur consomme.
 * Un debit — signe negatif ou colonne sens — est ignore et compte, pas rejete :
 * c est une ligne saine qui ne nous concerne pas. L asymetrie est voulue : on
 * prefere manquer un encaissement (la vente finira en file d exception, un
 * humain la verra) plutot qu en inventer un.
 */
export function parseReleve(contenu: string, profil: ProfilReleve): ResultatImport {
  // Le profil est une donnee : on la verifie comme une donnee.
  if (profil.colonnes.sens !== undefined) {
    if (profil.valeurCredit === undefined) {
      return {
        kind: 'profil_invalide',
        raison: `profil ${profil.name} : colonne sens declaree sans valeurCredit`,
      };
    }
    if (normalise(profil.valeurCredit) === '') {
      // Une valeurCredit blanche ne matcherait jamais : chaque ligne finirait
      // ignoree, zero paiement sans aucune erreur visible.
      return {
        kind: 'profil_invalide',
        raison: `profil ${profil.name} : valeurCredit vide`,
      };
    }
  }
  if (profil.colonnes.statut !== undefined) {
    if (profil.valeurStatutReussi === undefined) {
      return {
        kind: 'profil_invalide',
        raison: `profil ${profil.name} : colonne statut declaree sans valeurStatutReussi`,
      };
    }
    if (normalise(profil.valeurStatutReussi) === '') {
      return {
        kind: 'profil_invalide',
        raison: `profil ${profil.name} : valeurStatutReussi vide`,
      };
    }
  }

  const declarees = [
    profil.colonnes.date,
    profil.colonnes.montant,
    profil.colonnes.reference,
    profil.colonnes.sens,
    profil.colonnes.statut,
  ].filter((n): n is string => n !== undefined);

  // Un nom de colonne blanc s accrocherait a un champ d en-tete vide (un
  // delimiteur final en cree un) : mapping fantome. Deux roles sur le meme
  // nom liraient le meme champ. Les deux sont des incoherences du profil.
  const nomsDeclares = declarees.map(normalise);
  if (nomsDeclares.some((n) => n === '')) {
    return {
      kind: 'profil_invalide',
      raison: `profil ${profil.name} : nom de colonne vide`,
    };
  }
  if (new Set(nomsDeclares).size !== nomsDeclares.length) {
    return {
      kind: 'profil_invalide',
      raison: `profil ${profil.name} : deux roles declares sur le meme nom de colonne`,
    };
  }

  // Les exports Windows commencent souvent par un BOM UTF-8 : sans ce retrait,
  // le nom de la premiere colonne ne matcherait jamais.
  const sansBom = contenu.charCodeAt(0) === 0xfeff ? contenu.slice(1) : contenu;
  const lignes = sansBom.split(/\r\n|\n|\r/);

  let idxEntete = 0;
  while (idxEntete < lignes.length && lignes[idxEntete]!.trim() === '') idxEntete++;
  if (idxEntete >= lignes.length) {
    return {
      kind: 'entete_invalide',
      raison: `fichier vide : aucun en-tete pour le profil ${profil.name}`,
      colonnesManquantes: declarees,
    };
  }

  const enteteLue = decoupe(lignes[idxEntete]!, profil.delimiter);
  if (!enteteLue.ok) {
    return {
      kind: 'entete_invalide',
      raison: `en-tete illisible : ${enteteLue.raison}`,
      colonnesManquantes: declarees,
    };
  }

  const resolues = resoudColonnes(enteteLue.champs, profil);
  if (!resolues.ok) {
    const morceaux: string[] = [];
    if (resolues.manquantes.length > 0) {
      morceaux.push(`colonnes absentes : ${resolues.manquantes.join(', ')}`);
    }
    if (resolues.doublons.length > 0) {
      morceaux.push(`colonnes en double : ${resolues.doublons.join(', ')}`);
    }
    return {
      kind: 'entete_invalide',
      raison: `en-tete ne correspond pas au profil ${profil.name} — ${morceaux.join(' ; ')}`,
      colonnesManquantes: resolues.manquantes,
    };
  }
  const colonnes = resolues.colonnes;
  const largeurEntete = enteteLue.champs.length;

  const paiements: PaiementImporte[] = [];
  const rejets: LigneRejetee[] = [];
  let ignorees = 0;

  for (let i = idxEntete + 1; i < lignes.length; i++) {
    const brut = lignes[i]!;
    const numero = i + 1; // 1-base, en-tete compris : le numero que l humain voit.
    if (brut.trim() === '') continue; // les lignes vides ne sont ni des donnees ni des erreurs

    const rejette = (raison: string): void => {
      rejets.push({ ligne: numero, raison, brut });
    };

    const lue = decoupe(brut, profil.delimiter);
    if (!lue.ok) {
      rejette(lue.raison);
      continue;
    }
    const champs = lue.champs;

    // Plus de champs que l en-tete = un delimiteur non guillemete quelque
    // part : les colonnes sont decalees, et un montant decale peut rester
    // plausible (« 12,500 » lu 12). On rejette, on ne devine pas laquelle
    // des colonnes a glisse.
    if (champs.length > largeurEntete) {
      rejette(
        `ligne malformee : ${champs.length} champs pour ${largeurEntete} colonnes d en-tete — un delimiteur non guillemete decale les colonnes`,
      );
      continue;
    }

    // Chaque colonne declaree doit exister sur la ligne : une ligne trop
    // courte est malformee, on ne complete pas par du vide.
    const tropCourte = [colonnes.date, colonnes.montant, colonnes.reference, colonnes.sens, colonnes.statut]
      .filter((c): c is ColonneResolue => c !== undefined)
      .find((c) => c.idx >= champs.length);
    if (tropCourte !== undefined) {
      rejette(
        `ligne incomplete : ${champs.length} champs, colonne "${tropCourte.nom}" attendue en position ${tropCourte.idx + 1}`,
      );
      continue;
    }

    // Statut d abord : une operation non aboutie n est pas un encaissement,
    // quel que soit le reste de la ligne.
    if (colonnes.statut !== undefined) {
      const champStatut = champs[colonnes.statut.idx]!;
      if (champStatut === '') {
        rejette('statut vide : impossible de dire si l operation a abouti');
        continue;
      }
      if (normalise(champStatut) !== normalise(profil.valeurStatutReussi!)) {
        ignorees++;
        continue;
      }
    }

    const montant = litMontant(champs[colonnes.montant.idx]!);
    if (!montant.ok) {
      rejette(montant.raison);
      continue;
    }

    if (colonnes.sens !== undefined) {
      const champSens = champs[colonnes.sens.idx]!;
      if (champSens === '') {
        rejette('sens vide : ni credit ni debit identifiable');
        continue;
      }
      if (normalise(champSens) !== normalise(profil.valeurCredit!)) {
        ignorees++; // decaissement : sain, mais pas pour le Rapprocheur
        continue;
      }
      if (montant.negatif) {
        rejette(`montant negatif "${champs[colonnes.montant.idx]!}" pour un sens credit : contradiction`);
        continue;
      }
    } else if (montant.negatif) {
      ignorees++; // sans colonne sens, le signe porte le sens
      continue;
    }

    if (montant.valeurMinor === 0) {
      rejette('montant nul : un encaissement de zero franc est un mauvais mapping');
      continue;
    }

    const champDate = champs[colonnes.date.idx]!;
    const occurredAt = litDate(champDate, profil.formatDate);
    if (occurredAt === undefined) {
      rejette(`date illisible "${champDate}" pour le format ${profil.formatDate}`);
      continue;
    }

    let reference: string | undefined;
    if (colonnes.reference !== undefined) {
      const champRef = champs[colonnes.reference.idx]!;
      reference = champRef === '' ? undefined : champRef;
    }

    paiements.push({
      ligne: numero,
      amountMinor: montant.valeurMinor,
      reference,
      occurredAt,
      status: 'succeeded',
      operation: 'payin',
    });
  }

  return {
    kind: 'ok',
    paiements,
    rejets,
    total: paiements.length + rejets.length,
    ignorees,
  };
}
