# 041 - Privacy Firewall And Local Parser

## Goal

Redact sensitive notification content locally and emit extraction hints only.

## Scope

- Redact raw phone, amount/currency, card mask and references.
- Extract amount/currency/phone/reference/direction hints.
- Negative categories remain hints only.

## Guardrails

- No raw phone upload.
- No raw notification text upload.
- No Android payment confirmation or auto-confirmation.
- Backend decides.

## Acceptance

- Tests prove raw phone and raw notification text are absent from upload payloads.
- Local parser emits hints without final decisions.
