# 043 - Receiver Signed Heartbeat Client

## Goal

Implement signed heartbeat payload construction and client submission.

## Scope

- Include notification access, listener connectivity, bank ids, queue length, timestamp and app versions.
- Use an explicit signing interface compatible with the existing canonical HMAC foundation.
- Parse backend warnings safely.

## Acceptance Criteria

- Signed heartbeat payloads are deterministic in tests.
- Backend warnings are parsed.
- No raw PII is emitted.
