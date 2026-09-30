/**
 * Le contrat que tout rail doit tenir.
 *
 * Un « rail » est un moyen d'encaisser ou de verser : PayDunya aujourd'hui,
 * un distributeur demain, le rail simule pour les tests. Le Cerveau ne connait
 * QUE cette interface — c'est ce qui permet de changer de fournisseur sans
 * toucher au rapprocheur ni au moteur de factures.
 *
 * Deux regles non negociables, apprises avant d'ecrire une ligne :
 *   1. toute operation porte une cle d'idempotence. Un reseau qui coupe ne doit
 *      jamais produire deux versements ;
 *   2. le payload brut du fournisseur est enregistre AVANT d'etre interprete.
 *      Sans lui on ne peut ni rejouer, ni prouver ce qu'on a recu.
 */

/** Montants : entiers XOF. Jamais de flottant sur de l'argent. */
export type AmountMinor = number;

export type RailOperation = 'payin' | 'payout';

export type RailStatus = 'pending' | 'succeeded' | 'failed' | 'expired';

/** Un moyen de joindre ou de payer quelqu'un. */
export interface Identifier {
  kind: 'msisdn' | 'rib' | 'ncc' | 'email' | 'djamo';
  value: string;
  /** orange-money-ci, wave-ci, mtn-ci, moov-ci, djamo-ci… */
  operator?: string | undefined;
}

export interface RailCapabilities {
  payin: boolean;
  payout: boolean;
  operators: string[];
}

export interface CreatePayinRequest {
  amountMinor: AmountMinor;
  /** La reference que le payeur portera : c'est elle qui fait le match a 100. */
  reference: string;
  payerHint?: { operator?: string | undefined; msisdn?: string | undefined } | undefined;
  idempotencyKey: string;
  description?: string | undefined;
}

export interface CreatePayinResult {
  railRef: string;
  checkoutUrl?: string | undefined;
}

export interface CreatePayoutRequest {
  amountMinor: AmountMinor;
  destination: Identifier;
  idempotencyKey: string;
  reference?: string | undefined;
}

export interface CreatePayoutResult {
  railRef: string;
}

/**
 * Un evenement de rail, une fois normalise. Le brut reste en base ; ceci est
 * ce que le rapprocheur consomme.
 */
export interface NormalizedRailEvent {
  rail: string;
  operation: RailOperation;
  railRef: string;
  status: RailStatus;
  amountMinor: AmountMinor;
  /** La reference portee par le paiement, si le rail la restitue. */
  reference?: string | undefined;
  payerMsisdn?: string | undefined;
  operator?: string | undefined;
  occurredAt: Date;
  /** Ce qui distingue deux livraisons du meme evenement. */
  dedupeKey: string;
}

export interface WebhookVerdict {
  valid: boolean;
  event?: NormalizedRailEvent | undefined;
  reason?: string | undefined;
}

export interface RailAdapter {
  readonly name: string;
  capabilities(): RailCapabilities;
  createPayin(req: CreatePayinRequest): Promise<CreatePayinResult>;
  createPayout(req: CreatePayoutRequest): Promise<CreatePayoutResult>;
  getStatus(railRef: string): Promise<RailStatus>;
  verifyWebhook(headers: unknown, body: unknown): WebhookVerdict;
}

/**
 * Un rail peut refuser proprement. Ce n'est pas un bug : c'est le cas nominal
 * quand le fournisseur est indisponible, et cela doit tomber en file
 * d'exception, pas exploser dans l'appelant.
 */
export class RailUnavailableError extends Error {
  constructor(
    public readonly rail: string,
    message: string,
  ) {
    super(message);
    this.name = 'RailUnavailableError';
  }
}

/** Le rail a repondu, mais la demande etait invalide. Ne pas rejouer. */
export class RailRejectedError extends Error {
  constructor(
    public readonly rail: string,
    message: string,
  ) {
    super(message);
    this.name = 'RailRejectedError';
  }
}
