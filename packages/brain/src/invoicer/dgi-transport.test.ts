import { describe, expect, it } from 'vitest';
import type { DgiTransportResult } from './dgi-adapter.js';
import { classifyDgiError } from './dgi-errors.js';
import {
  createFetchDgiTransport,
  createReplayTransport,
  type DgiReplayScenario,
} from './dgi-transport.js';

/* AUCUN test ici ne touche le reseau : fetch est toujours injecte. Les charges
   utiles d'erreur sont recopiees a l'octet pres de dgi-errors.test.ts (relevees
   le 29 aout 2026 sur l'environnement de test officiel). Le corps 200 vient du
   doc 08 §5 ; le doc y tronque `token` et `invoice` (…), on en complete la
   forme sans pretendre a l'octet pres. */

const BASE = 'http://54.247.95.108/ws';

const CORPS_200 = {
  ncc: '9606123E',
  reference: '9606123E25000000019',
  token: 'http://54.247.95.108/fr/verification/019465c1-0000-0000-0000-000000000000',
  warning: false,
  balance_sticker: 179,
  invoice: { source: 'api' },
};

const CLE_ABSENTE = {
  message: 'API Key is required',
  error: 'unauthorized',
  statusCode: 401,
  errors: {},
};

const CLE_INVALIDE = {
  message: 'Invalid API Key',
  error: 'unauthorized',
  statusCode: 401,
  errors: {},
};

const ENTREPRISE_INCONNUE = {
  message: 'Company not found',
  error: 'company_not_found',
  statusCode: 404,
  errors: {},
  extraParams: {},
};

// ─── Outillage : un fetch espionne, jamais le reseau ─────────────────────

interface FetchProbe {
  readonly impl: typeof fetch;
  count(): number;
  lastUrl(): string | undefined;
  lastInit(): RequestInit | undefined;
}

function probeFetch(reponse: (init?: RequestInit) => Promise<Response> | Response): FetchProbe {
  let calls = 0;
  let url: string | undefined;
  let init: RequestInit | undefined;
  const impl = (async (input: unknown, i?: RequestInit) => {
    calls += 1;
    url = String(input);
    init = i;
    return reponse(i);
  }) as typeof fetch;
  return { impl, count: () => calls, lastUrl: () => url, lastInit: () => init };
}

function avecCode<E extends Error>(err: E, code: string): E {
  return Object.assign(err, { code });
}

/** Un fetch qui ne repond jamais : seul notre AbortController peut le sortir. */
function fetchQuiNeRepondJamais(init?: RequestInit): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('This operation was aborted', 'AbortError'));
    });
  });
}

function attendre<K extends DgiTransportResult['kind']>(
  resultat: DgiTransportResult,
  kind: K,
): Extract<DgiTransportResult, { kind: K }> {
  if (resultat.kind !== kind) {
    throw new Error(`attendu '${kind}', recu '${resultat.kind}' (${JSON.stringify(resultat)})`);
  }
  return resultat as Extract<DgiTransportResult, { kind: K }>;
}

const REQ = {
  url: '/external/invoices/sign',
  apiKeyRef: 'cle-marchand-01',
  body: { invoiceType: 'sale' },
  timeoutMs: 1_000,
} as const;

// ─── Le serveur a repondu : tout est 'answered', meme le pire ────────────

