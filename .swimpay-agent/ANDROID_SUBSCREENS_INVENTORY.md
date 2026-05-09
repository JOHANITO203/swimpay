# Android merchant sub-screens inventory

generated_at: 2026-05-09T00:08:00+03:00

Scope: Centre d'aide, Contacter le support, Securite, Langue, Apparence, Mode de confirmation.

## Active Android path

- Entrypoint: `MainActivity`.
- Runtime shell: `PremiumMerchantApp`.
- Active UI source: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`.
- Navigation source: `PremiumNavigationState`.
- Backend client/runtime: `AndroidMerchantApiWiring` and `PremiumMerchantRuntime`.
- Local settings storage before sprint: incomplete for these sub-screens.

## Screen inventory

- Centre d'aide: missing as a navigable screen; menu row existed but was inert.
- Contacter le support: missing; no Android support ticket contract existed.
- Securite: existed but mostly decorative; no app-lock state or Android system credential prompt.
- Langue: menu row existed but was inert; no language state or login-page switch.
- Apparence: menu row existed but was inert; no central theme setting.
- Mode de confirmation: existed; needed V1-safe copy and future-only IA exclusion.

## Backend inventory

- No support ticket endpoint existed for Android merchants.
- No confirmation settings endpoint existed for Android merchants.
- No support ticket persistence table existed.

## Safety findings

- Android must remain capture/redact/sign/upload only.
- Android must not expose API key or webhook secret show-once values.
- IA direction can stay visible only as future-only, inactive in V1.
- No real bank notification processing was started.
