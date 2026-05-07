# VPS Deployment Readiness Full Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

The stack is good enough for local Compose and synthetic staging preparation, but not ready for real-world VPS testing yet. A 2 GB VPS is possible only as constrained staging if images are built elsewhere or built sequentially with swap; 4 GB remains the safer V1 target.

## Ready now

- Single Docker Compose topology exists.
- Services have healthchecks.
- JSON-file log rotation is configured.
- Memory limits are present.
- Caddy proxy is present for local HTTP.
- PostgreSQL, Valkey and NATS have named volumes.
- Production env contract doc exists.

## Blockers / gaps

| Severity | Area | Evidence | Required |
| --- | --- | --- | --- |
| Critical | Public staging | No real VPS production-mode deployment has been executed. | Operator-approved VPS run with external secrets. |
| Critical | OAuth | Google OAuth exchange is not implemented/live validated. | Real callback flow or postpone OAuth testing. |
| High | Env injection | `infra/docker-compose.yml` uses `../.env.example`. | Production/staging env file or secret store outside git. |
| High | Migrations | Compose init migrations only run on fresh DB volume. | Migration runbook/tool for existing DB. |
| High | HTTPS/domain | Local Caddy config exposes HTTP on port 8080. | Domain, TLS, OAuth redirect URL and proxy hardening. |
| High | Backup/restore | No backup/restore drill recorded. | Before real staging data. |
| Medium | 2 GB VPS | Local history shows Docker/BuildKit pressure even on constrained local engine. | Build off-box or sequential builds + swap. |
| Medium | Monitoring | Healthchecks exist; no external alerting/log drain. | Minimal uptime/log/disk checks. |
| Medium | Retention | Policy exists; destructive cleanup jobs are not implemented. | OK for staging, not long-lived production. |

## Recommendation

Next VPS sprint should be synthetic-only:

1. Provision 2 GB VPS with swap, or use 4 GB if possible.
2. Build images locally/CI and pull on VPS, or build sequentially.
3. Inject secrets from files/env outside git.
4. Run migrations explicitly.
5. Validate `/api-health`, BFF session, SDK order creation, receiver registration/heartbeat and signed synthetic signal upload.
6. Do not process real bank notifications.

