# 057 - Android Toolchain Activation

## Goal

Inspect and document the local Android build toolchain without faking build readiness.

## Scope

- Inspect Java availability and version.
- Inspect Android SDK path and presence.
- Inspect Gradle command availability.
- Inspect Gradle wrapper availability.
- Inspect Android module files under `apps/android-receiver/android`.
- Improve `npm run android:doctor` output.

## Acceptance Criteria

- `npm run android:doctor` reports Java, Android SDK, Gradle, Gradle wrapper, module path and assemble readiness.
- Missing Gradle remains a documented non-critical blocker.
- No production secrets or product behavior are changed.

## Forbidden Work

- Do not manually create a `gradle-wrapper.jar`.
- Do not claim Android build success unless `assembleDebug` actually runs.
- Do not add Android payment confirmation, SMS access or scraping behavior.
