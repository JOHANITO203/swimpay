/**
 * La machine a etats FNE et la surface executable de l'adapter.
 *
 * Jusqu'a la revue du 31 aout 2026, dgi-adapter.ts etait le plus gros fichier
 * du Cerveau (973 lignes) et AUCUN de ses exports n'etait nomme dans un test.
 * Or c'est ici que vivent les invariants qui coutent de l'argent : un rejeu
 * depuis un etat apres-envoi est un doublon officiel dans la serie annuelle
 * du marchand.
 *
 * Ces tests ne verifient pas la syntaxe des tables : ils verifient les REGLES
 * que les commentaires enoncent. Chaque `it` cite la regle qu'il tient.
 */
import { describe, expect, it } from 'vitest';
import {
  canTransition,
  isTerminal,
  readWarning,
  stickerVerdict,
  DgiValidationError,
  DgiResponseShapeError,
  FneAttemptError,
  FneCredentialBlockedError,
  FneEnvironmentGuardError,
  FneSingleFlightError,
  DGI_VALIDATION_RULES,
  FNE_STATES_AFTER_SEND,
  FNE_TERMINAL_STATES,
  FNE_TEST_HOSTS,
  FNE_TRANSITIONS,
  STICKER_THRESHOLD_CRITICAL,
  STICKER_THRESHOLD_LOW,
  type FneState,
} from './dgi-adapter.js';

const ETATS = Object.keys(FNE_TRANSITIONS) as FneState[];

describe('la machine a etats FNE — coherence de la table', () => {
  it('chaque cible de transition est un etat connu de la table', () => {
    for (const [de, vers] of Object.entries(FNE_TRANSITIONS)) {
      for (const cible of vers) {
        expect(ETATS, `${de} -> ${cible}`).toContain(cible);
      }
    }
  });

  it('les etats terminaux n ont aucune sortie, et ce sont les seuls', () => {
    for (const etat of ETATS) {
      const sansSortie = FNE_TRANSITIONS[etat].length === 0;
      expect(sansSortie, etat).toBe(FNE_TERMINAL_STATES.includes(etat));
    }
    expect(FNE_TERMINAL_STATES).toEqual(['accepted', 'abandoned']);
  });

  it('tout etat est atteignable depuis draft — pas d etat orphelin', () => {
    const vus = new Set<FneState>(['draft']);
    const file: FneState[] = ['draft'];
    while (file.length > 0) {
      for (const suivant of FNE_TRANSITIONS[file.pop()!]) {
        if (!vus.has(suivant)) {
          vus.add(suivant);
          file.push(suivant);
        }
      }
    }
    expect([...vus].sort()).toEqual([...ETATS].sort());
  });
});

describe('la machine a etats FNE — les regles qui coutent de l argent', () => {
  it('depuis submitted, exactement cinq sorties, et on ne revient jamais en arriere', () => {
    expect([...FNE_TRANSITIONS.submitted].sort()).toEqual(
      ['accepted', 'blocked', 'rejected', 'uncertain', 'unreachable'].sort(),
    );
    // « Depuis submitted, on ne revient pas en arriere » : ni draft, ni
    // validated_local, ni queued ne sont des sorties directes.
    for (const arriere of ['draft', 'validated_local', 'queued'] as const) {
      expect(canTransition('submitted', arriere)).toBe(false);
    }
  });

  it('uncertain n a JAMAIS de sortie automatique vers la file', () => {
    // Le rejeu du doute est LE doublon le plus probable du module : la seule
    // maniere de repartir est une resolution humaine (accepted si retrouvee,
    // validated_local si prouvee absente, abandoned si on renonce).
    expect(canTransition('uncertain', 'queued')).toBe(false);
    expect(canTransition('uncertain', 'submitted')).toBe(false);
    expect([...FNE_TRANSITIONS.uncertain].sort()).toEqual(
      ['abandoned', 'accepted', 'validated_local'].sort(),
    );
  });

  it('unreachable est le SEUL etat apres tentative qui revient en file tout seul', () => {
    const reviennentEnFile = ETATS.filter(
      (e) => e !== 'validated_local' && canTransition(e, 'queued'),
    );
    expect(reviennentEnFile.sort()).toEqual(['blocked', 'unreachable'].sort());
    // et blocked n'est pas un etat apres-envoi : la cle etait inutilisable,
    // rien n'est parti. Le rejeu n'y cree pas de doublon.
    expect(FNE_STATES_AFTER_SEND).not.toContain('blocked');
    expect(FNE_STATES_AFTER_SEND).not.toContain('unreachable');
  });

  it('aucun etat apres-envoi ne retourne DIRECTEMENT en file', () => {
    for (const etat of FNE_STATES_AFTER_SEND) {
      expect(canTransition(etat, 'queued'), etat).toBe(false);
      expect(canTransition(etat, 'submitted'), etat).toBe(false);
    }
  });

  it('accepted est irreversible : rien n en sort, meme pas abandoned', () => {
    for (const cible of ETATS) {
      expect(canTransition('accepted', cible)).toBe(false);
    }
    expect(isTerminal('accepted')).toBe(true);
  });

  it('rejected repart par la correction, jamais par le rejeu direct', () => {
    // 400 : la DGI n'a rien fait. On corrige (validated_local) puis on
    // refait la queue — le detour est voulu, il force la re-validation.
    expect(canTransition('rejected', 'validated_local')).toBe(true);
    expect(canTransition('rejected', 'queued')).toBe(false);
  });

  it('tant que rien n est parti, corriger est gratuit', () => {
    expect(canTransition('draft', 'validated_local')).toBe(true);
    expect(canTransition('validated_local', 'draft')).toBe(true);
    expect(canTransition('queued', 'validated_local')).toBe(true);
  });

  it('une garde refuse ce qu elle ne connait pas — elle ne plante pas', () => {
    // Les etats arrivent d'une colonne de base : une valeur inconnue (ajoutee
    // par une migration future, ou corrompue) doit produire « non », pas une
    // exception que l'appelant prendrait pour une panne technique.
    const inconnu = 'archived' as FneState;
    expect(canTransition(inconnu, 'queued')).toBe(false);
    expect(canTransition('draft', inconnu)).toBe(false);
    expect(isTerminal(inconnu)).toBe(false);
  });
});