describe('createFetchDgiTransport — le serveur a repondu', () => {
  it('rend le 200 de certification tel quel (corps du doc 08 §5)', async () => {
    const brut = JSON.stringify(CORPS_200);
    const probe = probeFetch(() => new Response(brut, { status: 200 }));
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    const resultat = attendre(await transport.post(REQ), 'answered');

    expect(resultat.status).toBe(200);
    expect(resultat.body).toEqual(CORPS_200);
    // Le brut est conserve a l'octet pres : c'est lui qu'on archive.
    expect(resultat.rawBody).toBe(brut);
    expect(probe.count()).toBe(1);
  });

  it('envoie un POST JSON avec la cle en Bearer, sur la base + le chemin', async () => {
    const probe = probeFetch(() => new Response('{}', { status: 200 }));
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    await transport.post(REQ);

    expect(probe.lastUrl()).toBe('http://54.247.95.108/ws/external/invoices/sign');
    const init = probe.lastInit();
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    // La cle vient de l'APPEL, pas de la config : une cle par marchand.
    expect(headers['authorization']).toBe('Bearer cle-marchand-01');
    expect(headers['content-type']).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify(REQ.body));
  });

  it("rend les deux 401 mesures, et l'etage du dessus les distingue", async () => {
    for (const [corps, attendu] of [
      [CLE_ABSENTE, 'missing_api_key'],
      [CLE_INVALIDE, 'invalid_api_key'],
    ] as const) {
      const probe = probeFetch(() => new Response(JSON.stringify(corps), { status: 401 }));
      const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

      const resultat = attendre(await transport.post(REQ), 'answered');

      expect(resultat.status).toBe(401);
      expect(resultat.body).toEqual(corps);
      // Le transport ne classe pas : il livre de quoi classer.
      expect(classifyDgiError(resultat.status, resultat.body)).toBe(attendu);
      expect(probe.count()).toBe(1);
    }
  });

  it('rend le 404 company_not_found mesure, classable en aval', async () => {
    const probe = probeFetch(
      () => new Response(JSON.stringify(ENTREPRISE_INCONNUE), { status: 404 }),
    );
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    const resultat = attendre(await transport.post(REQ), 'answered');

    expect(resultat.status).toBe(404);
    expect(classifyDgiError(resultat.status, resultat.body)).toBe('company_not_found');
    expect(probe.count()).toBe(1);
  });

  it('ne plante pas sur le HTML d une passerelle : answered, corps non parse', async () => {
    const html = '<html>502 Bad Gateway</html>';
    const probe = probeFetch(() => new Response(html, { status: 502 }));
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    const resultat = attendre(await transport.post(REQ), 'answered');

    expect(resultat.status).toBe(502);
    expect(resultat.body).toBeUndefined();
    expect(resultat.rawBody).toBe(html);
    expect(probe.count()).toBe(1);
  });

  it("un 500 est 'answered' : l'interpretation (doute) appartient a l'appelant", async () => {
    // Le contrat est strict : 'answered' des que le serveur a repondu, quel
    // que soit le statut. C'est l'adapter qui en fera un etat 'uncertain'.
    const probe = probeFetch(
      () => new Response('{"message":"oops","error":"server_error","statusCode":500}', {
        status: 500,
      }),
    );
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    const resultat = attendre(await transport.post(REQ), 'answered');
    expect(resultat.status).toBe(500);
    expect(probe.count()).toBe(1);
  });
});

// ─── Le corps inserialisable : un bug local prouve, jamais un doute ──────

describe('createFetchDgiTransport — corps non serialisable', () => {
  it("jette AVANT tout octet sur un BigInt : fetch n'est jamais appele", async () => {
    const probe = probeFetch(() => new Response('{}', { status: 200 }));
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    // Un montant en BigInt fait jeter JSON.stringify. Le classer en
    // 'sent_no_answer' enverrait un humain chercher dans l'espace FNE une
    // facture qui n'a jamais pu partir — et chaque nouvelle tentative
    // recommencerait. C'est un bug local prouve : echec fort, zero octet.
    await expect(
      transport.post({ ...REQ, body: { montant: 5_000n } }),
    ).rejects.toThrow(/non serialisable/);
    expect(probe.count()).toBe(0);
  });

  it('refuse un corps qui se serialise en rien du tout (undefined)', async () => {
    const probe = probeFetch(() => new Response('{}', { status: 200 }));
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    // JSON.stringify(undefined) rend undefined : fetch partirait SANS corps,
    // en silence, vers une API qui certifie des documents fiscaux.
    await expect(transport.post({ ...REQ, body: undefined })).rejects.toThrow(/aucun octet/);
    expect(probe.count()).toBe(0);
  });
});

// ─── La reponse entamee puis coupee : en-tetes recus, corps perdu ────────

