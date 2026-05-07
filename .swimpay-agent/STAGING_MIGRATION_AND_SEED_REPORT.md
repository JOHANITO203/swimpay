# Staging Migration And Seed Report

generated_at: 2026-05-08T00:00:00+03:00

## Migration Readiness

The repo uses additive migrations under `packages/database/migrations`. They are mounted into Postgres for first-run Compose initialization and can be applied manually for existing volumes.

## Seed Readiness

`scripts/seed-staging-auth-bff.mjs` is ready for staging. It creates:

- staging user;
- staging merchant;
- owner membership;
- API key hash;
- BFF session hash;
- CSRF hash;
- active merchant context.

It refuses to run unless:

- `SWIMPAY_STAGING_SEED_CONFIRM=seed-local-staging-auth`;
- and, in production mode, `SWIMPAY_STAGING_SEED_ALLOW_PRODUCTION=yes-i-understand-this-is-staging`.

## Execution Result

Not executed. No staging `DATABASE_URL` or VPS/Compose staging shell was available in this session.

## Blocker

Run this only on the real staging database with external secrets available, then store the emitted staging API key, BFF session and CSRF token outside git.
