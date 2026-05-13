# Checkout Final State Machine Closeout

Date: 2026-05-13

## Result

The checkout state machine now treats buyer claims as idempotent and state-aware. Already-final merchant decisions reconcile to buyer-safe final states instead of attempting invalid transitions.

## Final Claim Results

- `claim_recorded`: normal buyer claim recorded.
- `pending_review`: buyer claim recorded while review/matching state is preserved.
- `already_confirmed`: merchant decision was already final confirmed.
- `already_rejected`: merchant decision was already final rejected.
- `already_expired`: session was already expired or expired before claim.

## Confirmation Boundary

- Buyer claim does not confirm payment.
- Merchant manual confirmation remains mandatory.
- No public webhook is emitted by buyer claim.
- `payment.confirmed` remains final-only after merchant decision.

## Return Boundary

- Android app return is prioritized when the hosted checkout carries a valid SDK return scheme.
- Web return URL remains fallback.
- Raw API endpoint pages are not used as buyer final destination.

## Tests

Targeted API and web checkout tests passed locally.

## Validation Update

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 78 files, 697 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- `npm run checkout:screenshot:verify` initially detected the intentional Step 1 copy baseline change.
- `npm run checkout:screenshot:record` regenerated 5 checkout baselines.
- `npm run checkout:screenshot:verify` passed after recording.
