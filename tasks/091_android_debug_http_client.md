# 091 Android Debug HTTP Client

## Goal

Implement a small debug-safe Android HTTP client for receiver smoke actions.

## Scope

- Support `GET /api-health`.
- Support `POST /v1/receiver-devices/register`.
- Support `POST /v1/receiver-devices/heartbeat`.
- Support `POST /v1/receiver/signals`.
- Use JSON, timeouts and safe UI result messages.
- Do not log full payloads, secrets, raw phone or raw notification text.

## Forbidden

- Do not create production networking behavior.
- Do not expose raw PII.
- Do not claim payment confirmation or official bank confirmation.

## Acceptance Criteria

- Client is testable with fake transport.
- Backend unreachable is surfaced safely.
- Successful responses expose only safe status fields.
- No raw phone or raw notification text appears in result messages.

