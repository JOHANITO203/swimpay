/**
 * Le Moteur de factures — LE CONTRAT DU BRAS DGI.
 *
 * Ce fichier ne parle pas au reseau. Il pose le contrat que devra tenir
 * l'implementation HTTP, et surtout les invariants qu'elle n'a pas le droit de
 * contourner.
 *
 * Trois faits, tires de la procedure officielle de mai 2025
 * (docs/pivot/assets/FNE-procedureapi-mai-2025.pdf), commandent tout le reste :
 *
 *   1. L'API n'offre AUCUNE idempotence : ni en-tete `Idempotency-Key`, ni
 *      identifiant client accepte, ni deduplication documentee. Deux POST
 *      identiques = deux factures certifiees, deux numeros officiels dans la
 *      serie annuelle du marchand, deux stickers brules.
 *   2. L'API n'offre AUCUNE lecture : trois POST (`/sign`, `/sign`,
 *      `/{id}/refund`) et zero GET. Apres un timeout, aucune machine ne peut
 *      dire si la facture existe. Seul un humain, dans l'espace FNE, le peut.
 *   3. La seule primitive de correction est l'avoir, et il ne porte QUE sur des
 *      couples (id d'article DGI, quantite). Ces ids ne se lisent QUE dans la
 *      reponse de certification. Ne pas les persister, c'est rendre la facture
 *      definitivement incorrigible.
 *
 * D'ou l'invariant central du module, celui qui justifie chaque type ci-dessous :
 *
 *   AUCUN OCTET NE PART VERS LA DGI SANS QU'UNE LIGNE `core.fne_attempt` SOIT
 *   COMMITEE. AUCUNE DEUXIEME TENTATIVE SANS QU'UN HUMAIN AIT CLOS LA PREMIERE.
 *
 * Ce qui est marque « inconnu » ci-dessous l'est vraiment : ce n'est ni dans le
 * PDF ni dans le repo, et on ne le devine pas. Les questions correspondantes
 * partent a support.fne@dgi.gouv.ci.
 */

import type { InvoiceTemplate, PaymentMethod } from './dgi-payload.js';
import type { InvoiceTotals, TaxCode } from './totals.js';

// ─────────────────────────────────────────────────────────────────────────
// 1. L'environnement et l'identite du marchand
// ─────────────────────────────────────────────────────────────────────────

/**
 * La DGI expose deux environnements. Celui de test est en HTTP CLAIR sur une IP
 * brute (`http://54.247.95.108/ws`, PDF p.6) : y pousser un vrai NCC, un vrai
 * telephone ou un vrai e-mail est une fuite de donnees personnelles.
 * L'environnement n'est donc pas un detail de configuration, c'est un champ du
 * modele, verifie avant chaque envoi.
 */
export type FneEnvironment = 'test' | 'prod';

/** Les hotes reconnus comme environnement de test. Liste dure, volontairement. */
export const FNE_TEST_HOSTS: readonly string[] = ['54.247.95.108'];

/**
 * La cle API est PAR NCC (PDF p.6 : « cette valeur n'est visible que par le
 * gestionnaire principal »). Elle ne transite jamais dans nos structures : on ne
 * manipule qu'une reference vers le coffre et une empreinte, pour pouvoir dire
 * « la cle a change » sans jamais l'ecrire.
 */
export interface FneCredentialRef {
  readonly merchantPartyId: string;
  /** Le NCC du marchand emetteur : c'est lui qui prefixe la reference DGI. */
  readonly ncc: string;
  readonly environment: FneEnvironment;
  /** L'URL de production est transmise par mail apres validation : elle vit en base. */
  readonly baseUrl: string;
  /** Reference vers le coffre a secrets. JAMAIS la cle elle-meme. */
  readonly apiKeyRef: string;
  /** Empreinte de la cle, pour detecter une rotation sans jamais la divulguer. */
  readonly apiKeyFingerprint: string;
  readonly state: FneCredentialState;
}

/**
 * Un 401 ne se rejoue jamais : une mauvaise cle ne devient pas bonne. Il gele la
 * file du marchand entier, pas seulement la facture en cours.
 */
export type FneCredentialState = 'pending' | 'active' | 'blocked' | 'revoked';

// ─────────────────────────────────────────────────────────────────────────
// 2. La machine a etats d'une facture
// ─────────────────────────────────────────────────────────────────────────

/**
 * L'etat de CERTIFICATION d'un document (vente, bordereau d'achat, ou avoir —
 * l'avoir est un document a part entiere, avec son propre cycle).
 *
 * Le point de bascule n'est pas la reponse HTTP : c'est l'ENVOI. Tout ce qui
 * doit survivre a un crash s'ecrit avant l'ouverture du socket.
 */
