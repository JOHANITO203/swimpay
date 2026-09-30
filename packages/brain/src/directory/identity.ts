import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * L'Annuaire — les paliers de verification et le conflit d'identite.
 *
 * Deux decisions structurantes :
 *
 * 1. On ne cherche PAS un numero en clair. La recherche se fait par HMAC avec
 *    une cle serveur : une base qui fuit ne rend pas l'annuaire telephonique
 *    de nos utilisateurs. La valeur normalisee reste stockee pour l'affichage,
 *    mais l'index de recherche, lui, est aveugle.
 *
 * 2. Un identifiant actif appartient a UN SEUL party. Quand deux le
 *    revendiquent, l'OTP le plus recent l'emporte — parce que prouver la
 *    possession du numero est le seul signal qu'on ait — et l'ancien lien est
 *    conserve, desactive. Rien ne s'efface : une revendication est un fait,
 *    meme quand elle perd.
 */

export type VerifyTier = 'declared' | 'otp' | 'document' | 'ncc';

/** Du plus faible au plus fort. L'ordre EST la regle. */
const RANG: Record<VerifyTier, number> = {
  declared: 0,
  otp: 1,
  document: 2,
  ncc: 3,
};

export function tierRank(tier: VerifyTier): number {
  return RANG[tier];
}

/** Un palier ne redescend jamais tout seul : il se perd par revocation. */
export function isUpgrade(from: VerifyTier, to: VerifyTier): boolean {
  return RANG[to] > RANG[from];
}

/**
 * Le niveau exige par une operation.
 * Verser de l'argent demande au moins un numero prouve — sinon on verse a un
 * numero que personne n'a jamais confirme.
 */
export function meetsRequirement(tier: VerifyTier, required: VerifyTier): boolean {
  return RANG[tier] >= RANG[required];
}

/**
 * L'empreinte de recherche. HMAC-SHA256, cle serveur, sortie brute.
 * Le `kind` entre dans l'empreinte : un meme chiffre en RIB et en MSISDN ne
 * doit pas collisionner.
 */
export function identifierHash(key: Buffer | string, kind: string, valueNormalized: string): Buffer {
  /* Une cle vide ou courte rend l'empreinte devinable : celui qui connait le
     numero retrouve la ligne. Une config incomplete doit s'arreter ici, pas
     produire un index qu'on croit aveugle et qui ne l'est pas. */
  const taille = typeof key === 'string' ? Buffer.byteLength(key) : key.length;
  if (taille < 16) {
    throw new Error(`cle HMAC trop courte (${taille} octets, 16 minimum)`);
  }
  if (!valueNormalized) throw new Error('valeur vide : rien a empreindre');
  return createHmac('sha256', key).update(`${kind}:${valueNormalized}`).digest();
}

/** Comparaison a temps constant : on ne renseigne pas un attaquant par la duree. */
export function hashEquals(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface Claim {
  partyId: string;
  /** Date du dernier OTP reussi sur cet identifiant, si un OTP a eu lieu. */
  otpVerifiedAt?: Date;
  tier: VerifyTier;
}

export type ConflictResolution =
  | { kind: 'keep'; partyId: string; reason: string }
  | { kind: 'transfer'; fromPartyId: string; toPartyId: string; reason: string }
  | { kind: 'escalate'; partyIds: string[]; reason: string };

/**
 * Tranche une revendication concurrente sur le meme identifiant.
 *
 * La regle est volontairement etroite : seul un OTP plus recent transfere. Le
 * reste monte en file d'exception, ou un humain regarde. Un annuaire qui se
 * trompe de proprietaire est pire qu'un annuaire qui hesite.
 */
export function resolveConflict(current: Claim, challenger: Claim): ConflictResolution {
  if (current.partyId === challenger.partyId) {
    return { kind: 'keep', partyId: current.partyId, reason: 'meme party, rien a trancher' };
  }
  const aOtp = current.otpVerifiedAt?.getTime();
  const bOtp = challenger.otpVerifiedAt?.getTime();

  // Le challenger prouve la possession, le titulaire ne l'a jamais fait.
  if (bOtp !== undefined && aOtp === undefined) {
    return {
      kind: 'transfer',
      fromPartyId: current.partyId,
      toPartyId: challenger.partyId,
      reason: 'OTP prouve contre simple declaration',
    };
  }
  // Les deux ont prouve : le plus recent l'emporte, une puce change de mains.
  if (bOtp !== undefined && aOtp !== undefined) {
    if (bOtp > aOtp) {
      return {
        kind: 'transfer',
        fromPartyId: current.partyId,
        toPartyId: challenger.partyId,
        reason: 'OTP plus recent',
      };
    }
    return { kind: 'keep', partyId: current.partyId, reason: 'OTP du titulaire plus recent' };
  }
  // Le challenger n'a rien prouve : il ne prend rien, meme avec un dossier.
  if (bOtp === undefined && aOtp !== undefined) {
    return { kind: 'keep', partyId: current.partyId, reason: 'le challenger n a pas prouve le numero' };
  }
  // Personne n'a prouve : ce n'est pas a la machine de decider.
  return {
    kind: 'escalate',
    partyIds: [current.partyId, challenger.partyId],
    reason: 'aucune des deux parties n a prouve la possession du numero',
  };
}
