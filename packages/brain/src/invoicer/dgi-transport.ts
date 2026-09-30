/**
 * Le transport HTTP vers l'API FNE — la seule couche qui a le droit de toucher
 * le reseau.
 *
 * Sa seule intelligence est de rendre honnetement la frontiere du contrat
 * `DgiTransportResult` (dgi-adapter.ts §5) : le serveur a repondu / la requete
 * est partie sans reponse / la requete n'est prouvablement jamais partie. Tout
 * le reste — classement des erreurs par slug, machine a etats, stickers — vit
 * au-dessus et ne regarde jamais fetch.
 *
 * Deux regles absolues, heritees du contrat :
 *
 *   1. JAMAIS de retry ici. La DGI n'a ni idempotence ni endpoint de lecture :
 *      un timeout apres POST /sign a peut-etre consomme un sticker et alloue
 *      un numero officiel dans la serie annuelle du marchand. Rejouer, c'est
 *      risquer un doublon qui ne se supprime pas. Un appel = au plus un fetch.
 *   2. En cas de doute, le resultat penche du cote 'sent_no_answer'. Ce cote
 *      coute une verification humaine dans l'espace FNE ; l'autre
 *      ('never_sent') autorise un rejeu automatique, donc peut couter un
 *      doublon officiel. On ne prend pas ce risque pour economiser une
 *      verification.
 *
 * Le timeout applique via AbortController illustre la regle 2 : quand notre
 * minuterie coupe l'appel, fetch ne dit pas si des octets sont deja partis.
 * Le seul timeout classe « avant envoi » est celui que la pile reseau PROUVE :
 * l'echec de la phase de connexion (UND_ERR_CONNECT_TIMEOUT), ou le socket
 * n'a jamais existe.
 */

import type {
  DgiTransport,
  DgiTransportResult,
  DgiUncertainReason,
  DgiUnreachableReason,
} from './dgi-adapter.js';

// ─────────────────────────────────────────────────────────────────────────
// 1. Le transport reel
// ─────────────────────────────────────────────────────────────────────────

export const DGI_TRANSPORT_DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchDgiTransportConfig {
  /**
   * La base de l'API, ex. `http://54.247.95.108/ws` (mesuree, doc 08 §10.5).
   * Les chemins passes a `post` s'y collent. Elle ne porte AUCUNE cle : la
   * cle est par marchand et arrive avec chaque appel.
   */
  readonly baseUrl: string;
  /** Delai par defaut quand l'appel n'en impose pas un exploitable. */
  readonly timeoutMs?: number | undefined;
  /** Injectable pour les tests. Par defaut, le fetch natif de Node 22. */
  readonly fetchImpl?: typeof fetch | undefined;
}

/**
 * Construit le transport reel. Il implemente `DgiTransport` a la lettre :
 * aucune exception pour un incident reseau, aucun retry, aucun log de la cle.
 * La seule exception jetee est un corps non serialisable en JSON — un bug de
 * l'appelant, prouve AVANT le premier octet (meme discipline que les erreurs
 * typees du §8 de dgi-adapter.ts) : ce n'est jamais un doute reseau.
 *
 * Sur `apiKeyRef` : au moment de l'envoi, l'appelant y a place la valeur a
 * mettre derriere `Bearer ` (resolue depuis le coffre juste avant l'appel).
 * Elle n'est ni conservee ni journalisee ici — elle ne fait que traverser.
 */
