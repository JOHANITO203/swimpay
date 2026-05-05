# Android Local Merchant State Audit

Generated: 2026-05-05

## Scope

Android premium frontend/runtime state only.

Backend APIs, contracts, database, workers, payment logic, review logic, notification processing, webhooks and auto-confirmation were not changed.

## Active Path

```text
MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime
apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium
```

## Receiving Methods Count

Existing source available today:

```text
MerchantReceivingMethodsApiRepository.list()
GET /v1/merchant/receiving-routes
```

No new backend API is needed.

The runtime can derive:

- active count from rows whose merchant status is `Active`;
- empty state from repository `EMPTY`;
- synchronization state from `ERROR`, `ACTION_REQUIRED` or `LOADING`.

## Bank Count

Current Accueil bank value is derived from exact supported package probing through Bank Target Lock.

It counts detected compatible banks, not broad installed apps.

No `QUERY_ALL_PACKAGES`, broad installed-app enumeration, SMS or Accessibility behavior was added.

## Connected Site State

Connected site/webhook remains optional unless configured.

Webhook absence must not make Accueil or Ventes unavailable.

## Ventes State

No live Android sales/order summary contract is introduced in this sprint.

Ventes must therefore render a local intentional empty state and must not display fake live transactions or fake amounts as real data.

## Decision

Use the existing receiving-method repository for Accueil's local/live card and keep Ventes as local non-live content until a future sales summary contract is explicitly approved.

