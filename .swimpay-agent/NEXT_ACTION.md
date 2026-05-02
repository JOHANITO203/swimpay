# Next Action

generated_at: 2026-05-03T01:36:30+03:00

## Latest Completed Sprint

Sprint 4L - Bank Package Evidence Dry Run Readiness.

## Status

PASS.

The Android Receiver now has a bank package/certificate evidence contract, explicit PackageManager collector boundary, review-only policy guards, and PII-safe diagnostics for future evidence dry runs. The sprint did not collect real bank package/cert values and did not create production trust from observed evidence.

## Next Recommended Sprint

Sprint 4M - Operator-reviewed bank evidence dry run and verification workflow.

Recommended tasks:

1. Add a backend/admin evidence intake endpoint guarded by operator RBAC.
2. Persist package/cert evidence as pending operator review only.
3. Add audit events for evidence submission, review-only decision and rejection.
4. Run the operator review path with synthetic evidence before any real package/cert dry run.

## What Not To Do Next

- Do not deploy.
- Do not push without explicit request.
- Do not use real bank notifications.
- Do not add SMS permissions.
- Do not add accessibility scraping.
- Do not implement Android payment confirmation.
- Do not implement Android auto-confirmation.
- Do not trust `TO_VERIFY` package names or certificate fingerprints.
- Do not treat PackageManager evidence as production trust without human/operator review.
- Do not store raw phone or raw notification text.
