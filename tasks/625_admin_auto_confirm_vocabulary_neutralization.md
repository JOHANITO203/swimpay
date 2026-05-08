# Task 625 - Admin auto_confirm vocabulary neutralization

Status: completed

Goal: remove or quarantine misleading active `auto_confirm*` admin/operator vocabulary before staging-prod.

Scope:
- Rename active admin response fields to manual-review readiness language where possible.
- Keep legacy schema/template vocabulary only when explicitly quarantined as compatibility or fixture debt.
- Ensure operator-facing web copy does not present V1 auto-confirmation as a capability.

Guardrails:
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not change public SDK or webhook contracts.
- Public events remain final-only and `official_bank_confirmation=false`.

Validation:
- Add/update tests proving active admin/operator surfaces do not expose `auto_confirm*` capabilities.
