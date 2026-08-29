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
 * SwimPay est joint DIRECTEMENT — gratuitement, sur-le-champ, sans rail, sans
 * frais et sans delai a annoncer. Le meme envoi vers quelqu'un qui n'a pas
 * installe l'application passe par un rail : il coute, il prend du temps, et
 * il peut echouer. L'invitation n'est donc pas une politesse commerciale,
 * c'est ce qui rend l'operation certaine.
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
  /** Compte a compte, sans rail : gratuit et immediat. */
  | 'swimpay_direct'
  /** Par un rail externe : frais, delai, et risque d'echec. */
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
  /** Vrai quand l'operation ne coute rien et part sur-le-champ. */
  free: boolean;
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
 * Rien a router, rien a facturer, rien a attendre. C'est la raison d'etre de
 * la file d'installation.
 */
export function resolveReachability(r: Recipient): ReachabilityVerdict {
  if (r.stage === 'active') {
    return {
      reachability: 'swimpay_direct',
      free: true,
      immediate: true,
      missing: [],
      reason: 'compte SwimPay actif : virement direct, sans frais ni delai',
    };
  }

  const missing: MissingField[] = [];
  if (!r.destinationValue) missing.push('destination_value');
  if (!r.preferredRail) missing.push('destination_rail');

  if (missing.length > 0) {
    return {
      reachability: 'unknown',
      free: false,
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
    free: false,
    immediate: false,
    missing: [],
    reason:
      r.stage === 'invited'
        ? 'invitation envoyee, pas encore installee : on passe par le rail en attendant'
        : 'pas de compte SwimPay : on passe par le rail, avec ses frais et son delai',
  };
}

/**
 * Ce que l'installation ferait gagner, pour un montant donne.
 *
 * C'est le chiffre qui justifie l'invitation aupres du dirigeant : ce n'est
 * pas « invitez vos employes », c'est « cette invitation vous fait economiser
 * ceci, a chaque paie ».
 */
export function invitationSaving(
  r: Recipient,
  amountMinor: number,
  railCostMinor: number,
): { saves: number; alreadyFree: boolean } {
  const v = resolveReachability(r);
  if (v.free) return { saves: 0, alreadyFree: true };
  if (amountMinor <= 0 || railCostMinor < 0) {
    throw new Error('montant ou cout de rail invalide');
  }
  return { saves: railCostMinor, alreadyFree: false };
}

export interface QueueSummary {
  total: number;
  active: number;
  invited: number;
  /** Ceux qui n'ont meme pas ete invites : le travail qui reste. */
  pending: number;
  /** Ce que couterait la prochaine paie en l'etat. */
  railCostMinor: number;
  /** Ce qu'elle couterait si toute la file installait l'application. */
  fullyInstalledCostMinor: number;
}

/**
 * La file d'installation, telle que l'ecran la montre.
 *
 * Elle se synchronise : chaque installation change la route, donc le cout.
 * Le total n'est pas un indicateur decoratif — c'est l'argument.
 */
export function summarizeQueue(
  recipients: readonly Recipient[],
  railCostOf: (r: Recipient) => number,
): QueueSummary {
  let active = 0;
  let invited = 0;
  let pending = 0;
  let cout = 0;

  for (const r of recipients) {
    const v = resolveReachability(r);
    if (v.free) {
      active += 1;
      continue;
    }
    cout += railCostOf(r);
    if (r.stage === 'invited') invited += 1;
    else pending += 1;
  }

  return {
    total: recipients.length,
    active,
    invited,
    pending,
    railCostMinor: cout,
    // Tout le monde installe : plus aucun rail, donc plus aucun frais.
    fullyInstalledCostMinor: 0,
  };
}

/**
 * Le passage d'un palier a l'autre.
 *
 * On ne saute pas d'etape et on ne redescend pas : un destinataire actif le
 * reste, meme si on le reinvite par erreur. Le parcours est une cliquet.
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
