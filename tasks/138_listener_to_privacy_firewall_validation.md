# Task 138 - Listener To Privacy Firewall Validation

Status: completed

## Goal

Verify that the live listener path applies the debug allowlist and privacy firewall before outbox or upload.

## Scope

- Verify debug synthetic package is accepted only in debug mode.
- Verify unknown packages remain ignored/untrusted.
- Verify `TO_VERIFY` real bank profiles remain untrusted.
- Verify outbox, logs, diagnostics and upload payloads do not expose raw phone, raw title/body or raw notification text.

## Guardrails

- Do not invent real bank package names or signing certificate fingerprints.
- Do not trust synthetic or `TO_VERIFY` metadata for production auto-confirmation.
