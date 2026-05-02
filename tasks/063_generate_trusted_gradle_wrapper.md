# 063 - Generate Trusted Gradle Wrapper

## Goal

Generate the Android Gradle wrapper through Gradle's official wrapper task.

## Scope

- Use a trusted Gradle command.
- Run `gradle wrapper` from `apps/android-receiver/android`.
- Verify wrapper files exist.
- Verify wrapper properties point to `services.gradle.org`.

## Acceptance Criteria

- `gradlew`, `gradlew.bat`, wrapper properties and wrapper JAR exist.
- Wrapper properties use an official Gradle distribution URL.
- No wrapper JAR is hand-written.

## Forbidden Work

- Do not copy wrapper binaries from unknown projects.
- Do not bypass wrapper verification.
