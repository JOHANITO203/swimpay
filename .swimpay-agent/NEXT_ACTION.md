# Next Action

generated_at: 2026-05-03T12:35:24+03:00

## Latest Completed Sprint

Sprint 4T - Evidence Lifecycle UI/API Rehearsal and Admin Audit Visibility.

## Status

PASS.

Evidence lifecycle rehearsal now has a safe operator-facing API surface:

- `GET /v1/admin/bank-evidence/review-dashboard` summarizes review queue, recent evidence, status counts and next actions;
- the dashboard exposes masked certificate hashes only;
- dashboard safety flags keep `trusted: false`, `production_trust_requested: false` and `auto_confirm_enabled: false`;
- admin audit event search supports `object_id`, `actor_id`, `created_after` and `created_before`;
- evidence lifecycle rehearsal docs and runbook examples exist;
- `trusted` remains `false`;
- `auto_confirm_enabled` remains `false`.

## Next Recommended Sprint

Sprint 4U - Operator evidence review UI rehearsal and production trust dry-run guard validation.

Recommended tasks:

1. Rehearse an operator-facing review UI or CLI using `/v1/admin/bank-evidence/review-dashboard`.
2. Exercise audit trace lookup for submit, approve-review-only, reject and deprecate events against a live local backend.
3. Verify production trust request/approval remains dual-control and separate from review-only actions.
4. Confirm dashboard/audit views never expose raw cert hashes, raw notification text, raw phone values or secrets.
5. Keep real notification processing out of scope.

## What Not To Do Next

- Do not deploy.
- Do not process real bank notifications.
- Do not enumerate installed apps.
- Do not read SMS.
- Do not scrape bank apps.
- Do not expose raw phone or raw notification text.
- Do not add Android payment confirmation.
- Do not add Android auto-confirmation.
- Do not treat `approved_for_review_only` as production trust.
- Do not treat `deprecated` evidence as production trust.
- Do not enable auto-confirm from package/cert evidence.
