# AGENTS.md — packages/bank-templates

## Scope

These instructions apply to all files under `packages/bank-templates`.

This package defines deterministic bank notification templates, extraction rules, lifecycle policies, drift detection policies and redacted fixtures for SwimPay.

## Core constraints

Never implement:
- LLM-based payment decisioning
- official bank confirmation
- SBP integration
- PSP behavior
- SMS reading
- bank app scraping
- buyer device access
- hidden collection of notifications

## Bank profile truth rule

Never invent real package names or signing certificate fingerprints.

Use:
- `TO_VERIFY`
- `pending_verification`

A bank app profile becomes trusted only after verification from real installed apps using Android `PackageManager` and server-side review.

## Template decision rule

A template can classify a signal, but it cannot confirm an order.

Final confirmation requires:
- backend matching
- hard gates
- device trust
- bank app trust
- template trust
- amount exact
- phone exact OR reference exact
- no collision
- anti-replay checks
- active payment session

## Storage and privacy

Templates must be canonicalized and redacted.

Use tokens:
- `<AMOUNT>`
- `<CURRENCY>`
- `<PHONE>`
- `<PHONE_MASKED>`
- `<PERSON>`
- `<REFERENCE>`
- `<REFERENCE_TRUNCATED>`
- `<CARD_MASK>`
- `<BALANCE_AMOUNT>`

Do not store raw notification text by default.

## Classification labels

Allowed labels:
- `incoming_customer_transfer`
- `incoming_cashback`
- `incoming_refund`
- `incoming_salary_or_income`
- `incoming_non_customer`
- `outgoing_payment`
- `outgoing_transfer`
- `failed_transfer`
- `promo`
- `balance_update`
- `unknown`
- `unknown_ambiguous_direction`

## Auto-confirm safety

Never auto-confirm:
- amount-only signals
- unknown direction
- ambiguous direction
- cashback
- refund
- promo
- failed transfer
- outgoing payments
- duplicate notifications
- signals from untrusted bank apps
- signals with unresolved amount collision

## Tests

Every new template or parser change must include:
- positive fixture
- negative fixture
- adversarial fixture
- drift fixture when relevant
- reason codes
- expected classification
- expected auto-confirm eligibility

## Required update behavior

When adding a bank template, update:
- bank profile YAML
- template YAML
- fixtures JSONL
- test case index
- operations notes if the behavior affects review or drift
