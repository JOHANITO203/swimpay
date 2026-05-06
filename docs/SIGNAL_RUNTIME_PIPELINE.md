# Signal Runtime Pipeline

The durable signal-worker path consumes redacted receiver signals and turns them into backend-owned decisions.

V1 is payment-intent-bound and manual-confirmation-first:

- no active payment intent means no merchant payment review;
- negative notification categories never create payment reviews;
- `Matching 100 %` is merchant review copy only;
- merchant manual confirmation is required before fulfillment webhook delivery;
- auto-confirmation is disabled for V1 public release.

## Runtime Flow

```text
signal.received
-> load notification_signals row from PostgreSQL
-> parse redacted notification fields
-> classify direction/category
-> run Payment Intent Gate
-> create merchant review only for intent-bound candidates
-> wait for merchant manual confirmation or rejection
-> request public webhook only after confirmation or terminal outcome
```

PostgreSQL remains the source of truth for decisions. NATS JetStream triggers processing and carries internal events, but final state changes are protected by database writes and unique constraints.

## Parser Behavior

The pipeline uses deterministic parser logic. Negative gates run before incoming classification:

- cashback -> not a customer payment candidate;
- refund -> not a customer payment candidate;
- outgoing payment/transfer -> not a customer payment candidate;
- promo -> ignored for payment review;
- failed transfer -> not a paid order;
- unknown or ambiguous direction -> cautious handling through the Payment Intent Gate.

The parser works only on redacted notification fields. Raw notification text is not stored or required by this runtime.

## Payment Intent Gate

Payment Intent Gate sits between classifier output and review creation.

Inputs include:

- bank profile/package;
- classification;
- amount/currency;
- shape hash;
- reference or sender phone HMAC if available;
- receiving route if known;
- observed time;
- active payment intents and expiry windows.

Outputs include:

- `expected_payment_candidate`;
- `ambiguous_activity`;
- `late_payment_candidate`;
- `unrelated_bank_activity`;
- `negative_activity`;
- `unknown_activity`.

Review creation is allowed only for:

- expected payment candidate;
- ambiguous activity with an active payment intent;
- late payment candidate when policy allows review.

Review creation is not allowed for:

- unrelated bank activity;
- negative activity;
- unknown activity without active payment intent.

## Review Path

The review path creates or reuses one open review item for the signal and payment intent.

Merchant copy may show:

- `Nouveau paiement detecte`;
- `Matching 100 %`;
- `Veuillez confirmer ce paiement.`;
- or a more cautious `Paiement a verifier`.

This copy does not confirm payment.

If the merchant rejects the signal with signal scope, the order remains unchanged. Explicit order rejection is a separate action.

## Public Webhook Path

Public fulfillment webhooks are requested only after merchant manual confirmation or explicit terminal outcome.

Every public payment webhook includes:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

No official bank confirmation behavior or wording is introduced.

## Disabled V1 Auto-confirmation

Older internal architecture contains auto-confirmation states and future policy concepts. For current V1 production readiness, runtime behavior must remain manual-confirmation-first.

Any future automation must be explicitly re-enabled by policy, tests and product approval. Feedback or unknown-shape monitoring must not mutate runtime rules automatically.

## Idempotency

Reprocessing the same `signal.received` event first checks existing signal decisions. Repeated processing returns the existing decision and avoids duplicate review items, duplicate webhook event requests and double confirmation.

PostgreSQL constraints remain the final protection.

## Limitations

- The worker does not implement Android Receiver UI logic.
- It does not scrape bank apps.
- It does not read SMS.
- It does not use Accessibility scraping.
- It does not promote bank templates or bank profiles automatically.
- It does not implement PSP, SBP official rail, wallet behavior or official bank confirmation.