describe('createFetchDgiTransport — le corps de la reponse casse apres les en-tetes', () => {
  it("classe une coupure PENDANT la lecture du corps comme 'sent_no_answer'", async () => {
    // Les en-tetes sont arrives : le serveur a recu et traite. Le flux du
    // corps casse ensuite — l'issue de la facture est inconnue.
    const flux = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"ncc":'));
        controller.error(new Error('socket hang up'));
      },
    });
    const probe = probeFetch(() => new Response(flux, { status: 200 }));
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    const resultat = attendre(await transport.post(REQ), 'sent_no_answer');

    expect(resultat.reason).toBe('connection_reset_in_flight');
    expect(probe.count()).toBe(1);
  });

  it("classe la minuterie qui coupe pendant la lecture du corps comme 'timeout_after_send'", async () => {
    // En-tetes arrives, corps qui ne vient jamais : c'est NOTRE minuterie qui
    // sort de l'attente, et la raison doit le dire (timeout, pas reset).
    const probe = probeFetch((init) => {
      const flux = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener('abort', () => {
            controller.error(new DOMException('This operation was aborted', 'AbortError'));
          });
        },
      });
      return new Response(flux, { status: 200 });
    });
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    const resultat = attendre(await transport.post({ ...REQ, timeoutMs: 25 }), 'sent_no_answer');

    expect(resultat.reason).toBe('timeout_after_send');
    expect(probe.count()).toBe(1);
  });
});

// ─── Le timeout : un doute, jamais un « jamais parti » ───────────────────

describe('createFetchDgiTransport — timeout via AbortController', () => {
  it("classe un timeout en vol comme 'sent_no_answer' : un sticker a pu partir", async () => {
    const probe = probeFetch(fetchQuiNeRepondJamais);
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

    const resultat = attendre(await transport.post({ ...REQ, timeoutMs: 25 }), 'sent_no_answer');

    expect(resultat.reason).toBe('timeout_after_send');
    expect(probe.count()).toBe(1);
  });

  it('retombe sur le delai de la config quand celui de l appel est inexploitable', async () => {
    const probe = probeFetch(fetchQuiNeRepondJamais);
    const transport = createFetchDgiTransport({
      baseUrl: BASE,
      timeoutMs: 25,
      fetchImpl: probe.impl,
    });

    // timeoutMs: 0 n'est pas un delai : sans le repli, ce test pendrait 30 s.
    const resultat = attendre(await transport.post({ ...REQ, timeoutMs: 0 }), 'sent_no_answer');
    expect(resultat.reason).toBe('timeout_after_send');
  });
});

// ─── Les echecs de fetch : prouve « jamais parti », sinon le doute ───────

