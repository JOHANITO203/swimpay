# Next Action

generated_at: 2026-05-02T23:55:28+03:00

## Latest Completed Sprint

Sprint 4I - Synthetic Notification Listener E2E and Receiver Diagnostics.

## Status

PASS with one manual Android permission step.

The deterministic synthetic notification pipeline, outbox flush and backend upload path passed on the real device. Live NotificationListener capture must be rerun after re-enabling Android Notification Access for SwimPay Receiver, because reinstall/data clear removed the OS listener grant.

## Next Recommended Sprint

Sprint 4J - Real-device listener capture replay and receiver resilience.

Recommended tasks:

1. Re-enable SwimPay Receiver in Android Notification Access and rerun live synthetic listener capture.
2. Add a debug-only warning/action when Notification Access is missing after reinstall.
3. Validate WorkManager retry after app process death and phone reboot with synthetic redacted outbox entries.
4. Add a safe diagnostics export for operator support without raw PII.

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
