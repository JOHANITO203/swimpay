# Task 324 - Real Notification Shadow Consent Gate

Status: completed

## Scope

Prepare an explicit gate before any real bank notification shadow testing.

## Requirements

- Require operator consent.
- Require merchant consent.
- Require a selected bank profile.
- Require review-only readiness for the selected bank.
- Require Notification Listener Access.
- Require backend health.
- Require outbox health.
- Block processing when the real notification shadow flag is not enabled.
- Keep auto-confirm disabled.

## Result

Implemented a pure contract model through `evaluateRealNotificationShadowConsentGate`. The default result is blocked until `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=true` and all consent/readiness inputs pass.

No real notification processing was enabled.
