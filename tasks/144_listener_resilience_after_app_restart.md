# 144 — Listener Resilience After App Restart

## Goal

Validate the synthetic NotificationListener path after app restart on a real device when available.

## Scope

- Verify backend health and adb reverse.
- Launch app, confirm Notification Access, trigger synthetic notification.
- Restart or force-stop/relaunch safely without `pm clear`.
- Trigger another synthetic notification and verify capture/outbox/backend path when possible.

## Safety Rules

- Use synthetic redacted notifications only.
- Do not use real bank notifications or customer data.
- Do not bypass Android permissions.

## Validation

- Document live result or blocker honestly in the Sprint 4K report.
