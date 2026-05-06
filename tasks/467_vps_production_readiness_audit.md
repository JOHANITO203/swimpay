# Task 467 - VPS Production Readiness Audit

## Goal

Audit readiness for a 4 GB RAM single VPS production deployment.

## Check

Docker Compose services, memory limits, log rotation, healthchecks, backups, Postgres settings, Valkey/NATS limits, API/web/proxy health, migration flow, `.env.example` vs production env, HTTPS/proxy assumptions, rate limiting, idempotency, webhook retry worker, monitoring and disk/log growth risks.

## Output

Create `.swimpay-agent/VPS_PRODUCTION_READINESS_AUDIT.md`.

