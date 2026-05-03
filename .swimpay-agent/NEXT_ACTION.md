# Next Action

generated_at: 2026-05-03T11:20:00+03:00

## Latest Completed Sprint

Sprint 4P - Operator-controlled Real Bank Package Evidence Dry-run Planning.

## Status

PASS.

The Android Receiver now has a strict explicit-package dry-run mechanism for real package/certificate metadata. It accepts one operator/user supplied package name, performs PackageManager lookup for that exact package, returns `package_not_found` safely when absent and submits metadata only as `pending_operator_review`.

## Next Recommended Sprint

Sprint 4Q - Operator-assisted live real package evidence collection.

Recommended tasks:

1. Wait for explicit operator/user package-name input.
2. Collect PackageManager evidence for that exact package only.
3. Submit evidence to backend as `pending_operator_review`.
4. Exercise admin review-only list/detail/approve/reject.
5. Keep real notifications, production trust and auto-confirmation out of scope unless a separate dual-control ceremony is explicitly started.

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
- Do not treat `production_trust_approved` as payment auto-confirmation.
- Do not guess or invent a real bank package name.
