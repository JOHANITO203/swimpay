# Task 010 — Review Queue

## Goal

Implement review workflow for ambiguous payment signals.

## Read first

- `docs/14_UX_MERCHANT_DASHBOARD.md`
- `docs/10_MATCHING_AND_SCORING.md`
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`

## Requirements

Implement:

- review creation;
- review list endpoint;
- confirm endpoint;
- reject endpoint;
- review actions;
- audit events;
- template feedback hook.

## Acceptance criteria

- Medium/ambiguous matches create review.
- Merchant can confirm/reject.
- Manual confirmation updates order/session.
- Manual rejection updates review.
- All actions audited.
