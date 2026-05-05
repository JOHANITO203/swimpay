# Android Onboarding Full Implementation Report

Date: 2026-05-05

Status: passed

## Scope

Android onboarding only.

Unchanged:

- backend APIs;
- contracts;
- payment logic;
- review logic;
- webhooks;
- notification learning;
- real notification capture;
- auto-confirmation.

Active source of truth:

`MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`

Active visual source:

`apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`

## Onboarding Inventory Result

The previous active flow mixed a prototype landing, bank source activation, business profile, policy and ready screens. The inventory is documented in `.swimpay-agent/ANDROID_ONBOARDING_FLOW_INVENTORY.md`.

The operator corrected the UX so compatible-bank search and bank selection are one merged step. This avoids redundant screens and speeds up onboarding.

## Implemented Onboarding Sequence

Implemented typed six-step onboarding:

1. Welcome
2. Notification Access
3. Compatible Bank Detection + Bank Selection
4. Receiving Method
5. Site or Application Connection
6. Configuration Test

The app now starts incomplete onboarding at `PremiumRoute.Onboarding` instead of showing the extra landing gate first.

## Compatible Bank Detection

The merged bank step uses the existing Bank Target Lock foundation and runtime bank state.

Behavior:

- probes only exact V1 supported package names through `PackageManagerExactPackageProbe`;
- does not use broad installed-app enumeration;
- does not require `QUERY_ALL_PACKAGES`;
- shows a soft search status card;
- shows detected/not detected rows;
- preselects detected banks for speed;
- lets the merchant activate/deactivate detected banks before continuing;
- disables continuation when no bank is selected.

Supported package targets:

- Sberbank: `ru.sberbankmobile`
- T-Bank: `com.idamob.tinkoff.android`
- VTB: `ru.vtb24.mobilebanking.android`
- Alfa-Bank: `ru.alfabank.mobile.android`
- Gazprombank: `ru.gazprombank.android.mobilebank.app`

## Notification Access

The Notification Access step:

- uses the live `NotificationAccessStatusReader` state;
- opens Android Notification Listener settings through the activity callback;
- blocks continuation until access is enabled;
- refreshes through `MainActivity.onResume`.

No SMS or Accessibility permissions were added.

## Site/Application Skip

The Site or Application step is skippable.

Behavior:

- `Ajouter maintenant` marks the site/application as connected for the onboarding model;
- `Configurer plus tard` persists the skipped state in the current onboarding state;
- skipping does not block onboarding completion;
- configuration test copy adapts to `Site ou application a configurer`.

## Configuration Test

The onboarding configuration test is frontend-only/non-confirming.

It checks:

- phone connected;
- bank selected;
- receiving method added;
- site/application connected or marked to configure later.

It does not:

- confirm a real payment;
- emit `payment.confirmed`;
- send developer webhooks directly from Android;
- process real bank notifications.

## Tests Added/Updated

Android JVM/static tests now cover:

- typed merged onboarding sequence;
- Notification Access continuation gate;
- connected-site skip path;
- configuration checklist adaptation;
- supported bank filtering and unsupported-bank ignore behavior;
- approved onboarding copy;
- removal of legacy business/policy onboarding copy;
- safety guardrails: no `QUERY_ALL_PACKAGES`, SMS, Accessibility, broad enumeration, `payment.confirmed`, official bank confirmation wording;
- initial route for incomplete onboarding is `PremiumRoute.Onboarding`.

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 54 files / 382 tests
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- Android `:app:testDebugUnitTest`
- Android `:app:assembleDebug`
- ADB device check on Samsung `SM_S916B` / `R5CWA0FEPZW`
- Debug APK install
- App launch
- UIAutomator dump

## Device QA Result

Device smoke passed.

Observed:

- app starts directly on Welcome after clearing only `swimpay_premium_onboarding` completion preference;
- Welcome copy renders correctly;
- Notification Access step reads the real Android listener state;
- merged bank step renders `Choisissez vos banques`, `SwimPay recherche uniquement les banques compatibles.`, `Recherche terminee` and activated bank rows;
- exact ADB package checks for the five supported packages on the device match the merged UI showing all five compatible banks as detected/activated.

The onboarding preference reset used `run-as ... rm shared_prefs/swimpay_premium_onboarding.xml`; no `pm clear` was used, so Notification Access was not removed.

## Blockers

No product/security blocker introduced.

## Next Recommendation

After validation and device QA, continue with onboarding visual tuning only if the real-device dump shows spacing or readability issues. Do not continue to real bank notification capture until the explicit real-notification consent gate is used.
