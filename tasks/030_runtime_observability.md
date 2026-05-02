# 030 - Runtime Observability

## Goal

Add minimal, resource-conscious observability for the single-server SwimPay runtime.

## Scope

- Structured health and readiness signals.
- Basic worker metrics or counters where lightweight.
- Clear operational logs with redaction.
- No heavy analytics stack.

## Requirements

- Respect 2 GB RAM single-server constraints.
- Do not add Elasticsearch, OpenSearch, ClickHouse or Kubernetes.
- Logs must not expose API keys, raw phones or raw notifications.

## Acceptance criteria

- API and worker health reports include useful runtime status.
- Key queue/worker counters are testable.
- Docs explain local checks and operational limits.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
