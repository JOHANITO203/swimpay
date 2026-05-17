# Android Background Notification Reliability Audit

Date: 2026-05-17

Scope: audit only. No runtime, backend, payment, navigation or UI behavior was changed.

## Context

This audit covers the transition from the current solid staging base toward production, with one specific risk: Android can kill or deprioritize the app, and bank notifications can be missed when the merchant app is not in the foreground.

SwimPay remains manual-confirmation-only. Android captures, filters, redacts, signs and uploads notification signals; backend decides and creates reviews. Missed notifications must never become automatic confirmation.

## Documents Read

- `AGENTS.md`
- `docs/02_SYSTEM_ARCHITECTURE.md`
- `docs/06_API_SPEC.md`
- `docs/08_ANDROID_RECEIVER_SPEC.md`
- `tasks/623_android_non_debug_signal_upload_transport.md`
- `tasks/639_notification_listener_readiness.md`
- `tasks/640_redaction_outbox_upload_readiness.md`
- `tasks/641_receiver_registration_heartbeat_readiness.md`
- `tasks/721_active_intent_notification_sweep.md`
- `tasks/722_no_notification_manual_fallback.md`
- `tasks/706_harden_real_signal_runtime.md`
- `tasks/708_harden_android_device_redaction_and_exports.md`
- `tasks/738_checkout_fallback_prod_grade.md`
- `.swimpay-agent/ANDROID_RECEIVER_REAL_RUNTIME_REPORT.md`
- `.swimpay-agent/ANDROID_RECEIVER_HEALTH_RUNTIME_WIRING_REPORT.md`
- `.swimpay-agent/ACTIVE_INTENT_NOTIFICATION_SWEEP_REPORT.md`
- `.swimpay-agent/RECEIVER_REGISTRATION_HEARTBEAT_READINESS.md`
- `.swimpay-agent/NOTIFICATION_LISTENER_READINESS.md`
- `.swimpay-agent/REDACTION_OUTBOX_UPLOAD_READINESS.md`

## Code Surfaces Audited

