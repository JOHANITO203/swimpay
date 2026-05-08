# Task 645 - Manual Confirmation / Webhook Readiness

Status: completed_ready_with_external_staging_pending

Objective: verify manual confirmation and public webhook readiness.

Checks:
- payment.confirmed only after manual confirmation.
- payment.rejected after manual rejection.
- payment.expired after expiration.
- No public signal_detected/needs_review fulfillment webhook.
- Webhook signature.
- External app fulfillment only after verified payment.confirmed.

Deliverable:
- `.swimpay-agent/MANUAL_CONFIRMATION_WEBHOOK_READINESS.md`

Result:
- API, job-worker and SDK tests enforce public webhook taxonomy and signing.
- External staging app delivery proof remains pending.

