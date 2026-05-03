# 197 Evidence Duplicate And Latest Status Model

Status: completed

## Goal

Handle repeated evidence submissions safely.

## Completed

- Exact duplicate evidence is now idempotent and returns the existing evidence with `duplicate: true`.
- Duplicate submissions do not create additional evidence rows or audit events.
- A changed certificate for the same bank profile and package creates a new `pending_operator_review` row.
- No duplicate or changed-cert path creates trust or auto-confirmation.
