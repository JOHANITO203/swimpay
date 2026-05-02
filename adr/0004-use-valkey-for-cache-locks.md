# ADR 0004 — Use Valkey for Cache and Short Locks

## Status

Accepted

## Context

SwimPay needs cache, rate limiting, heartbeat cache and short-lived locks.

## Decision

Use Valkey for:

- cache;
- short locks;
- rate limits;
- temporary reservations;
- heartbeat state.

## Consequences

Valkey is not source of truth for payment decisions.
PostgreSQL remains final authority.
