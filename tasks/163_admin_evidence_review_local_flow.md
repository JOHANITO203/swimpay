# 163 - Admin Evidence Review Local Flow

Status: completed

Goal: validate local admin review endpoints against the Compose backend.

Requirements:

- Query `GET /v1/admin/bank-evidence`.
- Fetch detail for submitted synthetic evidence.
- Verify read-only RBAC can view if configured.
- Verify read-only RBAC cannot approve.
- Approve one synthetic evidence item with `approve-review-only`.
- Confirm approval does not mark bank profile trusted and does not enable auto-confirm.

Out of scope:

- Production identity provider.
- Production package/cert trust.
- Real bank metadata.
