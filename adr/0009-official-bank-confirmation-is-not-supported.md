# ADR 0009 — Official Bank Confirmation Is Not Supported

## Status

Accepted

## Context

SwimPay uses merchant-side notifications, not official bank APIs.

## Decision

SwimPay never claims official bank confirmation.

All public payment events must include:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## Consequences

Product wording, API naming and webhooks must avoid bank-confirmed language.
