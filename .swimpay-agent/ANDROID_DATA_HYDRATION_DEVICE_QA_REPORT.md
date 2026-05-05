# Android Data Hydration and Device QA Report

Generated: 2026-05-05T21:21:19+03:00

## Scope

This pass focused only on the Android premium merchant frontend hydration and device verification.

No backend APIs, contracts, workers, database schema, payment logic, notification capture, webhook logic or auto-confirmation behavior were changed.

## Problem Addressed

After onboarding, the Android app showed generic unavailable states too often, especially `Données indisponibles`.

That made SwimPay feel inactive and too dependent on webhook/business data, even though the app has useful local Android state available immediately after onboarding.

## Root Cause

The active premium runtime treated several missing or offline data paths as full UI failures:

- dashboard backend unavailable;
- dashboard with no payments;
- review queue empty;
- receiving methods not hydrated;
- connected site/webhook missing;
- configuration test backend unavailable.

Local Android state existed but was not always surfaced when backend or webhook data was missing.

## Implementation Summary

The Android premium source of truth remains:

```text
MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime
apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium
```

Implemented changes:

- Added local-first dashboard hydration.
- Added merchant-friendly empty states.
- Added backend synchronization fallback states.
- Made webhook/connected-site state optional unless configured.
- Removed generic unavailable wording from active premium UI.
- Added tests for hydration, copy safety and fallback behavior.

## Local-State Cards

`Accueil` now renders useful local/system state even when backend or webhook data is not ready:

- `SwimPay Intelligence`
- `Téléphone connecté`
- `Notifications activées`
- `Dernière activité`
- `Banques actives`
- `Moyens de réception`

These do not depend on webhook delivery history.

## Backend Fallback States

Backend-backed UI now uses action-oriented merchant copy:

- `Connexion en attente`
- `Les données seront synchronisées dès que SwimPay sera connecté.`
- `Aucun paiement détecté pour le moment`
- `Lancez un test`
- `Aucun paiement à confirmer`
- `Vos ventes apparaîtront ici après validation des paiements.`

No fake real payments were introduced.

## Webhook Optional State

Connected-site/webhook absence no longer blocks the merchant console.

When not configured, the UI can show:

- `Site ou application à configurer`
- `Vous pouvez continuer à utiliser SwimPay. Les mises à jour automatiques seront disponibles après connexion.`

## Tests Added or Updated

Added:

- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidDataHydrationTest.kt`

Updated:

- `PremiumMerchantRuntimeContractTest.kt`
- `PremiumNavigationStateTest.kt`

Test coverage verifies:

- dashboard remains alive when backend is offline;
- no payments renders useful empty copy;
- no reviews renders `Aucun paiement à confirmer`;
- backend offline renders synchronization copy;
- webhook missing is optional;
- forbidden jargon is absent;
- raw phone/card/notification text is absent;
- no official bank confirmation wording is introduced.

## Validation Commands

Passed:

```text
npm run android:doctor
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1
apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1
```

Root test result:

```text
54 test files passed
382 tests passed
```

## Device QA

Device detected:

```text
R5CWA0FEPZW
model: SM_S916B
```

Commands run:

```text
adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk
adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity
adb -s R5CWA0FEPZW exec-out uiautomator dump /dev/tty
```

Results:

- APK install succeeded.
- MainActivity launched successfully.
- UIAutomator confirmed the dashboard renders live merchant-facing local-state cards.

Observed UI text from device:

- `Les données seront synchronisées dès que SwimPay sera connecté.`
- `SwimPay Intelligence`
- `Prête`
- `Téléphone connecté`
- `Connecté`
- `Notifications activées`
- `Activées`
- `Dernière activité`
- `Il y a quelques instants`
- `Banques actives`
- `5 détectées`
- `Moyens de réception`
- `À vérifier`

## Safety

No forbidden behavior was added:

- no real bank notification processing;
- no SMS;
- no Accessibility scraping;
- no broad installed-app enumeration;
- no auto-confirmation;
- no raw card/phone/notification text exposure;
- no official bank confirmation claim;
- no Android-side order confirmation;
- no Android-side developer webhook sending.

## Remaining Limitations

Non-critical:

- `Moyens de réception` currently shows `À vérifier` until a lightweight local/live receiving-method count is wired.
- Sales remain empty/local until a live Android sales/order summary contract is introduced.

## Recommendation

Next recommended sprint:

Android local merchant state refinement:

- replace conservative `Moyens de réception · À vérifier` with a real local/live count;
- add a small visual device QA pass for Accueil/Revue/Ventes/Menu after hydration;
- keep backend/payment/notification logic unchanged.

