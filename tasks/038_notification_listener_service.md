# 038 - Notification Listener Service

## Goal

Create the NotificationListenerService boundary for the Android Receiver MVP.

## Scope

- Add service skeleton.
- Define callback boundary.
- Ignore non-allowlisted packages.
- Forward only safe signals to local processing.

## Guardrails

- No SMS reading.
- No bank app scraping.
- No final payment decision.
- Backend decides.

## Acceptance

- Listener tests prove non-allowlisted notifications are ignored.
- Listener capabilities do not include payment confirmation.
