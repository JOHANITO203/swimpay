# Webhook Event Taxonomy Source Truth Audit

Date: 2026-05-08

## Public V1 Fulfillment Events

- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

Every public event must disclose:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## Internal-Only Events

- `signal.received`
- `signal.parsed`
- `match.scored`
- `review.created`
- `review.confirmed`
- `review.rejected`
- `payment.signal_detected`
- `payment.needs_review`
- `receiver_armed`
- `buyer_claimed_paid`

## Verified

- `apps/job-worker/src/webhooks.ts` restricts public webhook delivery to final V1 events.
- `packages/swimpay-node/src/webhooks.ts` parses only final V1 public events.
- Public event creation rejects raw PII markers.
- Internal signal/review events cannot be delivered as merchant fulfillment webhooks.
- Test webhook behavior is test-only and does not mark fulfillment.

## Result

Aligned.