describe('createFetchDgiTransport — quand fetch rejette', () => {
  const cas: readonly {
    nom: string;
    erreur: () => Error;
    kind: DgiTransportResult['kind'];
    reason: string;
  }[] = [
    {
      nom: 'DNS introuvable',
      erreur: () =>
        new TypeError('fetch failed', { cause: avecCode(new Error('getaddrinfo'), 'ENOTFOUND') }),
      kind: 'never_sent',
      reason: 'dns_failure',
    },
    {
      // La forme reelle sous undici : TypeError -> cause AggregateError -> errors[].
      nom: 'connexion refusee (AggregateError)',
      erreur: () =>
        new TypeError('fetch failed', {
          cause: new AggregateError(
            [avecCode(new Error('connect ECONNREFUSED 54.247.95.108:80'), 'ECONNREFUSED')],
            'fetch failed',
          ),
        }),
      kind: 'never_sent',
      reason: 'connection_refused',
    },
    {
      nom: 'timeout de CONNEXION : le socket n a jamais existe',
      erreur: () =>
        new TypeError('fetch failed', {
          cause: avecCode(new Error('Connect Timeout Error'), 'UND_ERR_CONNECT_TIMEOUT'),
        }),
      kind: 'never_sent',
      reason: 'timeout_before_send',
    },
    {
      nom: 'poignee de main TLS',
      erreur: () =>
        new TypeError('fetch failed', {
          cause: avecCode(new Error('certificate has expired'), 'CERT_HAS_EXPIRED'),
        }),
      kind: 'never_sent',
      reason: 'tls_failure',
    },
    {
      nom: 'DNS temporairement indisponible (EAI_AGAIN)',
      erreur: () =>
        new TypeError('fetch failed', { cause: avecCode(new Error('getaddrinfo'), 'EAI_AGAIN') }),
      kind: 'never_sent',
      reason: 'dns_failure',
    },
    {
      nom: 'connexion reinitialisee en cours d echange',
      erreur: () =>
        new TypeError('fetch failed', {
          cause: avecCode(new Error('socket hang up'), 'ECONNRESET'),
        }),
      kind: 'sent_no_answer',
      reason: 'connection_reset_in_flight',
    },
    {
      nom: 'tuyau casse en ecriture (EPIPE) : la requete a pu partir',
      erreur: () =>
        new TypeError('fetch failed', { cause: avecCode(new Error('broken pipe'), 'EPIPE') }),
      kind: 'sent_no_answer',
      reason: 'connection_reset_in_flight',
    },
    {
      nom: 'socket undici casse (UND_ERR_SOCKET)',
      erreur: () =>
        new TypeError('fetch failed', {
          cause: avecCode(new Error('other side closed'), 'UND_ERR_SOCKET'),
        }),
      kind: 'sent_no_answer',
      reason: 'connection_reset_in_flight',
    },
    {
      nom: 'timeout undici sur les EN-TETES : la requete est partie',
      erreur: () =>
        new TypeError('fetch failed', {
          cause: avecCode(new Error('Headers Timeout Error'), 'UND_ERR_HEADERS_TIMEOUT'),
        }),
      kind: 'sent_no_answer',
      reason: 'timeout_after_send',
    },
    {
      nom: 'timeout undici sur le CORPS : la requete est partie',
      erreur: () =>
        new TypeError('fetch failed', {
          cause: avecCode(new Error('Body Timeout Error'), 'UND_ERR_BODY_TIMEOUT'),
        }),
      kind: 'sent_no_answer',
      reason: 'timeout_after_send',
    },
    {
      // La garde anti-cycle de collectErrorCodes : un incident reseau ne doit
      // jamais devenir une boucle infinie, ET le code au-dela du cycle doit
      // quand meme etre trouve.
      nom: 'chaine de causes cyclique : pas de boucle, le code est trouve',
      erreur: () => {
        const a = new Error('enveloppe');
        const b = avecCode(new Error('connect ECONNREFUSED'), 'ECONNREFUSED');
        (a as Error & { cause?: unknown }).cause = b;
        (b as Error & { cause?: unknown }).cause = a;
        return new TypeError('fetch failed', { cause: a });
      },
      kind: 'never_sent',
      reason: 'connection_refused',
    },
    {
      // La borne de profondeur assume le conservatisme : un code prouvant
      // 'never_sent' enfoui trop profond est perdu, et le doute l'emporte —
      // jamais l'inverse.
      nom: 'code enfoui au-dela de la borne de profondeur : le doute',
      erreur: () => {
        let e: Error = avecCode(new Error('fond'), 'ECONNREFUSED');
        for (let i = 0; i < 10; i += 1) e = new Error(`niveau ${i}`, { cause: e });
        return e;
      },
      kind: 'sent_no_answer',
      reason: 'connection_reset_in_flight',
    },
    {
      // Le garde-fou central : sans preuve, on ne classe JAMAIS 'never_sent'
      // — ce serait autoriser un rejeu sur une facture peut-etre certifiee.
      nom: 'erreur inconnue : le doute l emporte',
      erreur: () => new Error('boom'),
      kind: 'sent_no_answer',
      reason: 'connection_reset_in_flight',
    },
  ];

  for (const c of cas) {
    it(c.nom, async () => {
      const probe = probeFetch(() => Promise.reject(c.erreur()));
      const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });

      const resultat = await transport.post(REQ);

      expect(resultat.kind).toBe(c.kind);
      if (resultat.kind !== 'answered') expect(resultat.reason).toBe(c.reason);
      expect(probe.count()).toBe(1);
    });
  }
});

// ─── La preuve anti-retry : UN fetch, quelle que soit l'issue ────────────

describe('createFetchDgiTransport — jamais de retry', () => {
  it("n'appelle fetch qu'UNE fois dans chaque famille d'issue", async () => {
    const familles: readonly { nom: string; probe: FetchProbe }[] = [
      { nom: '200', probe: probeFetch(() => new Response('{}', { status: 200 })) },
      {
        nom: '401',
        probe: probeFetch(() => new Response(JSON.stringify(CLE_INVALIDE), { status: 401 })),
      },
      { nom: '500', probe: probeFetch(() => new Response('oops', { status: 500 })) },
      {
        nom: 'rejet reseau',
        probe: probeFetch(() =>
          Promise.reject(
            new TypeError('fetch failed', { cause: avecCode(new Error('x'), 'ECONNRESET') }),
          ),
        ),
      },
      { nom: 'timeout', probe: probeFetch(fetchQuiNeRepondJamais) },
    ];

    for (const famille of familles) {
      const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: famille.probe.impl });
      await transport.post({ ...REQ, timeoutMs: 25 });
      // Un deuxieme appel ici serait un doublon officiel potentiel.
      expect(famille.probe.count(), famille.nom).toBe(1);
    }
  });
});

