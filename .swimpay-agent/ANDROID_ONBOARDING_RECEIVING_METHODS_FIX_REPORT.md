# Android Onboarding + Receiving Methods Fix Report

generated_at: 2026-05-15T23:10:00+03:00

## Scope

- Fixed onboarding identity and bank selection UI.
- Fixed receiving-method edit/delete UX against the existing backend contract.
- Kept backend, API contracts, database, payment runtime, webhook runtime, receiver runtime and SDK behavior unchanged.

## Findings

- Ozon Bank already existed in `BankTargetLock.supportedTargets`, but `PremiumOnboardingSessionState.SUPPORTED_BANK_PROFILE_IDS` omitted `ozon_bank`, so onboarding ignored Ozon toggles.
- Onboarding bank rows used text fallback tiles instead of the existing registered bank logo component.
- The receiving-method `Modifier` action only patched `label`; the backend `PATCH /v1/merchant/receiving-methods/:method_id` accepts `label`, `status` and `is_default`, not raw card/phone values.
- Delete was already wired to `DELETE /v1/merchant/receiving-methods/:method_id`; if it still appears on device after confirmation, the likely causes are backend/session failure or stale reload, not a missing button callback.
- Local session restore already exists through `SharedPreferencesPremiumMobileMerchantSessionStore` with Android Keystore token protection and is used on app startup.

## Changes

- Added `ozon_bank` to onboarding supported bank ids.
- Added Ozon receiving-method label/code mapping in Android API wiring.
- Reused `PremiumBankLogo` on onboarding bank selection and receiving-method bank choice rows.
- Polished `PremiumBankLogo` with a white logo plate, softer padding, border and shadow so logos no longer look pasted against the container edge.
- Added launcher-icon badge usage to onboarding welcome/header surfaces.
- Changed receiving-method edit UI from "Modifier le libellé" to "Modifier la destination".
- Implemented Android-side replacement flow: create the new receiving method with the new value, then delete the old method only after creation succeeds.
- Kept raw card/phone values temporary: they are submitted to the existing create endpoint and cleared from UI state after success.

## Validation

- `npm run android:compile`: passed.
- Targeted Android JVM tests: passed for onboarding, Android API wiring, runtime contract, account session static guardrails and visual architecture guardrails.

