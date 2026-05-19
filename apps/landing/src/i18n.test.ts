import { describe, expect, it } from 'vitest';
import { defaultLandingLocale, landingLocalePath, landingLocales, landingSeoTranslations, landingTranslations } from './i18n';

function flatten(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === 'object') return Object.values(value).flatMap(flatten);
  return [];
}

describe('landing i18n', () => {
  it('keeps Russian as the primary locale with French and English derivatives', () => {
    expect(defaultLandingLocale).toBe('ru');
    expect(landingLocales).toEqual(['ru', 'fr', 'en']);
    expect(landingTranslations.fr.hero.primaryCta).toBe("Télécharger l'app Merchant");
    expect(landingTranslations.en.hero.primaryCta).toBe('Download Merchant app');
    expect(landingTranslations.ru.hero.primaryCta).toMatch(/[А-Яа-я]/u);
  });

  it('keeps every locale on the same dictionary structure', () => {
    const primaryKeys = JSON.stringify(Object.keys(landingTranslations[defaultLandingLocale]).sort());
    for (const locale of landingLocales) {
      expect(JSON.stringify(Object.keys(landingTranslations[locale]).sort())).toBe(primaryKeys);
      expect(landingTranslations[locale].features.cards).toHaveLength(landingTranslations[defaultLandingLocale].features.cards.length);
      expect(landingTranslations[locale].download.bullets).toHaveLength(landingTranslations[defaultLandingLocale].download.bullets.length);
    }
  });

  it('does not ship mojibake or replacement characters in visible landing copy', () => {
    const allCopy = landingLocales.flatMap((locale) => flatten(landingTranslations[locale])).join('\n');
    expect(allCopy).not.toMatch(/[\uFFFD\u00C3\u00C2]|(?:\u00D0|\u00D1)[\u0080-\u00ff]/u);
  });

  it('keeps internal implementation instructions out of customer-facing copy', () => {
    const allCopy = landingLocales.flatMap((locale) => flatten(landingTranslations[locale])).join('\n').toLowerCase();
    expect(allCopy).not.toContain('the landing must show');
    expect(allCopy).not.toContain('la landing doit montrer');
    expect(allCopy).not.toContain('лендинг показывает');
  });

  it('ships translated SEO metadata for every landing locale', () => {
    expect(Object.keys(landingSeoTranslations).sort()).toEqual([...landingLocales].sort());
    expect(landingSeoTranslations.ru.htmlLang).toBe('ru');
    expect(landingSeoTranslations.fr.htmlLang).toBe('fr');
    expect(landingSeoTranslations.en.htmlLang).toBe('en');
    expect(landingSeoTranslations.ru.title).toMatch(/[А-Яа-я]/u);
    expect(landingSeoTranslations.fr.description).toContain('APK Android');
    expect(landingSeoTranslations.en.description).toContain('Android merchant APK');
  });

  it('uses the root path for the Russian primary landing locale', () => {
    expect(landingLocalePath('ru')).toBe('/');
    expect(landingLocalePath('fr')).toBe('/fr/');
    expect(landingLocalePath('en')).toBe('/en/');
  });
});
