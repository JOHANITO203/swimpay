# Task 543 — Admin role boundary

Status: completed

Scope:
- Add admin role model and permission boundary foundation.
- Keep admin identity separate from merchant membership.
- Preserve existing operator-token protection for current admin monitoring routes.

Constraints:
- Merchant users must not automatically become admins.
- Admin monitoring remains redacted/read-only where required.

