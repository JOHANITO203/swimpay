# Staging Env Secret Contract

generated_at: 2026-05-08T00:00:00+03:00

Do not commit real values.

## Required Values

```text
NODE_ENV=production
HTTP_PORT=80
DATABASE_URL=postgres://...
VALKEY_URL=redis://valkey:6379
NATS_URL=nats://nats:4222
NATS_STREAM_NAME=SWIMPAY_EVENTS
NATS_DURABLE_PREFIX=swimpay
CHECKOUT_BASE_URL=https://staging.swimpay.pro/checkout
API_BASE_URL=https://staging.swimpay.pro
WEB_BASE_URL=https://staging.swimpay.pro
COOKIE_DOMAIN=staging.swimpay.pro
SESSION_COOKIE_SECURE=true
PHONE_HMAC_SECRET=<external secret>
WEBHOOK_SECRET_ENCRYPTION_KEY=<external secret>
ADMIN_AUTH_MODE=signed_token
ADMIN_TOKEN_HMAC_SECRET=<external secret>
GOOGLE_OAUTH_CLIENT_ID=<Google staging client id>
GOOGLE_OAUTH_CLIENT_SECRET=<Google staging client secret>
GOOGLE_OAUTH_REDIRECT_URI=https://staging.swimpay.pro/auth/google/callback
WEBHOOK_WORKER_ENABLED=true
SWIMPAY_STAGING_SEED_CONFIRM=seed-local-staging-auth
SWIMPAY_STAGING_SEED_ALLOW_PRODUCTION=yes-i-understand-this-is-staging
```

## External Merchant App Values

```text
SWIMPAY_STAGING_API_BASE_URL=https://staging.swimpay.pro
SWIMPAY_STAGING_SECRET_KEY=<staging merchant API key>
SWIMPAY_STAGING_WEBHOOK_SECRET=<show-once staging webhook secret>
EXTERNAL_APP_BASE_URL=https://<merchant-staging-endpoint>
```

## Missing In This Session

- All real staging secrets.
- Google OAuth staging credentials.
- Cookie domain/runtime confirmation from staging host.
- External merchant app public URL.
