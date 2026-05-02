# 060 - Android JVM Unit Tests

## Goal

Prepare Android JVM unit test validation for receiver platform boundaries.

## Scope

- Run Gradle unit tests only if the Android toolchain is available.
- If Gradle is unavailable, document the test plan and keep TypeScript/static tests passing.
- Preserve tests for status model, signer, outbox, WorkManager boundaries and privacy guardrails.

## Acceptance Criteria

- JVM unit test status is recorded.
- Existing static Android tests pass.
- No fake Gradle test success is claimed.

## Forbidden Work

- Do not bypass missing Gradle with fake test output.
- Do not weaken no-SMS, no-scraping or no-auto-confirmation tests.
