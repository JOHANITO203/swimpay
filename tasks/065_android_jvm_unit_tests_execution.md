# 065 - Android JVM Unit Tests Execution

## Goal

Add and run Android JVM unit tests for receiver platform boundaries.

## Scope

- Add JVM tests under `apps/android-receiver/android/app/src/test`.
- Cover status warnings, canonical payloads, fake signer and encrypted outbox transitions.
- Run `:app:testDebugUnitTest`.

## Acceptance Criteria

- Android JVM tests run through Gradle.
- Tests cover safety/privacy boundaries.
- No raw phone or raw notification behavior is introduced.

## Forbidden Work

- Do not fake test success.
- Do not weaken TypeScript/static tests.
