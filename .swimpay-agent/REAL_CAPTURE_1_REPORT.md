# REAL-CAPTURE-1 Report

generated_at: 2026-05-08T13:51:40+03:00

## Summary

REAL-CAPTURE-1 prepared and validated the operator device path up to the final real-notification gate. No real bank notification was captured or processed.

## Staging APK build/install

- Added an installable Android `staging` build type.
- `staging` uses the debug signing key for operator installation, but runs with `isDebuggable=false`.
- `staging` uses the non-debug runtime path through `matchingFallbacks += listOf("debug")`.
- Built with:
  - backend base URL: `https://staging.swimpay.pro`
  - Google server client ID: configured web client ID
- Increased Gradle metaspace from `256m` to `512m` so `lintVitalAnalyzeStaging` passes without exclusion.
- Installed `apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk` on the operator device.

## Device QA

- ADB device available over Wi-Fi: Samsung `SM_S916B`.
- APK installed successfully with `adb install -r`.
- App launched successfully with `com.swimpay.receiver/.MainActivity`.
- Crash buffer after clean relaunch contained no SwimPay crash entries.
- Fixed the Android package-visibility gap that prevented Bank Target Lock from seeing installed supported bank apps in the staging/non-debug APK.
- The visible app state now shows `Banques actives` with `5 detectees` on the operator device.
- The visible app state shows the merchant dashboard with:
  - notifications activated;
  - phone connected;
  - receiving methods still to add.

## Bank detection hotfix

- Root cause: Android package visibility on Android 11+ hid installed supported bank apps because exact V1 bank package queries were not present in the main Receiver manifest used by staging/non-debug builds.
- Fix: moved exact visibility for the five V1 supported bank package targets into `apps/android-receiver/android/app/src/main/AndroidManifest.xml`.
- Safety: this is visibility only, not trust. It does not add `QUERY_ALL_PACKAGES`, broad installed-app enumeration, SMS, Accessibility, scraping, notification processing, auto-confirmation or webhook behavior.
- Device proof: the staging APK was rebuilt, reinstalled and relaunched; UIAutomator confirmed 5 supported bank apps detected.

## Login/onboarding

- Not fully re-run in this pass because install preserved existing app data.
- The app opened directly into an existing merchant dashboard state.
- I did not clear app data because that would erase the current local device state without an explicit operator instruction.
- Google Identity was opened once during navigation and dismissed; no account data was used or recorded in this report.

## Receiver registration and heartbeat

- Staging API health is reachable over HTTPS and reports database, NATS and Valkey `ok`.
- App dashboard shows `Téléphone connecté`.
- Full receiver registration/heartbeat proof from a fresh login/onboarding path remains blocked until we either:
  - intentionally clear app data and replay login/onboarding; or
  - use an existing in-app route to inspect/refresh receiver registration without destroying local state.

## Signal upload smoke

- Not run in this pass.
- Reason: the device state still shows connected-site/webhook configuration as action-required, and no safe synthetic signal run was started from the installed APK.
- No raw notification text, no raw phone/card and no real notification payload crossed the boundary.

## Capture gate

- Real notification capture remains blocked.
- The next real capture requires a final explicit operator command after:
  - supported bank target is configured;
  - receiver registration/heartbeat is proven against staging;
  - active payment intent exists;
  - external staging webhook endpoint is configured.

## Manual review and webhook

- Not run.
- Requires safe signal evidence and a manual review created from an active payment intent.
- Product truth remains unchanged: Android does not confirm orders and does not emit developer webhooks.

## Commands run

- `npm test -- apps/android-receiver/src/android-runnable-app.test.ts`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleStaging -PswimpayBackendBaseUrl=https://staging.swimpay.pro -PswimpayGoogleServerClientId=<configured> --no-daemon --stacktrace --max-workers=1`
- `adb devices -l`
- `adb install -r apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk`
- `adb shell am start -n com.swimpay.receiver/.MainActivity`
- `adb exec-out uiautomator dump /dev/tty`
- `adb shell dumpsys package com.swimpay.receiver`
- `adb logcat -c`
- `adb logcat -b crash -d`
- `Invoke-WebRequest -UseBasicParsing https://staging.swimpay.pro/api-health`

## Blockers

- Existing device data skipped the login/create-account/onboarding path, so that full path still needs an operator-approved replay.
- Connected site/webhook configuration is action-required in the Android app state.
- Synthetic signed signal upload from the installed staging APK was not executed in this pass.
- Real notification capture has not started and remains gated.

## Next sprint

Run `REAL-CAPTURE-2`: Android staging account reset or in-app refresh, receiver registration/heartbeat proof, supported-bank target activation, synthetic signed upload from APK, then a final operator capture-start gate for exactly one controlled real notification.
