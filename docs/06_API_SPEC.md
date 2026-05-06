# 06 — API Specification

All public APIs use JSON.

Base path:

```text
/v1
```

## Authentication

Merchant API endpoints require an API key.

Recommended header:

```text
Authorization: Bearer sk_live_or_test_...
```

API keys are stored hashed.

## Common response fields

Errors must use:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## POST `/v1/orders`

Creates an order and a payment session.

The merchant backend must call this endpoint. Buyer-facing web or Android clients must not contain the merchant secret key.

### Request

```json
{
  "external_id": "order_888",
  "amount": {
    "value": "1390.00",
    "currency": "RUB"
  },
  "product": {
    "id": "premium_pack",
    "name": "Premium Pack",
    "risk_level": "low"
  },
  "expires_in_seconds": 900,
  "metadata": {
    "source": "merchant_checkout"
  }
}
```

### Response

```json
{
  "order_id": "ord_01",
  "payment_session_id": "ps_01",
  "status": "payment_session_created",
  "checkout_url": "https://pay.swimpay.app/checkout/ps_01",
  "display_price": {
    "value": "1390.00",
    "currency": "RUB"
  },
  "expected_payment_amount": {
    "value": "1390.35",
    "currency": "RUB"
  },
  "reconciliation_delta": {
    "value": "0.35",
    "currency": "RUB"
  },
  "reference": "TANGO ALFA",
  "expires_at": "2026-05-01T21:15:00Z"
}
```

### Behavior

- Generate payment session.
- Generate human-readable payment reference.
- Compute a bounded reconciliation amount when policy enables it.
- Return the exact expected amount the buyer must send.
- Emit `order.created` and `payment_session.created`.
- Do not arm the Receiver yet.
- Do not confirm payment.
- Do not enable auto-confirmation in V1.

Buyer recognition hints are collected in hosted checkout before payment instructions. Recognition hints are for matching only and must not include CVV, expiration date, PIN, SMS code or bank password.

Safe derived fields may include:

- buyer phone HMAC and masked value;
- buyer source card encrypted value, HMAC, masked value and last4.

Raw buyer source card and raw phone values must not be logged, rendered in merchant UI or sent in webhooks.

## POST `/v1/checkout/{payment_session_id}/continue-to-bank`

Arms the merchant Receiver after the buyer chooses to continue to their bank.

This is the required bank launcher step. Opening a bank app does not prove payment.

### Response

```json
{
  "payment_session_id": "ps_01",
  "status": "receiver_armed",
  "receiver_armed": true,
  "bank_launch_attempted": true,
  "fallback_copy": "Copiez les details et ouvrez votre banque manuellement."
}
```

### Behavior

- Transition the payment session/order to `receiver_armed` when allowed.
- Write an audit event.
- Do not confirm payment.
- Do not send developer webhooks.

## POST `/v1/checkout/{payment_session_id}/claimed-paid`

Records that the buyer clicked `J'ai paye`.

### Response

```json
{
  "payment_session_id": "ps_01",
  "status": "buyer_claimed_paid",
  "buyer_claimed_paid": true,
  "safe_status": "searching_signal"
}
```

### Behavior

- `J'ai paye` is not payment proof.
- It never confirms an order.
- It never sends developer webhooks.
- SwimPay still waits for a merchant-side bank notification signal and merchant manual confirmation.

## GET `/v1/orders/{order_id}`

Returns order status.

```json
{
  "order_id": "ord_01",
  "external_id": "order_888",
  "status": "awaiting_payment",
  "payment_session_id": "ps_01",
  "amount": {
    "value": "137.00",
    "currency": "RUB"
  },
  "expires_at": "2026-05-01T21:15:00Z",
  "latest_event": "payment_session.receiver_armed"
}
```

## GET `/v1/payment-sessions/{id}`

Returns payment session state.

```json
{
  "payment_session_id": "ps_01",
  "order_id": "ord_01",
  "status": "awaiting_payment",
  "amount": {
    "value": "137.00",
    "currency": "RUB"
  },
  "reference": "SWP-A8K2",
  "receiver_status": "armed",
  "expires_at": "2026-05-01T21:15:00Z"
}
```

## POST `/v1/receiver-devices/register`

Registers an Android Receiver device.

### Request

```json
{
  "device_name": "Merchant Phone",
  "public_key": "base64_public_key",
  "app_version": "1.0.0",
  "android_version": "15",
  "selected_banks": ["sber_ru", "tbank_ru"]
}
```

### Response

```json
{
  "device_id": "dev_01",
  "status": "pending",
  "trust_score": 0
}
```

## POST `/v1/receiver-devices/heartbeat`

Receiver heartbeat.

### Request

