# Task 461 - SDK Web Current State Audit

## Goal

Audit Web/backend developer integration readiness.

## Check

- Node SDK/helper
- web checkout helper
- order creation example
- webhook signature verifier
- webhook event types
- idempotency support
- typed errors
- `.env.example`
- integration docs
- tests

## Expected V1

Server-side order/payment-intent creation, checkout URL redirect, webhook signature verification, supported final events, idempotency, no raw PII in webhooks and `official_bank_confirmation=false`.

## Output

Create `.swimpay-agent/SDK_WEB_AUDIT.md`.

