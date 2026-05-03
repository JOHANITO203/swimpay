# Hybrid Receiving Routes

Sprint 7B adds the merchant-side payment destination model for the PSP-like checkout experience while keeping SwimPay as a Payment Signal Engine.

SwimPay is not a PSP, bank, wallet, SBP integration, payment initiator or official bank confirmation system.

## Model

`MerchantReceivingRoute` represents one merchant-configured receiving destination for one receiver bank.

Supported V1 rails:

- `phone_transfer`
- `card_transfer`

Important fields:

- `route_id`
- `merchant_id`
- `bank_profile_id`
- `rail_type`
- `receiver_identifier_type`
- `receiver_identifier_encrypted`
- `receiver_identifier_masked`
- `route_code`
- `display_label`
- `enabled`
- `recommended`
- `review_policy`

`receiver_identifier_encrypted` stores protected route data for server-side use. Buyer, webhook, audit and log surfaces use masked output only.

## Checkout Disclosure

The buyer flow is bank-first:

1. Show available receiver bank logos/names.
2. Do not show card or phone details at the bank selection step.
3. After bank selection, reveal buyer-safe masked routes for that bank.
4. After route selection, show amount, human-readable reference, payer launcher/manual fallback and `I paid`.

The buyer must not see personal merchant identity. The buyer sees only the payment destination fields needed to complete a manual transfer.

Safe wording:

```text
SwimPay suit le signal de reception cote marchand.
```

## Risk Policy

- `card_transfer` is `review_first` by default in beta.
- `phone_transfer` can be `eligible_low_risk_later`, but still does not auto-confirm by default.
- Buyer sender phone is an optional matching hint stored only as HMAC and masked output.
- Amount-only never auto-confirms.
- Missing route, collisions, review-only route policy, missing reference and card-transfer amount-only cases route to review.

## Webhooks

Safe route context may be included:

```json
{
  "receiver_route_code": "SBER-PHONE",
  "rail_type": "phone_transfer",
  "payment_reference": "TANGO ALFA",
  "receiver_bank_id": "sber_ru",
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

Webhook payloads must not include raw card, raw phone, buyer sender raw phone, raw notification text or personal merchant identity.

## Sprint 7C Copy-details Hardening

Masked route display remains the default. The full card or phone destination is returned only by the explicit buyer copy action:

```text
GET /v1/checkout/:session_id/receiving-route/copy-details
```

The copy-details endpoint requires an active, non-expired checkout session with a selected, enabled route that belongs to the session merchant. It does not return a destination for inactive, expired or rejected sessions, and it only returns the destination for the selected route.

The response is action-bound and short-lived:

- `masked_identifier` remains present for safe UI display.
- `destination_value` is present only for the explicit copy response.
- `reveal_expires_at` communicates the reveal window.
- API responses use no-store/no-cache headers.

Every successful reveal writes a redacted audit event:

```text
checkout.destination_copied
```

The audit event includes session id, selected route id, rail type and masked identifier only. It must not include raw card, raw phone or receiver identifier values. Webhooks never include copy-details raw destinations.

## Merchant Route Admin

Sprint 7C adds a minimal merchant/admin route surface for beta operations. It lists bank, rail type, masked identifier, enabled/recommended state, review policy and route code. Full card or phone input is accepted only in create/edit forms and is not rendered after save.

Card routes remain beta review-first. Route administration does not enable auto-confirmation and does not change the review-only posture for real bank signals.