```json
{
  "device_id": "dev_01",
  "notification_access": true,
  "listener_connected": true,
  "allowed_banks": ["sber_ru", "tbank_ru"],
  "queue_length": 0,
  "last_signal_at": "2026-05-01T21:00:00Z",
  "app_version": "1.0.0",
  "status": "healthy"
}
```

## POST `/v1/receiver/signals`

Receives a signed payment signal from Android Receiver.

### Request

```json
{
  "event_id": "evt_local_01",
  "device_id": "dev_01",
  "merchant_id": "mch_01",
  "bank_profile_id": "sber_ru",
  "package_name": "TO_VERIFY_FROM_DEVICE",
  "package_cert_sha256": "TO_VERIFY_FROM_DEVICE",
  "notification_hash": "sha256_hash",
  "local_counter": 1821,
  "observed_at": "2026-05-01T21:01:12Z",
  "payload": {
    "title_redacted": "поступление <AMOUNT> <CURRENCY>",
    "body_redacted": "перевод от <PERSON> <PHONE>. <REFERENCE>",
    "amount_minor": 13700,
    "currency": "RUB",
    "sender_phone_hmac": "hmac_...",
    "sender_phone_masked": "+7 *** *** **67",
    "reference_hmac": "hmac_...",
    "reference_code_masked": "SWP-A***"
  },
  "signature": "base64_signature"
}
```

### Response

```json
{
  "signal_id": "sig_01",
  "status": "received"
}
```

### Behavior

- Verify device exists.
- Verify signature.
- Verify event id uniqueness.
- Verify notification hash uniqueness.
- Verify local counter is increasing.
- Store signal.
- Emit `signal.received`.

## GET `/v1/payment-signals`

Returns merchant visible payment signals with masked sensitive data.

## GET `/v1/reviews`

Returns open review items.

Response fields are merchant-visible and redacted. Phone/reference values are masked only.

```json
{
  "reviews": [
    {
      "review_id": "rev_01",
      "status": "open",
      "reason_code": "amount_collision",
      "order_id": "ord_01",
      "payment_session_id": "ps_01",
      "signal_id": "sig_01",
      "amount": {
        "value": "137.00",
        "currency": "RUB"
      },
      "bank_profile_id": "sber_ru",
      "direction_label": "incoming_customer_transfer",
      "signal_quality": 72,
      "score": 68,
      "positive_reasons": ["amount_exact"],
      "negative_reasons": ["amount_collision"],
      "sender_phone_masked": "+7 *** *** **67",
      "reference_code_masked": "SWP-A***",
      "recommended_action": "manual_review",
      "created_at": "2026-05-02T10:00:00Z"
    }
  ]
}
```

## POST `/v1/reviews/{id}/confirm`

Manual confirm.

### Behavior

- Requires merchant authorization.
- Creates review action.
- Updates order/session status.
- Creates audit event.
- Emits an internal review event with `confirmation_type = notification_signal` and `official_bank_confirmation = false`.
- Webhook delivery is handled by the webhook worker task.

Response:

```json
{
  "review_id": "rev_01",
  "status": "confirmed",
  "order_id": "ord_01",
  "payment_session_id": "ps_01",
  "order_status": "manual_confirmed",
  "payment_session_status": "manual_confirmed"
}
```

## POST `/v1/reviews/{id}/reject`

Manual reject with explicit scope. Default scope is `signal`.

Request:

```json
{
  "scope": "signal",
  "reason": "false_positive"
}
```

Allowed scopes:

- `signal`
- `payment_session`
- `order`

Behavior:

- `signal`: reject the review and linked signal only; order and payment session stay unchanged unless already terminal.
- `payment_session`: reject the review, linked signal and linked payment session; order stays unchanged.
- `order`: reject the review, linked signal, linked order and linked payment session.

Response:

```json
{
  "review_id": "rev_01",
  "status": "rejected",
  "order_id": "ord_01",
  "payment_session_id": "ps_01",
  "rejection_scope": "signal",
  "reason": "false_positive",
  "order_status": "awaiting_payment",
  "payment_session_status": "awaiting_payment"
}
```

Repeating the same rejection scope is idempotent. Escalating a resolved rejection to another scope returns `review_rejection_scope_conflict`.

## POST `/v1/webhook-endpoints`

Creates webhook endpoint.

```json
{
  "url": "https://merchant.example/webhooks/swimpay",
  "enabled_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
}
```

V1 public webhook endpoints are for post-review or terminal outcomes only. Internal signal/review states must not be used by merchant systems to release goods.

## GET `/v1/webhook-deliveries`

Returns delivery status.

## POST `/v1/webhook-deliveries/{id}/replay`

Replays a delivery.

## Idempotency

Endpoints that create resources should support idempotency key when appropriate.

Webhook consumers must use `SwimPay-Event-Id` as idempotency key.
