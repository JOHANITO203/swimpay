# ADR 0013 — Redacted Bank Template Dataset

## Status

Accepted

## Context

Bank notifications may contain personal and financial data.

## Decision

SwimPay stores redacted canonical templates and HMAC/tokenized operational fields by default.

## Consequences

- Raw notification text is not stored by default.
- Training samples must be redacted.
- Merchant training consent is separate from operational consent.
- Fixtures use redaction tokens.
