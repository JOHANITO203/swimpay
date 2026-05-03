# Next Action

generated_at: 2026-05-03T13:53:18+03:00

## Latest Sprint

Sprint 4Y - Signed-token Compose handoff rehearsal and production trust operational playbook.

## Status

PASS.

Sprint 4Y implementation is present:

- `infra/docker-compose.signed-admin.override.yml`
- `npm run rehearsal:evidence:compose-signed`
- `docs/BANK_EVIDENCE_SIGNED_COMPOSE_HANDOFF_PLAYBOOK.md`

The deterministic tests pass, the signed Compose plan works and the persisted live Compose handoff has now run successfully after Docker Desktop/WSL was restarted.

Evidence `878ddd87-2e69-40b1-9cc7-da15d95a6b0b` completed the full drill:

- review-only setup;
- production trust request by `ops_requester`;
- same-actor approval blocked;
- second-operator approval by `ops_approver`;
- metadata trust revoked;
- audit continuity verified;
- final `trusted=false`, `production_trusted_app_metadata=false`, `auto_confirm_enabled=false`.

## Next Recommended Action

Proceed to operator handoff packaging or a production-readiness review sprint.

Recommended checks before any future handoff drill:

1. `docker ps`
2. `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
3. `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`
4. `npm run rehearsal:evidence:compose-signed -- --plan`

Any future mutating drill must again end with production trust revoked and audit continuity verified.

## What Not To Do Next

- Do not deploy.
- Do not process real bank notifications.
- Do not enumerate installed apps.
- Do not read SMS.
- Do not scrape bank apps.
- Do not expose raw phone or raw notification text.
- Do not add Android payment confirmation.
- Do not add Android auto-confirmation.
- Do not treat review-only evidence as production trust.
- Do not leave rehearsal production trust approved after a drill.
- Do not process real bank notifications before explicit future authorization and readiness review.
