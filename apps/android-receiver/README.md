# SwimPay Android Receiver

This app owns merchant-side Android notification capture for SwimPay V1.

Android captures, filters, redacts, signs and uploads operational payment signals. The backend verifies, matches and decides.

## Current Shape

This repository currently contains:

- TypeScript MVP core used by local tests.
- Gradle Android project files under `android`.
- Kotlin-source-ready Android app skeleton under `android/app/src/main`.
- Configuration placeholders under `config`.

No Gradle wrapper JAR is currently present in this repo, and the current shell does not expose a `gradle` command. Android platform builds/tests are documented as unavailable until a trusted wrapper is generated or Gradle is installed. The executable checks are the TypeScript/static tests in `src`.

## Commands

```bash
npm test -- --run apps/android-receiver/src
npm run android:doctor
npm run android:emulator-doctor
npm run typecheck
npm run build
```

`npm run android:doctor` reports Java, Android SDK, Gradle, wrapper and `assembleDebug` readiness. Sprint 4B generated the trusted Gradle wrapper, so Android build execution is now available through `gradlew.bat` on this machine when `ANDROID_HOME` points to the local SDK.

```powershell
cd apps/android-receiver/android
$env:ANDROID_HOME='C:\Users\Lenovo\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:testDebugUnitTest
```

Do not manually invent or paste `gradle-wrapper.jar`.

## Guardrails

- Do not implement Android payment confirmation.
- Do not implement Android auto-confirmation.
- Do not read SMS.
- Do not scrape bank apps.
- Do not upload non-bank notifications.
- Do not upload raw phone numbers.
- Do not upload raw notification text.
- Do not invent real bank package names or signing certificate fingerprints.

## MVP Components

- Notification listener boundary.
- Bank allowlist and package/cert trust model.
- Snapshot extraction.
- Snapshot coalescing.
- Privacy firewall.
- Local parser hints.
- Encrypted outbox foundation.
- Signed upload envelope.
- Receiver device registration client.
- Signed heartbeat client.
- Signed signal upload client.
- Retrying encrypted outbox model.
- Receiver health status model.
- Local backend smoke plan helper.
- Gradle Android project foundation.
- Notification access status screen skeleton.
- Android Keystore signer skeleton.
- Android encrypted outbox storage boundary.
- WorkManager upload retry skeleton.

All package/cert values in examples are synthetic.

## Sprint 3C Commands

```bash
npm test -- --run apps/android-receiver/src/android-receiver-lifecycle.test.ts
npm test -- --run apps/android-receiver/src/android-runnable-app.test.ts
npm run smoke:receiver
npm run android:doctor
```

`npm run smoke:receiver` prints a local synthetic flow. It does not require a real Android device and does not call external services.

## Real Device Debug Smoke

Sprint 4F debug builds include a local-only smoke panel wired to app-side HTTP calls.

Backend URL on the device:

```text
http://127.0.0.1:8080
```

Host setup:

```powershell
adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
```

Debug actions use synthetic redacted data only:

- Register receiver
- Send heartbeat
- Upload synthetic signal
- Queue synthetic outbox signal
- Flush outbox

The debug app never confirms or auto-confirms a payment. Successful signal upload means backend decision pending, not official bank confirmation.

Sprint 4G adds persistent debug state:

- receiver registration state is kept across activity recreation;
- heartbeat and signal upload reuse the stored device id;
- synthetic outbox entries persist in a protected local storage boundary;
- retry delays are bounded and non-infinite;
- the status screen refreshes backend reachability through `/api-health`.

The current persistent outbox is for local MVP smoke validation only. It stores redacted signed payloads and must not be treated as production-grade encrypted storage.

Sprint 4H hardens the app path:

- Android Keystore protects persisted outbox records on device.
- Legacy debug outbox records migrate into the protected adapter.
- Old acknowledged and expired records can be cleaned up.
- WorkManager retry is network-constrained and bounded.
- Debug smoke controls and broadcasts remain debug-only.

The debug app still uses synthetic redacted data only. It never confirms or auto-confirms a payment.

Sprint 4I adds a debug-only synthetic notification listener smoke path:

```powershell
adb -s R5CWA0FEPZW shell pm grant com.swimpay.receiver android.permission.POST_NOTIFICATIONS
adb -s R5CWA0FEPZW shell am broadcast -a com.swimpay.receiver.DEBUG_SMOKE --es action post_synthetic_notification
adb -s R5CWA0FEPZW shell am broadcast -a com.swimpay.receiver.DEBUG_SMOKE --es action process_synthetic_notification_e2e
```

The source is marked `synthetic_debug_only`, logs safe metadata only, redacts before outbox/upload and still leaves the backend as the only decision maker.

## Bank Package Evidence Dry Run

Sprint 4L adds a PackageManager evidence boundary for future operator dry runs.

The collector accepts an explicit package name and returns observed package/certificate metadata. It does not enumerate arbitrary apps, does not trust the package automatically and does not process real bank notifications.

Evidence remains review-only:

- `TO_VERIFY` stays untrusted.
- concrete PackageManager evidence becomes `pending_verification`.
- `synthetic_debug_only` stays debug-only.

See `docs/BANK_PACKAGE_EVIDENCE_DRY_RUN.md`.

Sprint 4M wires debug-only evidence submission to the backend:

- action id: `submit_synthetic_bank_evidence`;
- endpoint: `POST /v1/bank-evidence`;
- result: evidence submitted for operator review, not trusted yet, no auto-confirm enabled.

The debug action uses `synthetic_debug_only` metadata and does not enumerate installed apps.

Sprint 4P adds a real package dry-run action for explicit operator input only:

```text
submit_explicit_package_evidence
```

Required input:

```text
package_name=<operator supplied package>
```

The Receiver performs one PackageManager lookup for that exact package. It does not list installed apps, does not scrape app data and does not process notifications. If the package is absent, the result is `package_not_found` and no evidence is submitted. If evidence is submitted, backend status remains `pending_operator_review`, `trusted: false` and `auto_confirm_enabled: false`.

## Receiver Onboarding Readiness

Phase 4J separates two Android permissions:

- App notifications: allows SwimPay Receiver to show its own notifications.
- Notification Listener Access: allows SwimPay Receiver to observe Android notifications and apply local bank allowlist filtering.

Notification Listener Access is mandatory. If app notifications are enabled but listener access is disabled, Receiver readiness is blocked and capture/upload are disabled except explicit debug/test actions.

The app opens Android's official Notification Listener settings with:

```text
android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
```

Required onboarding wording:

```text
Android donne une permission large d'accès aux notifications. SwimPay applique ensuite une allowlist locale : seules les notifications des banques que vous choisissez sont analysées. Les autres notifications sont ignorées localement.
```

After reinstall or `pm clear`, Android may remove the listener grant. The app detects this as `regrant_required_after_reinstall`.

## Emulator Smoke

Run:

```bash
npm run android:emulator-doctor
```

Current Sprint 4C status: `adb` is available through the SDK, but the Android Emulator command and AVDs are not installed. APK install and launch are blocked until an emulator/device is available.
