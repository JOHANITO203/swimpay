# Review Rejection Semantics

Task 028 clarifies that rejecting a manual review is not the same thing as rejecting the whole order.

## Default Behavior

`POST /v1/reviews/:id/reject` defaults to:

```json
{
  "scope": "signal"
}
```

Signal-scope rejection means:

- `review_queue.status` becomes `rejected`
- linked `notification_signals.status` becomes `rejected`
- linked order status is unchanged
- linked payment session status is unchanged
- `review.rejected` is published internally
- redacted audit events are written
- no public `payment.rejected` webhook is created by default

This lets the merchant say "this signal was not the payment for this review" while keeping the buyer/order flow active.

## Supported Scopes

### `signal`

Use when the reviewed signal is a false positive, wrong sender, ambiguous match, or otherwise not the buyer's payment.

Effects:

- reject review
- reject signal
- keep order active unless already terminal
- keep payment session active unless already terminal

### `payment_session`

Use when the payment attempt/session should stop, but the order itself should remain separately actionable.

Effects:

- reject review
- reject signal
- set linked payment session to `rejected` when it is not terminal
- keep order unchanged unless it is already terminal

### `order`

Use only when the merchant explicitly wants to reject the whole order.

Effects:

- reject review
- reject signal
- set linked order to `rejected` when it is not terminal
- set linked payment session to `rejected` when it is not terminal

## Allowed Reasons

The reject endpoint accepts these reason codes:

- `false_positive`
- `wrong_signal`
- `amount_collision`
- `negative_direction`
- `buyer_not_recognized`
- `expired_payment`
- `fraud_suspected`
- `merchant_cancelled`
- `other`

Free-form raw PII must not be sent as the reason field.

## Idempotency

Repeating the same rejection scope for an already rejected review returns the existing result and does not create another review action.

Escalating a resolved rejection from one scope to another is blocked with `review_rejection_scope_conflict`. A future explicit escalation endpoint can be added if product policy requires it.

## Audit Events

Review rejection writes redacted audit events for:

- `review.rejected`
- `review.action_created`
- `signal.rejected`
- `payment_session.status_changed` for `payment_session` or `order` scope
- `order.status_changed` for `order` scope

Audit payloads include ids, scope and reason codes only. They must not include raw phone numbers or raw notification text.

## Webhook Behavior

Signal-scope review rejection does not create a public `payment.rejected` webhook by default.

Order-scope or payment-session-scope public rejection webhooks remain a future explicit product decision. If emitted in a later task, public payloads must include:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```
