# Live Docker Runtime Smoke

Task: `033_live_docker_runtime_smoke_tests`

This smoke layer verifies the local Docker Compose runtime shape for SwimPay V1 before deeper live tests. It is a local guardrail, not a production deployment flow.

## Scope

The smoke check validates:

- PostgreSQL, Valkey and NATS are present.
- PostgreSQL, Valkey and NATS do not publish host ports.
- `swimpay_private` is an internal Compose network.
- API, signal worker, job worker and web services define healthchecks.
- Docker log rotation remains configured.
- Only the Caddy proxy publishes a host port.

## Commands

Validate the Compose file:

```bash
docker compose --env-file .env.example -f infra/docker-compose.yml config
```

Run the SwimPay smoke config checker:

```bash
npm run smoke:runtime
```

Start the local runtime:

```bash
docker compose --env-file .env.example -f infra/docker-compose.yml up --build
```

Check local health through the proxy:

```bash
curl http://localhost:8080/health
```

Inspect service health:

```bash
docker compose --env-file .env.example -f infra/docker-compose.yml ps
docker compose --env-file .env.example -f infra/docker-compose.yml logs swimpay-api swimpay-signal-worker swimpay-job-worker --tail=100
```

## Public Exposure Rule

Only `proxy` may publish a host port. PostgreSQL, Valkey, NATS, API, web and workers must stay on the private Compose network.

## Not Implemented

This task does not add live NATS/PostgreSQL integration tests, external monitoring, production deployment automation, Android app logic or payment decision changes.
