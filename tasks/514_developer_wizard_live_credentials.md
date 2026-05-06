# Task 514 - Developer Wizard Live Credentials

Sprint: 9F - Developer Integration Wizard Live UX Wiring

## Goal

Render live merchant integration credentials from the backend lifecycle read model.

## Requirements

- Render merchant id and public key from backend.
- Render masked secret key and masked webhook secret only.
- Support show-once reveal after create/rotate actions if backend returns one-time secret.
- Do not show raw secret on normal reads.
- Render safe unavailable state when backend is unreachable.
- Add tests.

## Safety

- Do not expose `secret_key_once` or `webhook_secret_once` except immediate one-time action result.
- Never include secrets in snippets.
