# Task 290 - Five-bank Synthetic Signal Fixture Set

Status: completed

## Scope

Create synthetic redacted notification-signal fixtures for each V1 bank:

- incoming transfer-like signal
- amount-only signal
- cashback
- refund
- outgoing/payment
- promo
- failed transfer

## Result

The fixture set lives at `packages/bank-templates/five-bank-synthetic-shadow-fixtures.json`.

## Safety

Fixtures use placeholders such as `<AMOUNT>`, `<CURRENCY>`, `<PHONE>`, `<PERSON>` and `<REFERENCE>`. They contain no real customer data, raw phone number or raw notification text.
