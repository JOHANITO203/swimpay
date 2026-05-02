# Task 004 — Implement Payment Sessions

## Goal

Implement Payment Session Engine and Receiver Armed Mode data model.

## Read first

- `docs/02_SYSTEM_ARCHITECTURE.md`
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`
- `docs/08_ANDROID_RECEIVER_SPEC.md`

## Requirements

Implement:

- session creation from order;
- reference generation;
- valid_from/valid_until;
- session status transitions;
- receiver arming request event;
- checkout status response.

## Acceptance criteria

- Every order has a payment session.
- Session has amount, currency, reference, phone HMAC if provided.
- Session expiry works.
- No direct created → confirmed transition.
- Audit events created for transitions.
