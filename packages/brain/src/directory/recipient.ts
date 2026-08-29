import type { VerifyTier } from './identity.js';

/**
 * Le destinataire, et ce qu'il coute.
 *
 * Le premier des deux outils : le workflow qu'on impose. Plutot que de deviner
 * ou joindre quelqu'un, on le fait DECLARER — et ce qui est declare une fois
 * ne se redemande plus. Un destinataire saisi devient un beneficiaire
 * enregistre, un beneficiaire invite devient un compte actif, et a chaque
 * palier l'operation suivante en sait davantage.
 *
 * Le second outil suit du premier : le determinisme. Un destinataire actif sur
 * SwimPay est joint DIRECTEMENT, sur-le-champ, sans traverser de rail. Le meme
 * envoi vers quelqu'un qui n'a pas installe l'application passe par un rail
 * externe : il prend du temps, et il peut echouer.
 *
 * CE QUE L'INSTALLATION SUPPRIME, C'EST LE COUT DU RAIL — PAS NOTRE
 * FACTURATION. Le service reste du dans les deux cas. Confondre les deux
 * ferait annoncer « gratuit » a l'utilisateur avant de lui presenter une
 * note : c'est le litige assure. On separe donc ce qui part chez l'operateur
 * de ce qui nous revient, et le devis montre les deux.
 */

/** Ou en est ce destinataire dans le parcours qu'on lui impose. */
export type RecipientStage =
  /** Saisi pour une operation, jamais enregistre. Tout est a redemander. */
  | 'ad_hoc'
  /** Enregistre au carnet : on connait son nom, son numero, son rail. */
  | 'saved'
  /** Un lien d'installation lui a ete envoye, il n'a pas encore ouvert. */
  | 'invited'
  /** Il a un compte SwimPay actif : joignable en direct. */
  | 'active';

export type Reachability =
  /** Compte a compte, sans rail externe. */
  | 'swimpay_direct'
  /** Par un rail externe : frais de rail, delai, et risque d'echec. */
  | 'rail'
  /** On ne sait pas encore ou envoyer : le workflow doit le demander. */
  | 'unknown';

export interface Recipient {
  id: string;
  displayName: string;
  stage: RecipientStage;
  /** Le rail declare par l'utilisateur pour ce destinataire, s'il l'a dit. */
  preferredRail?: string | undefined;
  preferredOperator?: string | undefined;
  /** Le numero ou compte, normalise. */
  destinationValue?: string | undefined;
  /** Ce qu'on a prouve de cet identifiant. */
  verifyTier?: VerifyTier | undefined;
  /** Nombre d'operations deja menees a bien vers lui. */
  successfulTransfers?: number | undefined;
  lastUsedAt?: Date | undefined;
  invitedAt?: Date | undefined;
  activatedAt?: Date | undefined;
}

export interface ReachabilityVerdict {
  reachability: Reachability;
  /**
   * Vrai quand AUCUN rail externe n'est traverse. Ce drapeau ne dit pas
   * « gratuit » : il dit « sans frais de rail ». Le service reste facture.
   */
  railFree: boolean;
  immediate: boolean;
  /** Ce que le workflow doit encore demander avant de pouvoir executer. */
  missing: MissingField[];
  reason: string;
}

export type MissingField =
  | 'destination_value'
  | 'destination_rail'
  | 'verification';

/**
 * Dit comment joindre ce destinataire, et ce qu'il reste a demander.
 *
 * La regle centrale : un destinataire ACTIF sur SwimPay se joint en direct.
 * Aucun rail a traverser, donc aucun frais de rail et aucun delai. C'est la
 * raison d'etre de la file d'installation.
 */
export function resolveReachability(r: Recipient): ReachabilityVerdict {
  if (r.stage === 'active') {
    return {
      reachability: 'swimpay_direct',
      railFree: true,
      immediate: true,
      missing: [],
      reason:
        'compte SwimPay actif : virement direct, sans frais de rail (le service reste facture)',
    };
  }

  const missing: MissingField[] = [];
  if (!r.destinationValue) missing.push('destination_value');
  if (!r.preferredRail) missing.push('destination_rail');

  if (missing.length > 0) {
    return {
      reachability: 'unknown',
      railFree: false,
      immediate: false,
      missing,
      reason:
        r.stage === 'ad_hoc'
          ? 'destinataire saisi sans destination : le workflow doit la demander'
          : 'beneficiaire incomplet : il manque ou envoyer',
    };
  }

  return {
    reachability: 'rail',
    railFree: false,
    immediate: false,
    missing: [],
    reason:
      r.stage === 'invited'
        ? 'invitation envoyee, pas encore installee : on passe par le rail en attendant'
        : 'pas de compte SwimPay : on passe par le rail, avec ses frais et son delai',
  };
}

