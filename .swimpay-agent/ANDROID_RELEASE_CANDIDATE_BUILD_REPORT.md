# Android Release Candidate Build Report

generated_at: 2026-05-17

## Scope

Prepare the Android app for production packaging without changing the runtime behavior validated in staging.

Changed code:

- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidProductionReleaseConfigTest.kt`

The production app code, backend logic, payment runtime, navigation and Android receiver behavior were not changed.

## Release Rules Verified

The existing Gradle release build type is kept as the production packaging path:

- `isDebuggable = false`
- `isMinifyEnabled = true`
- `isShrinkResources = true`
- `proguard-android-optimize.txt`
- `proguard-rules.pro`
- release signing config
- production backend/Google BuildConfig fields

The new static guardrail verifies that release and staging keep the same non-debug runtime shape, while release only adds packaging hardening such as minification, resource shrinking and release signing.

## ProGuard / R8

R8 completed successfully.

Generated release mapping artifacts:

- `apps/android-receiver/android/app/build/outputs/mapping/release/mapping.txt`
- `apps/android-receiver/android/app/build/outputs/mapping/release/configuration.txt`
- `apps/android-receiver/android/app/build/outputs/mapping/release/seeds.txt`
- `apps/android-receiver/android/app/build/outputs/mapping/release/usage.txt`
- `apps/android-receiver/android/app/build/outputs/mapping/release/resources.txt`

Existing keep rules preserve:

- Android WorkManager/background worker entrypoints;
- Credential Manager runtime surface;
- Google ID token helper classes.

No keep rule was added to weaken payment or confirmation boundaries.

## Artifacts

APK:

- `apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk`
- size: `18148359` bytes
- application id: `com.swimpay.receiver`
- version: `0.1.0`
- versionCode: `1`

AAB:

- `apps/android-receiver/android/app/build/outputs/bundle/release/app-release.aab`
- size: `20767963` bytes

APK signature verification:

- `apksigner verify --verbose --print-certs`: passed
- APK Signature Scheme v2: true
- signer count: 1

## Validation Commands

Passed:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidProductionReleaseConfigTest --no-daemon --stacktrace --max-workers=1 --no-watch-fs
npm run android:assemble:release
npm run android:assemble:staging
npm run android:bundle:release
```

## Behavior Statement

The release candidate is a packaging hardening of the staging-validated app shape.

It does not:

- change Android payment decision behavior;
- add local Android confirmation;
- change checkout, review, webhook or receiver contracts;
- change UI copy, navigation or business state;
- enable debug/staging-only broadcast receivers in release;
- add any real payment-network logo or card number behavior.

## Remaining Operational Step

Before public distribution, install the generated release APK on the target device and run the same staging smoke path already used for the staging APK:

1. launch app;
2. confirm account/session restoration or login;
3. verify dashboard loads;
4. verify receiving methods screen;
5. verify review flow;
6. verify notification listener and receiver health state.

