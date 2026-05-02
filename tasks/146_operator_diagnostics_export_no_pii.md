# 146 — Operator Diagnostics Export Without PII

## Goal

Add a safe receiver diagnostics export for operator support without exposing PII or secrets.

## Scope

Include:

- app version
- device status
- Notification Access state
- listener connected state
- backend reachable
- selected bank count
- selected bank verification statuses
- outbox counts
- last upload status
- last redacted error summary
- synthetic debug enabled state

Exclude:

- raw phone
- raw notification title/body
- raw payloads
- secrets
- API keys
- private keys
- sensitive signatures

## Validation

- Add tests proving diagnostics do not contain PII, secrets, raw notification text, or official confirmation wording.