/**
 * Le devis d'une operation : ce qui part chez l'operateur, et ce qui nous
 * revient. Les deux sont montres a l'utilisateur AVANT qu'il confirme.
 */
export interface Quote {
  /** Ce que le rail externe preleve. Nul en direct. */
  railFeeMinor: number;
  /** Ce que SwimPay facture. Du au service, en direct comme par rail. */
  serviceFeeMinor: number;
  totalFeeMinor: number;
  immediate: boolean;
}

export interface FeeSchedule {
  /** Le cout du rail pour cette operation, quand un rail est traverse. */
  railFeeMinor: number;
  /** Ce que SwimPay facture, quelle que soit la route. */
  serviceFeeMinor: number;
}

/** Le devis complet, selon que le destinataire est joignable en direct ou non. */
export function quoteFor(r: Recipient, schedule: FeeSchedule): Quote {
  if (schedule.railFeeMinor < 0 || schedule.serviceFeeMinor < 0) {
    throw new Error('grille de frais invalide');
  }
  const v = resolveReachability(r);
  const rail = v.railFree ? 0 : schedule.railFeeMinor;
  return {
    railFeeMinor: rail,
    serviceFeeMinor: schedule.serviceFeeMinor,
    totalFeeMinor: rail + schedule.serviceFeeMinor,
    immediate: v.immediate,
  };
}

/**
 * Ce que l'installation ferait gagner.
 *
 * L'argument a servir au dirigeant n'est pas « invitez vos employes » mais
 * « cette invitation vous economise les frais de rail, a chaque paie ». Le
 * service, lui, reste du — et le dire d'emblee vaut mieux que de le laisser
 * decouvrir sur la note.
 */
export function invitationSaving(
  r: Recipient,
  schedule: FeeSchedule,
): { savesRailFee: number; serviceStillDue: number; alreadyDirect: boolean } {
  if (schedule.railFeeMinor < 0 || schedule.serviceFeeMinor < 0) {
    throw new Error('grille de frais invalide');
  }
  const v = resolveReachability(r);
  return {
    savesRailFee: v.railFree ? 0 : schedule.railFeeMinor,
    serviceStillDue: schedule.serviceFeeMinor,
    alreadyDirect: v.railFree,
  };
}

export interface QueueSummary {
  total: number;
  active: number;
  invited: number;
  /** Ceux qui n'ont meme pas ete invites : le travail qui reste. */
  pending: number;
  /** Les frais de RAIL de la prochaine paie, en l'etat. */
  railFeeMinor: number;
  /** Les frais de service, dus quoi qu'il arrive. */
  serviceFeeMinor: number;
  /** Le total a payer aujourd'hui. */
  totalFeeMinor: number;
  /**
   * Ce que la meme paie couterait si toute la file installait l'application :
   * plus aucun frais de rail, le service demeure.
   */
  fullyInstalledFeeMinor: number;
}

/**
 * La file d'installation, telle que l'ecran la montre.
 *
 * Elle se synchronise : chaque installation change la route, donc les frais de
 * rail. Le total n'est pas un indicateur decoratif — c'est l'argument.
 */
export function summarizeQueue(
  recipients: readonly Recipient[],
  scheduleOf: (r: Recipient) => FeeSchedule,
): QueueSummary {
  let active = 0;
  let invited = 0;
  let pending = 0;
  let rail = 0;
  let service = 0;

  for (const r of recipients) {
    const v = resolveReachability(r);
    const s = scheduleOf(r);
    // Le service est du pour CHAQUE ligne de la paie, installee ou non.
    service += s.serviceFeeMinor;
    if (v.railFree) {
      active += 1;
      continue;
    }
    rail += s.railFeeMinor;
    if (r.stage === 'invited') invited += 1;
    else pending += 1;
  }

  return {
    total: recipients.length,
    active,
    invited,
    pending,
    railFeeMinor: rail,
    serviceFeeMinor: service,
    totalFeeMinor: rail + service,
    // Tout le monde installe : plus aucun rail. Le service, lui, demeure.
    fullyInstalledFeeMinor: service,
  };
}

/**
 * Le passage d'un palier a l'autre.
 *
 * On ne saute pas d'etape et on ne redescend pas : un destinataire actif le
 * reste, meme si on le reinvite par erreur. Le parcours est un cliquet.
 */
export function advanceStage(
  current: RecipientStage,
  event: 'saved' | 'invited' | 'activated',
): RecipientStage {
  if (current === 'active') return 'active';
  switch (event) {
    case 'saved':
      return current === 'ad_hoc' ? 'saved' : current;
    case 'invited':
      return 'invited';
    case 'activated':
      return 'active';
  }
}
