# apps/job-worker AGENTS.md

This app owns webhook delivery, retries, expirations, cleanup and scheduled template checks.

Read before coding here:

- root `AGENTS.md`;
- `docs/12_WEBHOOKS.md`;
- `docs/07_EVENT_CATALOG.md`;
- `docs/17_OPERATIONS_RUNBOOK.md`.

Rules:

- Webhook delivery must be idempotent.
- Retry schedule must be persisted.
- Replay keeps original event id but creates new delivery id.
- Expiry jobs must not override already confirmed/rejected states.