export function createFetchDgiTransport(config: FetchDgiTransportConfig): DgiTransport {
  const fetchImpl = config.fetchImpl ?? fetch;
  const defaultTimeoutMs = usableTimeout(config.timeoutMs) ?? DGI_TRANSPORT_DEFAULT_TIMEOUT_MS;

  return {
    async post(req) {
      const url = resolveUrl(config.baseUrl, req.url);
      const timeoutMs = usableTimeout(req.timeoutMs) ?? defaultTimeoutMs;

      // La serialisation se fait AVANT d'ouvrir quoi que ce soit. Un corps
      // non serialisable (BigInt, structure cyclique) est un bug local PROUVE :
      // aucun octet ne partira jamais. Le laisser tomber dans le classement
      // reseau le rendrait 'sent_no_answer' — un humain irait chercher dans
      // l'espace FNE une facture qui n'a jamais pu partir, a chaque tentative.
      // On echoue fort a la place ; le message ne porte ni la cle ni le corps.
      let payload: string | undefined;
      try {
        // Type `string` dans lib.d.ts, mais rend undefined a l'execution pour
        // undefined, une fonction ou un symbole.
        payload = JSON.stringify(req.body) as string | undefined;
      } catch (err) {
        throw new Error(
          `dgi-transport: corps non serialisable en JSON pour ${req.url} — aucun octet n'est parti`,
          { cause: err },
        );
      }
      if (payload === undefined) {
        // Envoyer un POST sans corps, en silence, a une API qui certifie des
        // documents fiscaux serait deviner. On refuse.
        throw new Error(
          `dgi-transport: corps qui se serialise en rien pour ${req.url} — aucun octet n'est parti`,
        );
      }

      const controller = new AbortController();
      // Le drapeau se pose AVANT abort() : quand fetch rejette sur notre
      // signal, on sait que c'est notre minuterie et pas autre chose.
      let timerFired = false;
      const timer = setTimeout(() => {
        timerFired = true;
        controller.abort();
      }, timeoutMs);

      try {
        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${req.apiKeyRef}`,
              'content-type': 'application/json',
              accept: 'application/json',
            },
            body: payload,
            signal: controller.signal,
          });
        } catch (err) {
          return classifySendFailure(err, timerFired);
        }

        // Les en-tetes sont arrives : le serveur a bien recu et traite. Si la
        // lecture du corps casse ensuite, l'issue de la facture est inconnue —
        // c'est un doute, jamais un « jamais parti ».
        let rawBody: string;
        try {
          rawBody = await response.text();
        } catch {
          return {
            kind: 'sent_no_answer',
            reason: timerFired ? 'timeout_after_send' : 'connection_reset_in_flight',
          };
        }

        return { kind: 'answered', status: response.status, body: parseBody(rawBody), rawBody };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/**
 * Un corps non-JSON (le HTML d'une passerelle, un corps vide) n'est pas une
 * panne du transport : le statut et le brut suffisent a l'etage du dessus
 * (`classifyDgiError` retombe sur le code HTTP quand le corps est illisible).
 */
function parseBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    return undefined;
  }
}

/** Un delai n'est exploitable que strictement positif et fini. */
function usableTimeout(value: number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return undefined;
}

/**
 * Colle un chemin a la base par concatenation explicite. `new URL(path, base)`
 * est un piege ici : un chemin commencant par `/` effacerait le `/ws` de la
 * base mesuree. Une URL deja absolue passe telle quelle.
 */
function resolveUrl(baseUrl: string, url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Le classement d'un echec de fetch
// ─────────────────────────────────────────────────────────────────────────

const UNCERTAIN_RESET: DgiTransportResult = {
  kind: 'sent_no_answer',
  reason: 'connection_reset_in_flight',
};

const UNCERTAIN_TIMEOUT: DgiTransportResult = {
  kind: 'sent_no_answer',
  reason: 'timeout_after_send',
};

const NEVER_SENT_TLS: DgiTransportResult = { kind: 'never_sent', reason: 'tls_failure' };

/**
 * Les codes que la pile reseau de Node (et undici) posent sur l'erreur ou sa
 * chaine de causes. Seuls les codes qui PROUVENT que le socket n'a jamais
 * porte la requete donnent 'never_sent' : c'est lui qui autorise un rejeu.
 */
const CODE_MAP: Readonly<Record<string, DgiTransportResult>> = {
  // La phase de connexion a echoue : aucun octet metier n'est parti.
  UND_ERR_CONNECT_TIMEOUT: { kind: 'never_sent', reason: 'timeout_before_send' },
  ENOTFOUND: { kind: 'never_sent', reason: 'dns_failure' },
  EAI_AGAIN: { kind: 'never_sent', reason: 'dns_failure' },
  ECONNREFUSED: { kind: 'never_sent', reason: 'connection_refused' },
  // L'echange s'est rompu : la requete a pu partir. Doute.
  ECONNRESET: UNCERTAIN_RESET,
  EPIPE: UNCERTAIN_RESET,
  UND_ERR_SOCKET: UNCERTAIN_RESET,
  UND_ERR_HEADERS_TIMEOUT: UNCERTAIN_TIMEOUT,
  UND_ERR_BODY_TIMEOUT: UNCERTAIN_TIMEOUT,
};

/** Les echecs TLS surviennent pendant la poignee de main : rien n'est parti. */
function isTlsCode(code: string): boolean {
  return (
    code === 'EPROTO' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code.startsWith('ERR_TLS') ||
    code.includes('CERT') ||
    code.includes('SSL')
  );
}

function classifySendFailure(err: unknown, timerFired: boolean): DgiTransportResult {
  if (timerFired) {
    // Notre minuterie a coupe l'appel en vol. fetch ne dit pas si des octets
    // etaient deja partis : supposer « jamais parti » autoriserait un rejeu,
    // donc un doublon officiel possible. On assume le doute.
    return UNCERTAIN_TIMEOUT;
  }
  for (const code of collectErrorCodes(err)) {
    const mapped = CODE_MAP[code] ?? (isTlsCode(code) ? NEVER_SENT_TLS : undefined);
    if (mapped !== undefined) return mapped;
  }
  // Erreur sans code reconnu : on ne devine pas ou l'echange s'est rompu.
  // Le cote incertain coute une verification humaine ; l'autre peut couter
  // un doublon. On choisit la verification.
  return UNCERTAIN_RESET;
}

/**
 * Remonte la chaine `cause` et les `errors[]` d'un AggregateError (forme
 * reelle d'un ECONNREFUSED sous undici) pour collecter les codes, dans
 * l'ordre de rencontre. Profondeur bornee : une chaine cyclique ne doit pas
 * transformer un incident reseau en boucle infinie.
 */
function collectErrorCodes(err: unknown): readonly string[] {
  const codes: string[] = [];
  const seen = new Set<object>();
  const walk = (value: unknown, depth: number): void => {
    if (depth > 8 || value === null || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const o = value as Record<string, unknown>;
    if (typeof o['code'] === 'string') codes.push(o['code']);
    if (Array.isArray(o['errors'])) {
      for (const sub of o['errors']) walk(sub, depth + 1);
    }
    walk(o['cause'], depth + 1);
  };
  walk(err, 0);
  return codes;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Le double de test : rejouer des reponses MESUREES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Un scenario enregistre. Les trois formes epousent `DgiTransportResult` pour
 * que les tests d'integration rejouent aussi bien une reponse relevee sur
 * l'environnement de test officiel qu'un incident reseau.
 */
export type DgiReplayScenario =
  | {
      readonly kind: 'answered';
      readonly status: number;
      /** Le corps parse. `undefined` pour un corps non-JSON : donner `rawBody`. */
      readonly body: unknown;
      /** Le brut exact, s'il differe de `JSON.stringify(body)` (HTML, corps vide). */
      readonly rawBody?: string | undefined;
    }
  | { readonly kind: 'sent_no_answer'; readonly reason: DgiUncertainReason }
  | { readonly kind: 'never_sent'; readonly reason: DgiUnreachableReason };

/** Ce que le double a vu passer, pour verifier les envois — et compter a UN. */
export interface DgiReplayCall {
  readonly url: string;
  readonly apiKeyRef: string;
  readonly body: unknown;
  readonly timeoutMs: number;
}

export interface DgiReplayTransport extends DgiTransport {
  /** Journal des appels, dans l'ordre. `calls.length` EST le compteur anti-retry. */
  readonly calls: readonly DgiReplayCall[];
}

/**
 * Rejoue les scenarios dans l'ordre, un par appel. Un appel au-dela du dernier
 * scenario est exactement un rejeu non prevu : on echoue fort plutot que
 * d'inventer une reponse — un double qui improvise ne prouve rien.
 */
export function createReplayTransport(
  scenarios: readonly DgiReplayScenario[],
): DgiReplayTransport {
  const calls: DgiReplayCall[] = [];
  return {
    calls,
    async post(req) {
      calls.push({
        url: req.url,
        apiKeyRef: req.apiKeyRef,
        body: req.body,
        timeoutMs: req.timeoutMs,
      });
      const scenario = scenarios[calls.length - 1];
      if (scenario === undefined) {
        throw new Error(
          `createReplayTransport: appel #${calls.length} vers ${req.url} sans scenario enregistre — un rejeu non prevu ?`,
        );
      }
      switch (scenario.kind) {
        case 'answered':
          return {
            kind: 'answered',
            status: scenario.status,
            body: scenario.body,
            rawBody:
              scenario.rawBody ??
              (scenario.body === undefined ? '' : JSON.stringify(scenario.body)),
          };
        case 'sent_no_answer':
          return { kind: 'sent_no_answer', reason: scenario.reason };
        case 'never_sent':
          return { kind: 'never_sent', reason: scenario.reason };
      }
    },
  };
}
