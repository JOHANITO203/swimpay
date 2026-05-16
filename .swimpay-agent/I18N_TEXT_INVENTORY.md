# I18N Text Inventory

generated_at: 2026-05-16T07:25:00+03:00

## Scope

- Landing page: `apps/landing`.
- Hosted checkout URL: `apps/web/src/screens/CheckoutScreen.ts`.
- Android Merchant app resources: `apps/android-receiver/android/app/src/main/res/values*`.

## Source Language

French is now the source/base language for the new localization foundation.

## Landing

- Status: localized foundation added.
- Default locale: `fr`.
- Derivatives: `en`, `ru`.
- Routing: `/fr/`, `/en/`, `/ru/` are supported by the landing SPA/nginx fallback.
- Guardrail: `apps/landing/src/i18n.test.ts`.

## Android

- Status: app-owned string resources normalized; premium account/settings copy partially normalized.
- Default `values/strings.xml`: French.
- Explicit derivatives: `values-en`, `values-ru`, `values-fr`.
- Guardrail: `tests/android-i18n-resources.test.ts`.
- Normalized Kotlin copy surfaces: `PremiumLocalizedCopy.kt`, `PremiumMerchantSettingsState.kt`, Appearance theme selector labels.
- Note: many Compose premium business screens still contain hardcoded copy in Kotlin. This pass created the resource baseline and fixed the active account/settings language path without refactoring every screen.

## Checkout URL

- Status: entry shell localized through `?lang=fr|en|ru`.
- French remains the default when `lang` is absent or invalid.
- Localized now: page title, brand subtitle, progress labels, intro title/text/features/start button/trust note.
- Guardrail: `apps/web/src/checkout.test.ts`.

## Encoding

- Added static checks for replacement characters and common French/Russian mojibake patterns on touched i18n surfaces.
