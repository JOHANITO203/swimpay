# Task 243 - Signed Compose Handoff Rehearsal Script

Status: completed

## Scope

Add a script that validates signed Compose handoff guardrails and delegates to the existing production trust handoff flow.

## Result

- Added `scripts/evidence-production-trust-compose-signed-rehearsal.mjs`.
- Added `npm run rehearsal:evidence:compose-signed`.
- The script supports `--plan`.
- Mutation requires `SWIMPAY_SIGNED_COMPOSE_HANDOFF=true`, `SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true`, signed tokens, local secret and explicit evidence id.

## Safety

The script checks local API health first and revocation remains part of the delegated handoff.
