# Next Action

generated_at: 2026-05-03T11:54:16+03:00

## Latest Completed Sprint

Sprint 4R - Android Package Visibility and Operator Evidence UX Hardening.

## Status

PASS.

Android package visibility now distinguishes hidden/not-declared packages from true absence. The debug/operator manifest includes one exact query for `ru.sberbankmobile`, selected by the operator in Sprint 4Q.

The app-side PackageManager evidence action now succeeds on the real device and submitted evidence `878ddd87-2e69-40b1-9cc7-da15d95a6b0b`.

Final evidence state:

- `status: pending_operator_review`
- `trusted: false`
- `production_trusted_app_metadata: false`
- `auto_confirm_enabled: false`

## Next Recommended Sprint

Sprint 4S - Operator review UX and evidence lifecycle hardening.

Recommended tasks:

1. Add operator-facing filters/status summaries for pending evidence rows.
2. Add evidence lifecycle guidance for duplicates, deprecation and stale review-only rows.
3. Keep production trust separate and dual-control.
4. Keep real notifications and auto-confirmation out of scope.

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
- Do not treat Sprint 4Q/4R evidence rows as production trust.
- Do not guess or invent a real bank package name.
