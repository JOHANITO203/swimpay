# Android Data Hydration Report

Generated: 2026-05-05

## Summary

Sprint scope was Android premium frontend hydration only. Backend APIs, contracts, payment logic, review logic, notification processing, webhooks and auto-confirmation were not changed.

The app previously felt inactive because several merchant screens treated backend or webhook absence as a full UI failure. That hid local Android truth such as Notification Access, supported-bank detection and Receiver readiness.

## Why unavailable data appeared

- `PremiumScreenState.error()` defaulted to `Données indisponibles`.
- `PremiumMerchantRuntime.loadDashboard()` returned an empty/error state when the dashboard endpoint had no activity or was unavailable.
- Webhook/connected-site failures were rendered as a problem for the merchant app instead of an optional business integration state.
- Review and receiving-method errors used endpoint-specific unavailable copy instead of synchronization/offline copy.
- Local Receiver state existed but was only visible when backend dashboard content loaded successfully.

## Local-state cards implemented

`Accueil` now stays alive with local/system cards:

- SwimPay Intelligence
- Téléphone connecté
- Notifications activées
- Dernière activité
- Banques actives
- Moyens de réception

These cards are derived from Android/runtime state and supported bank target probing, not webhook delivery history.

## Backend fallback states

Backend-backed areas now use merchant-friendly fallbacks:

- Dashboard backend missing: content stays visible with `Connexion en attente`.
- No recent payments: `Aucun paiement détecté pour le moment` and `Lancez un test`.
- Review queue empty: `Aucun paiement à confirmer`.
- Review/receiving-method/configuration backend offline: `Les données seront synchronisées dès que SwimPay sera connecté.`
- Sales empty state: `Vos ventes apparaîtront ici après validation des paiements.`

## Webhook optional state

Connected site/webhook is now optional unless configured:

- `Site ou application à configurer`
- `Vous pouvez continuer à utiliser SwimPay. Les mises à jour automatiques seront disponibles après connexion.`

Webhook absence no longer makes Accueil, Revue or SwimPay Intelligence look unavailable.

## Tests added

Added `AndroidDataHydrationTest.kt` covering:

- dashboard remains alive when backend is offline;
- dashboard no-payment state uses useful copy;
- Review empty/offline states are merchant-friendly;
- connected site missing is optional;
- receiving methods backend offline uses sync copy;
- no forbidden merchant jargon, raw card/phone or notification text appears in the hydrated UI models.

Updated `PremiumMerchantRuntimeContractTest.kt` to reflect the new local-first dashboard and optional connected-site behavior.

## Remaining limitations

- `Moyens de réception` count on Accueil is currently conservative (`À vérifier`) because the dashboard does not yet receive a lightweight local receiving-method count.
- Sales remain empty/local until a live Android sales/order summary contract is introduced.
- The dashboard still uses live backend recent payment rows when available; it does not invent fake payments.

## Validation status

- Targeted Android hydration/runtime/navigation tests passed.
- Full Android debug JVM tests passed.
- Root validation passed: android doctor, typecheck, lint, tests, build and Compose config.
- Android debug APK build passed.
- Device smoke was not run in this pass because `adb devices -l` returned no connected authorized device.
