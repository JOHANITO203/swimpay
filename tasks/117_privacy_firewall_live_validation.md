# 117 - Privacy Firewall Live Validation

## Goal

Ensure the live listener path redacts before outbox or upload.

## Scope

- Redact phone-like values and references.
- Emit parser hints only: amount, currency, masked/HMAC hints and direction hint.
- Verify outbox and upload payloads do not contain raw phone or raw notification text.

## Guardrails

- `raw_text_present` must remain `false`.
- No raw title/body storage.
- No official bank confirmation wording.
