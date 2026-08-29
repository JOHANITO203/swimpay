/**
 * Le classement des erreurs de la DGI — mesure, pas suppose.
 *
 * Toutes les reponses d'erreur de l'API FNE partagent la meme enveloppe :
 *
 *   { "message": "...", "error": "<slug>", "statusCode": 000,
 *     "errors": {}, "extraParams": {} }
 *
 * LA REGLE, ET ELLE N'EST PAS INTUITIVE : le discriminant est le slug `error`,
 * pas le code HTTP. Deux `404` veulent dire des choses opposees :
 *
 *   - `company_not_found` : la donnee du MARCHAND est fausse. Un humain corrige.
 *   - `not_found`         : notre URL est fausse. C'est un bug CHEZ NOUS.
 *
 * Classer par code HTTP enverrait nos propres bugs d'URL grossir la file
 * d'exception des marchands, ou personne ne les verrait jamais.
 *
 * Releve le 29 aout 2026 sur l'environnement de test officiel
 * (`http://54.247.95.108/ws`). Chaque valeur ci-dessous a ete observee, et les
 * charges utiles exactes sont rejouees dans les tests. Voir
 * `docs/pivot/08_DGI_FNE_API.md` section 10.
 */

/** L'enveloppe d'erreur, telle que l'API la renvoie. */
export interface DgiErrorEnvelope {
  readonly message: string;
  readonly error: string;
  readonly statusCode: number;
  readonly errors?: unknown;
  readonly extraParams?: unknown;
}

/**
 * Ce qu'on fait de l'erreur. Le nom dit l'ACTION, pas le code : c'est ce qu'on
 * lit dans une file d'exception a trois heures du matin.
 */
export type DgiFailure =
  /** Cle absente de la requete. Bug de configuration chez nous. */
  | 'missing_api_key'
  /** Cle refusee ou revoquee. Gele la file du marchand entier. */
  | 'invalid_api_key'
  /** Le NCC n'existe pas dans le registre vise. Le marchand corrige. */
  | 'company_not_found'
  /** La route n'existe pas. NOTRE bug. Ne jamais mettre en file metier. */
  | 'route_not_found'
  /** Requete refusee sur le fond. Corrigeable, puis nouvelle tentative. */
  | 'bad_request'
  /** La DGI a echoue chez elle. L'issue de la facture est INCONNUE. */
  | 'server_error'
  /** Enveloppe non reconnue. On ne devine pas : un humain regarde. */
  | 'unknown';

/** Ce que l'appelant a le droit de faire ensuite. */
export interface DgiFailurePolicy {
  readonly failure: DgiFailure;
  /**
   * Rejouer la MEME requete a l'identique peut-il reussir ?
   * Faux partout ou l'issue est incertaine : on n'invente pas un rejeu sur une
   * facture dont on ignore si elle a consomme un sticker.
   */
  readonly retryable: boolean;
  /** Faut-il geler toutes les factures en attente de ce marchand ? */
  readonly freezesMerchant: boolean;
  /** Est-ce un defaut de NOTRE code, a router vers l'astreinte technique ? */
  readonly ourBug: boolean;
  /**
   * L'issue de la facture est-elle inconnue ? Si oui : jamais de rejeu aveugle,
   * la piece part en file de doute et se resout par un humain.
   */
  readonly outcomeUnknown: boolean;
}

/** Les messages exacts observes, pour distinguer deux `unauthorized`. */
const MSG_CLE_ABSENTE = 'api key is required';
const MSG_CLE_INVALIDE = 'invalid api key';

/**
 * Classer une reponse d'erreur.
 *
 * `status` est le code HTTP du transport ; `body` le corps parse, s'il l'est.
 * On lit le slug EN PREMIER. Le code HTTP ne sert qu'a rattraper les cas ou le
 * corps est absent ou illisible — une passerelle qui repond du HTML, par
 * exemple.
 */
export function classifyDgiError(status: number, body: unknown): DgiFailure {
  const env = asEnvelope(body);
  const slug = env?.error?.toLowerCase().trim();
  const message = env?.message?.toLowerCase().trim() ?? '';

  if (slug === 'unauthorized') {
    // Les deux se repondent en 401 mais n'ont rien a voir : l'un est un oubli
    // chez nous, l'autre une cle morte qui doit tout arreter.
    if (message.includes(MSG_CLE_ABSENTE)) return 'missing_api_key';
    if (message.includes(MSG_CLE_INVALIDE)) return 'invalid_api_key';
    return 'invalid_api_key';
  }
  if (slug === 'company_not_found') return 'company_not_found';
  if (slug === 'not_found') return 'route_not_found';
  if (slug === 'bad_request') return 'bad_request';

  // Sans slug exploitable, on retombe sur le transport — et on reste prudent.
  if (status === 401 || status === 403) return 'invalid_api_key';
  if (status === 400 || status === 422) return 'bad_request';
  if (status >= 500) return 'server_error';
  if (status === 404) {
    // Un 404 sans slug est ambigu par construction. On refuse de trancher :
    // le mettre en file metier masquerait un bug d'URL chez nous.
    return 'unknown';
  }
  return 'unknown';
}

/** La politique attachee a chaque cas. Une table, pour qu'elle se relise. */
const POLITIQUES: Readonly<Record<DgiFailure, Omit<DgiFailurePolicy, 'failure'>>> = {
  missing_api_key: {
    retryable: false,
    freezesMerchant: false,
    ourBug: true,
    outcomeUnknown: false,
  },
  invalid_api_key: {
    retryable: false,
    freezesMerchant: true,
    ourBug: false,
    outcomeUnknown: false,
  },
  company_not_found: {
    retryable: false,
    freezesMerchant: false,
    ourBug: false,
    outcomeUnknown: false,
  },
  route_not_found: {
    retryable: false,
    freezesMerchant: false,
    ourBug: true,
    outcomeUnknown: false,
  },
  bad_request: {
    retryable: false,
    freezesMerchant: false,
    ourBug: false,
    outcomeUnknown: false,
  },
  server_error: {
    // La DGI n'a ni idempotence ni endpoint de lecture : apres un 500, on ne
    // sait pas si le sticker a ete consomme. Rejouer, c'est risquer un doublon
    // officiel — qui ne se supprime pas, il se corrige par un avoir.
    retryable: false,
    freezesMerchant: false,
    ourBug: false,
    outcomeUnknown: true,
  },
  unknown: {
    retryable: false,
    freezesMerchant: false,
    ourBug: false,
    outcomeUnknown: true,
  },
};

export function policyFor(failure: DgiFailure): DgiFailurePolicy {
  return { failure, ...POLITIQUES[failure] };
}

/** Le raccourci du chemin courant : classer et decider en un appel. */
export function classifyDgiFailure(status: number, body: unknown): DgiFailurePolicy {
  return policyFor(classifyDgiError(status, body));
}

function asEnvelope(body: unknown): DgiErrorEnvelope | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const o = body as Record<string, unknown>;
  if (typeof o['error'] !== 'string' || typeof o['message'] !== 'string') {
    return undefined;
  }
  return {
    message: o['message'],
    error: o['error'],
    statusCode: typeof o['statusCode'] === 'number' ? o['statusCode'] : 0,
    errors: o['errors'],
    extraParams: o['extraParams'],
  };
}
