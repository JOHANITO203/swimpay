# 049 - Android Gradle Project Setup

## Goal

Turn `apps/android-receiver/android` into a Gradle Android app project foundation.

## Scope

- Add `settings.gradle.kts`, root `build.gradle.kts`, and `app/build.gradle.kts`.
- Use Kotlin and Android application plugin declarations.
- Preserve the TypeScript receiver foundation and npm validation.
- Do not manually invent a Gradle wrapper JAR.

## Acceptance Criteria

- Gradle project files exist.
- Android build status is documented honestly.
- Existing npm workspace validation still passes.
