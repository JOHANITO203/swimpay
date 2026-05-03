# 398 - Android review actions confirm/reject wiring

Status: completed

Scope:
- Wire confirm, reject-signal and reject-order contracts to authenticated backend review endpoints where available.
- Keep signal rejection scoped to signal by default.
- Keep order rejection explicit.
- Ensure Android does not directly send developer webhooks.
- Add tests for endpoint selection and action scope.
