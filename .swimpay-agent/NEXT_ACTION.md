# Next Action

generated_at: 2026-05-02T23:00:00+03:00

## Latest Completed Sprint

Sprint 4G - Android Persistent Outbox and Live Status Hardening.

## Status

PASS.

## Next Recommended Sprint

Sprint 4H - Android production storage and worker hardening.

Recommended tasks:

1. Replace the local protected outbox boundary with Android Keystore-backed encrypted storage.
2. Wire WorkManager to run the real persistent outbox processor in the background.
3. Add a debug-only clear synthetic state action.
4. Validate retry after app process death and device reconnect.

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

