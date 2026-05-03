# Next Action

generated_at: 2026-05-03T13:09:06+03:00

## Latest Completed Sprint

Sprint 4W - Evidence production trust dual-operator rehearsal and operator handoff.

## Status

PASS.

The evidence production trust handoff now has a guarded local operator tool:

- `npm run handoff:evidence-trust -- --plan`
- `npm run handoff:evidence-trust`

Default mode is non-mutating. Full mutation requires:

- explicit `SWIMPAY_EVIDENCE_ID`;
- `SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true`;
- requester token;
- different approver token.

## Next Recommended Sprint

Sprint 4X - Signed operator token local rehearsal and production trust handoff execution.

Recommended tasks:

1. Add a local signed-operator-token helper for development only.
2. Configure a local signed-token API rehearsal path without weakening production RBAC.
3. Run the full dual-operator handoff against synthetic/local evidence.
4. Verify request, same-actor block, second-actor approval, revocation and audit continuity.
5. Keep auto-confirm disabled and real notification processing out of scope.

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
- Do not leave rehearsal production trust approved after a drill.
