# Android Receiver Real-Runtime Inventory

generated_at: 2026-05-08T00:00:00+03:00

## Scope

Sprint CR-4 prepares Android Receiver real-runtime readiness for synthetic staging smoke only.

No real bank notifications were captured, read, uploaded, parsed or matched during this inventory.

## Files audited

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/BankTargetLock.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidNotificationSnapshotExtractor.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverNotificationPipeline.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/PrivacyFirewall.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/outbox/AndroidEncryptedOutboxStore.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/work/SignalUploadWorker.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/PersistentDeviceStateStore.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- `apps/android-receiver/android/app/src/main/AndroidManifest.xml`

## Current listener blocker

The current listener path is synthetic/debug-only for three exact reasons:

1. `ReceiverBoundaries.isRuntimeNotificationAllowed(...)` returns true only when `debugEnabled == true` and `packageName == appPackageName`.
2. `SwimPayNotificationListenerService.onNotificationPosted(...)` returns after redaction unless `BuildConfig.DEBUG` is true.
3. `SignalUploadWorker.doWork()` returns failure in non-debug builds before flushing the encrypted outbox.

As a result, non-debug supported bank notifications cannot currently enter the encrypted outbox or upload retry boundary.

## Existing safe foundations

- `BankTargetLock` already has an exact five-bank supported package list and exact package probe guard.
- The manifest does not request SMS, Accessibility or `QUERY_ALL_PACKAGES`.
- `AndroidNotificationSnapshotExtractor` extracts Android notification fields into an in-memory `NotificationSnapshot`.
- `ReceiverNotificationPipeline` coalesces snapshots, redacts text, emits placeholders and sets `raw_text_present=false`.
- `AndroidEncryptedOutboxStore` rejects raw phone markers, raw notification keys, raw title/body markers and secret-like payloads before persistence.
- `PersistentDeviceStateStore` maintains a monotonic local counter and rejects raw/secret-like state.
- Premium UI receiver states are display/review-first and do not own payment confirmation.

## Gaps to close

- Add non-debug package gating for explicitly enabled supported bank targets.
- Replace the synthetic-only package gate with a real-runtime gate that accepts supported activated package targets while marking package/cert trust as review-only metadata.
- Ensure listener enqueue uses the same redacted pipeline in non-debug mode.
- Ensure worker can flush redacted outbox payloads in non-debug mode without exposing debug smoke actions.
- Add a synthetic staging harness that exercises supported and unsupported notification snapshots without real bank notifications.
- Add guardrails for permissions, package enumeration, raw text, Android confirmation and developer webhooks.

## Product truth retained

- Android captures, filters, redacts, signs and uploads.
- Backend decides.
- Android does not confirm orders.
- Android does not send developer webhooks.
- Real bank notification capture remains blocked until explicit operator approval.

