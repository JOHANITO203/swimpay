# Next Action

generated_at: 2026-05-03T11:35:33+03:00

## Latest Completed Sprint

Sprint 4Q - Operator-assisted Live Real Package Evidence Collection.

## Status

PASS with one non-critical implementation limitation.

The dry run used the operator-selected package `ru.sberbankmobile`. Exact ADB PackageManager metadata was collected and submitted as bank evidence `f4069615-028b-4329-a136-115495bd058c`, then approved only as `approved_for_review_only`.

Final evidence state:

- `trusted: false`
- `production_trusted_app_metadata: false`
- `auto_confirm_enabled: false`

Non-critical limitation: app-side PackageManager lookup returned `package_not_found` under current Android package visibility settings. No package enumeration was used.

## Next Recommended Sprint

Sprint 4R - Android package visibility and operator evidence UX hardening.

Recommended tasks:

1. Decide a safe package visibility strategy for operator-entered packages.
2. Keep real package names out of production allowlists until explicitly reviewed.
3. Add app-side UX for `package_not_visible` versus truly absent packages.
4. Keep evidence review-only unless a separate dual-control production trust ceremony is intentionally performed.
5. Keep real notifications and auto-confirmation out of scope.

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
- Do not treat Sprint 4Q review-only approval as production trust.
- Do not guess or invent a real bank package name.

