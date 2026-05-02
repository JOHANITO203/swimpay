# 151 — Operator Evidence Diagnostics Without PII

## Goal

Provide safe diagnostic/export helpers for package/cert evidence dry runs.

## Scope

- Mask certificate hashes.
- Include source, bank profile id and review status.
- Exclude secrets, raw notification text, raw phone, raw payloads and sensitive signatures.

## Validation

- Add tests proving full cert hashes and secret-like fields are not exposed.
