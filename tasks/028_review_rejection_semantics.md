# 028 - Review Rejection Semantics

## Goal

Clarify and implement final review rejection semantics so rejecting a review has the correct order/session effect.

## Scope

- Review current `rejectReview` behavior.
- Define whether rejecting one review rejects the order/session or only the candidate signal.
- Add explicit reason codes and audit payloads.
- Do not change confirmation rules without tests.

## Requirements

- Every state transition must be auditable.
- Confirmed states must not move to rejected without a defined reversal process.
- Review rejection must not create hidden payment confirmation behavior.

## Acceptance criteria

- Rejection semantics are documented.
- Tests cover linked order/session outcomes.
- Audit events describe the action without raw PII.
- Existing review confirm idempotency remains intact.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
