# Next Action

generated_at: 2026-05-03T10:55:00+03:00

## Latest Completed Sprint

Sprint 4O - Production Trust Policy Design for Bank Package/Certificate Evidence.

## Status

PASS.

The backend now has a metadata-only production trust policy foundation for bank package/certificate evidence. Production trust requires review-only approval first, explicit owner/admin request, second-actor approval and redacted audit. It does not enable auto-confirmation.

## Next Recommended Sprint

Sprint 4P - Real bank evidence collection dry-run planning.

Recommended tasks:

1. Define an operator-controlled real package-name selection flow without installed-app enumeration.
2. Keep real bank notifications out of scope.
3. Collect only package/certificate metadata after explicit operator/user consent.
4. Keep production trust and auto-confirmation disabled during the dry run unless a separate go/no-go policy approves the transition.

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
