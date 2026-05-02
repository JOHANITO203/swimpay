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
npm run typecheck
npm run build
```

`npm run android:doctor` reports Java, Android SDK, Gradle, wrapper and `assembleDebug` readiness. Current Sprint 4A status is that Java and the Android SDK are present, but Gradle and the wrapper are absent, so Android build execution is blocked and not claimed as passed.

After installing trusted Gradle or generating a trusted wrapper:

```powershell
cd apps/android-receiver/android
.\gradlew.bat :app:assembleDebug
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
