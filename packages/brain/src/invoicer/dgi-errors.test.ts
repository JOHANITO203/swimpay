import { describe, expect, it } from 'vitest';
import {
  classifyDgiError,
  classifyDgiFailure,
  policyFor,
  type DgiFailure,
} from './dgi-errors.js';

/* Les charges utiles ci-dessous ne sont pas inventees : elles ont ete relevees
   le 29 aout 2026 sur l'environnement de test officiel de la DGI,
   `http://54.247.95.108/ws`, et sont recopiees a l'octet pres. Un test qui
   invente sa donnee d'entree ne prouve rien sur le monde reel. */

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

const ROUTE_INCONNUE = {
  message: 'Cannot POST /ws/auth/nexiste-pas',
  error: 'not_found',
  statusCode: 404,
  errors: {},
};

describe('classifyDgiError — sur les reponses reellement observees', () => {
  it('distingue la cle absente de la cle invalide, malgre le meme 401', () => {
    expect(classifyDgiError(401, CLE_ABSENTE)).toBe('missing_api_key');
    expect(classifyDgiError(401, CLE_INVALIDE)).toBe('invalid_api_key');
  });

  it('distingue les DEUX 404, qui veulent dire le contraire l un de l autre', () => {
    expect(classifyDgiError(404, ENTREPRISE_INCONNUE)).toBe('company_not_found');
    expect(classifyDgiError(404, ROUTE_INCONNUE)).toBe('route_not_found');
  });

  it('lit le slug, pas le code : un slug connu prime sur un code trompeur', () => {
    // Si une passerelle reecrit le statut, le slug reste la verite.
    expect(classifyDgiError(200, ENTREPRISE_INCONNUE)).toBe('company_not_found');
    expect(classifyDgiError(500, ROUTE_INCONNUE)).toBe('route_not_found');
  });
});

describe('classifyDgiError — quand le corps manque ou ne se lit pas', () => {
  it('retombe sur le transport pour les cas non ambigus', () => {
    expect(classifyDgiError(401, undefined)).toBe('invalid_api_key');
    expect(classifyDgiError(400, null)).toBe('bad_request');
    expect(classifyDgiError(503, '<html>502 Bad Gateway</html>')).toBe('server_error');
  });

  it('REFUSE de trancher un 404 sans slug', () => {
    // C'est le coeur du sujet : trancher au hasard enverrait un bug d URL de
    // notre cote dans la file des marchands, ou il resterait invisible.
    expect(classifyDgiError(404, undefined)).toBe('unknown');
    expect(classifyDgiError(404, { detail: 'nope' })).toBe('unknown');
  });

  it('ignore une enveloppe incomplete plutot que de deviner', () => {
    expect(classifyDgiError(404, { error: 'company_not_found' })).toBe('unknown');
    expect(classifyDgiError(404, { message: 'Company not found' })).toBe('unknown');
  });
});

describe('la politique attachee a chaque cas', () => {
  it('ne rejoue JAMAIS, quel que soit le cas', () => {
    const tous: DgiFailure[] = [
      'missing_api_key',
      'invalid_api_key',
      'company_not_found',
      'route_not_found',
      'bad_request',
      'server_error',
      'unknown',
    ];
    for (const f of tous) {
      expect(policyFor(f).retryable, `${f} ne doit pas etre rejouable`).toBe(false);
    }
  });

  it('seule la cle invalide gele la file du marchand', () => {
    expect(policyFor('invalid_api_key').freezesMerchant).toBe(true);
    expect(policyFor('company_not_found').freezesMerchant).toBe(false);
    expect(policyFor('bad_request').freezesMerchant).toBe(false);
    expect(policyFor('route_not_found').freezesMerchant).toBe(false);
  });

  it('route inconnue et cle absente sont NOS bugs, pas ceux du marchand', () => {
    expect(policyFor('route_not_found').ourBug).toBe(true);
    expect(policyFor('missing_api_key').ourBug).toBe(true);
    expect(policyFor('company_not_found').ourBug).toBe(false);
    expect(policyFor('invalid_api_key').ourBug).toBe(false);
  });

  it('marque comme incertains les seuls cas ou le sticker a pu partir', () => {
    expect(policyFor('server_error').outcomeUnknown).toBe(true);
    expect(policyFor('unknown').outcomeUnknown).toBe(true);
    // Un refus explicite est un refus : la DGI dit qu elle n a rien fait.
    expect(policyFor('company_not_found').outcomeUnknown).toBe(false);
    expect(policyFor('bad_request').outcomeUnknown).toBe(false);
    expect(policyFor('invalid_api_key').outcomeUnknown).toBe(false);
  });
});

describe('preuve negative — le classement par code HTTP se tromperait', () => {
  it('les deux 404 auraient le meme sort si on classait par code', () => {
    const a = classifyDgiFailure(404, ENTREPRISE_INCONNUE);
    const b = classifyDgiFailure(404, ROUTE_INCONNUE);
    expect(a.failure).not.toBe(b.failure);
    // Et surtout : ils ne partent PAS au meme endroit.
    expect(a.ourBug).toBe(false);
    expect(b.ourBug).toBe(true);
  });

  it('les deux 401 aussi', () => {
    const a = classifyDgiFailure(401, CLE_ABSENTE);
    const b = classifyDgiFailure(401, CLE_INVALIDE);
    expect(a.failure).not.toBe(b.failure);
    // Une cle oubliee ne doit pas geler la file de tout un marchand.
    expect(a.freezesMerchant).toBe(false);
    expect(b.freezesMerchant).toBe(true);
  });
});
