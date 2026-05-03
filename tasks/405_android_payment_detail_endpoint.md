# 405 - Android payment detail endpoint

Status: completed

Scope:
- Add `GET /v1/android-merchant/payments/:id` or reuse an existing safe review detail endpoint.
- Require authenticated merchant context.
- Return safe payment review detail, reason labels/codes for UI mapping and allowed actions.
- Exclude raw receiver identifiers, buyer phone and notification text.
- Add tests.