export type FneState =
  /** En composition. Aucun numero, aucune obligation, modifiable. */
  | 'draft'
  /** Notre validateur est passe. Le numero LOCAL est alloue ici, pas avant. */
  | 'validated_local'
  /** Admise en file. Le verrou single-flight est pris sur l'id de facture. */
  | 'queued'
  /** `core.fne_attempt` est COMMITE. Un POST a pu partir. Etat le plus dangereux. */
  | 'submitted'
  /** 200 (ou 201 pour l'avoir) avec `reference` ET `token`. Irreversible. */
  | 'accepted'
  /** 400 : la DGI a repondu qu'elle n'a rien fait. Correction, puis nouvelle tentative. */
  | 'rejected'
  /** Le doute : la requete est partie, la reponse manque. Sortie HUMAINE seulement. */
  | 'uncertain'
  /** La requete n'est PROUVABLEMENT jamais partie. Seul cas de rejeu automatique. */
  | 'unreachable'
  /** 401, cle revoquee, ou stock de stickers epuise. Toute la file du marchand gele. */
  | 'blocked'
  /** Un document ecarte. Nouvel enregistrement, jamais une suppression. */
  | 'abandoned';

/**
 * Les transitions autorisees. Ce qui n'est pas ici est un bug, pas un cas
 * limite : la base le refuse aussi (039, trigger `invoice_fne_status_fsm`).
 *
 * A lire avec la regle qui compte : depuis `submitted`, on ne revient pas en
 * arriere. Il n'existe que cinq sorties, et une seule est bonne.
 */
export const FNE_TRANSITIONS: Readonly<Record<FneState, readonly FneState[]>> = {
  draft: ['validated_local', 'abandoned'],
  // Tant que rien n'est parti, corriger est gratuit.
  validated_local: ['queued', 'draft', 'abandoned'],
  queued: ['submitted', 'validated_local', 'abandoned'],
  // Les cinq sorties. Aucune autre.
  submitted: ['accepted', 'rejected', 'uncertain', 'unreachable', 'blocked'],
  // Terminal cote certification. Ce qui suit (rendu, remise, avoir) est ADDITIF.
  accepted: [],
  rejected: ['validated_local', 'abandoned'],
  // JAMAIS de sortie automatique. Un humain, dans l'espace FNE, ou rien.
  uncertain: ['accepted', 'validated_local', 'abandoned'],
  // Le seul rejeu automatique legitime de tout le module.
  unreachable: ['queued', 'abandoned'],
  blocked: ['queued', 'abandoned'],
  abandoned: [],
};

export const FNE_TERMINAL_STATES: readonly FneState[] = ['accepted', 'abandoned'];

/** Etats depuis lesquels un octet a pu partir : le rejeu y est interdit. */
export const FNE_STATES_AFTER_SEND: readonly FneState[] = [
  'submitted',
  'accepted',
  'rejected',
  'uncertain',
];

export function canTransition(from: FneState, to: FneState): boolean {
  return FNE_TRANSITIONS[from].includes(to);
}

export function isTerminal(state: FneState): boolean {
  return FNE_TERMINAL_STATES.includes(state);
}

/**
 * L'opposabilite ne s'acquiert pas a la certification. Le PDF (I- CONTEXTE)
 * exige une signature electronique EN TROIS ELEMENTS : le QR code, le visuel
 * FNE, et le format de la numerotation. Une facture certifiee mais non rendue
 * avec ces trois elements n'est pas une facture normalisee dans la main du
 * client. Cet axe est ADDITIF a `FneState`, il ne s'y substitue pas.
 */
export type FneDocState = 'none' | 'rendered' | 'delivered';

/**
 * Comment une facture est sortie du doute. Aucune de ces valeurs ne peut etre
 * posee par un automate : chacune porte un acteur humain et sa preuve.
 */
export type FneUncertaintyResolution =
  /** Trouvee dans l'espace FNE : on saisit reference, id de facture, ids d'articles. */
  | 'found_certified'
  /** Absente de l'espace FNE : rien n'a ete certifie, une nouvelle tentative est permise. */
  | 'found_absent'
  /** Doublon constate et neutralise par un avoir integral. */
  | 'duplicate_neutralized'
  /** On renonce a ce document. Il reste, marque abandonne. */
  | 'abandoned';

// ─────────────────────────────────────────────────────────────────────────
// 3. Le corps de requete, dans ses trois formes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Une taxe specifique (GRA, AIRSI, DTD…).
 *
 * ATTENTION — le PDF p.8 decrit `amount` comme « Taux de L'autre taxe » et les
 * exemples envoient 5 (GRA), 2 (AIRSI), 5 (DTD) : ce sont des POURCENTAGES, pas
 * des francs. `totals.ts` les additionne aujourd'hui comme des montants — une
 * GRA a 5 % sur 486 000 F y vaut 5 F.
 *
 * La BASE du taux (PU HT ? HT apres remise de ligne ? apres remise globale ?) et
 * l'ordre d'arrondi sont INCONNUS. Tant que la DGI n'a pas repondu (questions 1
 * et 2), l'emission d'une facture portant des taxes specifiques est REFUSEE par
 * le validateur : voir `DGI_V_CUSTOM_TAX_UNRESOLVED`.
 */
export interface DgiCustomTax {
  readonly name: string;
  /** Taux en pourcentage, tel que la DGI l'attend (`5` = 5 %). */
  readonly ratePercent: number;
}

