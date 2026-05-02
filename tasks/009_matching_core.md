# Task 009 — Matching Core

## Goal

Implement deterministic matching between parsed payment signals and active payment sessions.

## Read first

- `docs/10_MATCHING_AND_SCORING.md`
- `docs/05_DATABASE_SCHEMA.md`
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`

## Requirements

Implement:

- candidate search;
- exact amount/currency matching;
- phone/reference matching;
- time window check;
- collision detection;
- score computation;
- decision output;
- reason codes.

## Acceptance criteria

- Amount-only signal does not auto-confirm.
- Phone exact OR reference exact is required for auto-confirm.
- Collision creates review.
- Duplicate signal cannot confirm two orders.
- Same order cannot be confirmed twice.
- Negative direction rejects or blocks auto-confirm.
