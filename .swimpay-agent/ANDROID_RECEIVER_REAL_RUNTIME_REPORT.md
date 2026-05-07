# Android Receiver Real Runtime Report

generated_at: 2026-05-08T00:00:00+03:00

## Scope

Sprint CR-4 prepared the Android Receiver real-runtime path for controlled staging validation with synthetic/staging notification snapshots only.

No real bank notification was captured, read, stored, uploaded, parsed or matched.

## Inventory Result

The inventory confirmed that the pre-CR-4 listener path was effectively synthetic/debug-only:

- `ReceiverBoundaries` allowed runtime notification processing only for the app package in debug.
- `SwimPayNotificationListenerService` did not enqueue non-debug accepted runtime signals.
- `SignalUploadWorker` did not flush non-debug outbox records to any unsafe transport.

Existing safe foundations were preserved:

- exact five-bank target list in `BankTargetLock`;
- no SMS, Accessibility service or broad package enumeration;
- notification snapshot extraction separated from redacted payload creation;
- encrypted outbox validation rejecting raw notification text and raw PII-like values;
- Android-side behavior remains signal capture/upload only, never payment confirmation.

## Bank Target Lock Non-debug Readiness

Implemented a non-debug package gate that accepts only explicitly enabled supported bank packages.

- Unsupported package names are rejected immediately.
- Supported but not activated packages are rejected before redaction or outbox.
- The exact package allowlist remains the five V1 bank targets only.
- No `QUERY_ALL_PACKAGES`, SMS, Accessibility or broad installed-app enumeration was added.

## Notification Redaction Path

The listener now builds runtime snapshots for allowed packages and routes them through `ReceiverNotificationPipeline`.

- Raw title/body/big text/text lines remain local temporary inputs to redaction.
- The forwarded payload contains only redacted title/body, hashes, masked placeholders and parser hints.
- Payloads use `raw_text_present=false`.
- Raw phone/reference values are replaced before outbox enqueue.

## Outbox Safety

Accepted runtime signals are enqueued through the encrypted outbox boundary.

- Runtime enqueue adds `merchant_id`, `device_id`, `local_counter`, a signature and payload hash.
- `event_id`, `notification_hash` and `semantic_hash` are preserved from the redacted pipeline result.
- Outbox validation rejects raw notification text keys and raw PII-like values.
- Non-debug worker behavior remains fail-safe: it does not emit unsafe payloads when staging upload transport is not configured.

## Synthetic Staging Harness

Added `StagingSyntheticNotificationHarness` for controlled staging smoke without real notification capture.

The harness proves:

- an activated supported bank package can enter the redacted runtime pipeline;
- an unsupported package is ignored;
- raw notification text is rejected if it tries to cross the outbox boundary;
- a redacted signal envelope is created;
- Android does not confirm payment;
- Android does not emit merchant fulfillment callbacks.

## Guardrails

Added Android JVM guardrail tests for:

- no SMS permission;
- no Accessibility service;
- no `QUERY_ALL_PACKAGES`;
- no broad installed-app enumeration APIs in the runtime source corpus;
- no raw notification storage/upload boundary crossing;
- no Android-side payment confirmation;
- no Android-origin fulfillment callback;
- no auto-confirmation runtime vocabulary in the Android listener/worker path;
- only activated supported bank packages can enter the listener pipeline.

## Commands Run

Completed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps\android-receiver\android\gradlew.bat -p apps\android-receiver\android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1 --tests com.swimpay.receiver.AndroidReceiverRealRuntimeTest`
- `apps\android-receiver\android\gradlew.bat -p apps\android-receiver\android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps\android-receiver\android\gradlew.bat -p apps\android-receiver\android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`
- `adb devices -l` failed because `adb` is not in PATH.
- `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe devices -l`
- `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`
- `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe -s R5CWA0FEPZW exec-out uiautomator dump /dev/tty`

Device QA passed on Samsung `SM-S916B` / `R5CWA0FEPZW`: APK install, launch and UIAutomator dump succeeded.

## Blockers

Resolved by CR-4:

- Android Receiver runtime is no longer limited to synthetic debug package acceptance.
- Non-debug listener path can accept explicitly enabled supported bank packages and enqueue only redacted outbox payloads.

Still remaining before real-world notification tests:

- Google OAuth live exchange has not been validated.
- VPS production-mode staging with external secrets, HTTPS and migrations has not been executed in this sprint.
- Real bank notification capture still requires explicit operator approval and must remain stopped until then.

## Next Recommended Sprint

Run Sprint CR-5: production-mode staging validation with synthetic data only.

Recommended scope:

- validate Google OAuth live exchange against staging redirect URLs;
- run VPS staging with external secrets, HTTPS and migrations;
- register a staging receiver and perform synthetic signed signal upload through the staging URL;
- keep real bank notification capture blocked until explicit operator approval.
