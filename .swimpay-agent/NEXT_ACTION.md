# Next Action

generated_at: 2026-05-03T14:36:00+03:00

## Latest Sprint

Sprint 5B - Production Admin Auth Mode and Secret Injection Preflight.

## Status

PASS.

Sprint 5B implementation is present:

- `docs/PRODUCTION_ADMIN_AUTH_PREFLIGHT.md`
- `.env.production.example`
- `infra/docker-compose.production-admin-auth.override.yml`
- `scripts/production-admin-auth-preflight.mjs`
- `npm run production:admin-auth-preflight`

The production admin-auth preflight is non-mutating and filesystem-only by default. It verifies required artifacts, blocker state, production template shape, dev-admin value rejection, external secret-injection docs and no committed production admin secrets.

## Next Recommended Action

Proceed to Sprint 5C - Production Compose Config Assembly and Non-deploying Dry Run.

Recommended scope:

1. Add a production Compose config assembly check using the production admin-auth override with dummy external env values.
2. Verify PostgreSQL, Valkey and NATS stay private in production config.
3. Add production backup/restore and log-retention preflight docs.
4. Keep production deployment out of scope until a final operator go/no-go.
5. Keep real bank notification processing out of scope.

## What Not To Do Next

- Do not deploy.
- Do not process real bank notifications.
- Do not enumerate installed apps.
- Do not read SMS.
- Do not scrape bank apps.
- Do not expose raw phone or raw notification text.
- Do not commit production secrets.
- Do not use `ADMIN_AUTH_MODE=dev_token` for production.
- Do not add Android payment confirmation.
- Do not add Android auto-confirmation.
- Do not treat review-only evidence as production trust.
- Do not leave rehearsal production trust approved after a drill.
