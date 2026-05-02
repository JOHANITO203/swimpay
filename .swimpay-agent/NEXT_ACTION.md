# Next Action

generated_at: 2026-05-03T00:52:04+03:00

## Latest Completed Sprint

Phase 4J-B - Real NotificationListener Replay After Onboarding Gate.

## Status

PASS.

The real device replay captured a debug-only synthetic notification through `SwimPayNotificationListenerService`, enqueued a redacted signed payload, and flushed it to the local backend with `acked=1 failed_retrying=0`.

## Next Recommended Sprint

Sprint 4K - Receiver resilience and bank-profile selection readiness.

Recommended tasks:

1. Add safe selected-bank onboarding/debug selection so the app can reach `ready_review_only` without trusting `TO_VERIFY`.
2. Validate listener capture across app restart/process death with synthetic notifications.
3. Continue WorkManager process-death/reboot validation with synthetic redacted outbox entries.
4. Prepare operator diagnostics export without raw PII.

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
