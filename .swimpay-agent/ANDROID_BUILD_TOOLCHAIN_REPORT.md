# Android Build Toolchain Report

completed_at: 2026-05-02T19:58:00+03:00

## Java status

PASS.

- Java is available in the current shell.
- Version observed by `npm run android:doctor`: `openjdk version "21.0.10" 2026-01-20`.

## Android SDK status

PASS.

- Android SDK path: `C:\Users\Lenovo\AppData\Local\Android\Sdk`.
- SDK presence: available.

## Gradle status

BLOCKED.

- `gradle` is not available in `PATH`.
- No trusted Gradle command is available to generate a wrapper.

## Gradle wrapper status

BLOCKED.

- No `gradle-wrapper.jar` is checked in.
- No wrapper was generated in this sprint.
- This is intentional because wrapper JARs must be generated from trusted Gradle, not manually invented or pasted.

## Android module status

PASS.

- Android module path: `apps/android-receiver/android`.
- `settings.gradle.kts`, root `build.gradle.kts` and `app/build.gradle.kts` exist.

## assembleDebug status

BLOCKED, not failed.

Expected command after wrapper generation:

```bash
cd apps/android-receiver/android
./gradlew :app:assembleDebug
```

Windows PowerShell:

```powershell
cd apps/android-receiver/android
.\gradlew.bat :app:assembleDebug
```

`assembleDebug` was not run because Gradle and the Gradle wrapper are unavailable.

## Tests status

Node/TypeScript/static Android tests are PASS.

Android Gradle JVM tests are BLOCKED because Gradle and wrapper are unavailable. The planned coverage is documented in `docs/ANDROID_JVM_UNIT_TEST_PLAN.md`.

## Blockers

No critical blocker.

Non-critical blocker:

- Install trusted Gradle or generate a trusted wrapper before Android build/test execution.

## Exact next action

Install a trusted Gradle distribution or expose Gradle from Android Studio/approved tooling, then run:

```bash
cd apps/android-receiver/android
gradle wrapper
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest
```

On Windows PowerShell, use `.\gradlew.bat` after wrapper generation.
