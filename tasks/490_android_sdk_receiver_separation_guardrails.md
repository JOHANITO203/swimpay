# Task 490 - Android SDK receiver separation guardrails

Sprint: 9C - Android Merchant SDK / Helper Production Readiness

Goal:
Prove the merchant Android SDK/helper is separate from SwimPay Receiver internals.

Acceptance:
- SDK does not import Receiver classes.
- SDK does not use `NotificationListenerService`.
- SDK does not request Notification Access.
- SDK does not include SMS, Accessibility or `QUERY_ALL_PACKAGES`.
- SDK does not probe bank packages.
- SDK does not process bank notifications.
- Add tests/static checks.
