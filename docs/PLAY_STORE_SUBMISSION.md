# SwimPay Android Play Store Submission Guide

Last updated: 2026-05-17

This guide prepares the SwimPay Android merchant receiver app for Google Play review.

It is written for the current Android package:

- package name: `com.swimpay.receiver`
- app type: Android app, not a game
- app category recommendation: Finance or Business/Finance tooling
- target SDK: 36
- min SDK: 26
- release artifact: Android App Bundle preferred for Play Store

## Product Position For Review

SwimPay is a merchant-side payment signal engine.

The Android app helps a merchant:

- create or recover a merchant account;
- configure supported bank notification monitoring;
- receive merchant-side bank notification signals;
- redact and upload operational payment signals to SwimPay;
- review possible payment matches manually.

The app does not:

- initiate payments;
- read SMS;
- use Accessibility APIs;
- scrape banking apps;
- access buyer phones;
- act as a bank, PSP, wallet or official bank confirmation system;
- confirm payments locally on Android.

All payment outcomes remain backend-owned and merchant-reviewed.

## Play Console App Content Checklist

Complete these Play Console sections before submitting any internal, closed, open or production release.

### App Access

Select that the app requires login or account access.

Provide Google reviewers with one of these:

- a review test merchant account;
- or temporary test credentials;
- plus steps to reach the dashboard and notification access screen.

Reviewer instruction draft:

```text
This app is a merchant receiver dashboard. To review it, sign in with the provided test merchant account, complete onboarding, and use "Configure later" on the website/app integration step if no webhook endpoint is available.

The Notification Access screen is expected: SwimPay needs Android Notification Listener Access to detect supported merchant-side bank notifications. The app filters locally to supported bank apps and uploads redacted operational signals only. Android does not confirm payments.
```

### Data Safety

Google requires the Data safety form to reflect what the app collects or shares.

For SwimPay, answer that the app collects data because it sends merchant account, receiver state and redacted payment-signal data to SwimPay backend services.

Recommended data categories to review and declare:

- Personal info: account identifier, optional Google sign-in identity for recovery, merchant contact/account data if enabled.
- Financial info: transaction amount, currency, payment session/order identifiers, merchant receiving method metadata, redacted bank-notification-derived payment signal fields.
- App activity: onboarding choices, review actions, settings, webhook configuration actions.
- App info and performance: app version, Android version, receiver health, queue status and operational diagnostics.
- Device or other IDs: generated app-install/device proof material and receiver device public key. Do not describe this as raw device fingerprinting.

Recommended purpose selections:

- App functionality;
- Account management;
- Fraud prevention, security and compliance;
- Analytics only if actual analytics tooling is added later.

Current expected sharing position:

- Do not claim third-party sharing unless data is sent to an external third party outside SwimPay service providers.
- Google sign-in, if used, is for optional account recovery/login. Disclose it consistently if Play Console asks about SDK or third-party handling.

Security answers:

- Data is transmitted over HTTPS.
- Payment signal payloads are redacted before upload.
- Raw notification text is not uploaded in normal operation.
- Users can request account deletion / merchant data deletion through support until in-app self-service deletion exists.

### Privacy Policy

A public privacy policy URL is required before submission.

The privacy policy must mention:

- Notification Listener Access;
- supported bank notification filtering;
- redaction before upload;
- merchant account data;
- receiving method data;
- payment review data;
- webhook/API configuration data;
- data retention;
- account deletion request path;
- no SMS reading;
- no Accessibility API;
- no bank app scraping;
- no automatic payment confirmation.

Do not submit until the privacy policy URL is live and matches the Data safety answers.

### Financial Features Declaration

Complete the Financial features declaration.

Recommended classification for SwimPay:

- Declare that the app contains financial/payment-related support features.
- Select the closest available support/payment category if prompted.
- Do not select personal loans, lending, payday loans, BNPL, crypto, stock trading, insurance or wallet features unless they are actually added.

Suggested explanation:

```text
SwimPay is merchant-side payment operations software. It does not lend money, hold user funds, provide a wallet, initiate payments or provide banking services. The Android app detects merchant-side bank notification signals, redacts them, uploads them to SwimPay, and lets the merchant manually review possible payment matches.
```

### Permissions Declaration

Current manifest permissions:

- `android.permission.INTERNET`
- `android.permission.USE_BIOMETRIC`
- `android.permission.POST_NOTIFICATIONS`
- `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` on `SwimPayNotificationListenerService`

Current package visibility:

- exact `<queries>` entries for supported bank packages only;
- no `QUERY_ALL_PACKAGES`.

No current forbidden/sensitive permissions found in the main app scope:

- no `READ_SMS`;
- no `RECEIVE_SMS`;
- no Accessibility service;
- no `QUERY_ALL_PACKAGES`;
- no contacts;
- no location;
- no microphone;
- no camera.

