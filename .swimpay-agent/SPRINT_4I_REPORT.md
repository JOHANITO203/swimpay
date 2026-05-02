# Sprint 4I Report - Synthetic Notification Listener E2E and Receiver Diagnostics

generated_at: 2026-05-02T23:55:28+03:00

status: PASS

## Tasks Created

- `112_synthetic_notification_source_strategy`
- `113_debug_synthetic_notifier_app_or_channel`
- `114_notification_listener_e2e_capture`
- `115_allowlist_and_synthetic_package_gate`
- `116_snapshot_coalescer_live_validation`
- `117_privacy_firewall_live_validation`
- `118_notification_to_outbox_to_backend_e2e`
- `119_receiver_operator_diagnostics`
- `120_sprint_4i_closeout_review`

## Tasks Completed

- Created the Sprint 4I task queue and marked tasks 112 through 120 complete.
- Added a debug-only synthetic notification source inside the Receiver app.
- Added a deterministic NotificationListener pipeline for synthetic debug notifications.
- Added debug-only synthetic package/certificate gate rules.
- Added snapshot extraction, coalescing and duplicate snapshot handling.
- Added local privacy firewall validation before outbox/upload.
- Added receiver diagnostics model with safe runtime status.
- Ran deterministic real-device outbox-to-backend smoke using synthetic redacted data.

## Synthetic Notification Strategy

Chosen strategy: debug-only synthetic notification source inside the Receiver app.

The synthetic source posts notifications through a debug-only channel and uses metadata clearly marked as synthetic:

- package: `synthetic_debug_only.com.swimpay.syntheticbank`
- cert: `synthetic_debug_only.cert_sha256`
- channel: `swimpay_synthetic_debug`

The synthetic metadata is accepted only in debug mode. It is not a production bank identity, not trusted as a verified real bank package/cert and cannot auto-confirm a payment.

## NotificationListener Live Capture

- Synthetic notification post command: PASS.
- Live NotificationListener capture after reinstall/data clear: MANUAL STEP REQUIRED.

During the final real-device run, `pm clear`/reinstall removed the Android Notification Access grant. The synthetic notification posted successfully, but the listener did not receive it because Android no longer listed SwimPay Receiver in `enabled_notification_listeners`.

Required phone-side step:

1. Open Android Settings.
2. Go to Notifications.
3. Open Device and app notifications / Notification access.
4. Enable SwimPay Receiver again.
5. Rerun the `post_synthetic_notification` debug action.

This is not a code/security blocker. Android intentionally requires the user to grant Notification Access.

## Allowlist and Synthetic Package Gate

- Debug synthetic package accepted in debug builds only.
- Debug synthetic package rejected when debug mode is disabled.
- Unknown packages are ignored/untrusted.
- `TO_VERIFY` package/cert metadata remains untrusted.
- No real bank package names or certificate fingerprints were invented.

## Coalescer Result

- Snapshot extraction supports safe metadata: package, notification id/tag, post time, channel and field count.
- Coalescing tracks snapshot count, first/last snapshot timestamps, notification hash and semantic hash.
- Duplicate synthetic snapshots are deduped.
- Coalesced output is suitable for the signed outbox/upload path.

## Privacy Firewall Result

- Raw phone is rejected before payload creation.
- Raw notification title/body are not stored or uploaded.
- Upload payloads use redacted fields and hashed/masked hints only.
- Negative categories such as cashback, refund, outgoing, promo and failed transfer never produce Android confirmation behavior.
- No official bank confirmation wording was added.

## Outbox and Backend Upload

Deterministic real-device E2E path: PASS.

Broadcast action:

```text
process_synthetic_notification_e2e
```

Result:

```text
synthetic notification listener path outbox flush result: acked=1 failed_retrying=0; backend decision pending; not official bank confirmation
```

The backend accepted the synthetic redacted signal as a notification signal flow. Android did not confirm or auto-confirm anything.

## Receiver Diagnostics

Added a safe diagnostics model showing:

- listener connected
- Notification Access enabled/disabled
- allowed bank count
- synthetic debug source enabled status
- outbox pending count
- outbox failed retrying count
- last upload status
- backend reachable/unreachable
- last signal observed time
- last safe redacted error summary

Diagnostics do not expose raw phone, raw notification text, raw title/body, secrets or payment-confirmation wording.

## Tests Added

- Android JVM tests for synthetic package gate behavior.
- Android JVM tests for snapshot coalescing/deduplication.
- Android JVM tests for privacy firewall redaction and unsafe category handling.
- Android JVM tests for receiver diagnostics redaction and queue counts.
- Static Vitest checks for Sprint 4I task queue, docs and debug-only safety boundaries.

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
- debug broadcast `post_synthetic_notification`
- debug broadcast `process_synthetic_notification_e2e`

Note: Android Gradle assemble/test commands must be run sequentially on this Windows workspace. Running them concurrently can race on generated resource output directories.

## Safety

- No real bank notification used.
- No real customer data used.
- No SMS permission added.
- No SMS reading.
- No bank app scraping.
- No Accessibility scraping service.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone stored/uploaded.
- No raw notification text stored/uploaded.
- No real bank package/cert values invented.
- `TO_VERIFY` remains untrusted.

## Non-critical Limitations

- Live NotificationListener capture must be rerun after manually re-enabling Android Notification Access after reinstall/data clear.
- Full process-death/reboot WorkManager validation remains future work.
- Real bank package/cert verification remains out of scope.
- Real bank notifications remain out of scope.

## Next Recommended Sprint

Sprint 4J - Real-device listener capture replay and receiver resilience.

Recommended focus:

1. Re-enable Notification Access and rerun live synthetic listener capture.
2. Add a debug-only status/action to detect and explain missing Notification Access after reinstall.
3. Validate process-death/reboot WorkManager retry with synthetic redacted outbox entries.
4. Prepare operator-facing diagnostics export without raw PII.
