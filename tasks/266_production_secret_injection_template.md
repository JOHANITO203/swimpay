# Task 266 - Production Secret Injection Template

Status: completed

Define a safe one-server Docker Compose secret injection shape.

Requirements:

- committed production examples must contain no real secrets;
- `ADMIN_TOKEN_HMAC_SECRET` must be injected from external environment or secret storage;
- development admin auth variables must stay blank in production;
- no production deployment.

Result:

- Added `.env.production.example`.
- Added `infra/docker-compose.production-admin-auth.override.yml`.
