# Next Action

generated_at: 2026-05-03T12:47:04+03:00

## Latest Completed Sprint

Sprint 4U - Operator Evidence Review UI/API Rehearsal and Production Trust Dry-run Guard Validation.

## Status

PASS.

Evidence lifecycle rehearsal now has a local operator tool:

- `npm run rehearsal:evidence -- --plan` prints a non-destructive plan;
- `npm run rehearsal:evidence` validates dashboard/audit redaction against local backend;
- optional `SWIMPAY_EVIDENCE_ID=<id> npm run rehearsal:evidence` validates production trust dual-control on explicit local/dev evidence;
- same-actor production trust approval remains blocked;
- `trusted` remains `false`;
- `auto_confirm_enabled` remains `false`.

## Next Recommended Sprint

Sprint 4V - Evidence operator UI surface and production trust audit drill.

Recommended tasks:

1. Add a minimal operator UI surface or static admin view backed by the evidence dashboard endpoint.
2. Add an audit drill that links each evidence lifecycle action to its redacted audit event.
3. Verify production trust approval still requires a second operator in UI/API rehearsal.
4. Keep real notification processing out of scope.
5. Keep auto-confirm disabled unless all separate payment gates are implemented and tested.

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
