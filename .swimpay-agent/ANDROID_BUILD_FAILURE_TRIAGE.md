# Android Build Failure Triage

completed_at: 2026-05-02T20:18:00+03:00

## command run

```powershell
cd apps/android-receiver/android
.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace
```

With SDK environment:

```powershell
$env:ANDROID_HOME='C:\Users\Lenovo\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace
```

Android unit tests:

```powershell
.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace
```

## error summary

Three build issues were observed and fixed:

1. Gradle could not find the Android SDK when `ANDROID_HOME` was not set for the shell process.
2. AndroidX dependencies were present without `android.useAndroidX=true`.
3. Kotlin compiled with JVM target 17 while Java compiled with target 1.8.

## suspected cause

- The Android SDK existed locally, but Gradle does not use the repository's doctor fallback path unless `ANDROID_HOME`, `ANDROID_SDK_ROOT`, or `local.properties` is present.
- The Android app uses AndroidX dependencies, so Gradle requires `android.useAndroidX=true`.
- The module configured Kotlin target 17 without matching Java compile options.

## exact next fix

The fixes applied in Sprint 4B:

- Run Android Gradle commands with `ANDROID_HOME` and `ANDROID_SDK_ROOT` set to the local SDK path.
- Add `apps/android-receiver/android/gradle.properties` with `android.useAndroidX=true`.
- Add Java 17 compile options in `apps/android-receiver/android/app/build.gradle.kts`.

## critical or non-critical

Non-critical. These were local Android build configuration issues. They did not require product behavior changes and did not affect SwimPay payment safety rules.

## final status

PASS.

- `:app:assembleDebug` passed after the fixes.
- `:app:testDebugUnitTest` passed after the fixes.
