# Backend Receiver Signal Live Flow

Task: `034_backend_receiver_signal_live_flow`

This task documents and tests the synthetic backend flow for Android Receiver signal upload. It does not implement Android platform logic and it does not make receiver uploads a payment confirmation.

## Flow

1. Android Receiver uploads a redacted, signed signal to `POST /v1/receiver/signals`.
2. The API validates the receiver contract, receiver device, signature, anti-replay fields and privacy constraints.
3. The API stores a redacted `notification_signals` record.
4. The API emits `signal.received`.
5. The signal runtime processor loads the signal, parses/classifies it, matches candidates and decides between review, reject or strict auto-confirm.

## Accepted Response Semantics

`accepted: true` means only:

- the receiver signal upload contract was accepted;
- the signal was stored for backend processing;
- the backend decision path is pending or underway.

It does not mean:

- the payment is confirmed;
- a bank confirmed the payment;
- Android confirmed the order.

The response uses:

```json
{
  "status": "received",
  "accepted": true,
  "next_action": "backend_decision_pending"
}
```

It intentionally omits `official_bank_confirmation`.

## TO_VERIFY Bank Metadata

Signals with `package_name` or `package_cert_sha256` still marked `TO_VERIFY` may be accepted as operational signals, but they cannot auto-confirm. They must route to review or safe rejection according to matching and direction rules.

## Privacy

The upload path rejects raw phone and raw notification text by default. Synthetic tests use HMAC/masked sender/reference values and redacted title/body fields only.

## Not Implemented

This task does not add live NATS/PostgreSQL tests, Android NotificationListenerService logic, real bank app verification, production deployment or new matching gates.
