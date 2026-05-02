# Next Action

generated_at: 2026-05-03T00:31:25+03:00

## Latest Completed Sprint

Phase 4J - Receiver Onboarding Gate + Listener Replay.

## Status

PASS.

Notification Listener Access is now a blocking onboarding condition. App notification permission is tracked separately and is not sufficient for payment signal detection.

## Next Recommended Sprint

Sprint 4K - Real-device listener replay after onboarding gate.

Recommended tasks:

1. Re-enable SwimPay Receiver in Android Notification Access.
2. Rerun live synthetic NotificationListener capture.
3. Confirm onboarding state moves from `notification_access_required` to `ready_review_only` once a selected unverified bank profile and backend/device state exist.
4. Continue WorkManager process-death/reboot validation with synthetic redacted outbox entries.

## What Not To Do Next

- Do not deploy.
- Do not push without explicit request.
- Do not use real bank notifications.
- Do not add SMS permissions.
- Do not add accessibility scraping.
- Do not implement Android payment confirmation.
- Do not implement Android auto-confirmation.
- Do not trust `TO_VERIFY` package names or certificate fingerprints.
- Do not store raw phone or raw notification text.
