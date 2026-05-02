# Sprint 4J-B Report - Real NotificationListener Replay After Onboarding Gate

generated_at: 2026-05-03T00:52:04+03:00

status: PASS

## Tasks Created

- `136_real_listener_replay_after_onboarding_gate`
- `137_synthetic_notification_listener_capture`
- `138_listener_to_privacy_firewall_validation`
- `139_listener_to_outbox_to_backend_validation`
- `140_listener_diagnostics_and_closeout`

## Tasks Completed

- Verified real device `R5CWA0FEPZW` is authorized.
- Verified backend health through `http://localhost:8080/api-health`.
- Rebuilt, reinstalled and launched the debug APK.
- Verified Android Notification Listener Access includes `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`.
- Replayed debug-only synthetic notification capture after the onboarding gate.
- Tightened runtime notification filtering so non-allowlisted packages are ignored before snapshot extraction.
- Made the synthetic debug notification id/tag unique per replay to avoid stale same-id notification updates.

## Notification Access Status

PASS.

ADB `settings get secure enabled_notification_listeners` includes:

```text
com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService
```

No Android permission bypass was attempted.

## Receiver Readiness Status

The Notification Listener gate is clear on the real device.

The app readiness model remains intentionally gated by selected bank profile, backend configuration and device registration state. With `TO_VERIFY` or review-only bank metadata, V1 can reach `ready_review_only`, not any Android auto-confirm readiness state.

## Live Listener Capture Result

PASS.

Safe logcat evidence:

```text
SwimPayDebugSmoke: action=post_synthetic_notification success=true message=synthetic debug notification posted; backend decision pending; not official bank confirmation
SwimPayReceiverListener: package=synthetic_debug_only.com.swimpay.syntheticbank notification_id=22478 tag=swimpay_synthetic_debug_incoming_12478 post_time=1777759512480 fields_detected=4 result=enqueued reason=synthetic_notification_processed
SwimPayReceiverListener: outbox_enqueue_success=true message=queued listener notification signal; backend decision pending; not official bank confirmation
```

Only safe metadata was used for diagnostics: package label, notification id/tag, post time, field count and result/reason.

## Allowlist Result

PASS.

The live app now ignores runtime notifications before extraction unless they come from the debug synthetic source package path in a debug build. Real bank package allowlisting remains future work and must use verified bank profiles.

Synthetic metadata remains:

- package: `synthetic_debug_only.com.swimpay.syntheticbank`
- cert: `synthetic_debug_only.cert_sha256`
- trust label: `synthetic_debug_only`

This metadata is not production trust evidence.

## Privacy Firewall Result

PASS.

- No real bank notification was used.
- No real customer data was used.
- No raw phone was uploaded or stored.
- No raw notification text was uploaded or stored.
- Listener diagnostics did not log full notification title/body.
- Android did not confirm or auto-confirm payment.

## Outbox And Backend Upload Result

PASS.

WorkManager processed the listener-created outbox entry:

```text
SwimPaySignalWorker: background outbox flush success=true message=outbox flush result: acked=1 failed_retrying=0; backend decision pending; not official bank confirmation
```

The backend result remains a notification signal upload path with backend decision pending. It is not an official bank confirmation and not Android-side payment confirmation.

## Commands Run

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`
- `adb devices -l`
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080`
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`
- `adb -s R5CWA0FEPZW shell settings get secure enabled_notification_listeners`
- `adb -s R5CWA0FEPZW shell am broadcast -n com.swimpay.receiver/.DebugSmokeBroadcastReceiver -a com.swimpay.receiver.DEBUG_SMOKE --es action post_synthetic_notification`
- `adb -s R5CWA0FEPZW logcat -d -v time`

## Blockers

No critical blockers.

Non-critical limitations:

- Real bank package/certificate verification remains out of scope.
- Real bank notifications remain out of scope.
- Full reboot/process-death WorkManager validation remains future work.
- Production trust for bank app packages/certificates still requires operator verification workflow and real PackageManager evidence.

## Next Recommended Sprint

Sprint 4K - Receiver resilience and bank-profile selection readiness.

Recommended focus:

1. Add a safe selected-bank onboarding/debug selection path that can reach `ready_review_only` without trusting `TO_VERIFY`.
2. Validate listener capture across app restart/process death using synthetic notifications.
3. Continue WorkManager reboot/process-death retry validation.
4. Prepare operator diagnostics export with no raw PII.
