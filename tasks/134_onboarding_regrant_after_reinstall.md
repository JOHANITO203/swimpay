# 134 - Onboarding Regrant After Reinstall

## Goal

Detect when Android Notification Listener Access must be re-granted after reinstall or data clear.

## Requirements

- Persist the last known Notification Listener Access state.
- If previous access was true and current access is false, emit `regrant_required_after_reinstall`.
- Document the manual Android action.

## Boundaries

- Do not bypass Android permission settings.

## Status

Completed in Phase 4J.
