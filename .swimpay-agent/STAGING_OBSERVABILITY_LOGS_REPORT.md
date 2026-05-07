# Staging Observability Logs Report

generated_at: 2026-05-08T00:00:00+03:00

## Status

Blocked until real staging stack runs.

## Checks To Run

- API logs contain no raw notification title/body/text.
- Worker logs contain no raw phone/card values.
- Frontend logs contain no Google tokens.
- Logs contain no API keys, webhook secrets or DB credentials.
- Health endpoints OK.
- NATS/worker queues OK.
- Webhook delivery status OK.
- Receiver heartbeat OK.

## Local Finding

Local Docker Desktop Linux engine is unavailable from this shell, so `docker compose ps` could not inspect services.
