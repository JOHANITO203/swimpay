# Sprint 3D Report - Android Runnable App Setup

completed_at: 2026-05-02T19:34:00+03:00

## Tasks Created

- `049_android_gradle_project_setup`
- `050_android_manifest_notification_access`
- `051_android_notification_access_status_screen`
- `052_android_keystore_signer_platform_impl`
- `053_android_encrypted_outbox_platform_impl`
- `054_android_workmanager_upload_retry`
- `055_android_emulator_smoke_path`
- `056_android_mvp_closeout_review`

## Tasks Completed

- `049_android_gradle_project_setup`
- `050_android_manifest_notification_access`
- `051_android_notification_access_status_screen`
- `052_android_keystore_signer_platform_impl`
- `053_android_encrypted_outbox_platform_impl`
- `054_android_workmanager_upload_retry`
- `055_android_emulator_smoke_path`
- `056_android_mvp_closeout_review`

## Android Gradle / Project Status

- Added Gradle Android project files under `apps/android-receiver/android`.
- Added `settings.gradle.kts`, root `build.gradle.kts`, and `app/build.gradle.kts`.
- Configured Kotlin Android app module with namespace `com.swimpay.receiver`.
- Android SDK exists locally.
- Java exists locally.
- Gradle is not available in PATH.
- No Gradle wrapper JAR is checked in.
- Android assemble was not run and is not claimed as passed.

## Manifest / Notification Access

- Manifest declares `SwimPayNotificationListenerService`.
- Service uses `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`.
- No SMS permissions are requested.
- No accessibility scraping service is declared.
- Added `MainActivity` with safe receiver status text only.

## Status Screen / Model

- Added `ReceiverStatusViewModel`.
- Status includes notification access, listener connectivity, allowed bank count, trusted bank count, queue length, backend reachability and warnings.
- No raw phone or raw notification text is displayed.
- No payment confirmation wording is used.

## Keystore Signer Behavior

- Added `PayloadSigner` interface.
- Added `AndroidKeystorePayloadSigner` skeleton using `AndroidKeyStore` and `SHA256withECDSA`.
- Required signed fields are explicit:
  - `event_id`
  - `device_id`
  - `merchant_id`
  - `notification_hash`
  - `local_counter`
  - `observed_at`
  - `payload_hash`
- Added `FakePayloadSigner` for JVM/local test boundaries.
- No unsigned production fallback was added.

## Encrypted Outbox Behavior

- Added `EncryptedOutboxStore` interface and `OutboxRecord`.
- Added `AndroidEncryptedOutboxStore` platform boundary.
- Added `FakeEncryptedStorageAdapter` for tests/future JVM wiring.
- Supports `captured`, `pending_upload`, `uploading`, `acked`, `failed_retrying` and `expired`.
- Rejects obvious raw phone/raw notification storage strings at the boundary.

## WorkManager Retry Behavior

- Added `SignalUploadWorker`.
- Uses WorkManager constraints with `NetworkType.CONNECTED`.
- Defines `MAX_RETRY_ATTEMPTS`.
- Does not implement an infinite retry loop.
- Does not perform payment confirmation.

## Emulator Smoke Path

- Added `docs/ANDROID_EMULATOR_SMOKE_TEST.md`.
- Documents build/install, Notification Access setup, local backend URL, synthetic signal flow and no-SMS/no-scraping checklist.
- Uses synthetic redacted data only.

## Tests Added Or Strengthened

- Added `apps/android-receiver/src/android-runnable-app.test.ts`.
- Updated `tests/agent-framework.test.ts` for Sprint 3D queue and Android doctor script.

Covered:

- Gradle project files exist.
- No wrapper JAR is invented.
- Manifest declares NotificationListenerService permission.
- Manifest does not contain SMS or accessibility scraping permissions.
- Status, signer, outbox and WorkManager source boundaries exist.
- Receiver source does not contain local confirmation, SMS or scraping APIs.

## Validation

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS (`34` test files, `227` tests)
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- `npm run android:doctor`: PASS as diagnostic
- Android Gradle assemble: NOT RUN because `gradle` is unavailable and no wrapper JAR is checked in.

## Blockers

No current critical blockers.

Known non-critical blocker:

- Android build cannot run until a trusted Gradle wrapper is generated or Gradle is installed.

## Next Recommended Phase

Phase 4 should focus on Android build/toolchain activation and emulator validation:

- generate Gradle wrapper from trusted Gradle;
- run `:app:assembleDebug`;
- add JVM tests for Kotlin classes;
- add emulator smoke automation;
- validate Android Keystore signing on emulator/device;
- validate encrypted storage and WorkManager retry on emulator/device.
