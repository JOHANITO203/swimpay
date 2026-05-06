# VPS Production Readiness Audit

generated_at: 2026-05-06

Target: one 4 GB RAM VPS for V1.

## Result

Status: partially ready.

The Docker Compose deployment is compact and appropriate for a 4 GB V1 server foundation, but production operations hardening is not complete.

## Ready or Acceptable

- Compose services are defined for:
  - proxy;
  - Postgres;
  - Valkey;
  - NATS;
  - API;
  - signal worker;
  - job worker;
  - web.
- Memory limits are defined and conservative:
  - proxy 128 MB;
  - Postgres 512 MB;
  - Valkey 192 MB;
  - NATS 192 MB;
  - API 256 MB;
  - signal worker 192 MB;
  - job worker 192 MB;
  - web 256 MB.
- Docker log rotation is configured.
- Healthchecks are present.
- Private/public Docker networks are separated.
- Postgres config is tuned for a small VPS.
- Valkey maxmemory is configured.
- NATS JetStream memory/file limits are configured.
- Caddy proxy exists and routes API/web traffic.

## Not Production-ready Yet

- `.env.example` contains dev defaults and is not a production secret template.
- `.env.production.example` is limited and does not cover the full production environment.
- Caddy config currently uses HTTP-style local assumptions; HTTPS/domain provisioning needs a production Caddyfile.
- Backup automation for Postgres/NATS/Valkey volumes is not present.
- Restore drill documentation is not complete.
- Migration flow is mostly init-volume/manual; existing production volume migration needs an explicit runbook.
- Monitoring/alerts are minimal; no external alerting target is configured.
- Webhook worker enablement is disabled by default in `.env.example`.
- Disk growth policy is limited to Docker log rotation; database/event retention cleanup needs an operations sprint.
- Production rate-limit/idempotency audit should be repeated after SDK flow is finalized.

## 4 GB VPS Verdict

The service footprint is plausible for V1 on 4 GB RAM, but do not deploy production until:

1. production env file is complete;
2. HTTPS/domain config is finalized;
3. Postgres backup/restore runbook is tested;
4. migration process is explicit;
5. monitoring/alerts and disk retention are in place;
6. webhook worker is intentionally enabled/configured.

