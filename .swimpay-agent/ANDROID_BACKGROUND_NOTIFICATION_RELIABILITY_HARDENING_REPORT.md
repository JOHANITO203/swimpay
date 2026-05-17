# Android Background Notification Reliability Hardening

Date: 2026-05-17

## Scope

This hardening pass follows the background notification reliability audit for the Android receiver before the staging-to-production transition.

Goal:
- reduce blind spots when Android kills or deprioritizes the app;
- expose stale receiver state to the backend and merchant UI;
- preserve the SwimPay contract: Android captures, filters, redacts, signs and uploads; backend decides; no Android-side payment confirmation.

## Root Cause

The previous receiver readiness contract depended too much on a heartbeat being sent while the process was alive.

Observed risk:
- the notification listener could be disconnected or killed without a durable local lifecycle mark;
- a stale heartbeat could still look operational from the backend response path;
- the active-notification sweep produced redacted observations but did not expose accepted pipeline results for signed outbox upload;
- periodic heartbeat scheduling was not explicitly registered from the app entry point.

## Backend Changes

Modified:
- `apps/api/src/receiver-devices.ts`
- `apps/api/src/receiver-devices.test.ts`

Implemented:
- `ReceiverHeartbeatFreshness` thresholds:
  - degraded after 2 minutes;
  - offline after 10 minutes.
- Heartbeat response now derives effective receiver warnings from heartbeat freshness.
- Stale heartbeat now moves `receiver_health.status` to `degraded` or `offline`.
- Stale heartbeat now makes `receiver_mode = "attention_required"`.
- Required actions include reconnecting the notification listener when freshness is no longer acceptable.

No payment decision behavior was changed.

## Android Changes

Modified:
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/MainActivity.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ActiveIntentNotificationSweep.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ActiveIntentNotificationSweepTest.kt`

Added:
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverListenerLifecycleStore.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverHeartbeatPayload.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/work/ReceiverHeartbeatWorker.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ReceiverListenerLifecycleStoreTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/work/ReceiverHeartbeatWorkerTest.kt`

Implemented:
- durable notification listener lifecycle state:
  - connected;
  - last connected at;
  - last disconnected at.
- notification listener now marks connected/disconnected lifecycle events.
- periodic WorkManager heartbeat:
  - unique work name: `swimpay_receiver_heartbeat`;
  - 15 minute interval;
  - network-connected constraint;
  - `ExistingPeriodicWorkPolicy.KEEP`.
- heartbeat payload now includes:
  - device id;
  - app version;
  - Android version;
  - notification access status;
  - listener lifecycle status;
  - allowed bank profile ids;
  - due outbox queue length;
  - battery optimization status;
  - timestamp;
  - signature-present marker.
- active notification sweep now returns accepted uploadable pipeline results so they can be queued through the signed outbox path.
- live notification handling schedules upload only after successful outbox enqueue.

No navigation, UI copy, backend decision logic, order state logic, or payment confirmation logic was changed.

## Tests Added

Backend:
- stale heartbeat degrades/offlines receiver health and required actions.

Android:
- listener lifecycle store persists connected/disconnected state without raw notification or raw phone content;
- heartbeat payload uses real listener lifecycle and battery risk state;
- heartbeat WorkManager plan is unique and network constrained;
- active notification sweep exposes accepted uploadable results for signed outbox upload.

## Verification

Red phase was confirmed before implementation:
- backend stale-heartbeat test initially returned `healthy` instead of `degraded`;
- Android tests initially failed on missing lifecycle, heartbeat worker and sweep upload contracts.

Green phase:

```powershell
npm test -- apps/api/src/receiver-devices.test.ts
```

Result: passed, 9 tests.

```powershell
.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testStagingUnitTest --tests com.swimpay.receiver.ReceiverListenerLifecycleStoreTest --tests com.swimpay.receiver.work.ReceiverHeartbeatWorkerTest --tests com.swimpay.receiver.ActiveIntentNotificationSweepTest --no-daemon --max-workers=1 --no-watch-fs
```

Result: BUILD SUCCESSFUL.

```powershell
npm test -- packages/contracts/src/android-receiver.test.ts apps/api/src/receiver-devices.test.ts apps/job-worker/src/no-notification-fallback.test.ts
```

Result: passed, 37 tests.

```powershell
.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidReceiverRealRuntimeTest --tests com.swimpay.receiver.ActiveIntentNotificationSweepTest --tests com.swimpay.receiver.ReceiverListenerLifecycleStoreTest --tests com.swimpay.receiver.work.ReceiverHeartbeatWorkerTest --tests com.swimpay.receiver.work.WorkManagerHardeningTest --tests com.swimpay.receiver.work.SignalUploadFlusherTest --no-daemon --max-workers=1 --no-watch-fs
```

Result: BUILD SUCCESSFUL.

```powershell
npm run android:assemble:staging
```

Result: BUILD SUCCESSFUL, `:app:assembleStaging`.

## Remaining Risks

- Android OEM battery restrictions can still delay WorkManager. The app now reports battery optimization status, but production readiness should still include a user-facing operational warning when the receiver is not protected.
- The heartbeat worker currently sends due outbox queue depth, not a full historical queue metric.
- Last signal observation is prepared in the payload shape but not yet wired to a durable last-signal timestamp source.
- Backend active checkout window synchronization should be reviewed separately to ensure the receiver arms only inside valid backend-owned payment windows.

## Recommendation

This hardening is ready to keep in staging and promote as part of the production candidate, provided the remaining active-window synchronization review is tracked before release.

The change improves observability and recovery behavior without changing the payment decision contract.