If Play Console presents a permission declaration because of Notification Listener or another sensitive API, use this purpose:

```text
Core functionality: merchant payment signal detection.

The app requires Android Notification Listener Access so a merchant can authorize SwimPay to observe notifications from selected supported bank apps on the merchant's own device. SwimPay filters notifications locally by supported bank package, extracts only payment-signal fields, redacts sensitive text, signs the payload and uploads it to SwimPay backend for matching and merchant review.

The app does not read SMS, does not use Accessibility APIs, does not scrape banking apps, does not initiate payments, and does not confirm payments on Android.
```

### Prominent Disclosure

Before directing users to Android Notification Access settings, the app must clearly disclose what is accessed and why.

Recommended disclosure text:

```text
SwimPay needs Android Notification Access to detect payment notifications from the supported bank apps you select.

Android grants broad notification access, but SwimPay filters locally to supported bank apps, redacts sensitive values, and uploads only operational payment-signal data for merchant review.

SwimPay does not read SMS, does not control your bank app, does not initiate payments and does not confirm payments automatically.
```

The user must take an affirmative action to continue to Android settings.

### Advertising ID

If no ads or analytics SDK using Advertising ID is present, declare that the app does not use Advertising ID.

Do not add `com.google.android.gms.permission.AD_ID` unless a real ad/analytics need is introduced and Data safety is updated.

### Content Rating

Recommended answers:

- no gambling;
- no user-generated public content;
- no violence/sexual content;
- no controlled substances;
- financial/payment operations utility.

### Target API

The Android app currently targets SDK 36, which is above the current Google Play submission floor for new apps and updates.

Keep this checked before every submission:

```powershell
Select-String -Path apps/android-receiver/android/app/build.gradle.kts -Pattern "targetSdk"
```

### Store Listing

Short description draft:

```text
Merchant payment signal receiver and review dashboard for SwimPay.
```

Full description draft:

```text
SwimPay helps merchants monitor payment notification signals from supported bank apps on their own Android device and review possible payment matches.

The app guides merchants through account setup, notification access, supported bank selection, receiving method setup, payment review and integration diagnostics.

SwimPay is not a bank, wallet, PSP or payment initiator. It does not read SMS, does not use Accessibility APIs, does not scrape banking apps and does not confirm payments automatically. Payment outcomes require merchant review.
```

Feature graphic / screenshots should show:

- onboarding;
- notification access explanation;
- supported bank selection;
- dashboard;
- review screen;
- settings/privacy/help.

Avoid screenshots that show:

- real card numbers;
- raw notification text;
- real customer personal data;
- real bank account identifiers;
- Visa/Mastercard/Mir branding unless licensed and actually used.

## Required Submission Artifacts

Prepare before Play Console upload:

- signed release AAB;
- app icon and feature graphic;
- phone screenshots;
- privacy policy URL;
- support email;
- test account for review;
- Data safety answers;
- Financial features declaration answers;
- permission declaration text if prompted;
- app access instructions;
- release notes;
- reviewer notes explaining Notification Access.

## Build Commands

For Play Store, prefer AAB:

```powershell
npm run android:bundle:release
```

Optional APK for direct QA:

```powershell
npm run android:assemble:release
```

Verify release APK when using direct QA:

```powershell
& "C:\Users\Lenovo\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat" verify --verbose --print-certs apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk
```

Expected release safety checks:

- release is not debuggable;
- minification enabled;
- resource shrinking enabled;
- release signing configured;
- backend URL is HTTPS and not localhost;
- Google OAuth client ID configured if Google recovery is enabled.

## Pre-Submission Manual QA

Run on a real device:

1. install release APK;
2. create or log in to a merchant account;
3. complete onboarding;
4. use `Configurer plus tard` on Site/Application and verify dashboard entry;
5. enable Notification Access;
6. select supported banks;
7. verify dashboard loads;
8. verify receiver health;
9. verify review queue opens;
10. verify settings/help/privacy surface;
11. verify no raw notification text or raw card/phone values appear.

## Current Blockers Before Submission

Before first public Play Store submission, confirm or complete:

- public privacy policy URL;
- account deletion request path or in-app deletion plan;
- reviewer test account;
- Play Console organization account if Google classifies SwimPay as financial services;
- final production backend URL decision;
- one release AAB build after final changes;
- one real-device release smoke test.

## Official References

- Google Play Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/9888076
- Google Play permissions declarations: https://support.google.com/googleplay/android-developer/answer/9214102
- Android `NotificationListenerService`: https://developer.android.com/reference/kotlin/android/service/notification/NotificationListenerService
- Google Play target API level: https://support.google.com/googleplay/android-developer/answer/11917020
- Google Play Financial features declaration: https://support.google.com/googleplay/android-developer/answer/13849271
- Google Play Financial Services policy: https://support.google.com/googleplay/android-developer/answer/16322411
