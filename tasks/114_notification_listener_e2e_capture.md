# 114 - Notification Listener E2E Capture

## Goal

Validate that `NotificationListenerService` can receive a synthetic notification and pass it into the safe receiver pipeline.

## Scope

- Extract safe snapshot fields.
- Log safe metadata only: package, notification id/tag, post time and detected field count.
- Ignore non-allowlisted or untrusted packages.

## Guardrails

- Do not log full raw notification text.
- Do not upload raw phone or raw notification text.
- Do not perform payment decisions on Android.
