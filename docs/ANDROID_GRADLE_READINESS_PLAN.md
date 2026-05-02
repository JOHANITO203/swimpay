# Android Gradle Readiness Plan

The current Android Receiver is Kotlin-source-ready and TypeScript-testable, but not yet a runnable Android app module. Sprint 3C intentionally does not add an unstable Gradle setup because the repo has no Gradle wrapper or Android SDK build configuration.

## Required Build Pieces

- Gradle wrapper pinned in the repository.
- Android Gradle Plugin pinned to a supported version.
- Kotlin Android plugin pinned to a supported version.
- `settings.gradle.kts`.
- Root `build.gradle.kts`.
- `apps/android-receiver/android/app/build.gradle.kts`.
- Android namespace, `minSdk`, `targetSdk` and `compileSdk`.
- JVM/Kotlin toolchain configuration.

## App Module Requirements

- Keep `SwimPayNotificationListenerService` declared in the manifest.
- Request notification listener binding through:

```text
android.service.notification.NotificationListenerService
```

- Do not request SMS permissions.
- Do not add accessibility-service scraping permissions.
- Add clear local UX for notification access status and required actions.

## Security Implementation Requirements

- Device private key stored through Android Keystore.
- Backend public key registration through `POST /v1/receiver-devices/register`.
- Canonical signed heartbeat and signal upload.
- Encrypted outbox backed by Android encrypted storage.
- No raw phone storage.
- No raw notification text storage.

## Retry Runtime

Use a platform scheduler such as WorkManager for:

- pending upload retry;
- network backoff;
- battery-friendly scheduling;
- app restart recovery.

The retry state should preserve the Sprint 3C outbox statuses:

- `pending_upload`
- `uploading`
- `acked`
- `failed_retrying`
- `expired`

## Tests

Local JVM/unit tests should cover:

- allowlist and package/cert trust evaluation;
- snapshot extraction;
- coalescing;
- privacy firewall;
- payload signing;
- outbox retry scheduling;
- health warnings.

Instrumented tests should cover:

- notification listener permission flow;
- service lifecycle callbacks;
- encrypted storage;
- Android Keystore signing;
- WorkManager retry behavior.

## Go Criteria For Adding Gradle

Add Gradle only when:

- Android SDK is available in the development environment;
- wrapper generation is intentional and reviewed;
- validation can run without breaking the existing Node monorepo checks;
- no production secrets are introduced;
- no real bank package names or cert fingerprints are invented.
