import { describe, expect, it } from 'vitest';
import { landingLocales, landingTranslations } from './i18n';

function flatten(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === 'object') return Object.values(value).flatMap(flatten);
  return [];
}

describe('landing i18n', () => {
  it('keeps French as the source locale with English and Cyrillic Russian derivatives', () => {
    expect(landingLocales).toEqual(['fr', 'en', 'ru']);
    expect(landingTranslations.fr.hero.primaryCta).toBe("Télécharger l'app Merchant");
    expect(landingTranslations.en.hero.primaryCta).toBe('Download Merchant app');
    expect(landingTranslations.ru.hero.primaryCta).toMatch(/[А-Яа-я]/u);
  });

  it('keeps every locale on the same dictionary structure', () => {
    const frenchKeys = JSON.stringify(Object.keys(landingTranslations.fr).sort());
    for (const locale of landingLocales) {
      expect(JSON.stringify(Object.keys(landingTranslations[locale]).sort())).toBe(frenchKeys);
      expect(landingTranslations[locale].features.cards).toHaveLength(landingTranslations.fr.features.cards.length);
      expect(landingTranslations[locale].download.bullets).toHaveLength(landingTranslations.fr.download.bullets.length);
    }
  });

  it('does not ship mojibake or replacement characters in visible landing copy', () => {
    const allCopy = landingLocales.flatMap((locale) => flatten(landingTranslations[locale])).join('\n');
    expect(allCopy).not.toMatch(/[\uFFFD\u00C3\u00C2]|(?:\u00D0|\u00D1)[\u0080-\u00ff]/u);
  });
});