- `apps/android-receiver/android/app/src/main/AndroidManifest.xml`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ActiveIntentNotificationSweep.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverRuntimeConfigStore.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverRuntimeRegistrationCoordinator.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/work/SignalUploadWorker.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/work/SignalUploadFlusher.kt`
- `apps/api/src/receiver-devices.ts`
- `apps/job-worker/src/no-notification-fallback.ts`
- `infra/docker-compose.yml`

## What Is Already Solid

1. Notification access is represented separately from app notification permission.
2. The listener is declared as a proper `NotificationListenerService`.
3. Runtime notification processing is allowlisted by explicit supported bank packages.
4. Unsupported notifications are rejected before snapshot extraction.
5. Raw notification content is temporary and must be redacted before outbox/upload.
6. Non-debug signal upload uses `/v1/receiver/signals`.
7. The encrypted outbox and upload flusher reject unsafe raw fields.
8. WorkManager is used for network-constrained outbox flush after a captured signal.
9. Backend heartbeat has states/actions for notification access, listener disconnected, bank targets missing, queue backlog and battery optimization risk.
10. The no-notification manual fallback exists and is enabled by default in Docker Compose.

## Critical Gaps Before Production

### P0 - Active payment window is not wired from real checkout runtime

`SwimPayNotificationListenerService` exits early unless `runtimeConfig.activeIntentWindow.canSweep()` is true.

That window requires:

- `paymentIntentActive = true`
- `receiverArmed = true`
- `expectedPaymentProfilePresent = true`
- `receivingRouteLocked = true`

Current code persists the model, but `saveActiveIntentWindow(...)` is not called by production runtime code. The onboarding save writes only bank ids and merchant id, leaving the active window false by default.

Impact: on a real production checkout, the listener can have permission and still ignore bank notifications because the active payment window is not opened locally.

Recommended hardening: add a backend-owned receiver active-window sync path. It should open the local window only for armed sessions with expected payment profile and locked receiving route, then expire it locally. Do not let Android decide payment truth.

### P0 - Active notification sweep does not enqueue/upload recovered observations

`onListenerConnected()` runs `getActiveNotifications()` and snoozed notification sweep. Keyed recall runs after `onNotificationPosted()`.

However, `runNotificationSweep(...)` currently logs the result only. `ActiveIntentNotificationSweep.processSnapshots(...)` returns redacted observations, but those observations are not converted into signed outbox records.

Impact: the recovery path for notifications already present in the notification shade does not currently recover a missed signal. It is useful telemetry, not a durable upload path.

Recommended hardening: convert accepted sweep observations into the same redacted signed outbox path as live listener captures, with idempotency by `notification_hash` and active payment intent gate.

### P0 - Backend does not degrade stale heartbeat by time

The backend stores `last_heartbeat_at`, but `deriveReceiverHealthStatus(...)` derives health from the stored device status and notification access flag, not from heartbeat freshness.

Impact: if Android is killed, force-stopped, disconnected, or blocked by OEM battery policy and no new heartbeat arrives, the backend can keep reporting the last known active state.

Recommended hardening: derive `offline` or `degraded` from stale `last_heartbeat_at` in backend read/health surfaces and active checkout readiness. Add threshold config and tests.

### P1 - Heartbeat is not scheduled as a durable periodic Android runtime

Android registration performs `registerAndHeartbeat(...)`, and onboarding/refresh can call it, but there is no periodic `WorkManager` heartbeat worker found in the active Android source.

Impact: receiver health cannot prove ongoing liveness while the app is backgrounded. It also cannot reliably report outbox depth, battery optimization risk, last signal time or listener disconnects over time.

Recommended hardening: add a constrained periodic heartbeat worker with:

- notification listener access state;
- persisted listener connected/disconnected timestamp;
- outbox depth;
- last signal observed timestamp;
- battery optimization state;
- backend URL from persisted device state;
- safe retry/backoff.

### P1 - `listener_connected` is currently approximated as notification access

The Android heartbeat body sets:

```text
listener_connected = notificationAccessEnabled
```

This conflates permission with actual service connection.

Impact: backend may consider the receiver connected when Android granted access but the service is disconnected or stale.

Recommended hardening: persist listener lifecycle events from `onListenerConnected()` and `onListenerDisconnected()`, then send the actual recent connection state in heartbeat.

### P1 - Android force-stop and OEM battery policies remain operational risks

WorkManager helps after a signal is already in the outbox, but Android force-stop prevents scheduled work until the user launches the app again. Some OEM policies can also delay background work and listener reconnection.

Impact: already-captured signals are safer than missed notifications; missed notifications still need backend fallback and merchant-visible action states.

Recommended hardening:

- surface battery optimization risk in receiver health;
- guide the merchant to exempt SwimPay from restrictive battery modes;
- make stale heartbeat degrade checkout readiness;
- keep no-notification fallback active for armed sessions.

## Production Readiness Assessment

Current state is staging-solid for controlled tests, but not yet production-hard for background notification reliability.

Decision: not ready to rely on passive background notification capture as the only operational path.

Safe production direction:

1. Keep manual confirmation only.
2. Keep no-notification manual fallback enabled.
3. Add stale heartbeat degradation.
4. Add periodic Android heartbeat.
5. Wire active checkout window from backend/session state to Android.
6. Make active notification sweep enqueue redacted signed outbox entries.
7. Prove all of the above on staging before flipping prod traffic.

## Recommended Next Task Order

1. Backend stale receiver health hardening.
2. Android listener lifecycle persistence and real `listener_connected` heartbeat.
3. Android periodic heartbeat worker.
4. Active payment window sync from checkout/backend to Android.
5. Active notification sweep to outbox upload.
6. Staging proof: background app, screen locked, app swiped away, network loss/recovery, and no-notification fallback.

## Verification Status

No tests were run for this audit because no code was changed.

Recommended verification after hardening:

- Android unit tests for heartbeat worker payloads and listener lifecycle state.
- Android unit tests for sweep-to-outbox idempotency.
- API tests for stale heartbeat degradation.
- Job-worker tests confirming no-notification fallback remains manual-only.
- Staging device smoke with app backgrounded and screen locked.
