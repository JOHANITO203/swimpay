# 24 — Order and Payment Session State Machines

## Order states

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
auto_confirmed
manual_confirmed
rejected
expired
fulfilled
```

## Payment session states

```text
created
receiver_arming
receiver_armed
awaiting_payment
buyer_claimed_paid
signal_detected
matching
needs_review
auto_confirmed
manual_confirmed
rejected
expired
```

## Forbidden transitions

- `created` → `auto_confirmed`;
- `created` → `manual_confirmed`;
- `awaiting_payment` → `fulfilled`;
- `expired` → `auto_confirmed` unless signal `observed_at` was inside window and grace rules allow review/manual confirmation;
- any confirmed state → rejected without explicit reversal process.

## Required audit

Every transition creates an `audit_events` row.

Audit payload must be redacted.

## Normal flow

```text
created
→ awaiting_buyer_identity
→ payment_session_created
→ receiver_arming
→ receiver_armed
→ payment_instructions_shown
→ awaiting_payment
→ signal_detected
→ matching
→ auto_confirmed
→ fulfilled
```

## Review flow

```text
awaiting_payment
→ signal_detected
→ matching
→ needs_review
→ manual_confirmed or rejected
```

## Expiry flow

```text
awaiting_payment
→ expired
```

## Buyer claimed paid

`buyer_claimed_paid` is not proof of payment. It only helps timeline and UX.
