# Production Environment

This document defines the production-mode staging contract for SwimPay V1.

SwimPay production-mode staging initially used synthetic data only. As of Real Staging Integration, operator-owned real notification testing is allowed only inside the controlled staging scope:

- staging domain only, not public production;
- operator-owned device and bank account only;
- one small test payment context at a time;
- no customer data;
- no auto-confirmation;
- no raw notification title/body/text storage or upload;
- public fulfillment webhooks only after merchant manual confirmation.

## Required Runtime Shape

- `NODE_ENV=production`
- `DATABASE_URL`
- `VALKEY_URL`
- `NATS_URL`
- `CHECKOUT_BASE_URL`
- `PHONE_HMAC_SECRET`
- `WEBHOOK_SECRET_ENCRYPTION_KEY`
- `ADMIN_AUTH_MODE=signed_token`
- `ADMIN_TOKEN_HMAC_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

## Auth Boundaries

- Human dashboard access uses the BFF session cookie.
- Merchant backend API access uses stored hashed API keys.
- Android Receiver upload identity uses receiver device registration and signed redacted envelopes.
- Local `Bearer test_*` merchant bearers must fail closed in production mode.
- `/auth/dev/bootstrap-session` must fail closed in production mode.

## Cookie and CSRF Requirements

- Session cookie is opaque and server-side.
- Session cookie must be `HttpOnly`.
- Session cookie must be `Secure` in production mode.
- Session cookie should use `SameSite=Lax` unless a stricter deployment shape is validated.
- Merchant mutations must require a session-bound CSRF token.

## Google OAuth

Google OAuth identifies the human user only. Merchant access is granted by SwimPay merchant memberships and roles.

Do not commit Google OAuth secrets. Put local/staging credentials in ignored environment files or a server secret store.

For local dev without a public domain, use:

- Authorized JavaScript origin: `http://localhost:8080`
- Authorized redirect URI: `http://localhost:8080/auth/google/callback`

For VPS staging, configure the HTTPS staging origin and:

- `https://<staging-host>/auth/google/callback`

## SDK/API Keys

Merchant API keys are server-side only. They must be stored hashed and verified with constant-time hash comparison helpers. Browser and Android snippets must never contain secret keys.

## Receiver Signals

Receiver signals must remain signed, redacted and synthetic for production-mode staging. Raw notification title/body/text, raw phone and raw card values are forbidden.

## Webhooks

Public V1 webhooks remain:

- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

Every public event must preserve:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

Webhook test events must be clearly test-only and must not trigger fulfillment.

## VPS Notes

For a 4 GB VPS:

- build images sequentially or outside the VPS when possible;
- keep Compose service count to the V1 deployables;
- enable Docker log rotation;
- keep Postgres backups outside the container filesystem;
- run migrations before service rollout;
- expose only HTTPS through Caddy or Nginx;
- monitor disk, memory, Postgres, NATS and Valkey health.
