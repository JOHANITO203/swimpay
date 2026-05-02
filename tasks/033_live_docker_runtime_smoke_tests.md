# 033 - Live Docker Runtime Smoke Tests

## Goal

Add safe local Docker Compose smoke test scripts and documentation for SwimPay V1 runtime readiness.

## Scope

- Verify API health.
- Verify PostgreSQL, NATS and Valkey connectivity through service health.
- Verify signal-worker and job-worker health endpoints.
- Verify PostgreSQL, Valkey and NATS are not publicly exposed.
- Keep the smoke workflow local only.

## Guardrails

- Do not deploy to production.
- Do not expose private infrastructure ports publicly.
- Do not require real bank data.
- Do not modify production secrets.

## Acceptance Criteria

- A local smoke script or documented command set exists.
- Smoke checks use Docker Compose and local endpoints only.
- Documentation explains startup, checks and shutdown.
- No public exposure of PostgreSQL, Valkey or NATS is introduced.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
