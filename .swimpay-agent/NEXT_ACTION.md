# Next Action

generated_at: 2026-05-03T02:23:25+03:00

## Latest Completed Sprint

Sprint 4N - Real-device Operator Evidence Dry-run Rehearsal with Synthetic Package Only.

## Status

PASS.

The local backend and real Android device completed the synthetic bank evidence rehearsal: Android submitted `synthetic_debug_only` evidence, the backend stored it for operator review, admin approval produced only `approved_for_review_only`, rejection worked for a second synthetic fixture and audit events were redacted.

## Next Recommended Sprint

Sprint 4O - Production trust policy design for bank package/certificate evidence.

Recommended tasks:

1. Define the human/operator policy needed before any real bank package/cert can become production trust evidence.
2. Add an explicit future permission boundary for production trust transitions, separate from `approve-review-only`.
3. Define required evidence quality, source, recency and audit criteria.
4. Keep real bank notifications and real customer data out of scope until the policy is approved.

## What Not To Do Next

- Do not deploy.
- Do not use real bank notifications.
- Do not enumerate installed apps.
- Do not store raw phone or raw notification text.
- Do not add SMS permissions.
- Do not add accessibility scraping.
- Do not implement Android payment confirmation.
- Do not implement Android auto-confirmation.
- Do not trust `TO_VERIFY` package names or certificate fingerprints.
- Do not treat `approved_for_review_only` as production trust.
- Do not enable auto-confirmation from evidence review.
