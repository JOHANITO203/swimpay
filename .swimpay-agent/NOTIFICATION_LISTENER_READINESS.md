# Notification Listener Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: partial, blocked by device OS state proof.

The listener code gates by package before snapshot extraction and never confirms payment. The remaining proof is Android OS Notification Listener Access and listener connection on the operator device.

## Evidence

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidNotificationSnapshotExtractor.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidReceiverRealRuntimeTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ReceiverNotificationPipelineTest.kt`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| Listener only accepts activated supported packages | ready in code | `ReceiverBoundaries` runs before snapshot extraction. |
| Unsupported notifications ignored before redaction | ready in code | Rejected package returns immediately. |
| No raw storage | ready in code | Raw fields are only transient before redaction; outbox rejects raw markers. |
| No Android confirmation | ready | Source and tests keep `payment.confirmed` out of receiver runtime. |

## Missing Proof

Use ADB/UI inspection to prove Notification Listener Access is enabled and heartbeat reports a safe state.

