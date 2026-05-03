# SwimPay Checkout Bank Selection Flow

Sprint 7A introduces a PSP-like hosted checkout experience while keeping SwimPay's
actual role as a Payment Signal Engine.

SwimPay is not a PSP, not a bank, and not an official bank confirmation system.
Buyer-facing checkout copy must explain that SwimPay searches for a merchant-side
notification signal and that review may be required.

## Receiver Bank vs Payer Bank Launcher

Receiver bank:

- merchant-side receiving bank;
- selected by the buyer so the merchant can show where to send the transfer;
- determines which merchant-side notification signal SwimPay can detect;
- remains review-only for the five V1 banks during beta;
- never implies auto-confirmation.

Payer bank launcher:

- buyer-side UX helper;
- may show an Android package hint or manual transfer fallback;
- does not prove payment;
- does not affect matching, trust, review or confirmation policy.

## Hosted Checkout Steps

1. Pay with SwimPay intro.
2. Select the merchant receiver bank.
3. Select a payer bank launcher or manual transfer.
4. Show amount, recipient and reference instructions.
5. Buyer may click `I paid`, which is only a buyer claim.
6. SwimPay searches for a merchant-side payment signal.
7. A detected signal routes to review or controlled release according to policy.
8. Public webhooks disclose `confirmation_type=notification_signal` and
   `official_bank_confirmation=false`.

Required buyer-facing wording:

```text
SwimPay recherchera le signal de paiement côté marchand.
```

Forbidden wording includes any claim that SwimPay provides official bank
confirmation, guaranteed payment, or PSP confirmation.

## Buyer-safe Statuses

The hosted checkout maps internal states to buyer-safe statuses:

- `awaiting_payment`
- `searching_signal`
- `signal_detected`
- `needs_review`
- `confirmed`
- `expired`
- `not_validated`

`buyer_claimed_paid` and `signal_detected` never confirm payment.

## APIs

Sprint 7A adds checkout bank-selection endpoints:

- `GET /v1/checkout/:session_id/receiver-banks`
- `POST /v1/checkout/:session_id/receiver-bank`
- `GET /v1/checkout/:session_id/payer-bank-launchers`
- `POST /v1/checkout/:session_id/payer-bank-launcher`
- `POST /v1/checkout/:session_id/payment-instructions-shown`
- `POST /v1/checkout/:session_id/claimed-paid`
- `GET /v1/checkout/:session_id/status`

Responses are buyer-safe and include no raw notification text, raw phone, secrets,
or official-bank-confirmation claim.

## Sprint 7B Hybrid Receiving Routes

Sprint 7B adds a bank-first route reveal:

1. Buyer sees only receiver bank logos/names.
2. Buyer selects the merchant-side receiver bank.
3. Checkout reveals masked routes for that selected bank:
   - `phone_transfer`;
   - `card_transfer`.
4. Buyer selects the actual merchant receiving route.
5. Buyer selects a payer bank launcher or manual fallback.
6. Checkout shows masked destination, exact amount and a human-readable reference.
7. Buyer may click `I paid`; this is still only a buyer claim.

Receiver route selection is separate from payer launcher selection. Payer launcher
choice is UX-only and never proves payment.

Buyer-facing route details must not expose raw card, raw phone or personal merchant
identity. Webhooks and audits may include safe route context such as
`receiver_route_code`, `rail_type`, `payment_reference` and `receiver_bank_id`,
but never raw identifiers.

## Sprint 7C Destination Copy Policy

The checkout keeps destination details masked until the buyer explicitly clicks the copy destination action. The copy action:

- works only for the active checkout session;
- works only after the selected receiving route is stored;
- returns only the selected route destination;
- uses no-store/no-cache headers;
- includes `reveal_expires_at`;
- writes a redacted audit event with the masked identifier only;
- is rate-limited by session, route and coarse client fingerprint.

Normal checkout status and HTML never include raw card or raw phone values. Expired, rejected or inactive sessions cannot reveal copy details.

Hosted checkout QA for Sprint 7C covers mobile and desktop responsive layout, bank selection, route reveal, copy-details proxy headers, payer launcher fallback, buyer-claimed-paid state, needs-review/expired copy and forbidden wording checks.
