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

### Request

```json
{
  "external_id": "order_888",
  "amount": {
    "value": "137.00",
    "currency": "RUB"
  },
  "buyer": {
    "bank_phone": "+79991234567",
    "name": "Ivan"
  },
  "product": {
    "id": "premium_pack",
    "name": "Premium Pack",
    "risk_level": "low"
  },
  "expires_in_seconds": 900,
  "auto_confirm": true,
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
  "status": "receiver_arming",
  "checkout_url": "https://pay.swimpay.app/checkout/ps_01",
  "amount": {
    "value": "137.00",
    "currency": "RUB"
  },
  "reference": "SWP-A8K2",
  "expires_at": "2026-05-01T21:15:00Z"
}
```

### Behavior

- Normalize buyer phone.
- Store buyer phone HMAC.
- Store masked phone.
- Generate payment session.
- Generate reference code.
- Emit `order.created` and `payment_session.created`.
- Request Receiver Armed Mode when receiver is healthy.

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

## POST `/v1/reviews/{id}/confirm`

Manual confirm.

### Behavior

- Requires merchant authorization.
- Creates review action.
- Updates order/session status.
- Creates audit event.
- Emits public webhook event with `confirmation_type = notification_signal` and `official_bank_confirmation = false`.

## POST `/v1/reviews/{id}/reject`

Manual reject.

## POST `/v1/webhook-endpoints`

Creates webhook endpoint.

```json
{
  "url": "https://merchant.example/webhooks/swimpay",
  "enabled_events": ["payment.confirmed", "payment.needs_review", "order.expired"]
}
```

## GET `/v1/webhook-deliveries`

Returns delivery status.

## POST `/v1/webhook-deliveries/{id}/replay`

Replays a delivery.

## Idempotency

Endpoints that create resources should support idempotency key when appropriate.

Webhook consumers must use `SwimPay-Event-Id` as idempotency key.
