# Bank Template Fixture Test Matrix

Codex must implement tests that load all fixtures and verify expected labels.

## Required tests

### Positive incoming

- `*_incoming_full_001`
- `*_incoming_phone_only_001`
- `*_incoming_reference_only_001`

Expected:
- classified as `incoming_customer_transfer`
- amount extracted
- auto-confirm candidate only if phone or reference is visible
- final backend still verifies device/bank/template/order/no-collision

### Amount-only incoming

- `*_incoming_amount_only_001`

Expected:
- classified as `incoming_customer_transfer`
- not auto-confirm candidate
- reason includes `amount_only_never_auto_confirm`

### Negative incoming-like signals

- cashback
- refund
- promo with amount
- failed with amount

Expected:
- never auto-confirm candidate

### Outgoing

Expected:
- `outgoing_payment` or `outgoing_transfer`
- never auto-confirm candidate

### Balance ambiguity

Expected:
- transaction amount must not be confused with balance amount
- if phone/reference missing, review required

## Critical invariant

No fixture with `auto_confirm_candidate: false` may produce an auto-confirm candidate.
