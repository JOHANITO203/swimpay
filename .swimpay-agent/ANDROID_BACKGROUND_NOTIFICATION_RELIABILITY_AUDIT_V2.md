# Android Background Notification Reliability Audit V2

Date: 2026-05-17

Scope: second audit pass before production transition. No code behavior was changed.

## Executive Verdict

The staging base is strong for controlled receiver tests, redacted upload, manual review and no-notification fallback.

It is not yet production-hard for Android background reliability.

The current system protects SwimPay from unsafe confirmations, but it does not yet fully protect the merchant from Android killing the app, delaying the listener, or missing notifications while the app is not foregrounded.

## Verified Strengths

1. `NotificationListenerService` is declared correctly in `AndroidManifest.xml`.
2. The listener rejects unsupported packages before snapshot extraction.
3. The listener requires an active payment intent window before extraction.
4. Accepted live notifications are redacted and can be enqueued into the protected outbox.
5. `SignalUploadWorker` uses unique, network-constrained WorkManager retry.
6. `SignalUploadFlusher` sends due records to `/v1/receiver/signals` and blocks unsafe raw payloads.
7. Backend receiver registration and heartbeat are covered for BFF and Android mobile session paths.
8. No-notification fallback creates a manual review only, does not confirm payment and does not emit public webhook.
9. Docker Compose exposes the no-notification fallback worker variables with production-useful defaults.

## Audit Findings

### P0 - Active intent window exists but is not wired from the real checkout

Evidence:

- `ReceiverRuntimeConfigStore.kt` persists `paymentIntentActive`, `receiverArmed`, `expectedPaymentProfilePresent`, `receivingRouteLocked`.
- `SwimPayNotificationListenerService.kt` exits before extraction if `activeIntentWindow.canSweep()` is false.
- `saveActiveIntentWindow(...)` exists, but no production caller was found.

Impact:

Even with Notification Listener Access enabled, a real bank notification can be ignored if Android never receives the backend-owned active payment window.

Required hardening:

Add a small backend-to-Android runtime sync that opens the local active window only for a current armed checkout with expected payment profile and locked receiving route. It must expire locally.

### P0 - Active notification sweep observes but does not upload

Evidence:

- `onListenerConnected()` calls `getActiveNotifications()`.
- keyed recall calls `getActiveNotifications(arrayOf(sbn.key))`.
- `runNotificationSweep(...)` calls `processSnapshots(...)`, then logs counts only.
- `ActiveIntentNotificationSweep` returns redacted observations, not signed outbox records.

Impact:

If Android missed `onNotificationPosted` but the notification remains visible, the recovery path currently does not produce a durable backend signal.

Required hardening:

Route accepted sweep results through the same redacted signed outbox path as live captures, deduped by `notification_hash`.

### P0 - Stale heartbeat does not degrade backend receiver health

Evidence:

- Backend stores `last_heartbeat_at`.
- `deriveReceiverHealthStatus(...)` uses device status and notification access, not heartbeat freshness.
- No freshness threshold was found in receiver health derivation.

Impact:

If Android is killed or blocked and no heartbeat arrives, backend health can remain based on stale last-known state.

Required hardening:

Add configurable heartbeat freshness thresholds:

- fresh: active;
- stale: degraded;
- very stale: offline/action required.

Apply this to receiver health, checkout readiness and dashboard state.

### P1 - No periodic heartbeat worker exists on Android

Evidence:

- `registerAndHeartbeat(...)` sends heartbeat during registration/refresh.
- No `PeriodicWorkRequest` or heartbeat worker was found in Android runtime source.
- Existing WorkManager worker is for signal upload retry only.

Impact:

The backend cannot know whether the receiver is still alive while the app is backgrounded.

Required hardening:

Add a periodic heartbeat WorkManager worker carrying:

- notification listener access;
- real listener lifecycle state;
- outbox depth;
- last signal observed timestamp;
- selected bank targets;
- battery optimization status;
- backend URL from persisted device state.

### P1 - `listener_connected` is currently approximated from permission

Evidence:

- Android registration heartbeat sets `"listener_connected" to notificationAccessEnabled`.
- No `onListenerDisconnected()` override was found.
- No persisted listener connected timestamp was found.

Impact:

Permission enabled does not prove that Android currently has the listener service connected.

Required hardening:

Persist listener lifecycle:

- `onListenerConnected` => connected timestamp;
- `onListenerDisconnected` => disconnected timestamp/status;
- heartbeat sends recent real state, not permission approximation.

### P1 - Battery optimization risk is contract-level, not device-measured yet

Evidence:

- Contract supports `battery_optimization_ignored`.
- Backend maps warning to `disable_battery_optimization`.
- Android code search did not find `PowerManager` or `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.

Impact:

The backend can display the action if reported, but the Android app does not yet measure/report the real device risk.

Required hardening:

Add Android battery optimization reader and safe settings CTA. This should be advisory, not a bypass.

### P2 - WorkManager proof is not full device survival proof

Evidence:

- Unit tests prove unique work, network constraint and bounded retry.
- Reports still document process-death/reboot validation as future work.

Impact:

Already-captured outbox records are relatively safe, but Android force-stop/reboot/OEM policy behavior remains device-specific until proven.

Required hardening:

Run staging device tests:

- app backgrounded;
- screen locked;
- app swiped away;
- process killed without force-stop;
- force-stop limitation documented;
- network loss/recovery;
- reboot after pending outbox.

## Decision Before Production

Do not move production traffic while passive background notification capture is the only path.

Proceed only if production launch is framed as:

- manual review first;
- no-notification fallback active;
- stale receiver health visible;
- merchant can recover from missed notifications;
- background receiver reliability proven on staging device.

## Recommended Implementation Order

1. Backend stale heartbeat degradation.
2. Android listener lifecycle persistence.
3. Android periodic heartbeat worker.
4. Active checkout window sync into Android runtime config.
5. Active notification sweep to signed outbox.
6. Battery optimization reader and receiver-health action.
7. Staging proof matrix on the real phone.

## Tests Run

Backend/contract targeted:

```text
npm test -- packages/contracts/src/android-receiver.test.ts apps/api/src/receiver-devices.test.ts apps/job-worker/src/no-notification-fallback.test.ts
```

Result:

```text
3 files passed
36 tests passed
```

Android/JVM targeted:

```text
.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidReceiverRealRuntimeTest --tests com.swimpay.receiver.ActiveIntentNotificationSweepTest --tests com.swimpay.receiver.work.WorkManagerHardeningTest --tests com.swimpay.receiver.work.SignalUploadFlusherTest --no-daemon --max-workers=1 --no-watch-fs
```

Result:

```text
BUILD SUCCESSFUL in 36s
```

## Final Audit Position

The current base is safe in the product-truth sense: it avoids automatic payment confirmation, raw notification leakage and unsupported package capture.

The remaining risk is operational reliability, not payment-safety logic. Before prod, the app needs an explicit receiver liveness loop and a durable recovery path for missed-but-still-visible notifications.
