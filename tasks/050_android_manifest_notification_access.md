# 050 - Android Manifest Notification Access

## Goal

Ensure the Android manifest declares the Notification Listener service safely.

## Scope

- Declare `NotificationListenerService`.
- Use `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`.
- Do not request SMS or scraping/accessibility permissions.
- Keep Android capture-only.

## Acceptance Criteria

- Static tests verify notification listener declaration.
- Static tests verify SMS permissions are absent.
