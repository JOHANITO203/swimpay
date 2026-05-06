# Task 505 — Webhook secret lifecycle

Status: completed

Scope:
- Added merchant-scoped webhook secret generation/rotation lifecycle.
- Normal reads return only masked webhook secret.
- Creation/rotation responses return raw webhook secret once.

Safety:
- API responses do not include raw webhook secrets except explicit one-time creation/rotation fields.

