# 130 - Notification Listener Access Required Step

## Goal

Add a blocking onboarding step for Android Notification Listener Access.

## Requirements

- Add the step text: `Activer l'accès aux notifications`.
- Add an action to open Android's Notification Listener settings with `android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`.
- The user must manually enable the OS permission.
- Add diagnostics:
  - `notification_access_disabled`
  - `listener_disconnected`
  - `regrant_required_after_reinstall`

## Boundaries

- Do not bypass Android OS settings.
- Do not claim SwimPay can read only bank notifications; Android grants broad access, then SwimPay filters locally.

## Status

Completed in Phase 4J.
