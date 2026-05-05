# Sprint 7K Report — Android Premium Merchant Operating Model

generated_at: 2026-05-05T00:00:00+03:00

## Result

Sprint 7K consolidates the Android merchant app around the premium operating model and keeps `ui/premium` as the active visual source of truth.

No backend APIs, contracts, workers, payment logic, review logic, notification processing, auto-confirmation, SMS, Accessibility scraping or raw PII behavior were changed.

## Source Of Truth Cleanup

- Active visual path remains `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
- Premium UI source remains `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`.
- Legacy `ui/screens` Kotlin visual sources remain inactive and absent from the tracked app source.
- Preserved high-risk runtime/API files:
  - `MainActivity.kt`
  - `PremiumMerchantApp.kt`
  - `PremiumMerchantRuntime.kt`
  - `AndroidMerchantApiWiring.kt`
  - `AndroidMerchantUiModels.kt`
  - `NotificationAccessStatusReader.kt`
  - `ReceiverOnboardingReadiness.kt`
  - `AndroidManifest.xml`

## Bank Target Lock

Implemented a safe internal Bank Target Lock model in `BankTargetLock.kt`.

Supported exact package targets:

- `sber_ru` / Sberbank / `ru.sberbankmobile`
- `tbank_ru` / T-Bank / `com.idamob.tinkoff.android`
- `vtb_ru` / VTB / `ru.vtb24.mobilebanking.android`
- `alfa_ru` / Alfa-Bank / `ru.alfabank.mobile.android`
- `gazprombank_ru` / Gazprombank / `ru.gazprombank.android.mobilebank.app`

Safety properties:

- exact supported package probe only;
- no `QUERY_ALL_PACKAGES`;
- no broad installed-app enumeration;
- no SMS permission;
- no Accessibility service;
- exact package visibility is debug/operator-scoped in `src/debug/AndroidManifest.xml`;
- enabled notification packages are derived only from enabled supported bank targets;
- unsupported notification packages are rejected by the target lock helper.

## Bank Detection UI

Updated premium bank-management surfaces to use merchant-safe labels:

- `Détectée`
- `Non détectée`
- `Activée`
- `À configurer`

Onboarding now presents the compatible-bank scan as:

- `Recherche des banques compatibles`
- `SwimPay recherche uniquement les banques compatibles.`

The merchant can activate detected banks without exposing package names, certs or trust internals.

## Navigation

Premium navigation now includes typed destinations for:

- `Accueil`
- `Revue`
- `Ventes`
- `MENU`
- `Mode de confirmation`
- `Sécurité`

Settings menu rows now route to the new typed premium screens for confirmation mode and security.

## Accueil

Updated dashboard language and layout around the new operating model:

- `Paiements suivis`
- `Aujourd’hui`
- `À confirmer`
- `Confirmés`
- `Rejetés`
- `SwimPay Intelligence`
- `Téléphone connecté`
- `Notifications activées`
- `Dernière activité : il y a 12 s`
- `Paiements confirmés`
- `Historique récent`
- `Banques actives`

The screen does not imply SwimPay holds funds and avoids balance/PSP wording.

## Revue

Aligned review queue and detail wording:

- `Paiements à confirmer`
- `Confirmez uniquement les paiements que vous reconnaissez.`
- filters: `Tout`, `À confirmer`, `Confirmés`, `Rejetés`
- actions remain separate: `Confirmer le paiement`, `Rejeter le signal`, `Rejeter la commande`

Signal reject remains signal-scoped in the runtime/API wiring.

## Ventes

Added a premium sales traceability view using existing frontend-safe data paths:

- `Ventes confirmées`
- `Montant confirmé`
- `Échecs`
- `Taux de confirmation`
- filters: `Aujourd’hui`, `7 jours`, `30 jours`, `Tout`
- order rows remain dev-safe and do not add backend APIs.

## Menu

Menu sections now follow the premium operating model:

- Paiements: Banques, Moyens de réception, Mode de confirmation
- Business: Site ou application, Ventes, Notifications
- Application: Apparence, Langue, Sécurité
- Aide: Centre d’aide, Contacter le support

## Mode De Confirmation

Added display-only premium mode screen:

- `Manuel — Activé`
- `Assisté — Disponible`
- `IA — Verrouillé`
- `IA en apprentissage`
- `7 / 10 paiements confirmés`
- `IA disponible`
- `Activer la confirmation IA`

This does not enable auto-confirmation and does not change payment decision logic.

## Sécurité

Added display-only premium security screen:

- Code d’accès
- Mot de passe
- Code PIN
- Biométrie
- Empreinte
- Reconnaissance faciale
- Verrouillage automatique
- Sessions connectées

No plaintext secret storage was added.

## Tests

Added/updated Android JVM/static checks for:

- exact supported Bank Target Lock package list;
- no broad installed-app enumeration;
- no `QUERY_ALL_PACKAGES`;
- no SMS permission;
- no Accessibility service;
- enabled target package filtering;
- merchant-safe bank target labels;
- typed premium navigation for Accueil/Revue/Ventes/Menu;
- new `Mode de confirmation` and `Sécurité` routes;
- IA wording without auto-confirm wording;
- Android does not confirm orders directly;
- Android does not send developer webhooks directly;
- no raw card/phone/notification text or official bank confirmation claim in premium UI.

## Validation Status

- Android targeted JVM tests: passed after setting local SDK env.
- Root validation passed: `npm run android:doctor`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, Compose config.
- Android validation passed: `:app:testDebugUnitTest`, `:app:assembleDebug`.
- ADB device smoke was not run because `adb devices -l` returned no connected authorized device in this shell.

## Blockers

- No critical product/security blocker introduced.
- Android SDK env must be set to `C:\Users\Lenovo\AppData\Local\Android\Sdk` for Gradle commands in this shell.
- Non-critical device blocker: ADB is available, but no device was listed during this pass.

## Next Recommended Sprint

Sprint 7L / next Android premium refinement: wire Bank Target Lock state into a dedicated bank activation sub-flow and continue deeper operational sub-states, without changing backend APIs or processing real notifications.
