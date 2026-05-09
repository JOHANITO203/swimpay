# Android language and localization report

generated_at: 2026-05-09T00:08:00+03:00

Implemented the V1 language setting foundation.

## Result

- Added `PremiumLanguageOption` with French, English and Russian.
- Added persisted language selection through `PremiumMerchantSettingsStore`.
- Added a discreet login-page language switch.
- Added full language settings screen.
- Added Android string resources under `values`, `values-fr` and `values-ru`.
- Fix follow-up: added `PremiumLocalizedCopy` and wired visible copy on login/profile/login-provider/menu/language surfaces so language changes are immediately observable.

## Boundary

- Login and merchant settings surfaces now visibly react to the selected language.
- Some older dashboard/onboarding strings remain French and are tracked as localization debt.

## Tests

- Added guardrails proving FR/EN/RU resources exist, the login page exposes `PremiumLanguageSwitch`, and localized copy differs per language.
