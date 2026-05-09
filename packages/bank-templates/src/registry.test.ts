import { describe, expect, it } from 'vitest';
import {
  BankProfileRegistry,
  getDefaultBankProfilesDirectory,
  loadBankProfilesFromDirectory,
  validateBankProfileDocument
} from './registry.js';

describe('bank profile registry', () => {
  it('loads V1 bank profiles plus Ozon placeholder through package YAML assets', async () => {
    const registry = await BankProfileRegistry.loadDefault();
    const profiles = registry.listProfiles();

    expect(profiles.map((profile) => profile.bankProfileId).sort()).toEqual([
      'alfa_ru',
      'gazprombank_ru',
      'ozon_bank',
      'sberbank_ru',
      'tbank_ru',
      'vtb_ru'
    ]);
    expect(registry.getProfile('sber_ru')?.bankProfileId).toBe('sberbank_ru');
    expect(registry.getProfile('unknown_bank')).toBeNull();
  });

  it('returns review-only behavior for unknown bank profiles', async () => {
    const registry = await BankProfileRegistry.loadDefault();

    expect(registry.getRuntimeBehavior('unknown_bank')).toEqual({
      bankProfileId: 'unknown_bank',
      profileKnown: false,
      status: 'review_only',
      autoConfirmStatus: 'disabled',
      allowAutoConfirmCandidate: false,
      reasonCodes: ['unknown_bank_profile', 'requires_review']
    });
  });

  it('treats TO_VERIFY package and certificate metadata as untrusted', async () => {
    const registry = await BankProfileRegistry.loadDefault();
    const sberbank = registry.getProfile('sberbank_ru');

    expect(sberbank).not.toBeNull();
    expect(
      registry.evaluateBankAppTrust({
        bankProfileId: 'sberbank_ru',
        packageName: 'TO_VERIFY',
        certSha256: 'TO_VERIFY'
      })
    ).toEqual({
      trusted: false,
      reasonCode: 'bank_app_pending_verification'
    });
    expect(registry.getRuntimeBehavior('sberbank_ru')).toMatchObject({
      profileKnown: true,
      status: 'learning',
      autoConfirmStatus: 'review_only',
      allowAutoConfirmCandidate: false
    });
  });

  it('validates required profile fields', () => {
    expect(() =>
      validateBankProfileDocument({
        bank_profile_id: 'broken_ru',
        display_name: 'Broken Bank'
      })
    ).toThrow(/missing required field/i);
  });

  it('can load profiles from an explicit directory path', async () => {
    const profiles = await loadBankProfilesFromDirectory(getDefaultBankProfilesDirectory());

    expect(profiles).toHaveLength(6);
    expect(profiles.every((profile) => profile.trustedApps.length === 1)).toBe(true);
  });

  it('keeps Ozon Bank review-only until an exact Android package is validated', async () => {
    const registry = await BankProfileRegistry.loadDefault();
    const ozon = registry.getProfile('ozon_bank');

    expect(ozon).toMatchObject({
      bankProfileId: 'ozon_bank',
      displayName: 'Ozon Банк',
      status: 'review_only',
      autoConfirmStatus: 'disabled'
    });
    expect(ozon?.trustedApps[0]).toMatchObject({
      packageName: 'TO_VERIFY',
      certSha256: 'TO_VERIFY',
      verificationStatus: 'pending_verification'
    });
    expect(registry.getRuntimeBehavior('ozon_bank')).toMatchObject({
      profileKnown: true,
      allowAutoConfirmCandidate: false,
      reasonCodes: ['requires_review']
    });
  });
});
