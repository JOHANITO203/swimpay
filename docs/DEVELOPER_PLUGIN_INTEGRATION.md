# Developer Plugin Integration

SwimPay provides a checkout-like buyer experience while remaining a Payment Signal
Engine.

The merchant creates an order, redirects the buyer to a SwimPay hosted checkout
URL, and receives signed webhook events as SwimPay observes merchant-side
notification signals. SwimPay is not a PSP, not a bank and not an official bank
confirmation system.

## Core Flow

1. Merchant backend creates an order through the SwimPay API.
2. Merchant redirects the buyer to the returned `checkout_url`.
3. Buyer selects the merchant-side receiver bank.
4. Buyer selects the merchant receiving route for that bank (`phone_transfer` or
   `card_transfer`).
5. Buyer optionally selects a payer bank launcher for convenience.
6. Buyer manually pays through their own bank app or manual transfer flow.
7. SwimPay searches for a merchant-side notification signal.
8. A detected signal routes to merchant review when required.
9. Merchant receives signed public webhook events only after manual confirmation
   or terminal rejection/expiry.

## Receiver Bank vs Payer Bank Launcher

Receiver bank:

- merchant-side receiving bank;
- determines whether SwimPay can look for a merchant-side notification signal;
- may be review-only during beta;
- does not imply automatic confirmation.

Payer bank launcher:

- buyer-side convenience option;
- may help the buyer open or identify their own bank app;
- does not prove payment;
- does not affect bank trust, matching confidence or confirmation gates.

Merchant receiving route:

- merchant-side destination shown only after receiver bank selection;
- may be `phone_transfer` or `card_transfer`;
- is stored with protected raw identifier data and masked public display;
- can improve review reasoning but does not enable auto-confirm by itself.

## Checkout Integration Shape

The expected developer flow is:

```text
create order
  -> redirect buyer to checkout_url
  -> SwimPay may create an internal merchant review when a matching notification signal is observed
  -> receive payment.confirmed webhook only after merchant manual confirmation
  -> or receive payment.rejected / payment.expired terminal events
```

During private beta, real-bank paths are review-first. A buyer clicking `I paid`
is only a buyer claim and must not be treated as payment confirmation.

Public V1 fulfillment webhooks are limited to:

- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

Internal signal and review events are not public fulfillment webhooks.

## Public Webhook Disclosure

Every public payment event must include the notification-signal disclosure:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

Example `payment.confirmed` payload after manual review:

```json
{
  "event_type": "payment.confirmed",
  "order_id": "ord_test_123",
  "payment_session_id": "ps_test_123",
  "review_id": "rev_test_123",
  "amount_minor": 13700,
  "currency": "RUB",
  "receiver_route_code": "SBER-PHONE",
  "rail_type": "phone_transfer",
  "payment_reference": "TANGO ALFA",
  "receiver_bank_id": "sber_ru",
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false,
  "decision": "manual_confirmed",
  "reason_codes": ["merchant_manual_review"]
}
```

These examples intentionally exclude raw phone numbers, raw notification text,
raw notification titles/bodies, raw card numbers, raw receiver phone numbers,
raw buyer sender phones, API keys, webhook secrets and full customer identifiers.

## Copy-details and Route Privacy

Developer plugins must treat checkout copy-details as a hosted-checkout action, not as webhook data. The buyer can reveal the selected destination only through the active checkout session copy action. That reveal is short-lived, rate-limited, no-store/no-cache, and audited with masked route data only.

Webhook payloads may include safe route context:

- `receiver_route_code`
- `rail_type`
- `payment_reference`
- `receiver_bank_id`

Webhook payloads must not include raw card numbers, raw receiver phone numbers, buyer sender raw phone numbers or raw notification text. `buyer_claimed_paid`, payer launcher selection and copy action events do not confirm payment.

## Webhook Verification

Webhook deliveries use signed headers:

```text
SwimPay-Event-Id
SwimPay-Timestamp
SwimPay-Signature
```

The merchant plugin should:

1. Read the raw request body.
2. Verify the signature with the configured webhook secret.
3. Reject stale timestamps according to merchant policy.
4. Deduplicate by `SwimPay-Event-Id`.
5. Release fulfillment only after the merchant-approved review policy emits
   `payment.confirmed`.

## Forbidden Plugin Behavior

Merchant plugins must not:

- present SwimPay as a bank or PSP;
- claim official bank confirmation;
- treat payer launcher selection as proof of payment;
- release product on `buyer_claimed_paid`;
- release product on internal signal or review concepts;
- store raw phone numbers or raw notification text from SwimPay payloads;
- ask SwimPay to read SMS or scrape bank apps.

## Beta Wording

Recommended merchant-facing wording:

```text
SwimPay recherche un signal de paiement côté marchand. SwimPay fournit un signal opérationnel, pas une preuve bancaire. Les paiements ambigus passent en review.
```

Do not write that SwimPay can only read bank notifications. Android grants broad
Notification Listener Access, and SwimPay applies a local allowlist before
analyzing merchant-selected bank notifications.
