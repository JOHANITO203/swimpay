# Review Queue

The review queue contains ambiguous or unsafe payment-signal candidates that require merchant action.

## Actions

### Confirm

`POST /v1/reviews/:id/confirm`

Manual confirmation means the merchant accepts the reviewed signal as the operational payment signal for the order.

Effects:

- review becomes `confirmed`
- order becomes `manual_confirmed`
- payment session becomes `manual_confirmed`
- a manual signal match is recorded
- redacted audit event is written
- `review.confirmed` is published internally

### Reject

`POST /v1/reviews/:id/reject`

Rejecting a review defaults to signal scope and does not reject the order automatically.

Request:

```json
{
  "scope": "signal",
  "reason": "false_positive"
}
```

Supported scopes:

- `signal`
- `payment_session`
- `order`

Supported reasons:

- `false_positive`
- `wrong_signal`
- `amount_collision`
- `negative_direction`
- `buyer_not_recognized`
- `expired_payment`
- `fraud_suspected`
- `merchant_cancelled`
- `other`

## Privacy

Review list and action responses expose masked phone/reference fields only. Raw phone numbers and raw notification text are not returned.

## Idempotency

Repeating the same reject scope for an already rejected review is a no-op response with `idempotent: true`. Changing scope after rejection returns `review_rejection_scope_conflict`.
