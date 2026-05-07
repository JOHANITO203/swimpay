# Task 580 - Public Webhook Taxonomy Enforcement

Goal:
- Restrict public fulfillment webhooks to final V1 events only.

Allowed public events:
- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

Forbidden as public fulfillment webhooks:
- `payment.signal_detected`
- `payment.needs_review`
- `order.expired`

Required:
- `apps/job-worker` public event types enforce the final taxonomy.
- Signal runtime does not request public webhook delivery for review/signal-detected events.
- Internal events/audit records may still record signal and review activity.

Tests:
- job-worker rejects internal event types;
- endpoints cannot subscribe to internal event types;
- signal runtime creates no public webhook on review creation;
- manual confirm path remains the only future source of `payment.confirmed`.

