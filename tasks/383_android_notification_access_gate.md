# Task 383 - Android notification access gate

Status: completed

Scope:
- Implement live Notification Listener Access state in the merchant UI.
- Disabled access blocks readiness and shows the approved required state.
- CTA opens `android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`.
- Keep app notification permission separate from Notification Listener Access internally.

Tests:
- Listener disabled blocks readiness.
- Listener enabled allows next onboarding step.
- No SMS permission and no Accessibility scraping service.