// ─── Le collage base + chemin ────────────────────────────────────────────

describe('createFetchDgiTransport — resolution d URL', () => {
  it('ne perd jamais le /ws de la base, quels que soient les slashes', async () => {
    for (const [base, chemin] of [
      ['http://54.247.95.108/ws', '/external/invoices/sign'],
      ['http://54.247.95.108/ws/', 'external/invoices/sign'],
      ['http://54.247.95.108/ws', 'external/invoices/sign'],
    ] as const) {
      const probe = probeFetch(() => new Response('{}', { status: 200 }));
      const transport = createFetchDgiTransport({ baseUrl: base, fetchImpl: probe.impl });
      await transport.post({ ...REQ, url: chemin });
      expect(probe.lastUrl()).toBe('http://54.247.95.108/ws/external/invoices/sign');
    }
  });

  it('laisse passer telle quelle une URL deja absolue', async () => {
    const probe = probeFetch(() => new Response('{}', { status: 200 }));
    const transport = createFetchDgiTransport({ baseUrl: BASE, fetchImpl: probe.impl });
    await transport.post({ ...REQ, url: 'http://autre-hote.example/ws/external/invoices/sign' });
    expect(probe.lastUrl()).toBe('http://autre-hote.example/ws/external/invoices/sign');
  });
});

// ─── Le double de rejeu ──────────────────────────────────────────────────

describe('createReplayTransport', () => {
  it('rejoue les scenarios dans l ordre et journalise chaque appel', async () => {
    const transport = createReplayTransport([
      { kind: 'answered', status: 200, body: CORPS_200 },
      { kind: 'answered', status: 401, body: CLE_INVALIDE },
    ]);

    const premier = attendre(await transport.post(REQ), 'answered');
    expect(premier.status).toBe(200);
    expect(premier.body).toEqual(CORPS_200);
    expect(premier.rawBody).toBe(JSON.stringify(CORPS_200));

    const second = attendre(
      await transport.post({ ...REQ, apiKeyRef: 'cle-marchand-02' }),
      'answered',
    );
    expect(second.status).toBe(401);

    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[0]?.apiKeyRef).toBe('cle-marchand-01');
    expect(transport.calls[1]?.apiKeyRef).toBe('cle-marchand-02');
    expect(transport.calls[0]?.url).toBe('/external/invoices/sign');
  });

  it('rejoue un corps HTML et les deux issues d incident, comme le reel', async () => {
    const scenarios: readonly DgiReplayScenario[] = [
      { kind: 'answered', status: 502, body: undefined, rawBody: '<html>502 Bad Gateway</html>' },
      { kind: 'sent_no_answer', reason: 'timeout_after_send' },
      { kind: 'never_sent', reason: 'connection_refused' },
    ];
    const transport = createReplayTransport(scenarios);

    const html = attendre(await transport.post(REQ), 'answered');
    expect(html.body).toBeUndefined();
    expect(html.rawBody).toBe('<html>502 Bad Gateway</html>');

    const doute = attendre(await transport.post(REQ), 'sent_no_answer');
    expect(doute.reason).toBe('timeout_after_send');

    const jamaisParti = attendre(await transport.post(REQ), 'never_sent');
    expect(jamaisParti.reason).toBe('connection_refused');
  });

  it('echoue FORT sur un appel de trop : un rejeu non prevu ne s improvise pas', async () => {
    const transport = createReplayTransport([{ kind: 'answered', status: 200, body: {} }]);
    await transport.post(REQ);
    await expect(transport.post(REQ)).rejects.toThrow(/sans scenario enregistre/);
    // L'appel fautif reste journalise : la trace dit ce qui s'est passe.
    expect(transport.calls).toHaveLength(2);
  });
});
