# Sprint 9K - VPS Staging Readiness Audit

Date: 2026-05-07

Target: single Ubuntu VPS staging deployment, 2-4 GB RAM class.

## Readiness Summary

| Area | Result | Notes |
| --- | --- | --- |
| Docker Compose services | Partially ready | V1 service set is correct; production env/secret source still required |
| Memory | Partial | 4 GB is plausible with sequential builds; 2 GB VPS should avoid building images locally |
| Log rotation | Ready locally | `.env.example` has Docker log max size/file knobs |
| Healthchecks | Ready locally | API/web/proxy healthchecks validated in previous live sprints |
| Migrations | Partial | Additive migrations exist; real VPS migration runbook still needs operator execution |
| Backups | Missing | Postgres backup/restore runbook needs final staging rehearsal |
| HTTPS/proxy | Partial | Proxy exists; real domain/TLS not configured yet |
| Secrets | Partial | Contract documented; real secret injection must be done outside git |
| Monitoring | Partial | Health endpoints exist; external alerting not configured |
| Retention | Partial | Intelligence retention policy documented; destructive cleanup jobs intentionally not active |
| Disk growth | Partial | Logs are bounded; Postgres/NATS volume growth needs VPS monitoring |

## 2 GB VPS Note

The user has a 2 GB RAM VPS. That can be used for lightweight staging only if images are built elsewhere or one-by-one with swap. It should not be treated as final production capacity for Postgres + Valkey + NATS + API + web + workers while also building Docker images.

Recommended 2 GB posture:

1. Build images locally/CI or use sequential `COMPOSE_PARALLEL_LIMIT=1`.
2. Add swap before builds.
3. Keep worker concurrency low.
4. Enable Docker log rotation.
5. Watch Postgres and NATS disk growth.

## Required Before Public Production

- HTTPS domain and OAuth redirect URI configured.
- Real Google OAuth exchange completed and tested.
- Staging seed runbook executed with synthetic identities.
- Stored API key smoke passed through staging URL.
- Receiver registration/heartbeat smoke passed through staging URL.
- Signed redacted synthetic signal upload smoke passed.
- Backup/restore rehearsal completed.
- No real bank notification capture unless explicit operator consent is recorded.

