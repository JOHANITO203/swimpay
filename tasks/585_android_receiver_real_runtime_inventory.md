# Task 585 - Android Receiver Real-Runtime Inventory

Sprint: Android Receiver Real-Runtime Readiness + Synthetic Staging Smoke.

Goal:
- Audit the current Android Receiver real notification runtime before implementation.

Scope:
- `ReceiverBoundaries.kt`;
- `SwimPayNotificationListenerService.kt`;
- Bank Target Lock implementation;
- notification snapshot extraction;
- redaction pipeline;
- encrypted outbox;
- upload envelope builder;
- receiver heartbeat;
- active premium UI receiver states.

Required:
- Identify exactly why the current listener path is synthetic/debug-only.
- Create `.swimpay-agent/ANDROID_RECEIVER_REAL_RUNTIME_INVENTORY.md`.

Do not:
- process real bank notifications;
- implement before inventory;
- enable auto-confirmation;
- add SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad app enumeration;
- store or upload raw notification text.

