# Android Premium Navigation and State Report

generated_at: 2026-05-05T00:00:00+03:00

## Sprint

Sprint 7K - Android Premium Navigation and State Foundation.

## Scope

Frontend-only Android premium navigation and reusable state foundation.

No backend APIs, contracts, workers, database, payment decisions, review decisions, notification processing, real bank notification capture, SMS, Accessibility scraping, installed-app enumeration, raw PII exposure or auto-confirmation behavior was changed.

## Multi-agent Audit Summary

Three read-only agents audited:

- typed route/tab gaps;
- loading/empty/error/action-required state gaps;
- future sub-screen navigation boundaries.

Shared conclusion:

- `PremiumMerchantApp` still relied on raw route strings and `Int` tabs;
- premium screens mostly rendered success/preview states;
- future sub-screens needed typed destinations before more UI is added.

## Typed Routes Added

Created `PremiumNavigationState.kt` with:

- `PremiumRoute.Landing`
- `PremiumRoute.Onboarding`
- `PremiumRoute.Main(tab)`
- `PremiumRoute.PaymentDetail(reviewId)`
- `PremiumRoute.ReceivingMethods`
- `PremiumRoute.Banks`
- `PremiumRoute.ConnectedSite`
- `PremiumRoute.ReceiverHealth`
- `PremiumRoute.ConfigurationTest`
- `PremiumRoute.OrderDetail(orderId)`

`PaymentDetail` now carries the review id in the route instead of relying on a separate mutable selected id.

## Typed Tabs Added

Created `PremiumMainTab`:

- `Home` -> `HOME` / `Accueil`
- `Reviews` -> `REVUES` / `Revues`
- `Orders` -> `VENTES` / `Ventes`
- `Menu` -> `MENU` / `Menu`

`PremiumAppShell` and `PremiumBottomNav` now use `PremiumMainTab` instead of raw `Int` tab positions.

## State Model Added

Created reusable `PremiumScreenState<T>`:

- `Content`
- `Loading`
- `Empty`
- `ActionRequired`
- `Error`
- `Offline`

State copy is merchant-facing and safe:

- `Chargement`
- `Aucun paiement à vérifier`
- `Action nécessaire`
- `Données indisponibles`
- `Hors ligne`

## Visual State Components

Added `PremiumStatePanel`.

It uses existing premium cards, icon tiles, rounded corners and safe action labels. It is ready for future screen-by-screen loading, empty, error and action-required states.

## Sub-screen Foundation

Prepared typed destinations for:

- receiving methods;
- banks;
- connected site;
- receiver health;
- configuration test;
- order detail.

Current visible UX remains conservative. Placeholder destinations show safe action-required copy until the next sprint implements full screens.

## Tests

Added:

- `PremiumNavigationStateTest.kt`

Updated:

- `PremiumOnboardingStateTest.kt`
- `AndroidMerchantVisualArchitectureTest.kt`
- `tests/agent-framework.test.ts`

Coverage:

- initial route is typed;
- after-onboarding route is typed;
- payment detail route carries review id;
- back from payment detail returns to review tab;
- bottom tabs are typed and ordered;
- state copy avoids forbidden jargon, raw phone/card and secret-like values;
- premium app no longer uses `PremiumOnboardingNavigation` route strings, `mutableIntStateOf` tabs or raw `payment_detail` assignment.

## Validation

Final Sprint 7K validation:

- `npm run android:doctor` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm test` - passed, 54 test files and 382 tests.
- `npm run build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - passed.
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` - passed.

Device smoke:

- `adb devices -l` - device visible, same physical device exposed two mDNS transports.
- `adb -t 3 install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` - passed.
- `adb -t 3 shell am start -n com.swimpay.receiver/.MainActivity` - passed.
- `adb -t 3 exec-out uiautomator dump /dev/tty` - passed; premium app shell and typed bottom navigation were visible.

Docker/live local revalidation:

- Initial `docker compose --env-file .env.example -f infra/docker-compose.yml ps` found no running services after Docker Desktop restarted.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d swimpay-api proxy` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - passed; API, web, proxy, Postgres, Valkey and NATS were healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` - passed; database, NATS and Valkey reported `ok`.

## Next Recommended Sprint

Sprint 7L - Android Premium Screen State Rollout.

Recommended focus:

- use `PremiumScreenState` in dashboard, reviews, payment detail, orders and menu routes;
- replace preview fallback during loading/error with explicit state panels;
- add full premium receiving-methods and bank management screens;
- keep backend/API/payment behavior unchanged.