/** Un article, tel que la DGI l'attend. Montants en entiers XOF. */
export interface DgiItemBody {
  /**
   * Reference d'article. Facultative pour la DGI (p.8, N) — OBLIGATOIRE chez
   * nous, et unique dans la facture : c'est la seule facon deterministe de
   * rattacher un `invoice.items[].id` rendu par la DGI a notre ligne, donc la
   * seule facon de pouvoir emettre un avoir partiel plus tard.
   */
  readonly reference: string;
  readonly description: string;
  readonly quantity: number;
  /** Prix unitaire HORS TAXE, entier XOF. */
  readonly amount: number;
  /** Le PDF envoie un tableau ; l'annexe type un `string` a 4 valeurs. */
  readonly taxes: readonly [TaxCode];
  readonly customTaxes?: readonly DgiCustomTax[] | undefined;
  /** Remise d'article, en pourcentage entier. */
  readonly discount?: number | undefined;
  readonly measurementUnit?: string | undefined;
}

/** Le tronc commun des trois formes. */
interface DgiBodyBase {
  readonly paymentMethod: PaymentMethod;
  readonly template: InvoiceTemplate;
  readonly isRne: boolean;
  readonly rne?: string | undefined;
  readonly clientCompanyName: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly clientSellerName?: string | undefined;
  readonly pointOfSale: string;
  readonly establishment: string;
  readonly commercialMessage?: string | undefined;
  readonly footer?: string | undefined;
  readonly items: readonly DgiItemBody[];
  /** Remise sur le total HT, en pourcentage entier. */
  readonly discount?: number | undefined;
}

/**
 * API #1 — Certification de facture de VENTE.
 * `POST $url/external/invoices/sign`, reponse 200.
 */
export interface DgiSaleBody extends DgiBodyBase {
  readonly invoiceType: 'sale';
  /** Obligatoire si `template` vaut B2B (PDF p.8). */
  readonly clientNcc?: string | undefined;
  /**
   * Code ISO ou libelle ? L'annexe 1 (p.24) liste les codes (« EUR : Euro »), la
   * reponse d'exemple (p.11) renvoie « Euro ». INCONNU — question 5.
   */
  readonly foreignCurrency?: string | undefined;
  /**
   * PDF p.8 : « O si foreignCurrency n'est pas vide, 0 si foreignCurrency est
   * null ». Decimales acceptees ou non : INCONNU (question 6).
   */
  readonly foreignCurrencyRate?: number | undefined;
  /**
   * L'exemple de requete p.10 porte un `customTaxes` A LA RACINE (DTD) que le
   * tableau des parametres ne liste pas. Modelise pour ne pas perdre la taxe,
   * mais REFUSE a l'emission tant que la question 2 est sans reponse.
   */
  readonly customTaxes?: readonly DgiCustomTax[] | undefined;
}

/**
 * API #3 — Certification du BORDEREAU D'ACHAT de produits agricoles.
 * Meme endpoint, corps different, et trois pieges :
 *   * le tableau du bordereau (p.15) ne comporte PAS `clientNcc`, et l'exemple
 *     officiel envoie `"template":"B2B"` SANS NCC. Notre validateur actuel
 *     refuse donc l'exemple de la DGI ;
 *   * les articles d'un bordereau n'ont NI `taxes` NI `customTaxes` (p.16 et
 *     p.18) : coller de la TVA sur un achat de cacao au producteur serait une
 *     TVA indue sur un document opposable ;
 *   * `clientCompanyName` y designe le FOURNISSEUR, pas un client.
 */
export interface DgiPurchaseSlipBody {
  readonly invoiceType: 'purchase';
  readonly paymentMethod: PaymentMethod;
  readonly template: InvoiceTemplate;
  readonly isRne: boolean;
  readonly rne?: string | undefined;
  /** Le FOURNISSEUR (le producteur agricole). */
  readonly clientCompanyName: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly clientSellerName?: string | undefined;
  readonly pointOfSale: string;
  readonly establishment: string;
  readonly commercialMessage?: string | undefined;
  readonly footer?: string | undefined;
  /** Sans `taxes`, sans `customTaxes`. Le type l'interdit, pas seulement le code. */
  readonly items: readonly DgiPurchaseSlipItem[];
  readonly discount?: number | undefined;
}

export interface DgiPurchaseSlipItem {
  readonly reference: string;
  readonly description: string;
  readonly quantity: number;
  readonly amount: number;
  readonly discount?: number | undefined;
  readonly measurementUnit?: string | undefined;
}

/**
 * API #2 — Certification de facture d'AVOIR.
 * `POST $url/external/invoices/{id}/refund`, reponse 201.
 *
 * `dgiInvoiceId` et `items[].id` ne viennent QUE de la reponse de certification
 * d'origine. Sans eux, l'avoir est impossible — pour toujours.
 */
