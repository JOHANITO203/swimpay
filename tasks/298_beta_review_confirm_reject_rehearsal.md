# Task 298 - Beta Review Confirm Reject Rehearsal

Status: completed

## Scope

Document and test review-first merchant actions:

- manual confirm after review moves to `manual_confirmed` semantics;
- default reject scope is `signal`;
- no action claims official bank confirmation.

## Result

The private beta rehearsal asserts manual confirm webhook data and signal-scope rejection expectations without enabling auto-confirm.
