# Signal Runtime Pipeline

Task 027 wires the durable signal-worker path from `signal.received` into deterministic parsing, matching, decision recording, review creation and webhook delivery requests.

## Runtime Flow

```text
signal.received
-> load notification_signals row from PostgreSQL
-> parse redacted notification text when present
-> score signal quality
-> search candidate payment sessions
-> run matching-core decision gates
-> create review, reject, or auto-confirm
-> request webhook delivery
```

PostgreSQL remains the source of truth for decisions. NATS JetStream triggers processing and carries internal events, but final state changes are protected by database writes and unique constraints.

The API keeps its existing internal event publisher interface, but NATS-backed publishing now serializes those events as JetStream-compatible envelopes on subjects such as `signal.received`.

## Parser Behavior

The pipeline uses `@swimpay/bank-templates` deterministic parser logic. Negative gates run before incoming classification:

- cashback -> rejected as a customer payment
- refund -> rejected as a customer payment
- outgoing payment/transfer -> rejected
- promo -> rejected
- failed transfer -> rejected
- unknown or ambiguous direction -> review

The parser works only on redacted notification fields if they are available. Raw notification text is not stored or required by this runtime.

## Matching and Decision Rules

Candidate sessions must belong to the same merchant, match exact amount and currency, be inside the valid time window, and remain active. Matching-core then evaluates identity, collisions and trust context.

Auto-confirmation is allowed only for a strict synthetic trusted case:

- active order and payment session
- exact amount and currency
- `incoming_customer_transfer`
- exact phone HMAC or reference HMAC match
- no collision
- trusted device
- trusted or trusted-low-amount bank profile
- verified bank app metadata
- trusted template
- unique signal/event/hash protected by PostgreSQL constraints
- score at or above the matching threshold

Amount-only signals never auto-confirm. `TO_VERIFY` or `pending_verification` bank package/certificate metadata cannot auto-confirm and routes to review.

## Review Path

`needs_review` creates or reuses one open review item for the signal. Review payloads include safe reason codes such as:

- `bank_app_unverified`
- `bank_profile_untrusted`
- `template_untrusted`
- `amount_collision`
- `ambiguous_direction`
- `amount_only_never_auto_confirm`
- `no_candidate`

The runtime publishes `decision.needs_review` and `review.created`, writes redacted audit events, and requests a `payment.needs_review` webhook delivery.

## Auto-Confirm Path

The runtime updates orders and payment sessions to `auto_confirmed` only through the repository transaction. Existing partial unique indexes still prevent confirming the same order or using the same signal twice.

The public webhook payload includes:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

No official bank confirmation behavior or wording is introduced.

## Rejected Path

Unsafe signals are preserved and marked rejected instead of deleted. The runtime publishes `decision.rejected`, writes redacted audit events, and requests a `payment.rejected` webhook if endpoints are configured.

## Idempotency

Reprocessing the same `signal.received` event first checks existing signal decisions. Repeated processing returns the existing decision and avoids duplicate review items, duplicate normal webhook event requests, and double confirmation. PostgreSQL constraints remain the final protection.

## Limitations

- The worker does not implement Android Receiver logic.
- It does not verify real bank package names or certificate fingerprints.
- It does not promote bank templates or bank profiles.
- It does not implement PSP, SBP, SMS reading, bank app scraping, or official bank confirmation.
- PostgreSQL integration tests remain a future task; current coverage is unit/in-process runtime behavior.
