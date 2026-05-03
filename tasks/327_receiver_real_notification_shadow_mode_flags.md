# Task 327 - Receiver Real Notification Shadow Mode Flags

Status: completed

## Scope

Define safe beta flags for future real notification shadow runs.

## Flags

- `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=false`
- `SWIMPAY_REQUIRE_REAL_NOTIFICATION_CONSENT=true`
- `SWIMPAY_REAL_BANK_AUTO_CONFIRM=false`
- `SWIMPAY_SHADOW_AUTO_CONFIRM_PREDICTION=true`
- `SWIMPAY_RAW_NOTIFICATION_STORAGE=false`

## Result

Added `buildSafeReceiverShadowFlags` with safe defaults. Real bank auto-confirm and raw notification storage are explicitly unsafe for Sprint 6E and block the consent gate.
