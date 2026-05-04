# Task 405 - Buyer Checkout Visual Guardrails Tests

Status: completed

Scope:
- Strengthen tests for buyer checkout wording, route-detail privacy and safe status behavior.

Result:
- Updated `apps/web/src/checkout.test.ts` with buyer flow coverage.
- Updated `apps/web/src/copy-guardrails.test.ts` for the new safe checkout copy.
- Tests verify:
  - no official bank confirmation claim;
  - no payment guarantee;
  - no auto-confirmation wording;
  - no raw card/phone rendered;
  - bank step hides route details;
  - instructions step shows only masked route details.
