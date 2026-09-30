import { describe, expect, it } from 'vitest';
import {
  formatCiMsisdn,
  isMobile,
  MsisdnError,
  normalizeCiMsisdn,
  operatorOf,
} from './msisdn.js';
import {
  hashEquals,
  identifierHash,
  isUpgrade,
  meetsRequirement,
  resolveConflict,
  tierRank,
  type Claim,
} from './identity.js';

describe('Les numeros ivoiriens — les memes ou pas les memes', () => {
  it('ramene toutes les formes usuelles a la meme', () => {
    const attendu = '+2250707123456';
    for (const forme of [
      '0707123456',
      '+225 07 07 12 34 56',
      '+2250707123456',
      '00225 07 07 12 34 56',
      '225-07-07-12-34-56',
      '  07.07.12.34.56  ',
    ]) {
      expect(normalizeCiMsisdn(forme)).toBe(attendu);
    }
  });

  it('lit l operateur dans le prefixe', () => {
    expect(operatorOf('0707123456')).toBe('orange');
    expect(operatorOf('0507123456')).toBe('mtn');
    expect(operatorOf('0107123456')).toBe('moov');
  });

  it('refuse un numero trop court, trop long, ou de prefixe inconnu', () => {
    expect(() => normalizeCiMsisdn('070712345')).toThrow(MsisdnError);
    expect(() => normalizeCiMsisdn('07071234567')).toThrow(MsisdnError);
    expect(() => normalizeCiMsisdn('0907123456')).toThrow(MsisdnError);
    expect(() => normalizeCiMsisdn('')).toThrow(MsisdnError);
  });

  it('accepte un fixe mais ne lui reconnait pas de Mobile Money', () => {
    expect(normalizeCiMsisdn('2721234567')).toBe('+2252721234567');
    expect(isMobile('2721234567')).toBe(false);
    expect(isMobile('0707123456')).toBe(true);
  });

  it('affiche le numero comme on le dit', () => {
    expect(formatCiMsisdn('0707123456')).toBe('+225 07 07 12 34 56');
  });
});

/* Une vraie cle serveur, pas un mot : la fonction refuse tout ce qui fait
   moins de 16 octets, et c'est ce qu'on veut. */
const CLE = 'cle-serveur-de-32-octets-au-moins';
const AUTRE_CLE = 'une-autre-cle-de-32-octets-aussi';

describe('L empreinte de recherche', () => {
  it('rend la meme empreinte pour la meme valeur, et une autre sinon', () => {
    const k = CLE;
    const a = identifierHash(k, 'msisdn', '+2250707123456');
    const b = identifierHash(k, 'msisdn', '+2250707123456');
    const c = identifierHash(k, 'msisdn', '+2250707123457');
    expect(hashEquals(a, b)).toBe(true);
    expect(hashEquals(a, c)).toBe(false);
  });

  it('ne collisionne pas entre deux natures d identifiant', () => {
    const k = CLE;
    expect(hashEquals(identifierHash(k, 'msisdn', '123'), identifierHash(k, 'rib', '123'))).toBe(false);
  });

  it('change entierement si la cle serveur change', () => {
    const a = identifierHash(CLE, 'msisdn', '+2250707123456');
    const b = identifierHash(AUTRE_CLE, 'msisdn', '+2250707123456');
    expect(hashEquals(a, b)).toBe(false);
  });

  it('refuse une cle vide ou trop courte : un index qu on croit aveugle', () => {
    expect(() => identifierHash('', 'msisdn', '+2250707123456')).toThrow();
    expect(() => identifierHash('trop-court', 'msisdn', '+2250707123456')).toThrow();
  });
});

describe('Les anciens numeros a 8 chiffres', () => {
  it('les refuse : ils n existent plus depuis 2021', () => {
    // Le basculement s'est acheve le 28 fevrier 2021. Un 8 chiffres dans un
    // carnet client est une donnee perimee, pas un numero a completer.
    expect(() => normalizeCiMsisdn('07123456')).toThrow(MsisdnError);
    expect(() => normalizeCiMsisdn('07123456')).toThrow(/10 chiffres depuis 2021/);
  });
});

describe('Les paliers de verification', () => {
  it('ordonne du declare au fiscal', () => {
    expect(tierRank('declared')).toBeLessThan(tierRank('otp'));
    expect(tierRank('otp')).toBeLessThan(tierRank('document'));
    expect(tierRank('document')).toBeLessThan(tierRank('ncc'));
  });

  it('ne considere comme montee que ce qui monte', () => {
    expect(isUpgrade('declared', 'otp')).toBe(true);
    expect(isUpgrade('otp', 'otp')).toBe(false);
    expect(isUpgrade('document', 'otp')).toBe(false);
  });

  it('exige au moins le palier demande', () => {
    expect(meetsRequirement('otp', 'otp')).toBe(true);
    expect(meetsRequirement('document', 'otp')).toBe(true);
    expect(meetsRequirement('declared', 'otp')).toBe(false);
  });
});

describe('Le conflit d identite — qui possede le numero', () => {
  const c = (partyId: string, over: Partial<Claim> = {}): Claim => ({
    partyId,
    tier: 'declared',
    ...over,
  });

  it('transfere au challenger qui prouve, contre un titulaire qui a seulement declare', () => {
    const d = resolveConflict(
      c('titulaire'),
      c('challenger', { tier: 'otp', otpVerifiedAt: new Date('2026-08-29T10:00:00Z') }),
    );
    expect(d).toMatchObject({ kind: 'transfer', fromPartyId: 'titulaire', toPartyId: 'challenger' });
  });

  it('donne le numero au dernier OTP quand les deux ont prouve', () => {
    const d = resolveConflict(
      c('titulaire', { tier: 'otp', otpVerifiedAt: new Date('2026-01-01T00:00:00Z') }),
      c('challenger', { tier: 'otp', otpVerifiedAt: new Date('2026-08-29T10:00:00Z') }),
    );
    expect(d).toMatchObject({ kind: 'transfer', toPartyId: 'challenger' });
  });

  it('garde le titulaire si son OTP est le plus recent', () => {
    const d = resolveConflict(
      c('titulaire', { tier: 'otp', otpVerifiedAt: new Date('2026-08-29T10:00:00Z') }),
      c('challenger', { tier: 'otp', otpVerifiedAt: new Date('2026-01-01T00:00:00Z') }),
    );
    expect(d).toMatchObject({ kind: 'keep', partyId: 'titulaire' });
  });

  it('ne cede rien a un challenger qui n a pas prouve, meme avec un dossier', () => {
    const d = resolveConflict(
      c('titulaire', { tier: 'otp', otpVerifiedAt: new Date('2026-01-01T00:00:00Z') }),
      c('challenger', { tier: 'document' }),
    );
    expect(d).toMatchObject({ kind: 'keep', partyId: 'titulaire' });
  });

  it('monte en file quand personne n a prouve : ce n est pas a la machine de dire', () => {
    const d = resolveConflict(c('un'), c('deux'));
    expect(d).toMatchObject({ kind: 'escalate' });
  });

  it('ne tranche rien quand c est le meme party', () => {
    const d = resolveConflict(c('meme'), c('meme', { tier: 'otp' }));
    expect(d).toMatchObject({ kind: 'keep', partyId: 'meme' });
  });
});
