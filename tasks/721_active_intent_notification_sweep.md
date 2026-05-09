# Task 721 - Active Intent Notification Sweep

Status: completed

Objective:
Add an intent-bound Android notification sweep that uses only official NotificationListenerService surfaces during active payment windows.

Scope:
- Live listener remains primary.
- `getActiveNotifications()` runs after listener connection.
- keyed recall uses tracked notification keys only.
- snoozed notifications are scanned when available.
- local recent buffer stores redacted metadata only.

Rules:
- exact supported and activated bank packages only;
- no broad installed-app enumeration;
- no `QUERY_ALL_PACKAGES`;
- no raw title/body/bigText/textLines storage;
- no Android confirmation;
- no webhook emission.

Evidence:
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ActiveIntentNotificationSweep.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ActiveIntentNotificationSweepTest.kt`

