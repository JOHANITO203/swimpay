# Task 516 - Developer Wizard Live Guardrails

Sprint: 9F - Developer Integration Wizard Live UX Wiring

## Goal

Protect live wizard wiring from secret leaks and product-truth regressions.

## Requirements

- Tests proving normal page renders no raw secret key.
- Tests proving normal page renders no raw webhook secret.
- Tests proving snippets contain no secret key in browser or Android code.
- Tests proving delivery history has no raw payload/PII.
- Tests proving public webhook events remain limited to:
  - `payment.confirmed`
  - `payment.rejected`
  - `payment.expired`
- Tests proving no auto-confirm or official bank confirmation claim.

## Safety

- No weakening existing guardrails.
- No payment behavior changes.
