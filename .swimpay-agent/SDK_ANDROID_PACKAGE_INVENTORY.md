# SDK Android Package Inventory

generated_at: 2026-05-06T00:00:00+03:00

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

## Scope

This sprint creates a small merchant Android checkout helper. It is not the SwimPay Receiver.

Out of scope:

- Receiver notification processing;
- payment runtime behavior;
- Android Notification Access;
- Bank Target Lock;
- real bank notifications;
- Developer Integration Wizard UI;
- auto-confirmation.

## Current Android Code

Existing Android paths are Receiver-oriented:

- `apps/android-receiver/android` - real Android Receiver app;
- `apps/android-receiver/src` - receiver core/runtime tests and helpers;
- active Receiver UI path remains `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.

This existing app listens to merchant-side notifications after explicit Receiver setup. It is not a merchant SDK for third-party APKs.

## SDK Package Location Decision

Create:

```text
packages/swimpay-android
```

Package identity:

```text
com.swimpay.sdk
```

Rationale:

- keeps SDK separate from `apps/android-receiver`;
- avoids dependency on Receiver internals;
- keeps source visible in the monorepo while deferring Maven/Gradle publication hardening;
- supports static and JVM-friendly guardrail tests in the root Vitest suite.

## Implementation Strategy

Sprint 9C will add Kotlin source helpers and static guardrail tests.

It will not overbuild Maven publication. A future sprint can wrap the Kotlin source in a publishable Android library module if needed.

## Required Boundaries

The SDK helper may:

- validate and open a `checkoutUrl`;
- build browser/Custom Tabs intents;
- parse merchant return/deep-link URIs;
- return typed non-confirming results.

The SDK helper must not:

- contain a SwimPay secret key;
- create orders directly with SwimPay;
- handle webhooks;
- confirm or fulfill orders;
- receive/process bank notifications;
- import Receiver classes;
- request Notification Access;
- use `NotificationListenerService`;
- request SMS, Accessibility or `QUERY_ALL_PACKAGES`;
- enumerate installed apps or probe bank packages.
