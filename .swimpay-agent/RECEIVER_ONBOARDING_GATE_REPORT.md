# Receiver Onboarding Gate Report

generated_at: 2026-05-03T00:31:25+03:00

status: PASS

## Context

Real-device testing exposed a product/UX issue: Android app notification permission and Notification Listener Access are different permissions.

App notification permission allows SwimPay Receiver to show its own notifications. Notification Listener Access allows SwimPay Receiver to observe Android notifications and then apply local bank allowlist filtering. Notification Listener Access is mandatory for payment signal detection.

## Tasks Completed

- `129_receiver_onboarding_readiness_gate`
- `130_notification_listener_access_required_step`
- `131_app_notifications_vs_listener_access_status`
- `132_bank_allowlist_onboarding_gate`
- `133_receiver_ready_state_machine`
- `134_onboarding_regrant_after_reinstall`
- `135_receiver_onboarding_closeout_review`

## Onboarding Readiness Behavior

Receiver readiness now requires:

- Notification Listener Access enabled.
- At least one selected bank profile.
- Backend configuration present.
- Device registration completed or safely pending.

When Notification Listener Access is disabled:

- `receiver_ready = false`
- `capture_enabled = false`
- `upload_enabled = false`, except explicit debug/test actions

## Notification Listener Access Gate

The Android app now has a required onboarding action:

```text
Activer l'accès aux notifications
```

The action opens Android's official Notification Listener settings:

```text
android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
```

SwimPay does not bypass Android settings.

## App Notifications vs Listener Access

The app explicitly separates:

- `app_notifications_permission`
- `notification_listener_access`

Exact gate case: app notifications ON + listener OFF leaves Receiver not ready.

App notifications are useful for Receiver UI/status notifications but are not sufficient for bank signal detection.

## Bank Allowlist Gate

At least one bank profile must be selected before readiness.

Selected unverified or review-only profiles can produce:

```text
ready_review_only
```

They cannot produce production trust or any Android-side auto-confirm behavior. `TO_VERIFY` remains untrusted.

## Receiver Ready State Machine

Supported states:

- `not_installed`
- `installed`
- `notification_access_required`
- `bank_selection_required`
- `backend_config_required`
- `device_registration_required`
- `ready_review_only`
- `ready`
- `degraded`

There is no auto-confirm readiness state on Android.

## Regrant After Reinstall

The app persists the last known Notification Listener Access state in safe device state. If previous access was true and the current platform check is false, readiness diagnostics include:

```text
regrant_required_after_reinstall
```

This covers reinstall/data-clear cases where Android removes the listener grant.

## Required UI Wording

```text
Android donne une permission large d'accès aux notifications. SwimPay applique ensuite une allowlist locale : seules les notifications des banques que vous choisissez sont analysées. Les autres notifications sont ignorées localement.
```

## Tests Added

- Android JVM tests for app notifications ON with Notification Listener Access OFF.
- Android JVM tests for `ready_review_only` with selected unverified bank.
- Android JVM tests for no selected bank blocking readiness.
- Android JVM tests for regrant detection after reinstall/data clear.
- Android JVM tests for Notification Listener settings action.
- Static Vitest checks for Phase 4J queue/docs/source boundaries.

## Validation

PASS:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` (`34` files, `247` tests)
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`

## Safety

- No SMS permission added.
- No bank app scraping added.
- No Accessibility scraping service added.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone storage.
- No raw notification text storage.
- No real bank package names or certificate fingerprints invented.
- Debug features remain debug-only.

## Next Step

Re-enable Notification Listener Access on the real device, then replay the Sprint 4I live synthetic notification listener capture.
