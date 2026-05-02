# ADR 0011 — Bank Template DSL

## Status

Accepted

## Context

SwimPay needs deterministic, auditable, versioned and bank-specific parsing rules for notifications.

## Decision

Use a YAML-based Bank Template DSL located in `packages/bank-templates`.

## Consequences

- Templates are versioned.
- Templates are human-readable.
- Templates can be validated.
- Parser behavior can be tested with fixtures.
- Codex must not hide parsing rules inside controllers.
