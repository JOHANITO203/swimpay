# 12 - Webhooks

## Purpose

Public webhooks notify developer systems when a merchant-visible payment outcome is ready for the merchant's system.

For V1, fulfillment webhooks are post-review only:

- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

Internal signal and review events may still exist inside SwimPay, but they are not public fulfillment webhooks and must not be used by merchant systems to release goods.

## Product Truth

SwimPay is a Payment Signal Engine.

SwimPay is not a bank, PSP, wallet or official bank confirmation system. A notification signal is operational evidence for merchant review, not official bank confirmation.

V1 rules:

- `Continuer vers ma banque` arms the Receiver.
- `J'ai paye` never confirms payment.
- `Matching 100 %` is strong merchant review copy only.
- Merchant manual confirmation remains required.
- Webhooks for fulfillment fire only after merchant confirmation or explicit terminal outcome.
- Auto-confirmation is disabled for V1 public release.

Every public payment webhook must include:

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
SwimPay-Signature: sha256=hmac_sha256_signature
SwimPay-Delivery-Id: del_01
```

## Public Events

### `payment.confirmed`

Emitted only after merchant manual confirmation in V1.

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
    "decision": "manual_confirmed",
    "review_id": "rev_01",
    "amount": {
      "value": "137.00",
      "currency": "RUB"
    },
    "payment_reference": "TANGO ALFA"
  }
}
```

### `payment.rejected`

Emitted only for explicit order/payment rejection, not for default signal-scope rejection.

```json
{
  "id": "evt_03",
  "type": "payment.rejected",
  "created_at": "2026-05-01T21:05:03Z",
  "data": {
    "order_id": "ord_01",
    "external_id": "order_888",
    "payment_session_id": "ps_01",
    "confirmation_type": "notification_signal",
    "official_bank_confirmation": false,
    "decision": "manual_rejected",
    "review_id": "rev_01"
  }
}
```

### `payment.expired`

Emitted when the payment session expires without a confirmed payment.

```json
{
  "id": "evt_04",
  "type": "payment.expired",
  "created_at": "2026-05-01T21:15:00Z",
  "data": {
    "order_id": "ord_01",
    "external_id": "order_888",
    "payment_session_id": "ps_01",
    "confirmation_type": "notification_signal",
    "official_bank_confirmation": false,
    "decision": "expired"
  }
}
```

## Non-fulfillment Internal Events

The following concepts are internal operational events in V1:

- signal detected;
- matching started;
- payment needs merchant review;
- feedback collected;
- unknown notification shape observed.

Developer systems must not release goods based on these internal states.

## Retry policy

Task 026 implements bounded durable retries with PostgreSQL as source of truth:

```text
attempt 1: immediate
attempt 2: +1 min
attempt 3: +5 min
attempt 4: +15 min
attempt 5: +1 h
attempt 6: +6 h
attempt 7: +24 h
```

Delivery statuses:

```text
pending
delivering
delivered
failed
dead
cancelled
```

`failed` is retryable when `next_retry_at <= now` and attempts remain. `dead` is terminal after the retry budget is exhausted.

## Idempotency

Developer systems must use `SwimPay-Event-Id` as the idempotency key.

Webhook worker must not create duplicate active deliveries for the same endpoint/event pair.

## Replay

Dashboard/API may support manual webhook replay.

Replay keeps the original event id but creates a new delivery id. Admin/API exposure must remain RBAC-protected.
