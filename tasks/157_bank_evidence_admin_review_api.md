# 157 - Bank Evidence Admin Review API

## Goal

Expose RBAC-protected operator review endpoints for package/certificate evidence.

## Endpoints

- `GET /v1/admin/bank-evidence`
- `GET /v1/admin/bank-evidence/:id`
- `POST /v1/admin/bank-evidence/:id/approve-review-only`
- `POST /v1/admin/bank-evidence/:id/reject`

## Permissions

- View requires `view_bank_templates`.
- Approval requires `promote_bank_templates` or a future dedicated evidence-review permission.
- Rejection uses a dangerous-action permission consistent with template degradation/disable policy.

## Safety

- Approval sets only `approved_for_review_only`.
- Approval does not mark bank profiles or bank app signatures trusted.
- Responses expose masked certificate hashes only.
- No raw PII.
