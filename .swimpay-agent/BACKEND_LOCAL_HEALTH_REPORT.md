# Backend Local Health Report

generated_at: 2026-05-02T21:34:45+03:00

## Result

PASS for local guarded development.

## Root Cause

`http://localhost:3000/health` failed for two reasons:

- In Docker Compose, `swimpay-api` listens on private container port `3000`; it is intentionally not published to the host.
- The public local entrypoint is the Caddy proxy on `HTTP_PORT=8080`, with API health routed as `/api-health`.

A second startup issue appeared after Docker Desktop was started:

- Docker image builds initially failed because service Dockerfiles did not copy newer workspace packages, especially `packages/observability` and `packages/bank-templates`.
- API health initially returned `database: error` because PostgreSQL was configured without `listen_addresses = '*'`, so it listened only inside its own container loopback.

## Correct API Port

- Host proxy port: `8080`
- API container private port: `3000`
- Correct health URL: `http://localhost:8080/api-health`
- Expected failure in Compose mode: `http://localhost:3000/health`

## Docker Status

`docker compose --env-file .env.example -f infra/docker-compose.yml ps` reports:

- `swimpay-api`: healthy
- `swimpay-signal-worker`: healthy
- `swimpay-job-worker`: healthy
- `swimpay-web`: healthy
- `postgres`: healthy
- `valkey`: healthy
- `nats`: healthy
- `proxy`: healthy

Only the proxy publishes a host port. PostgreSQL, Valkey and NATS remain private.

## Health Response

`GET http://localhost:8080/api-health` returned:

```json
{
  "service": "swimpay-api",
  "version": "0.1.0",
  "environment": "development",
  "dependencies": {
    "database": "ok",
    "nats": "ok",
    "valkey": "ok"
  }
}
```

## Fixes Applied

- Updated API, signal-worker and job-worker Dockerfiles to copy declared workspace package dependencies.
- Updated PostgreSQL local config with `listen_addresses = '*'`.
- Added deployment tests covering Dockerfile workspace package copies and private Docker-network PostgreSQL listening.
- Added `scripts/local-backend-doctor.mjs` and `npm run backend:doctor`.
- Updated `docs/LOCAL_DEVELOPMENT.md` with Compose health URL guidance.

