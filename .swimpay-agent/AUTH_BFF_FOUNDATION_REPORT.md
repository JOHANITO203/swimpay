# Auth BFF Foundation Report

Generated: 2026-05-07T10:55:00+03:00

## Sprint

Sprint 9J — Auth BFF Merchant/Admin Foundation.

## Implemented

1. Created task files `535` through `545` and updated `.swimpay-agent/TASK_QUEUE.md`.
2. Added `.swimpay-agent/AUTH_BFF_INVENTORY.md`.
3. Added migration `010_auth_bff_foundation.sql` for:
   - `users`;
   - additive merchant ownership fields;
   - `merchant_memberships`;
   - `admin_roles`;
   - `bff_sessions`.
4. Added `apps/api/src/auth-bff.ts` with:
   - role/permission constants;
   - opaque BFF session token hashing;
   - HttpOnly/Secure cookie helpers;
   - CSRF token hashing/verification;
   - Google OAuth provider seam;
   - in-memory and PostgreSQL BFF repositories;
   - stored API key verifier using hashed `api_keys`.
5. Added BFF routes:
   - `GET /auth/google/start`;
   - `GET /auth/google/callback`;
   - dev-only `POST /auth/dev/bootstrap-session`;
   - `GET /v1/me`;
   - `POST /auth/logout`.
6. Wired Developer Integration lifecycle routes to:
   - BFF active merchant context and permissions when session-authenticated;
   - CSRF for BFF-backed mutations;
   - local `Bearer test_*` fallback only outside production.
7. Wired `/v1/orders` to accept stored merchant API keys in production while keeping local test bearer only outside production.
8. Added `apps/api/src/auth-bff.test.ts` for:
   - permission mapping;
   - production cookie options;
   - OAuth fail-closed seam;
   - BFF session `/v1/me` and logout;
   - CSRF protection;
   - active merchant context isolation;
   - permission denial;
   - production API key order creation.
9. Updated database/security docs.

## Identity Boundaries

- BFF human session: dashboard, wizard and merchant/admin UI.
- Merchant API key: merchant backend SDK/API usage.
- Receiver device identity: Android Receiver registration/heartbeat/signal upload.

These identities remain separate.

## Limitations

- Google OAuth is a fail-closed provider seam in this sprint; live provider exchange remains a staging follow-up.
- Existing merchant/review/receiving routes still contain local development bearer seams outside production and should be migrated route-by-route to BFF permission helpers in a future sprint.
- Production staging still needs real environment secrets, OAuth credentials and seeded merchant membership/API key data.

## Validation

Validation completed:

- `npx vitest run apps/api/src/auth-bff.test.ts` — passed.
- `npm run android:doctor` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 67 files / 482 tests.
- `npm run build` — passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` — passed.
- `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api swimpay-web swimpay-job-worker proxy` — passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build` — passed.
- `docker exec swimpay-postgres psql -U swimpay -d swimpay -f /docker-entrypoint-initdb.d/010_auth_bff_foundation.sql` — passed for the existing local volume.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` — passed; API, web, job worker, signal worker, Postgres, NATS and Valkey healthy, proxy running.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` — passed; database, NATS and Valkey `ok`.

Android source was not touched in Sprint 9J, so Android Gradle and device smoke were not rerun.
