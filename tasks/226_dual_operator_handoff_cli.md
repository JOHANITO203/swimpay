# 226 - Dual Operator Handoff CLI

Status: completed

## Goal

Add a local operator handoff tool for production trust rehearsals.

## Scope

- `npm run handoff:evidence-trust -- --plan` prints a non-mutating plan.
- Default execution fetches dashboard/audit only and does not mutate.
- Mutating drill requires explicit `SWIMPAY_EVIDENCE_ID`, `SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true`, requester token and approver token.

## Result

Completed in Sprint 4W.