export interface DgiRefundBody {
  readonly items: readonly { readonly id: string; readonly quantity: number }[];
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Le billet de tentative : la preuve qu'un POST a pu partir
// ─────────────────────────────────────────────────────────────────────────

/**
 * L'adapter REFUSE d'envoyer sans ce billet. Il n'est delivre que par le
 * `FneAttemptStore`, apres COMMIT d'une ligne `core.fne_attempt`.
 *
 * C'est la seule chose qui distingue « la facture n'est jamais partie » de « on
 * ne sait pas ». Sans elle, un crash entre l'envoi et la reponse est
 * indetectable, et la reprise produit un doublon officiel.
 */
export interface FneAttemptTicket {
  readonly attemptId: string;
  readonly invoiceId: string;
  /** Unique avec `invoiceId`. Une deuxieme tentative exige une resolution humaine. */
  readonly attemptNo: number;
  readonly endpoint: FneEndpoint;
  /** Empreinte du corps exact qui va partir : elle prouve ce qui a ete envoye. */
  readonly requestHash: string;
  readonly baseUrl: string;
  readonly environment: FneEnvironment;
  readonly committedAt: Date;
}

export type FneEndpoint = 'sign' | 'refund';

/**
 * Le port de persistance des tentatives. L'implementation ecrit en base et
 * COMMITE avant de rendre la main : c'est non negociable.
 */
export interface FneAttemptStore {
  /**
   * Ouvre une tentative. Echoue (`FneAttemptError`) si une tentative est deja
   * ouverte pour cette facture, ou si la tentative precedente s'est close en
   * `uncertain` sans resolution humaine.
   */
  open(input: {
    readonly invoiceId: string;
    readonly endpoint: FneEndpoint;
    readonly credential: FneCredentialRef;
    readonly requestBody: unknown;
  }): Promise<FneAttemptTicket>;

