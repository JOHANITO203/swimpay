import {
  resolveReachability,
  type MissingField,
  type Recipient,
} from '../directory/recipient.js';

/**
 * L'instruction d'operation — le contrat entre le workflow et l'API.
 *
 * C'est le premier des deux outils. Au lieu de laisser l'API deviner ce que
 * l'utilisateur voulait, le workflow lui fait DECLARER, etape par etape :
 * d'ou part l'argent, vers qui, par quel rail, combien. Chaque etape ferme une
 * inconnue. Quand il n'en reste plus, l'operation est executable — et l'API
 * n'a plus qu'a l'executer, sans heuristique et sans surprise.
 *
 * L'inversion vaut la peine d'etre dite : le rapprocheur devine parce qu'il
 * recoit un paiement qu'il n'a pas prepare. Une instruction, elle, est connue
 * AVANT que l'argent bouge. Tout ce qui passe par ici n'aura jamais besoin
 * d'etre rapproche a l'aveugle.
 */

export type OperationKind = 'transfer' | 'payout' | 'topup';

/** Les etapes que le workflow impose, dans l'ordre ou l'ecran les demande. */
export type Step = 'origin' | 'recipient' | 'destination' | 'amount' | 'review';

export const STEPS: readonly Step[] = ['origin', 'recipient', 'destination', 'amount', 'review'];

export interface InstructionDraft {
  kind: OperationKind;
  /** Le compte ou le profil qui paie. */
  originAccountId?: string | undefined;
  recipient?: Recipient | undefined;
  /** Le rail choisi PAR L'UTILISATEUR. Il prime sur toute preference. */
  chosenRail?: string | undefined;
  chosenOperator?: string | undefined;
  destinationValue?: string | undefined;
  amountMinor?: number | undefined;
  /** L'utilisateur a vu les frais et le delai annonces, et il a confirme. */
  quoteAcknowledged?: boolean | undefined;
}

/** Ce qui empeche encore d'executer. */
export type Blocker =
  | 'origin_missing'
  | 'recipient_missing'
  | 'destination_missing'
  | 'rail_missing'
  | 'amount_missing'
  | 'amount_invalid'
  | 'quote_not_acknowledged';

export interface InstructionState {
  /** L'etape que l'ecran doit afficher maintenant. */
  step: Step;
  blockers: Blocker[];
  /** Vrai quand l'API peut executer sans rien deduire. */
  executable: boolean;
  /** Ce que le workflow a pu PRE-REMPLIR grace a ce qu'on sait deja. */
  prefilled: Step[];
  reason: string;
}

/**
 * Ou en est l'instruction, et ce qu'il reste a demander.
 *
 * Cette fonction est la seule autorite : l'ecran s'y refere pour savoir quoi
 * afficher, l'API pour savoir si elle peut partir. Les deux lisent la meme
 * verite, ce qui evite l'ecart classique entre ce que l'ecran croit valide et
 * ce que le serveur accepte.
 */
export function inspect(draft: InstructionDraft): InstructionState {
  const blockers: Blocker[] = [];
  const prefilled: Step[] = [];

  if (!draft.originAccountId) blockers.push('origin_missing');

  const r = draft.recipient;
  if (!r) blockers.push('recipient_missing');

  // La destination : ce que l'utilisateur a choisi prime, sinon ce que le
  // destinataire enregistre nous a deja appris.
  const valeur = draft.destinationValue ?? r?.destinationValue;
  const rail = draft.chosenRail ?? r?.preferredRail;

  let direct = false;
  if (r) {
    const v = resolveReachability(r);
    direct = v.reachability === 'swimpay_direct';
    // Un destinataire actif n'a besoin ni de valeur ni de rail : on le joint
    // en direct. C'est tout l'interet de la file d'installation.
    if (direct) prefilled.push('destination');
  }

  if (!direct) {
    if (!valeur) blockers.push('destination_missing');
    if (!rail) blockers.push('rail_missing');
  }

  if (draft.amountMinor === undefined) blockers.push('amount_missing');
  else if (!Number.isInteger(draft.amountMinor) || draft.amountMinor <= 0) {
    blockers.push('amount_invalid');
  }

  // On n'execute jamais sans que l'utilisateur ait vu ce que ca coute et
  // combien de temps ca prend. Un montant confirme a l'aveugle est un litige.
  if (!draft.quoteAcknowledged) blockers.push('quote_not_acknowledged');

  // Ce qu'on a pu remplir tout seul grace au carnet.
  if (r && r.stage !== 'ad_hoc') prefilled.push('recipient');
  if (!direct && r?.preferredRail && !draft.chosenRail) {
    if (!prefilled.includes('destination')) prefilled.push('destination');
  }

  return {
    step: nextStep(blockers),
    blockers,
    executable: blockers.length === 0,
    prefilled,
    reason: blockers.length === 0
      ? 'toutes les inconnues sont fermees'
      : `il reste ${blockers.length} chose(s) a declarer`,
  };
}

