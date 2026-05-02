# 071 - Receiver Register + Heartbeat Local Backend

## Goal

Smoke receiver registration and heartbeat against local backend when runtime/emulator conditions allow.

## Scope

- Use synthetic receiver identity only.
- Use local backend URL guidance.
- Document app integration gap if emulator/app-side calls are not automated.

## Acceptance Criteria

- Registration/heartbeat status is explicit.
- Responses must not imply payment confirmation.

## Forbidden Work

- Do not commit secrets.
- Do not upload raw PII.
- Do not use production endpoints.
