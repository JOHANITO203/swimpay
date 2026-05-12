# Android Sales Hydration Report

## Root Cause

The Android merchant `Ventes` screen was not hydrated because `PremiumMerchantRuntime.loadOrders()` still returned an empty, local-only `PremiumOrdersUiState`.

There was also no Android mobile-session backend contract dedicated to merchant sales. Existing order endpoints were SDK/API-key oriented and not suitable for the Android merchant app surface.

## Backend Contract

Added:

- `GET /v1/android-merchant/orders`

The endpoint:

- requires an Android merchant mobile session;
- loads only the authenticated merchant's orders;
- exposes confirmed sales rows and compact summary metrics;
- does not expose raw phone, card, PAN, webhook secrets, notification text or actor internals;
- keeps `official_bank_confirmation=false`.

Returned summary:

- `confirmed_order_count`
- `confirmed_amount_minor`
- `failed_count`
- `confirmation_rate`
- `currency`

Returned rows:

- `order_id`
- `external_id`
- `product_name`
- `amount`
- `status`
- `status_label`
- `helper`
- `confirmed_at`

## Android Wiring

Added `MerchantOrdersApiRepository` and wired `PremiumMerchantRuntime.loadOrders()` to consume the backend contract.

The `Ventes` cards now read from state instead of hardcoded `0` / `—` values:

- ventes confirmees;
- montant confirme;
- echecs;
- taux de confirmation.

Disconnected/offline state still shows the safe empty sales screen and does not invent sales rows.

## Tests

Added regression coverage:

- backend sales endpoint hydrates confirmed orders without unsafe internals;
- Android sales runtime hydrates rows and metrics from the backend contract;
- disconnected runtime does not invent sales rows.

Validation run:

- `npx vitest run apps/api/src/android-merchant.test.ts`
- `npm run typecheck`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidDataHydrationTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests com.swimpay.receiver.PremiumMerchantRuntimeContractTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest --no-daemon --stacktrace --max-workers=1`

## Remaining Note

This change does not process notifications, does not confirm payments automatically and does not change public webhook semantics.
