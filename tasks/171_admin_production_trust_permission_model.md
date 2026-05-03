# Task 171 - Admin Production Trust Permission Model

Status: completed

Added explicit permissions:

- `request_bank_evidence_production_trust`
- `approve_bank_evidence_production_trust`
- `revoke_bank_evidence_production_trust`

Owner/admin roles have these permissions. Normal operator, support and read-only roles cannot approve production trust.

Added endpoints:

- `POST /v1/admin/bank-evidence/:id/request-production-trust`
- `POST /v1/admin/bank-evidence/:id/approve-production-trust`
- `POST /v1/admin/bank-evidence/:id/revoke-production-trust`

Endpoints do not enable auto-confirmation.
