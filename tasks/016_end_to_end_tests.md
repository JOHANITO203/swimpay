# Task 016 — End-to-End Tests

## Goal

Create end-to-end tests for the full payment signal flow.

## Read first

- `docs/16_TESTING_STRATEGY.md`
- `docs/01_PRODUCT_REQUIREMENTS.md`

## Required flows

- order created → session created;
- incoming signal → auto-confirm;
- incoming signal missing phone/reference → review;
- cashback signal → no auto-confirm;
- outgoing signal → reject/no auto-confirm;
- duplicate signal → rejected;
- collision → review;
- webhook delivered after confirm.

## Acceptance criteria

- E2E tests run automatically.
- Critical unsafe paths are covered.
- Tests use fake redacted data only.
