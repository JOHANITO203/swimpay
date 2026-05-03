# Next Action

generated_at: 2026-05-03T12:20:25+03:00

## Latest Completed Sprint

Sprint 4S - Operator Review UX and Evidence Lifecycle Hardening.

## Status

PASS.

Evidence review now has safer operator-facing lifecycle behavior:

- admin dashboard responses include `submitted_at` and `production_trust_status`;
- exact duplicate submissions are idempotent;
- changed certs create new `pending_operator_review` evidence rows;
- review actions use allowed reason codes plus redacted notes;
- stale/superseded evidence can be deprecated without deletion;
- admin evidence listing supports metadata-only filters;
- `trusted` remains `false`;
- `auto_confirm_enabled` remains `false`.

## Next Recommended Sprint

Sprint 4T - Evidence lifecycle UI/API rehearsal and admin audit visibility.

Recommended tasks:

1. Add or rehearse an operator-facing evidence review screen/API view using the new dashboard DTOs.
2. Add audit-event filtering/runbook examples for evidence lifecycle events.
3. Rehearse approve-review-only, reject and deprecate actions against local backend evidence.
4. Keep production trust dual-control separate.
5. Keep real notification processing out of scope until evidence lifecycle review is stable.

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