  /** Clot la tentative avec son issue. Une tentative close ne se rouvre jamais. */
  close(input: { readonly ticket: FneAttemptTicket; readonly outcome: DgiOutcome }): Promise<void>;
}

/**
 * Le verrou single-flight. `invoice_fne_ref_unique` ne protege RIEN avant la
 * reponse : `fne_ref` est NULL tant qu'on n'a pas certifie. Deux workers
 * concurrents peuvent donc poster la meme facture et bruler deux stickers.
 * Implementation attendue : `pg_try_advisory_xact_lock` sur l'id de facture.
 */
export interface FneSingleFlight {
  /** Rend `null` si le verrou est deja pris : l'appelant abandonne, il ne boucle pas. */
  acquire(invoiceId: string): Promise<FneLease | null>;
}

export interface FneLease {
  readonly invoiceId: string;
  release(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Le transport : distinguer « jamais parti » de « on ne sait pas »
// ─────────────────────────────────────────────────────────────────────────

/**
 * Le port HTTP. Sa SEULE responsabilite intelligente est de rendre honnetement
 * la difference entre trois situations. Si elle est perdue ici, tout le module
 * s'effondre : le premier changement d'URL de production enverrait toute la file
 * en verification manuelle, ou pire, produirait des doublons.
 */
export interface DgiTransport {
  post(req: {
    readonly url: string;
    readonly apiKeyRef: string;
    readonly body: unknown;
    readonly timeoutMs: number;
  }): Promise<DgiTransportResult>;
}

export type DgiTransportResult =
  /** Le serveur a repondu. Le corps peut etre n'importe quoi. */
  | {
      readonly kind: 'answered';
      readonly status: number;
      readonly body: unknown;
      readonly rawBody: string;
    }
  /**
   * La requete est PROUVABLEMENT partie mais la reponse manque : timeout apres
   * envoi, connexion reinitialisee en cours d'echange. Rejeu INTERDIT.
   */
  | { readonly kind: 'sent_no_answer'; readonly reason: DgiUncertainReason }
  /**
   * La requete n'est JAMAIS partie : DNS, connexion refusee, echec TLS, timeout
   * AVANT le premier octet. Zero sticker. Rejeu legitime.
   */
  | { readonly kind: 'never_sent'; readonly reason: DgiUnreachableReason };

export type DgiUncertainReason =
  | 'timeout_after_send'
  | 'connection_reset_in_flight'
  | 'http_500'
  | 'ok_but_unusable_body';

export type DgiUnreachableReason =
  | 'dns_failure'
  | 'connection_refused'
  | 'tls_failure'
  | 'timeout_before_send';

// ─────────────────────────────────────────────────────────────────────────
// 6. Les issues d'une tentative
// ─────────────────────────────────────────────────────────────────────────

/** La reponse de certification, telle que la DGI la rend (PDF p.11 et p.21). */
export interface DgiCertifiedInvoice {
  readonly ncc: string;
  /** NCC + annee sur 2 chiffres + sequence. Prefixee `A` pour un avoir. */
  readonly reference: string;
  /** URL de verification, a transformer en QR code. */
  readonly token: string;
  /** `invoice.id` : SANS LUI, PLUS JAMAIS D'AVOIR. */
  readonly dgiInvoiceId?: string | undefined;
  /** `invoice.items[].id`, rattaches a nos lignes par leur `reference`. */
  readonly items: readonly DgiCertifiedItem[];
  /** Le solde APRES consommation. L'avoir consomme aussi un sticker (179 -> 178). */
  readonly stickerBalance?: number | undefined;
  /** Booleen dans l'exemple, `string` dans le tableau p.11. Voir `readWarning`. */
  readonly warning: boolean | 'unknown';
  /** Les totaux que la DGI a calcules elle-meme : notre seule sentinelle. */
  readonly dgiTotalTtc?: number | undefined;
  readonly dgiTotalVat?: number | undefined;
  /** Present dans la reponse, dans aucune requete. Regle d'application INCONNUE. */
  readonly dgiFiscalStamp?: number | undefined;
  /** Le corps brut, archive tel quel dans `core.external_event(source='dgi')`. */
  readonly raw: unknown;
}

export interface DgiCertifiedItem {
  /** Notre numero de ligne, si le rattachement est certain. */
  readonly lineNo?: number | undefined;
  readonly dgiItemId: string;
  readonly reference?: string | undefined;
  readonly description?: string | undefined;
  readonly quantity?: number | undefined;
}

/** Le corps d'erreur documente (PDF p.19). */
export interface DgiApiError {
  readonly message: string;
  readonly error: string;
  readonly statusCode: number;
  readonly errors?: unknown;
}

/**
 * L'issue d'une tentative. C'est une VALEUR, pas une exception : l'incertitude
 * doit remonter, se persister et s'afficher — jamais etre avalee par un `catch`
 * qui declenche un rejeu.
 */
export type DgiOutcome =
  | {
      readonly state: 'accepted';
      readonly certified: DgiCertifiedInvoice;
      readonly httpStatus: 200 | 201;
    }
  | {
      readonly state: 'rejected';
      readonly httpStatus: number;
      readonly apiError: DgiApiError;
      /** Presume non consommes — NON CONFIRME par la DGI (question 16). */
      readonly stickerPresumedConsumed: false;
      readonly raw: unknown;
    }
  | {
      readonly state: 'uncertain';
      readonly reason: DgiUncertainReason;
      /** Sticker et numero : INCONNUS. C'est precisement le probleme. */
      readonly raw?: unknown;
    }
  | {
      readonly state: 'unreachable';
      readonly reason: DgiUnreachableReason;
    }
  | {
      readonly state: 'blocked';
      readonly reason: DgiBlockedReason;
      readonly apiError?: DgiApiError | undefined;
    };

export type DgiBlockedReason =
  /** 401 : ne jamais rejouer, geler la file du marchand entier. */
  | 'invalid_api_key'
  /** Le stock est epuise. Ce que l'API renvoie alors est INCONNU (question 11). */
  | 'sticker_exhausted'
  | 'credential_revoked'
  | 'credential_pending_validation';

// ─────────────────────────────────────────────────────────────────────────
// 7. Le contrat de l'adapter
// ─────────────────────────────────────────────────────────────────────────

/** Ce qu'on attend de la DGI, pour pouvoir constater un ecart. */
export interface DgiExpectedTotals {
  readonly totals: InvoiceTotals;
  /** Notre numero local, pour tracer. Ce n'est PAS le numero officiel. */
  readonly numberLocal: string;
}

export interface DgiCertifyRequest<TBody> {
  readonly credential: FneCredentialRef;
  /** Delivre par `FneAttemptStore.open`, apres COMMIT. Sans lui, refus. */
  readonly ticket: FneAttemptTicket;
  readonly body: TBody;
  readonly expected: DgiExpectedTotals;
}

export interface DgiRefundRequest {
  readonly credential: FneCredentialRef;
  readonly ticket: FneAttemptTicket;
  /** L'id DGI de la facture d'origine, persiste a sa certification. */
  readonly dgiInvoiceId: string;
  readonly body: DgiRefundBody;
}

/**
 * Le bras DGI.
 *
 * Aucune methode ne jette pour un incident reseau ou une reponse d'erreur : ces
 * cas sont des `DgiOutcome`. Les exceptions typees du §8 ne sortent qu'AVANT que
 * le moindre octet soit parti.
 */
export interface DgiAdapter {
  readonly name: string;
  readonly environment: FneEnvironment;

  /** API #1 — vente. 200 attendu. */
  certifySale(req: DgiCertifyRequest<DgiSaleBody>): Promise<DgiOutcome>;

  /** API #3 — bordereau d'achat de produits agricoles. 200 attendu. */
  certifyPurchaseSlip(req: DgiCertifyRequest<DgiPurchaseSlipBody>): Promise<DgiOutcome>;

  /** API #2 — avoir. 201 attendu (et non 200 : un test `=== 200` echouerait). */
  certifyRefund(req: DgiRefundRequest): Promise<DgiOutcome>;
}

/**
 * Le rapprochement de nos totaux avec ceux de la DGI. Une divergence ne
 * DE-CERTIFIE PAS — le document officiel existe. Elle ouvre une exception.
 * C'est la seule sentinelle possible tant que la regle d'arrondi officielle est
 * inconnue (question 3).
 */
export interface DgiTotalsReconciliation {
  readonly ours: { readonly ttc: number; readonly vat: number };
  readonly theirs: { readonly ttc?: number | undefined; readonly vat?: number | undefined };
  readonly deltaTtc?: number | undefined;
  readonly deltaVat?: number | undefined;
  readonly verdict: 'match' | 'mismatch' | 'unknown';
}

/**
 * Le rattachement de nos lignes aux articles rendus par la DGI. Sans lui, aucun
 * avoir partiel n'est possible. Une ambiguite N'EST PAS resolue au hasard : elle
 * ouvre une exception `dgi_item_mapping`, et la facture reste sans avoir
 * possible tant qu'un humain n'a pas tranche.
 */
export interface DgiItemMapping {
  readonly mapped: readonly DgiCertifiedItem[];
  readonly ambiguous: readonly { readonly lineNo: number; readonly candidates: readonly string[] }[];
  readonly unmatchedLines: readonly number[];
}

// ─────────────────────────────────────────────────────────────────────────
// 8. Les erreurs typees — toutes AVANT le premier octet
// ─────────────────────────────────────────────────────────────────────────

/** Une regle de validation a priori a refuse le document. Aucun sticker brule. */
export class DgiValidationError extends Error {
  constructor(
    public readonly code: DgiValidationCode,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'DgiValidationError';
  }
}

/** Le billet de tentative manque, ne correspond pas, ou a deja servi. */
export class FneAttemptError extends Error {
  constructor(
    public readonly code:
      | 'no_ticket'
      | 'hash_mismatch'
      | 'already_closed'
      | 'attempt_already_open'
      | 'previous_uncertain_unresolved',
    message: string,
  ) {
    super(message);
    this.name = 'FneAttemptError';
  }
}

/** Le verrou single-flight est deja pris : on abandonne, on ne boucle pas. */
export class FneSingleFlightError extends Error {
  constructor(public readonly invoiceId: string) {
    super(`certification deja en cours pour la facture ${invoiceId}`);
    this.name = 'FneSingleFlightError';
  }
}

/**
 * Une donnee de production allait partir vers l'environnement de test en HTTP
 * clair, ou l'inverse. Refus dur.
 */
export class FneEnvironmentGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FneEnvironmentGuardError';
  }
}

/** La cle du marchand n'est pas utilisable : toute sa file est gelee. */
export class FneCredentialBlockedError extends Error {
  constructor(
    public readonly merchantPartyId: string,
    public readonly reason: DgiBlockedReason,
  ) {
    super(`cle FNE inutilisable pour ${merchantPartyId} : ${reason}`);
    this.name = 'FneCredentialBlockedError';
  }
}

/**
 * Une reponse 200/201 dont on ne peut rien tirer. L'appelant NE LA PROPAGE PAS :
 * il la convertit en `DgiOutcome { state: 'uncertain' }`. Un 200 illisible est un
 * doute, pas un echec.
 */
export class DgiResponseShapeError extends Error {
  constructor(
    message: string,
    public readonly raw: unknown,
  ) {
    super(message);
    this.name = 'DgiResponseShapeError';
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 9. Le catalogue des regles de validation a priori
// ─────────────────────────────────────────────────────────────────────────

/**
 * Chaque code correspond a une regle appliquee AVANT l'envoi, donc a un sticker
 * non brule ou a un document faux non emis. Les regles sont decrites en donnees
 * pour que l'interface puisse expliquer un refus au marchand dans ses mots, et
 * pour que le test les parcoure toutes.
 */
export type DgiValidationCode =
  // — Marchand, cle, environnement
  | 'DGI_V_CREDENTIAL_MISSING'
  | 'DGI_V_CREDENTIAL_NOT_ACTIVE'
  | 'DGI_V_ENV_MISMATCH'
  | 'DGI_V_PROD_DATA_TO_TEST'
  | 'DGI_V_NCC_MISSING'
  | 'DGI_V_BASE_URL_UNKNOWN'
  // — Entete du document
  | 'DGI_V_POINT_OF_SALE_MISSING'
  | 'DGI_V_ESTABLISHMENT_MISSING'
  | 'DGI_V_PAYMENT_METHOD_UNKNOWN'
  | 'DGI_V_TEMPLATE_UNKNOWN'
  | 'DGI_V_INVOICE_TYPE_UNKNOWN'
  // — Client
  | 'DGI_V_CLIENT_NAME_MISSING'
  | 'DGI_V_CLIENT_PHONE_MISSING'
  | 'DGI_V_CLIENT_PHONE_SHAPE'
  | 'DGI_V_CLIENT_EMAIL_MISSING'
  | 'DGI_V_CLIENT_EMAIL_INVENTED'
  | 'DGI_V_B2B_NCC_MISSING'
  | 'DGI_V_B2B_NCC_SHAPE'
  | 'DGI_V_B2G_UNSPECIFIED'
  // — Lignes
  | 'DGI_V_NO_LINES'
  | 'DGI_V_LINE_REFERENCE_MISSING'
  | 'DGI_V_LINE_REFERENCE_DUPLICATE'
  | 'DGI_V_LINE_DESCRIPTION_MISSING'
  | 'DGI_V_LINE_PRICE_INVALID'
  | 'DGI_V_LINE_QUANTITY_INVALID'
  | 'DGI_V_LINE_DISCOUNT_RANGE'
  | 'DGI_V_GLOBAL_DISCOUNT_RANGE'
  | 'DGI_V_AMOUNT_OVERFLOW'
  // — Taxes
  | 'DGI_V_TAX_CODE_UNKNOWN'
  | 'DGI_V_TVAD_REGIME'
  | 'DGI_V_TVAC_NO_CONVENTION'
  | 'DGI_V_CUSTOM_TAX_UNRESOLVED'
  | 'DGI_V_CUSTOM_TAX_RATE_RANGE'
  // — Devise
  | 'DGI_V_B2F_CURRENCY_UNKNOWN'
  | 'DGI_V_B2F_RATE_MISSING'
  | 'DGI_V_B2F_UNIT_UNRESOLVED'
  | 'DGI_V_CURRENCY_ON_NON_B2F'
  // — Recu
  | 'DGI_V_RNE_MISSING'
  | 'DGI_V_RNE_ON_FALSE'
  // — Bordereau d'achat
  | 'DGI_V_SLIP_HAS_TAXES'
  | 'DGI_V_SLIP_SUPPLIER_MISSING'
  // — Avoir
  | 'DGI_V_REFUND_NO_DGI_INVOICE_ID'
  | 'DGI_V_REFUND_NO_ITEM_ID'
  | 'DGI_V_REFUND_QUANTITY_RANGE'
  | 'DGI_V_REFUND_EXCEEDS_SOLD'
  | 'DGI_V_REFUND_SOURCE_NOT_CERTIFIED'
  | 'DGI_V_REFUND_ON_REFUND'
  | 'DGI_V_REFUND_ON_SLIP_UNRESOLVED'
  // — Stickers et file
  | 'DGI_V_STICKER_EXHAUSTED'
  | 'DGI_V_STICKER_UNKNOWN_AND_STRICT'
  // — Discipline d'envoi
  | 'DGI_V_ALREADY_CERTIFIED'
  | 'DGI_V_STATE_FORBIDS_SEND'
  | 'DGI_V_SINGLE_FLIGHT_NOT_HELD'
  | 'DGI_V_UNCERTAIN_UNRESOLVED';

export interface DgiValidationRule {
  readonly code: DgiValidationCode;
  /** Ce qu'on verifie. */
  readonly rule: string;
  /** L'erreur DGI evitee, ou le document faux non emis. */
  readonly prevents: string;
  /** D'ou vient la regle. `prudence` = notre choix, pas une regle DGI. */
  readonly source: 'pdf' | 'repo' | 'prudence';
  /** Ce que coute le manquement s'il passe. */
  readonly cost: 'sticker' | 'sticker+numero' | 'document_faux' | 'blocage' | 'fuite_donnees';
}

export const DGI_VALIDATION_RULES: readonly DgiValidationRule[] = [
  {
    code: 'DGI_V_CREDENTIAL_NOT_ACTIVE',
    rule: "la cle du marchand est a l'etat 'active'",
    prevents: '401 unauthorized_exception, et le gel en cascade de toute la file',
    source: 'pdf',
    cost: 'blocage',
  },
  {
    code: 'DGI_V_PROD_DATA_TO_TEST',
    rule: 'aucune donnee reelle (NCC, telephone, e-mail) ne part vers un hote de test',
    prevents: 'fuite de donnees personnelles en HTTP clair vers 54.247.95.108',
    source: 'pdf',
    cost: 'fuite_donnees',
  },
  {
    code: 'DGI_V_POINT_OF_SALE_MISSING',
    rule: 'pointOfSale non vide',
    prevents: "400 « Point of sale is not valid » (seul message d'erreur documente)",
    source: 'pdf',
    cost: 'sticker',
  },
  {
    code: 'DGI_V_ESTABLISHMENT_MISSING',
    rule: 'establishment non vide (marque O, p.8)',
    prevents: '400 bad_request',
    source: 'pdf',
    cost: 'sticker',
  },
  {
    code: 'DGI_V_CLIENT_NAME_MISSING',
    rule: 'clientCompanyName non vide (marque O, p.8)',
    prevents: '400 bad_request',
    source: 'pdf',
    cost: 'sticker',
  },
  {
    code: 'DGI_V_CLIENT_PHONE_MISSING',
    rule: 'clientPhone non vide (marque O, p.8)',
    prevents: '400 bad_request',
    source: 'pdf',
    cost: 'sticker',
  },
  {
    code: 'DGI_V_CLIENT_EMAIL_MISSING',
    rule: 'clientEmail non vide (marque O, p.8)',
    prevents: '400 bad_request',
    source: 'pdf',
    cost: 'sticker',
  },
  {
    code: 'DGI_V_CLIENT_EMAIL_INVENTED',
    rule: 'aucune adresse de convenance (client@swimpay.ci) n est fabriquee',
    prevents: 'une donnee inventee sur un document fiscal opposable',
    source: 'repo',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_B2B_NCC_MISSING',
    rule: 'un template B2B de VENTE porte le NCC du client',
    prevents: '400 bad_request',
    source: 'pdf',
    cost: 'sticker',
  },
  {
    code: 'DGI_V_LINE_REFERENCE_MISSING',
    rule: 'chaque ligne porte une reference unique dans la facture',
    prevents:
      "l'impossibilite de rattacher un id d'article DGI a notre ligne, donc l'impossibilite de tout avoir partiel",
    source: 'prudence',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_CUSTOM_TAX_UNRESOLVED',
    rule: "aucune taxe specifique n'est emise tant que sa base de calcul n'est pas confirmee",
    prevents:
      'une facture certifiee dont le total diverge silencieusement du notre (GRA 5 % lue comme 5 F)',
    source: 'prudence',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_TVAD_REGIME',
    rule: "TVAD n'est utilisable que si le regime du marchand l'autorise (TEE / RME)",
    prevents: 'une exoneration legale revendiquee a tort ; sanction INCONNUE',
    source: 'pdf',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_TVAC_NO_CONVENTION',
    rule: 'TVAC exige une reference de convention enregistree chez nous',
    prevents: "une exoneration conventionnelle sans texte, qu'aucun champ de l'API ne porte",
    source: 'prudence',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_B2F_UNIT_UNRESOLVED',
    rule: "aucune facture B2F en devise etrangere tant que l'unite des montants n'est pas confirmee",
    prevents: "des montants faux d'un facteur 655 sur un document opposable",
    source: 'prudence',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_SLIP_HAS_TAXES',
    rule: "un bordereau d'achat ne porte ni taxes ni customTaxes sur ses articles",
    prevents: 'une TVA indue certifiee sur un achat au producteur',
    source: 'pdf',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_REFUND_NO_DGI_INVOICE_ID',
    rule: "un avoir exige l'id DGI de la facture d'origine et les ids de ses articles",
    prevents: 'un appel /refund impossible, ou porte sur les mauvais articles',
    source: 'pdf',
    cost: 'sticker+numero',
  },
  {
    code: 'DGI_V_REFUND_EXCEEDS_SOLD',
    rule: 'le cumul des avoirs ne depasse jamais la quantite vendue',
    prevents: "un avoir superieur a la vente ; le plafond cote DGI est INCONNU",
    source: 'prudence',
    cost: 'document_faux',
  },
  {
    code: 'DGI_V_ALREADY_CERTIFIED',
    rule: "une facture qui porte deja une reference DGI n'est jamais renvoyee",
    prevents: 'un doublon officiel dans la serie annuelle du marchand',
    source: 'prudence',
    cost: 'sticker+numero',
  },
  {
    code: 'DGI_V_UNCERTAIN_UNRESOLVED',
    rule: "une facture en doute n'est jamais renvoyee sans resolution humaine",
    prevents: 'le doublon le plus probable de tout le module',
    source: 'prudence',
    cost: 'sticker+numero',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 10. Le stock de stickers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Le tableau p.11 type `warning` en `string` (« Alerte sur le stock de
 * sticker ») alors que l'exemple envoie le booleen `false`. Lire `=== true` fait
 * perdre l'alerte si la plateforme envoie « true » ou un message.
 * On rend `'unknown'` plutot que de trancher a tort.
 */
export function readWarning(raw: unknown): boolean | 'unknown' {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0' || v === '') return false;
    // Un message d'alerte non vide EST une alerte.
    return true;
  }
  return 'unknown';
}

/**
 * Une observation du solde. C'est un JOURNAL, pas un instantane : sans
 * l'historique, la baisse inexpliquee — notre seul oracle apres un doute — est
 * indetectable.
 */
export interface StickerObservation {
  readonly merchantPartyId: string;
  readonly balance: number;
  readonly warning: boolean | 'unknown';
  readonly observedAt: Date;
  readonly source: 'sign' | 'refund';
  readonly attemptId: string;
}

export type StickerVerdict = 'ok' | 'low' | 'critical' | 'unknown';

/**
 * Les seuils sont LES NOTRES, pas une regle DGI : le PDF ne publie ni bareme ni
 * seuil. A presenter comme un choix produit, jamais comme une regle officielle.
 */
export const STICKER_THRESHOLD_CRITICAL = 20;
export const STICKER_THRESHOLD_LOW = 100;

export function stickerVerdict(balance: number | undefined): StickerVerdict {
  if (balance === undefined || !Number.isFinite(balance)) return 'unknown';
  if (balance <= STICKER_THRESHOLD_CRITICAL) return 'critical';
  if (balance <= STICKER_THRESHOLD_LOW) return 'low';
  return 'ok';
}

/**
 * L'oracle du solde : le seul indice LISIBLE PAR MACHINE apres un doute.
 *
 * Si entre deux observations le solde a baisse de plus que nos certifications
 * reussies ne l'expliquent, une certification a bien eu lieu quelque part.
 *
 * C'est une INFERENCE, pas une preuve : elle tombe si le marchand facture en
 * parallele depuis l'espace web FNE ou l'appli mobile (les trois canaux sont
 * autorises), et elle tombe si certaines factures ne consomment rien. Elle
 * ORIENTE l'humain ; elle ne conclut jamais seule.
 */
export interface StickerOracleInput {
  readonly previous: StickerObservation;
  readonly current: StickerObservation;
  /** Nos certifications reussies entre les deux observations. */
  readonly ourSuccesses: number;
}

export interface StickerOracleVerdict {
  readonly observedDrop: number;
  readonly explainedDrop: number;
  readonly unexplainedDrop: number;
  /** `suspected_consumed` n'autorise JAMAIS un rejeu : il ouvre une exception. */
  readonly verdict: 'consistent' | 'suspected_consumed' | 'inconsistent';
}
