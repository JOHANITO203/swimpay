# 404 - Android dashboard summary endpoint

Status: completed

Scope:
- Add `GET /v1/android-merchant/dashboard-summary`.
- Require authenticated merchant context.
- Return merchant-safe dashboard counts, receiver status and recent detected payments.
- Exclude raw card, raw phone, raw notification text and internal technical fields.
- Add API tests.
