# Real Staging Integration Inventory

generated_at: 2026-05-08T00:00:00+03:00

## Summary

Repository readiness is strong for local build, SDK integration shape, manual-confirm-only runtime and Android Receiver safety. Real staging execution is blocked by external setup that is not present in the workspace: VPS access, DNS proof for `staging.swimpay.pro`, real staging secrets, Google OAuth credentials and a running staging stack.

## Classification

Ready:

- CR-2/CR-3 runtime product truth: no active auto-confirmation and public webhooks restricted to `payment.confirmed`, `payment.rejected`, `payment.expired`.
- CR-4 Android Receiver safety: supported activated package gate, redaction before outbox, encrypted outbox boundary, no Android confirmation and no Android-origin fulfillment callback.
- `@swimpay/node` SDK order creation and webhook verifier.
- Webhook worker public event taxonomy.
- Additive database migrations.
- Staging seed script with explicit confirmation flags.

Needs env only:

- `DATABASE_URL`, `VALKEY_URL`, `NATS_URL`.
- Google OAuth client values.
- webhook encryption/signing secrets.
- production-mode admin/BFF secrets.
- staging domain/base URLs.
- cookie domain and secure cookie settings.

Needs small code/config fix:

- `infra/caddy/Caddyfile` is local HTTP-only with `auto_https off`; HTTPS staging needs a staging Caddyfile or host override.
- `infra/docker-compose.yml` service `env_file` points at `../.env.example`; real staging needs an ignored staging env file or server-injected environment.
- Android non-debug staging configuration has a safe store but no operator UI for entering staging URL/keys in this sprint.

Blocked by external setup:

- DNS for `staging.swimpay.pro` was not resolvable from this shell.
- `https://staging.swimpay.pro/api-health` did not return a usable response.
- Docker Desktop Linux engine was unavailable locally, so local Compose runtime `ps` could not run.
- No VPS SSH/session, server env, Google OAuth credentials, webhook endpoint URL or real staging API key was available in the workspace.

Unsafe for real staging until fixed:

- Running real notification capture before staging API, active payment intent and redaction/outbox checks are verified.
- Running real bank capture without a final operator start command that names the device, bank, staging order and expected amount.
