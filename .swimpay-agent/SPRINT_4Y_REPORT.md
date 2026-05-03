# Sprint 4Y Report - Signed-token Compose Handoff Rehearsal and Production Trust Operational Playbook

status: PASS
generated_at: 2026-05-03T13:39:27+03:00

## Scope

Sprint 4Y prepared the local-only signed-token Docker Compose handoff rehearsal for production trust metadata and added an operator playbook for running the drill against persisted local evidence.

No real bank notifications were processed. No installed-app enumeration was added. No production deployment was performed. Production trust remains metadata-only and auto-confirmation remains disabled.

## Tasks Created

1. `241_signed_token_compose_override`
2. `242_persisted_handoff_candidate_selection`
3. `243_signed_compose_handoff_rehearsal_script`
4. `244_production_trust_audit_playbook`
5. `245_signed_compose_handoff_tests`
6. `246_operational_handoff_docs`
7. `247_sprint_4y_validation`
8. `248_sprint_4y_closeout_review`

## Tasks Completed

All Sprint 4Y code, test, task, documentation and live local Compose rehearsal deliverables were completed.

## Signed-token Compose Override

Added `infra/docker-compose.signed-admin.override.yml`.

The override switches `swimpay-api` and `swimpay-web` to `ADMIN_AUTH_MODE=signed_token`, requires `ADMIN_TOKEN_HMAC_SECRET`, and clears dev-token operator environment values for the local rehearsal.

The override is deliberately local-only. It does not deploy anything, does not add secrets, and does not weaken RBAC.

## Handoff Rehearsal Script

Added `scripts/evidence-production-trust-compose-signed-rehearsal.mjs` and `npm run rehearsal:evidence:compose-signed`.

The script supports:

- non-mutating plan mode with `--plan`;
- environment guard validation before any mutation;
- signed requester and approver token requirements;
- health check against the configured Compose API URL;
- delegation to the existing production trust handoff runner;
- same-actor dual-control block verification;
- second-operator approval verification;
- revocation after the drill;
- redacted audit continuity inspection.

Mutating execution requires:

- `SWIMPAY_SIGNED_COMPOSE_HANDOFF=true`
- `SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true`
- `ADMIN_TOKEN_HMAC_SECRET`
- `SWIMPAY_EVIDENCE_ID`
- `SWIMPAY_REQUESTER_TOKEN`
- `SWIMPAY_APPROVER_TOKEN`

## Persisted Evidence Candidate

Local evidence inspection found a real package evidence candidate:

- evidence id: `878ddd87-2e69-40b1-9cc7-da15d95a6b0b`
- package: `ru.sberbankmobile`
- status before signed drill setup: `pending_operator_review`

The live rehearsal switched local Compose to signed-token mode, approved the candidate review-only, requested production trust with requester token, blocked same-actor approval, approved with a second operator token, inspected audit events, then revoked metadata trust.

Final persisted evidence status:

- status: `production_trust_revoked`
- trusted: `false`
- production_trusted_app_metadata: `false`
- auto_confirm_enabled: `false`

## Operational Playbook

Added `docs/BANK_EVIDENCE_SIGNED_COMPOSE_HANDOFF_PLAYBOOK.md`.

Updated:

- `docs/BANK_EVIDENCE_PRODUCTION_TRUST_HANDOFF.md`
- `docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md`
- `docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md`
- `docs/11_SECURITY_AND_PRIVACY.md`

The playbook documents:

- local-only Compose signed-token mode;
- token generation and masking;
- candidate selection;
- required environment variables;
- rehearsal commands;
- audit verification;
- revocation requirement;
- rollback to dev-token Compose mode;
- explicit distinction between production-trusted app metadata and auto-confirmation.

## Tests Added

Added `tests/evidence-production-trust-compose-signed-rehearsal.test.ts`.

Updated `tests/agent-framework.test.ts`.

Coverage includes:

- signed Compose plan output;
- missing guard failure without mutation;
- successful fake signed Compose handoff delegation;
- Sprint 4Y task queue wiring;
- `npm run rehearsal:evidence:compose-signed` script wiring.

## Commands Run

- `npm test -- tests/evidence-production-trust-compose-signed-rehearsal.test.ts` - RED first, then PASS, 3 tests
- `npm test -- tests/evidence-production-trust-compose-signed-rehearsal.test.ts tests/agent-framework.test.ts` - PASS, 7 tests
- `npm test -- tests/evidence-production-trust-compose-signed-rehearsal.test.ts tests/evidence-production-trust-signed-local-rehearsal.test.ts tests/operator-token-helper.test.ts tests/agent-framework.test.ts` - PASS, 12 tests
- `npm run rehearsal:evidence:compose-signed -- --plan` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml -f infra/docker-compose.signed-admin.override.yml config` with `ADMIN_TOKEN_HMAC_SECRET` set - PASS
- `npm run android:doctor` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 41 files and 292 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - initial retry failed while Docker Desktop/WSL was down; after Docker restart PASS with services healthy
- `GET http://localhost:8080/api-health` - initial retry timed out while Docker Desktop/WSL was down; after Docker restart PASS, HTTP 200
- `docker version` - PASS after Docker restart
- `docker info` - PASS after Docker restart
- `docker compose version` - PASS after Docker restart
- `docker ps` - PASS after Docker restart
- `docker compose --env-file .env.example -f infra/docker-compose.yml -f infra/docker-compose.signed-admin.override.yml up -d --no-build swimpay-api swimpay-web proxy` - PASS
- signed-token Compose env inspection - PASS, API/Web set to `ADMIN_AUTH_MODE=signed_token` with dev tokens blank
- signed-token Compose API health - PASS, HTTP 200
- review-only setup for evidence `878ddd87-2e69-40b1-9cc7-da15d95a6b0b` - PASS, `approved_for_review_only`, `trusted=false`, `auto_confirm_enabled=false`
- `npm run rehearsal:evidence:compose-signed` - PASS, `signed_compose_dual_operator_drill`
- final evidence inspection - PASS, `production_trust_revoked`, `trusted=false`, `production_trusted_app_metadata=false`, `auto_confirm_enabled=false`
- final audit inspection - PASS, request, approval and revocation events present with masked cert hash and no raw notification or phone data
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build swimpay-api swimpay-web proxy` - PASS, restored local default dev-token mode
- final base Compose service status and API health - PASS
- `git diff --check` - PASS

## Blockers

No current critical blockers.

Resolved during retry:

- Docker Desktop/WSL was restarted by the user.
- Docker daemon, Compose status and API health recovered.
- Persisted signed-token Compose handoff executed successfully and ended revoked.

## Git

Ready for local commit after final status check.

## Next Recommended Sprint

Proceed to the next planned sprint only after preserving the Sprint 4Y evidence trail:

1. Keep Compose default mode restored to `dev_token` for local development.
2. Keep the signed-token Compose override for deliberate future drills only.
3. Continue with operator handoff packaging or production-readiness review.
4. Do not process real bank notifications or enable auto-confirmation.
