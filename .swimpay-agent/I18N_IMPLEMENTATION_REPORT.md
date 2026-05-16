# Internationalization Implementation Report

generated_at: 2026-05-16T07:25:00+03:00

## Implemented

1. Landing page i18n foundation:
   - `apps/landing/src/i18n.ts`
   - typed `fr`, `en`, `ru` dictionaries
   - language switcher in the navbar
   - nginx SPA fallback for localized paths

2. Android resource baseline:
   - French default strings in `values/strings.xml`
   - English derivative in `values-en/strings.xml`
   - Russian Cyrillic derivative in `values-ru/strings.xml`
   - explicit French derivative in `values-fr/strings.xml`

3. Hosted checkout URL:
   - `?lang=fr|en|ru` support
   - localized intro shell and progress language
   - form-post redirects preserve non-default `lang`

4. Guardrails:
   - landing dictionary structure + mojibake test
   - Android resource mojibake/Cyrillic test
   - checkout URL localization test
   - Android premium copy/settings labels mojibake test

5. Android premium UI copy continuation:
   - cleaned `PremiumLocalizedCopy.kt` UTF-8 French/Russian text
   - localized the Appearance theme selector labels for French, English and Russian
   - normalized lock-timeout labels with French accents

## Not Changed

- No backend contract was changed.
- No payment, webhook, receiver, database or SDK runtime logic was changed.
- No payment decision semantics were changed.

## Follow-Up

- Refactor remaining hardcoded Android Compose copy gradually into the existing language model/resources.
- Extend checkout localization beyond the intro shell to every later payment step after product wording review.
- Add landing SEO language alternate links when domains/routes are finalized.
