# 083 Local Backend Startup For Real Device

## Goal

Diagnose and fix local Docker Compose backend startup for real-device Receiver smoke testing.

## Scope

- Confirm Docker and Compose availability.
- Confirm the correct host API/proxy port.
- Start SwimPay services locally with `.env.example`.
- Verify API health through the correct route.
- Keep PostgreSQL, Valkey and NATS private.
- Add or update local backend doctor tooling if useful.

## Forbidden Work

- Do not deploy to production.
- Do not modify production secrets.
- Do not weaken API/auth/security behavior.
- Do not delete or rewrite migrations.
- Do not expose PostgreSQL, Valkey or NATS publicly.

## Acceptance Criteria

- Root cause of `localhost:3000/health` failure is documented.
- Correct API health URL is documented.
- Docker Compose config remains valid.
- Backend either becomes healthy or a clear blocker is recorded.

