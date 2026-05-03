# 204 Evidence Audit Trace Filters

Status: completed

## Goal

Make admin audit visibility useful for operator evidence rehearsal without exposing raw values.

## Completed

- Extended audit event search filters with `object_id`, `actor_id`, `created_after` and `created_before`.
- Implemented filters for Postgres and in-memory admin repositories.
- Kept audit payload responses redacted.

