# 12 — Webhooks

## Purpose

Webhooks notify developer systems when SwimPay detects, reviews, confirms or rejects payment signals.

## Public event rule

Every payment event must include:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## Headers

```text
SwimPay-Event-Id: evt_01
SwimPay-Timestamp: 2026-05-01T21:02:03Z
SwimPay-Signature: hmac_sha256_signature
```

## Events

### `payment.signal_detected`

```json
{
  "id": "evt_01",
  "type": "payment.signal_detected",
  "created_at": "2026-05-01T21:02:00Z",
  "data": {
    "order_id": "ord_01",
    "payment_session_id": "ps_01",
    "signal_id": "sig_01",
    "confirmation_type": "notification_signal",
    "official_bank_confirmation": false,
    "signal_quality": 90
  }
}
```

### `payment.confirmed`

```json
{
  "id": "evt_02",
  "type": "payment.confirmed",
  "created_at": "2026-05-01T21:02:03Z",
  "data": {
    "order_id": "ord_01",
    "external_id": "order_888",
    "payment_session_id": "ps_01",
    "confirmation_type": "notification_signal",
    "official_bank_confirmation": false,
    "confidence_score": 94,
    "decision": "auto_confirmed",
    "reasons": [
      "amount_exact",
      "sender_phone_exact",
      "trusted_bank_profile",
      "trusted_device",
      "trusted_template",
      "no_collision"
    ]
  }
}
```

### `payment.needs_review`

```json
{
  "id": "evt_03",
  "type": "payment.needs_review",
  "created_at": "2026-05-01T21:02:03Z",
  "data": {
    "order_id": "ord_01",
    "payment_session_id": "ps_01",
    "confirmation_type": "notification_signal",
    "official_bank_confirmation": false,
    "reason_codes": ["phone_missing", "reference_missing", "amount_collision"]
  }
}
```

### `payment.rejected`

### `order.expired`

## Retry policy

Recommended retries:

```text
1 min
5 min
15 min
1 h
6 h
24 h
```

## Idempotency

Developer systems must use `SwimPay-Event-Id` as idempotency key.

Webhook worker must not create duplicate active deliveries for the same endpoint/event pair.

## Replay

Dashboard/API must support manual webhook replay.

Replay must keep original event id but create a new delivery id.