describe('readWarning — le champ que la DGI type string et envoie booleen', () => {
  it('les booleens passent tels quels', () => {
    expect(readWarning(true)).toBe(true);
    expect(readWarning(false)).toBe(false);
  });

  it('les chaines conventionnelles sont lues, espaces et casse compris', () => {
    expect(readWarning('true')).toBe(true);
    expect(readWarning('TRUE')).toBe(true);
    expect(readWarning(' 1 ')).toBe(true);
    expect(readWarning('false')).toBe(false);
    expect(readWarning('0')).toBe(false);
    expect(readWarning('')).toBe(false);
    expect(readWarning('   ')).toBe(false);
  });

  it('un message d alerte non vide EST une alerte', () => {
    expect(readWarning('Alerte sur le stock de sticker')).toBe(true);
  });

  it('tout le reste est un aveu d ignorance, pas un defaut de tranchage', () => {
    expect(readWarning(1)).toBe('unknown');
    expect(readWarning(0)).toBe('unknown');
    expect(readWarning(null)).toBe('unknown');
    expect(readWarning(undefined)).toBe('unknown');
    expect(readWarning({})).toBe('unknown');
  });
});

describe('stickerVerdict — les seuils sont les notres, leurs bords aussi', () => {
  it('les bords exacts des deux seuils', () => {
    expect(stickerVerdict(STICKER_THRESHOLD_CRITICAL)).toBe('critical');
    expect(stickerVerdict(STICKER_THRESHOLD_CRITICAL + 1)).toBe('low');
    expect(stickerVerdict(STICKER_THRESHOLD_LOW)).toBe('low');
    expect(stickerVerdict(STICKER_THRESHOLD_LOW + 1)).toBe('ok');
  });

  it('zero et negatif sont critiques : le stock est epuise ou incoherent', () => {
    expect(stickerVerdict(0)).toBe('critical');
    expect(stickerVerdict(-3)).toBe('critical');
  });

  it('l absence et l infini rendent unknown, jamais un verdict invente', () => {
    expect(stickerVerdict(undefined)).toBe('unknown');
    expect(stickerVerdict(Number.NaN)).toBe('unknown');
    expect(stickerVerdict(Number.POSITIVE_INFINITY)).toBe('unknown');
  });

  it('les seuils restent ordonnes — critical sous low', () => {
    expect(STICKER_THRESHOLD_CRITICAL).toBeLessThan(STICKER_THRESHOLD_LOW);
  });
});

describe('les erreurs typees — toutes avant le premier octet', () => {
  it('chacune porte son name, son message et ses champs', () => {
    const validation = new DgiValidationError('DGI_V_NO_LINES', 'aucune ligne', 'items');
    expect(validation.name).toBe('DgiValidationError');
    expect(validation.code).toBe('DGI_V_NO_LINES');
    expect(validation.field).toBe('items');
    expect(validation).toBeInstanceOf(Error);

    const tentative = new FneAttemptError('hash_mismatch', 'le corps a change');
    expect(tentative.name).toBe('FneAttemptError');
    expect(tentative.code).toBe('hash_mismatch');

    const verrou = new FneSingleFlightError('inv_42');
    expect(verrou.name).toBe('FneSingleFlightError');
    expect(verrou.invoiceId).toBe('inv_42');
    expect(verrou.message).toContain('inv_42');

    const garde = new FneEnvironmentGuardError('NCC reel vers hote de test');
    expect(garde.name).toBe('FneEnvironmentGuardError');

    const cle = new FneCredentialBlockedError('m_7', 'invalid_api_key');
    expect(cle.name).toBe('FneCredentialBlockedError');
    expect(cle.merchantPartyId).toBe('m_7');
    expect(cle.reason).toBe('invalid_api_key');
    expect(cle.message).toContain('m_7');

    const forme = new DgiResponseShapeError('200 illisible', { corps: 'brut' });
    expect(forme.name).toBe('DgiResponseShapeError');
    expect(forme.raw).toEqual({ corps: 'brut' });
  });
});

describe('le catalogue de validation a priori', () => {
  it('aucun code en double', () => {
    const codes = DGI_VALIDATION_RULES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('chaque regle dit ce qu elle verifie, ce qu elle evite, et ce que coute le manquement', () => {
    for (const r of DGI_VALIDATION_RULES) {
      expect(r.rule.length, r.code).toBeGreaterThan(0);
      expect(r.prevents.length, r.code).toBeGreaterThan(0);
      expect(['pdf', 'repo', 'prudence'], r.code).toContain(r.source);
      expect(
        ['sticker', 'sticker+numero', 'document_faux', 'blocage', 'fuite_donnees'],
        r.code,
      ).toContain(r.cost);
    }
  });

  it('les deux disciplines anti-doublon du module sont bien au catalogue', () => {
    const codes = DGI_VALIDATION_RULES.map((r) => r.code);
    expect(codes).toContain('DGI_V_ALREADY_CERTIFIED');
    expect(codes).toContain('DGI_V_UNCERTAIN_UNRESOLVED');
  });
});

describe('les hotes de test', () => {
  it('l hote de test documente par le PDF est connu', () => {
    expect(FNE_TEST_HOSTS).toContain('54.247.95.108');
  });
});
