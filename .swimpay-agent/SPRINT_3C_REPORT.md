# Sprint 3C Report - Receiver Lifecycle, Signed Upload, Outbox and Health

completed_at: 2026-05-02T19:02:00+03:00

## Tasks Created

- `042_receiver_device_registration_client`
- `043_receiver_signed_heartbeat_client`
- `044_receiver_signed_signal_upload_client`
- `045_receiver_encrypted_outbox_retry_loop`
- `046_receiver_health_status_model`
- `047_receiver_local_backend_smoke_test`
- `048_android_gradle_readiness_plan`

## Tasks Completed

- `042_receiver_device_registration_client`
- `043_receiver_signed_heartbeat_client`
- `044_receiver_signed_signal_upload_client`
- `045_receiver_encrypted_outbox_retry_loop`
- `046_receiver_health_status_model`
- `047_receiver_local_backend_smoke_test`
- `048_android_gradle_readiness_plan`

## Device Registration Behavior

- Added `createReceiverApiClient().registerDevice()`.
- Requires a configured backend base URL.
- Sends device name, app version, Android version, public key, install id and supported capabilities.
- Parses device id, merchant id, status, server time, required capabilities and warnings.
- Does not hardcode a production URL or expose secrets in parsed responses.

## Heartbeat Behavior

- Added `buildSignedHeartbeatPayload()`.
- Includes device id, app versions, notification access state, listener connectivity, allowed bank ids, queue length, last signal timestamp, battery optimization state and timestamp.
- Uses the existing canonical HMAC signing interface.
- Client parses backend warnings safely.

## Signal Upload Behavior

- Added `buildSignedSignalUploadPayload()`.
- Builds redacted signed `POST /v1/receiver/signals` payloads.
- Rejects raw phone fields and raw notification text.
- Forces `raw_text_present: false`.
- Marks `TO_VERIFY` package/cert metadata as untrusted.
- Accepted upload is treated only as `backend_decision_pending`.

## Outbox Behavior

- Added `RetryingEncryptedOutbox`.
- Supports `captured`, `pending_upload`, `uploading`, `acked`, `failed_retrying` and `expired`.
- Dedupes by event id.
- Tracks attempts, first seen time, last attempt, next retry, ack time, expiration and sanitized last error.
- Retry schedule is immediate, 30 seconds, 2 minutes, 5 minutes, then 15 minutes capped.
- Stores encrypted redacted signed payloads only.

## Health Status Behavior

- Added `buildReceiverHealthStatus()`.
- Reports notification access, listener state, allowed/trusted bank counts, queue length, last signal/upload timestamps, app version, device status and warnings.
- Warnings include notification access disabled, listener disconnected, no banks allowed, all banks untrusted, queue backlog, backend unreachable and battery optimization risk.

## Smoke Test Behavior

- Added `npm run smoke:receiver`.
- Prints a synthetic local backend smoke plan for registration, heartbeat, signal upload, backend-decision-pending response and `TO_VERIFY` review routing.
- Does not require a real Android device or external services.

## Tests Added Or Strengthened

- Added `apps/android-receiver/src/android-receiver-lifecycle.test.ts`.
- Updated `tests/agent-framework.test.ts` for Sprint 3C queue and smoke script.

Covered:

- registration success/failure;
- signed heartbeat and warning parsing;
- signed signal upload payload shape;
- raw phone rejection;
- raw notification text rejection;
- `TO_VERIFY` untrusted handling;
- accepted upload semantics;
- outbox enqueue/dedupe/retry/ack/expiration;
- health warning derivation;
- local smoke plan shape;
- no SMS, scraping or local payment confirmation APIs in receiver sources.

## Validation

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS (`33` test files, `223` tests)
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- `npm run smoke:receiver`: PASS
- Android/Gradle tests: not run because no Gradle wrapper or Android SDK build configuration is present yet.

## Blockers

No current critical blockers.

Known non-critical limitation: the Android Receiver still needs a real Gradle Android project before platform tests and installed-device behavior can run.

## Next Recommended Sprint

Sprint 3D should turn the source-ready Android skeleton into a runnable Android app foundation:

- Gradle wrapper and Android module setup;
- Kotlin unit test wiring;
- Notification access status screen;
- Android Keystore-backed signer implementation;
- encrypted outbox platform implementation;
- WorkManager retry scheduling;
- local emulator smoke path.
