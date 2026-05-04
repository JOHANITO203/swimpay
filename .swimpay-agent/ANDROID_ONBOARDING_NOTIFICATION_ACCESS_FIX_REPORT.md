# Android Onboarding Notification Access Fix

generated_at: 2026-05-05T01:34:00+03:00

## Scope

Focused Android frontend/runtime wiring fix after operator concern that Notification Access consent looked visual-only and onboarding restarted too often.

No backend, API, worker, database, payment decision, webhook, SMS, Accessibility, package enumeration, real notification capture or auto-confirmation logic was changed.

## Result

Status: PASS.

## What Changed

- Added `PremiumOnboardingCompletionStore`.
- Added `SharedPreferencesPremiumOnboardingStateStore`.
- Added `PremiumOnboardingNavigation.initialRoute`.
- `PremiumMerchantApp` now starts at:
  - `landing` when onboarding is not completed;
  - `main` when onboarding completion is persisted.
- Completing premium onboarding now calls `markCompleted()`.
- `MainActivity` now reads real Notification Listener Access through `NotificationAccessStatusReader`.
- `MainActivity` refreshes Notification Access state in `onResume`.
- The premium authorization step now:
  - opens Android Notification Listener settings when access is disabled;
  - continues onboarding only when access is enabled.
- Added a permanent secondary action:
  - `OUVRIR LES REGLAGES NOTIFICATIONS`.
- The Android settings intent now includes `Settings.EXTRA_APP_PACKAGE` with the SwimPay package name when launching notification listener settings.
- The authorization guide now explicitly tells the merchant to:
  - search for SwimPay in the Android list;
  - enable the SwimPay switch;
  - return to SwimPay.
- Removed unsafe onboarding wording around `Policy Engine`, `AI (EXPERT)` and payment automation.
- Replaced that section with deterministic merchant-facing validation copy:
  - `Validation sûre`;
  - `MODE DE VALIDATION`;
  - `REVUE HUMAINE`;
  - `OPTION FUTURE`.

## Safety Assertions

- Android still never confirms orders.
- Android still never sends developer webhooks directly.
- No SMS permission was added.
- No Accessibility scraping was added.
- No real bank notification was captured, read, uploaded, parsed or matched.
- No raw notification storage was enabled.
- No auto-confirmation was enabled.
- No official bank confirmation wording was introduced.
- No LLM/AI payment-decision wording is shown in onboarding.

## Validation

- RED test confirmed before implementation:
  - `:app:testDebugUnitTest` failed because `PremiumOnboardingNavigation` and `InMemoryPremiumOnboardingStateStore` did not exist.
- Android JVM tests:
  - `:app:testDebugUnitTest` passed.
- Android static guardrails:
  - premium onboarding must not contain `Policy Engine`;
  - premium onboarding must not contain `AI (EXPERT)`;
  - premium onboarding must not contain `ALGORITHME DE CONFIANCE`;
  - premium onboarding must not contain `paiements automatiques`.
- Android build:
  - `:app:assembleDebug` passed.
- Device install and launch:
  - `adb devices -l` detected `R5CWA0FEPZW`.
  - `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` returned `Success`.
  - `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` launched the app.
  - `uiautomator dump` verified the authorization screen shows:
    - `Cherchez SwimPay dans la liste Android`;
    - `Activez l'interrupteur SwimPay`;
    - `Revenez dans SwimPay`;
    - `OUVRIR LES REGLAGES NOTIFICATIONS`.
  - Tapping the button opened Android `Accès aux notifications`.
  - `SwimPay Receiver` was visible in the Android notification access list.
- Root validation:
  - `npm run android:doctor` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed after blocker wording was corrected to reflect the current non-critical Sprint 7I gate.
  - `npm run build` passed.
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
  - `docker compose --env-file .env.example -f infra/docker-compose.yml ps` showed all services healthy.
  - `GET http://localhost:8080/api-health` returned database, NATS and Valkey as `ok`.

## Device QA

- Device connected and authorized through ADB.
- APK installed successfully.
- App launched successfully.
- Authorization screen verified through UI tree dump.
- Android notification access settings opened successfully.
- SwimPay Receiver was visible in the Android notification access list.

## Blockers

- Hard gate for Sprint 7I real Sberbank notification shadow capture remains explicit operator consent.
- No current blocker for the Android onboarding notification access flow.

## Next Action

Use the real Android settings screen to enable or verify notification access:

1. Tap `OUVRIR LES REGLAGES NOTIFICATIONS`.
2. Find `SwimPay Receiver`.
3. Enable its notification access switch if it is not enabled.
4. Return to SwimPay; the app refreshes the access state in `onResume`.
5. Continue onboarding when the primary CTA shows `CONTINUER L'ONBOARDING`.
