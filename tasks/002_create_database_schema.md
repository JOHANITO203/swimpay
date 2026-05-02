# Task 002 — Create Database Schema

## Goal

Implement the initial PostgreSQL schema and migrations.

## Read first

- `docs/05_DATABASE_SCHEMA.md`
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`
- `docs/11_SECURITY_AND_PRIVACY.md`

## Requirements

Create migrations for:

- merchants;
- api_keys;
- orders;
- payment_sessions;
- receiver_devices;
- bank_profiles;
- bank_app_signatures;
- bank_templates;
- notification_signals;
- signal_matches;
- review_queue;
- review_actions;
- webhook_endpoints;
- webhook_deliveries;
- audit_events.

Implement critical unique indexes:

- unique event id;
- unique notification hash;
- unique confirmed order;
- unique used confirmed signal.

Seed V1 bank profiles:

- `sber_ru`;
- `tbank_ru`;
- `vtb_ru`;
- `alfa_ru`;
- `gazprombank_ru`.

Do not seed trusted package/cert values.

## Acceptance criteria

- Migrations run on clean database.
- Critical constraints exist.
- V1 bank profiles exist with `learning` status.
- Tests verify duplicate event id/hash are rejected.