function nextStep(blockers: readonly Blocker[]): Step {
  if (blockers.includes('origin_missing')) return 'origin';
  if (blockers.includes('recipient_missing')) return 'recipient';
  if (blockers.includes('destination_missing') || blockers.includes('rail_missing')) {
    return 'destination';
  }
  if (
    blockers.includes('amount_missing') ||
    blockers.includes('amount_invalid')
  ) {
    return 'amount';
  }
  return 'review';
}

export interface ExecutableInstruction {
  kind: OperationKind;
  originAccountId: string;
  recipientId: string;
  /** Vrai : compte a compte, sans rail. Faux : le rail nomme ci-dessous. */
  direct: boolean;
  rail?: string | undefined;
  operator?: string | undefined;
  destinationValue?: string | undefined;
  amountMinor: number;
  /** La cle qui empeche le double envoi si l'ecran renvoie la demande. */
  idempotencyKey: string;
}

export class InstructionNotReadyError extends Error {
  constructor(public readonly blockers: Blocker[]) {
    super(`instruction incomplete : ${blockers.join(', ')}`);
    this.name = 'InstructionNotReadyError';
  }
}

/**
 * Scelle l'instruction pour execution.
 *
 * La cle d'idempotence est DERIVEE de ce que l'instruction contient, pas
 * tiree au hasard : deux envois identiques du meme ecran produisent la meme
 * cle, donc une seule operation. C'est le filet entre un utilisateur qui
 * double-clique et un versement en double.
 */
export function seal(
  draft: InstructionDraft,
  context: { sessionNonce: string },
): ExecutableInstruction {
  const state = inspect(draft);
  if (!state.executable) throw new InstructionNotReadyError(state.blockers);

  const r = draft.recipient!;
  const direct = resolveReachability(r).reachability === 'swimpay_direct';
  const rail = direct ? undefined : (draft.chosenRail ?? r.preferredRail);
  const operator = direct ? undefined : (draft.chosenOperator ?? r.preferredOperator);
  const valeur = direct ? undefined : (draft.destinationValue ?? r.destinationValue);

  return {
    kind: draft.kind,
    originAccountId: draft.originAccountId!,
    recipientId: r.id,
    direct,
    rail,
    operator,
    destinationValue: valeur,
    amountMinor: draft.amountMinor!,
    idempotencyKey: [
      context.sessionNonce,
      draft.kind,
      draft.originAccountId,
      r.id,
      direct ? 'direct' : `${rail}:${valeur}`,
      String(draft.amountMinor),
    ].join('|'),
  };
}

/**
 * Ce que le workflow n'a plus a demander, grace a ce qu'on a appris.
 *
 * C'est le second outil, rendu visible : au premier envoi vers quelqu'un, tout
 * est a saisir. Au deuxieme, le carnet repond. Une fois l'application
 * installee chez lui, meme la destination disparait du parcours.
 */
export function questionsAvoided(r: Recipient | undefined): MissingField[] {
  if (!r) return [];
  const v = resolveReachability(r);
  if (v.reachability === 'swimpay_direct') {
    // Plus rien a demander : ni ou, ni par quel rail.
    return ['destination_value', 'destination_rail'];
  }
  const evitees: MissingField[] = [];
  if (r.destinationValue) evitees.push('destination_value');
  if (r.preferredRail) evitees.push('destination_rail');
  return evitees;
}
