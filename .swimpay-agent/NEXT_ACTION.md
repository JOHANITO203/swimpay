# Next Action

generated_at: 2026-05-03T01:20:17+03:00

## Latest Completed Sprint

Sprint 4K - Receiver Resilience and Bank-profile Selection Readiness.

## Status

PASS.

PASS.

The Android Receiver now has explicit safe bank-profile selection modeling, `ready_review_only` readiness for selected `TO_VERIFY` banks, a bank selection onboarding/debug UI model, and a PII-safe operator diagnostics export. Real-device smoke verified listener capture after app restart and persisted outbox recovery after a local backend outage.

## Next Recommended Sprint

Sprint 4L - Bank package/certificate evidence dry-run preparation.

Recommended tasks:

1. Define a real-device PackageManager evidence collection checklist without automatically trusting captured values.
2. Add or harden an operator review path for bank package/cert evidence.
3. Keep `TO_VERIFY` and pending profiles review-only until explicit operator verification.
4. Continue reboot/background WorkManager validation using synthetic redacted data.

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
