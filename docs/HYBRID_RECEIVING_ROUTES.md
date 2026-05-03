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
