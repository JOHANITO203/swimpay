# 24 - Order and Payment Session State Machines

## Order States

```text
created
awaiting_buyer_identity
payment_session_created
receiver_arming
receiver_armed
payment_instructions_shown
awaiting_payment
buyer_claimed_paid
signal_detected
matching
needs_review
manual_confirmed
rejected
expired
fulfilled
```

## Payment Session States

```text
created
receiver_arming
receiver_armed
awaiting_payment
buyer_claimed_paid
signal_detected
matching
needs_review
manual_confirmed
rejected
expired
```

## Forbidden Transitions

- `created` -> `manual_confirmed`;
- `awaiting_payment` -> `fulfilled`;
- `expired` -> `manual_confirmed` unless signal `observed_at` was inside the payment window and policy allows manual review;
- any confirmed state -> rejected without explicit reversal process.

## Required Audit

Every transition creates an `audit_events` row.

Audit payload must be redacted.

## Normal V1 Flow

```text
created
-> awaiting_buyer_identity
-> payment_session_created
-> receiver_arming
-> receiver_armed
-> payment_instructions_shown
-> awaiting_payment
-> signal_detected
-> matching
-> needs_review
-> manual_confirmed
-> fulfilled
```

## Review Flow

```text
awaiting_payment
-> signal_detected
-> matching
-> needs_review
-> manual_confirmed or rejected
```

Review rejection scopes:

- `signal` scope rejects the review and signal only. The order and payment session remain in their current non-terminal states.
- `payment_session` scope rejects the review, signal and payment session. The order is not rejected automatically.
- `order` scope rejects the review, signal, order and linked payment session.

The default API scope is `signal`.

## Expiry Flow

```text
awaiting_payment
-> expired
```

Expired payment candidates may still create cautious manual review when explicit policy allows it. They never confirm without merchant action.

