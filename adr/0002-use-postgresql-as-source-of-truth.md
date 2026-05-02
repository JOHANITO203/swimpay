# ADR 0002 — Use PostgreSQL as Source of Truth

## Status

Accepted

## Context

Payment signal decisions require strong consistency and auditability.

## Decision

PostgreSQL is the source of truth for all critical payment data.

Valkey locks may help but cannot be the final protection for payment decisions.

## Consequences

Critical constraints must exist in PostgreSQL:

- unique event id;
- unique notification hash;
- unique confirmed order;
- unique used confirmed signal.

Payment state transitions must be transactional and audited.
