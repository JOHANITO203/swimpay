# Android Local Merchant State Refinement Report

Generated: 2026-05-05

## Summary

This sprint refined Android premium local merchant state after the data hydration pass.

The work stayed inside Android premium frontend/runtime state. No backend APIs, contracts, payment logic, review logic, notification capture, webhooks or auto-confirmation behavior were changed.

## Receiving Methods Count Behavior

Accueil no longer renders `Moyens de réception · À vérifier` when a safer state is available.

New behavior:

- known active methods: `1 actif` or `N actifs`;
- no methods configured: `À ajouter`;
- backend/session unavailable: `Connexion en attente`.

The count is derived from the existing receiving routes repository and displays only safe merchant labels.

No raw card or phone is exposed.

## Ventes Local State

Ventes now renders an intentional local state before live sales/order summary contracts exist:

- `Aucune vente confirmée`;
- `Vos ventes apparaîtront ici après confirmation des paiements.`;
- `Lancer un test`;
- `Voir les paiements à confirmer`.

The screen no longer presents zero amounts as if they were live sales data when `usesLiveApi=false`.

No fake order rows, fake clients or fake live payments are introduced.

## Tests

Added/updated Android JVM tests verifying:

- Accueil receiving-method card uses count/action/sync states;
- Accueil does not show `Moyens de réception · À vérifier` when known data is available;
- Ventes has merchant-friendly empty copy;
- Ventes does not invent fake real payments;
- webhook absence does not make Accueil or Ventes dead;
- forbidden jargon is absent;
- raw phone/card/notification text is absent;
- no official bank confirmation or auto-confirm wording appears.

## Validation Commands

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` — 54 files, 382 tests passed.
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

## Device QA

Device detected:

- `R5CWA0FEPZW`
- model: `SM_S916B`

APK installation and launch passed:

- `adb -t 1 install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -t 1 shell am start -n com.swimpay.receiver/.MainActivity`

UI dump confirmed:

- Accueil renders `Connexion en attente` instead of a dead unavailable state when live data is not hydrated.
- Accueil renders premium local cards such as `SwimPay Intelligence` and `Téléphone connecté`.
- Ventes renders non-live metrics as `—` instead of fake zero sales.
- Ventes renders `Aucune vente confirmée`, `Vos ventes apparaîtront ici après confirmation des paiements.`, `Lancer un test` and `Voir les paiements à confirmer`.

## Remaining Limitations

- If the receiving-method repository is unreachable and no local persisted receiving-method summary exists, Accueil shows `Connexion en attente`.
- Ventes remains local/non-live until a future Android sales/order summary contract is explicitly added.

## Next Recommended Sprint

Android local persisted merchant summary:

- persist a tiny safe local summary after receiving-method setup;
- reuse it when backend is offline;
- keep the backend API unchanged unless a future contract sprint explicitly approves a new endpoint.
