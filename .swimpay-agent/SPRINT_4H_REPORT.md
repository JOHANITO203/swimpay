# Sprint 4H Report - Android Production Storage and Worker Hardening

generated_at: 2026-05-02T23:30:00+03:00

status: PASS

## Tasks Completed

- `104_android_keystore_device_identity_hardening`
- `105_android_encrypted_storage_platform_impl`
- `106_android_persistent_outbox_migration_and_cleanup`
- `107_android_workmanager_background_retry_validation`
- `108_android_debug_release_separation`
- `109_android_storage_security_tests`
- `110_real_device_background_retry_smoke`
- `111_sprint_4h_closeout_review`

## Keystore / Signing

- Canonical payload requirements remain explicit: `event_id`, `device_id`, `merchant_id`, `notification_hash`, `local_counter`, `observed_at` and `payload_hash`.
- `ReceiverSigningPolicy` distinguishes debug and production modes.
- Production mode rejects the JVM fake signer and has no dev signer bypass.
- The local counter persists through device state reload and advances before signed upload/outbox enqueue.

## Encrypted / Protected Storage

- Added an Android Keystore AES/GCM `StringProtector`.
- Added `AndroidKeystoreOutboxStorageAdapter` for protected persisted outbox records.
- The previous SharedPreferences outbox adapter remains only as a migration/debug boundary.
- Stored outbox values are redacted signed payload records and retry metadata only.
- Storage rejects raw phone, raw notification text, raw title/body keys and secret-like values before persistence.

## Migration / Cleanup

- Added `OutboxMigration` to copy legacy records into protected storage without duplicating by event id or notification hash.
- Added cleanup for old acknowledged and expired outbox records.
- Expired records are not due for upload.

## WorkManager Retry

- `SignalUploadWorker` now has a typed `SignalUploadWorkPlan`.
- Work is unique, network-constrained and bounded.
- Debug builds can flush the persistent outbox from WorkManager.
- Release builds do not use the debug backend fallback.

## Debug / Release Separation

- Debug smoke broadcast remains in `src/debug` only.
- Main release manifest does not contain the debug receiver.
- UI smoke actions are gated by `BuildConfig.DEBUG`.
- No SMS permission or Accessibility scraping service is declared.

## Real Device Background Retry Smoke

- Device: Samsung `SM_S916B`
- Serial: `R5CWA0FEPZW`
- Backend: `http://localhost:8080/api-health` PASS
- adb reverse: `tcp:8080 tcp:8080` PASS
- APK build/install/launch: PASS
- Synthetic register/heartbeat/upload/outbox smoke: PASS
- Offline/online retry was validated with synthetic redacted payloads only; no real bank notification or customer data was used.

## Tests Added

- Android JVM tests for production signing policy and local counter persistence.
- Android JVM tests for protected storage encryption boundary, migration, cleanup and PII rejection.
- Android JVM tests for WorkManager plan and bounded retry decisions.
- Static Vitest checks for Sprint 4H queue, debug/release separation and storage hardening boundaries.

## Safety

- No real bank notification used.
- No real customer data used.
- No SMS permission added.
- No Accessibility scraping service added.
- No Android payment confirmation or auto-confirmation.
- No raw phone or raw notification text stored/uploaded.
- `TO_VERIFY` remains untrusted.

## Validation

PASS:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `GET http://localhost:8080/api-health`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`
- `adb devices -l`
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080`
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`
- debug broadcast smoke actions

## Non-critical Limitations

- WorkManager process-death/reboot retry validation is still future work.
- No real bank package/cert verification was performed.
- No real bank notification was used.

## Next Recommended Sprint

Sprint 4I - Android real-device resilience and operator readiness.
