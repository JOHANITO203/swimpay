import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const resRoot = join(root, 'apps/android-receiver/android/app/src/main/res');
const premiumCopyPath = join(
  root,
  'apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumLocalizedCopy.kt'
);
const premiumSettingsPath = join(
  root,
  'apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantSettingsState.kt'
);

function readResource(path: string): string {
  return readFileSync(join(resRoot, path, 'strings.xml'), 'utf8');
}

describe('Android Merchant i18n resources', () => {
  it('uses French as the default Android resource language', () => {
    const source = readResource('values');
    expect(source).toContain('Centre d’aide');
    expect(source).toContain('Sécurité');
    expect(source).toContain('Langue');
    expect(source).toContain('Apparence');
  });

  it('ships English and Cyrillic Russian derivatives for settings labels', () => {
    expect(readResource('values-en')).toContain('Help center');
    const russian = readResource('values-ru');
    expect(russian).toContain('Центр помощи');
    expect(russian).toMatch(/[А-Яа-я]/u);
  });

  it('does not ship mojibake in app-owned localized Android resources', () => {
    const combined = ['values', 'values-fr', 'values-en', 'values-ru'].map(readResource).join('\n');
    expect(combined).not.toMatch(/[\uFFFD\u00C3\u00C2]|(?:\u00D0|\u00D1)[\u0080-\u00ff]/u);
  });

  it('keeps premium Kotlin language copy readable in French and Cyrillic Russian', () => {
    const combined = `${readFileSync(premiumCopyPath, 'utf8')}\n${readFileSync(premiumSettingsPath, 'utf8')}`;
    expect(combined).toContain('Bienvenue sur SwimPay');
    expect(combined).toContain('Sécurité');
    expect(combined).toContain('Добро пожаловать');
    expect(combined).toContain('Русский');
    expect(combined).not.toMatch(/[\uFFFD\u00C3\u00C2]|(?:\u00D0|\u00D1)[\u0080-\u00ff]/u);
  });
});
