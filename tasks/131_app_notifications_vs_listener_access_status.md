# 131 - App Notifications vs Listener Access Status

## Goal

Separate Android app notification permission from Notification Listener Access.

## Requirements

- Track `app_notifications_permission`.
- Track `notification_listener_access`.
- App notifications ON plus listener OFF must leave Receiver not ready.
- App notifications are useful for SwimPay's own notifications but not sufficient for payment signal detection.

## Boundaries

- Do not conflate these Android permissions in UI, docs, diagnostics, or readiness.

## Status

Completed in Phase 4J.
