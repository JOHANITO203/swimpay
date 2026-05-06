# SDK Android Audit

generated_at: 2026-05-06

## Result

Status: missing as a merchant SDK / partially ready as Receiver app.

The repository contains an Android Receiver application, not a production merchant Android SDK. The Receiver must not be confused with a merchant app integration helper.

## Present

- Android Receiver Gradle project exists under `apps/android-receiver/android`.
- Main active path is `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
- Notification Access flow, premium merchant UI and receiver foundations exist.
- Safety tests assert no SMS permission, no Accessibility service and no broad installed-app enumeration.
- Android receiver contract docs state Android does not confirm payments.
- Android API wiring exists for merchant dashboard/review/connected-site style surfaces.

## Missing for SDK Android V1

- No standalone Android SDK/helper module for a merchant Android app was found.
- No production Kotlin snippet for:
  - merchant Android app calls its own backend;
  - merchant backend creates SwimPay order;
  - Android opens returned `checkout_url`;
  - Android handles return URL/deep link;
  - fallback browser opener.
- No dedicated Android SDK tests proving secret key never appears in APK snippets.
- No packaged deep-link/return helper.
- No clear docs that merchant Android apps must never receive SwimPay webhooks directly.

## Required Production Rule

SDK Android must be a client-side launcher/return helper only. It must never include:

- SwimPay API secret key;
- webhook secret;
- direct payment confirmation behavior;
- developer webhook sending.

The merchant Android app must call the merchant backend. The merchant backend creates the SwimPay order and receives webhooks.

