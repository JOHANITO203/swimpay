# Task 540 — Active merchant context and tenant isolation

Status: completed

Scope:
- Resolve merchant context from authenticated BFF session and membership.
- Ensure developer integration endpoints no longer depend on client-submitted merchant ids.
- Preserve dev-only `Bearer test_*` fallback outside production.

Constraints:
- Frontend cannot freely choose `merchant_id`.
- Production routes must fail closed without authenticated session/API key.

