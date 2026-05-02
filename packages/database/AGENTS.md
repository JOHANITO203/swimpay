# packages/database AGENTS.md

This package owns database schema and migrations.

Read before coding here:

- root `AGENTS.md`;
- `docs/05_DATABASE_SCHEMA.md`;
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`.

Rules:

- PostgreSQL is source of truth.
- Critical uniqueness must be enforced in DB.
- Update schema docs when migrations change behavior.
- Do not remove audit fields.
