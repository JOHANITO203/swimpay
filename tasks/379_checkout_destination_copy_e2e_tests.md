# Task 379 - Checkout destination copy E2E tests

Status: completed

Scope:
- Add end-to-end checkout destination copy coverage.
- Verify merchant creates phone/card routes, buyer selects bank/route, masked route appears, copy endpoint reveals only the selected active route, expired/inactive sessions cannot copy, audit is masked and webhooks remain PII-free.

Validation:
- API and E2E tests use synthetic data only.
- Buyer claimed paid does not confirm payment.
