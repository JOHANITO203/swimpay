# SDK Android Production Report

generated_at: 2026-05-06T00:00:00+03:00

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

## Summary

Sprint 9C created a production-safe Android merchant checkout helper that is separate from the SwimPay Receiver.

The Android merchant SDK/helper does not create orders, does not contain merchant secrets, does not handle webhooks, does not process bank notifications and does not confirm payments.

## Package Location

Created:

```text
packages/swimpay-android
```

Public package name:

```text
@swimpay/android
```

Kotlin package:

```text
com.swimpay.sdk
```

This sprint ships a Kotlin source helper and static guardrail tests. Maven/Gradle publication remains a future packaging task.

## Helper API

Implemented in:

```text
packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayCheckout.kt
```

Public helper:

- `SwimPayCheckout.open(activity, checkoutUrl, options)`
- `SwimPayCheckout.createIntent(context, checkoutUrl, options)`
- `SwimPayCheckout.parseReturnUri(uri, options)`
- `SwimPayCheckout.parseReturnIntent(intent, options)`

Behavior:

- validates checkout URL;
- allows only `http` and `https`;
- supports optional allowed host restriction;
- attempts Custom Tabs;
- falls back to `Intent.ACTION_VIEW`;
- returns safe typed errors for invalid URL, no browser and activity launch failures.

## Return Handling

Return/deep-link parsing maps to typed non-confirming statuses:

- `Returned`
- `Cancelled`
- `Expired`
- `Rejected`
- `Unknown`
- `Error`

Return handling sets `returnDoesNotConfirm=true` and `shouldRefreshBackend=true` for parsed return results.

The merchant Android app must refresh order status from the merchant backend after return.

## Errors and Models

Added:

- `SwimPayCheckoutResult`
- `SwimPayCheckoutStatus`
- `SwimPayCheckoutOptions`
- `SwimPayCheckoutError`
- `SwimPayEnvironment`
- `SwimPayCheckoutIntentResult`

Errors expose only safe messages and enum values. They do not include secrets, raw card data, raw phone data or raw notification text.

## Receiver Separation

Guardrails prove the Android merchant SDK:

- does not import Receiver runtime/UI classes;
- does not use `NotificationListenerService`;
- does not request Notification Access;
- does not request SMS or Accessibility permissions;
- does not use `QUERY_ALL_PACKAGES`;
- does not enumerate installed apps;
- does not probe bank packages;
- does not process bank notifications.

The existing Receiver app under `apps/android-receiver` was not modified.

## Docs and Examples

Added:

- `docs/SDK_ANDROID_QUICKSTART.md`
- `examples/android-merchant-basic/README.md`
- `examples/android-merchant-basic/CheckoutActivity.kt`
- `examples/android-merchant-basic/AndroidManifest.xml`

Docs explain:

- the merchant Android app calls the merchant backend;
- the merchant backend creates the SwimPay order;
- the backend returns `checkout_url`;
- Android opens `checkout_url`;
- Android return does not confirm payment;
- Android refreshes order status from the backend;
- the webhook is delivered to the backend after merchant manual confirmation;
- `official_bank_confirmation=false`;
- never put a SwimPay secret in the APK.

## Tests Added

Added:

```text
tests/sdk-android-product-truth.test.ts
```

Coverage:

- SDK files/docs/examples exist;
- checkout opening and return helpers exist;
- typed statuses and errors exist;
- Receiver separation;
- no NotificationListener, SMS, Accessibility or broad package enumeration;
- no secret key or webhook handling in Android code;
- no local fulfillment from return;
- no auto-confirmation fields;
- no official bank confirmation claim;
- no CVV/expiry collection.

## Validation

Passed:

- `npx vitest run tests/sdk-android-product-truth.test.ts`
- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

Not run:

- Android Receiver Gradle build/test, because Sprint 9C did not modify the Receiver app or Android Gradle package.

Live environment revalidation:

- `docker version` passed after Docker Desktop was restarted.
- `docker compose version` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d` started the local stack.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` shows Postgres, Valkey, NATS, API, web, signal worker, job worker and proxy healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` returned `200 OK` with database, NATS and Valkey `ok`.

## Remaining Gaps

- Maven/Gradle publication wrapper for `@swimpay/android` is still pending.
- Developer Integration Wizard UI is still pending.
- Android merchant return contract examples should be validated in a real sample app once publication is introduced.

## Next Recommended Sprint

Sprint 9D - Developer Integration Wizard Production Readiness:

- Web/Android integration type selector;
- secret generation and masking;
- webhook URL setup;
- test webhook;
- delivery history;
- code snippets that never place secrets in Android or browser code.
