# Next Action

generated_at: 2026-05-03T02:00:46+03:00

## Latest Completed Sprint

Sprint 4M - Operator-reviewed Bank Evidence Workflow.

## Status

PASS.

The backend now has a `bank_package_evidence` model, receiver intake endpoint, RBAC-protected admin review endpoints, redacted audit events and a debug-only Android evidence submission action. Evidence approval is review-only and cannot create production trust or auto-confirmation eligibility.

## Next Recommended Sprint

Sprint 4N - Real-device operator evidence dry-run rehearsal with synthetic package only.

Recommended tasks:

1. Use the real device debug action to submit synthetic evidence through adb reverse.
2. Verify `GET /v1/admin/bank-evidence` and approve-review-only against local Compose.
3. Confirm all evidence remains review-only and no bank profile/template trust changes.
4. Keep real bank notifications and real package/cert values out of scope until a separate explicit dry-run plan.

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
