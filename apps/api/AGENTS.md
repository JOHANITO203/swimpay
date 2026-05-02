# apps/api AGENTS.md

This app owns public API, dashboard API, merchants, orders, payment sessions and receiver device registration.

Read before coding here:

- root `AGENTS.md`;
- `docs/06_API_SPEC.md`;
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`;
- `docs/11_SECURITY_AND_PRIVACY.md`.

Rules:

- Do not implement payment matching logic in controllers.
- Do not store raw phone numbers.
- Create audit events for state transitions.
- Never expose secrets after creation.
- Return `official_bank_confirmation: false` for public payment events.
