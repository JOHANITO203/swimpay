# Next Action

generated_at: 2026-05-03T12:59:29+03:00

## Latest Completed Sprint

Sprint 4V - Evidence operator UI surface and production trust audit drill.

## Status

PASS.

The evidence operator flow now has a local web surface:

- `GET /admin/evidence-review`
- reads the evidence review dashboard API;
- reads redacted evidence audit events;
- displays pending/recent evidence and production trust audit drill rows;
- keeps `trusted=false` and `auto_confirm_enabled=false` explicit;
- keeps production trust actions out of the UI.

## Next Recommended Sprint

Sprint 4W - Evidence production trust dual-operator rehearsal and operator handoff.

Recommended tasks:

1. Rehearse requester/approver separation with two explicit local dev operators.
2. Add an operator handoff checklist from review-only evidence to production trust request.
3. Verify audit trace continuity across request, blocked same-actor approval and second-actor approval/revocation on synthetic/local data only.
4. Keep real notification processing out of scope.
5. Keep auto-confirm disabled and separate from package/certificate metadata trust.

## What Not To Do Next

- Do not deploy.
- Do not process real bank notifications.
- Do not enumerate installed apps.
- Do not read SMS.
- Do not scrape bank apps.
- Do not expose raw phone or raw notification text.
- Do not add Android payment confirmation.
- Do not add Android auto-confirmation.
- Do not treat review-only evidence as production trust.
- Do not enable auto-confirm from package/cert evidence.
