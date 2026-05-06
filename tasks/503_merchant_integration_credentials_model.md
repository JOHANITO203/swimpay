# Task 503 — Merchant integration credentials model

Status: completed

Scope:
- Added merchant-scoped developer integration read model.
- Added additive database migration for `merchant_integrations`.

Safety:
- Normal reads expose masked secret fields only.
- Public webhook events remain limited to `payment.confirmed`, `payment.rejected` and `payment.expired`.

