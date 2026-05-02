# 046 - Receiver Health Status Model

## Goal

Implement a safe Receiver health/status model for local UI and heartbeat context.

## Scope

- Track notification access, listener state, bank trust counts, queue length, timestamps, app version and device status.
- Derive warnings for notification access, listener, bank trust, queue backlog, backend reachability and battery optimization.
- Do not expose sensitive data.

## Acceptance Criteria

- Warning derivation is tested.
- Health snapshots contain no raw PII or secrets.
