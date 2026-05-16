# Production Environment

This document defines the production runtime contract for SwimPay V1.

The current production conversion keeps the validated staging application shape
and points the public runtime to the production domain. Staging remains the test
mirror; production must use the public HTTPS host.

Production host:

- `https://www.swimpay.pro`

Checkout URL:

- `https://www.swimpay.pro/checkout`

Android release backend:

- `SWIMPAY_ANDROID_PRODUCTION_BACKEND_BASE_URL=https://www.swimpay.pro`

Android release signing:

- `SWIMPAY_ANDROID_RELEASE_STORE_FILE=/absolute/path/to/swimpay-release.jks`
- `SWIMPAY_ANDROID_RELEASE_STORE_PASSWORD`
- `SWIMPAY_ANDROID_RELEASE_KEY_ALIAS`
- `SWIMPAY_ANDROID_RELEASE_KEY_PASSWORD`

Release keystore files and passwords must stay outside Git.

Google recovery/linking:

- Production release may reuse the currently validated Android Google server
  client id until a separate production OAuth client is created.
- If a separate production client is added later, set
  `SWIMPAY_ANDROID_PRODUCTION_GOOGLE_SERVER_CLIENT_ID`.

SwimPay staging initially used synthetic data only. As of Real Staging Integration, operator-owned real notification testing is allowed only inside the controlled staging scope:

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
- `GOOGLE_OAUTH_CLIENT_ID` when Google recovery/linking is enabled
- `GOOGLE_OAUTH_CLIENT_SECRET` when Google recovery/linking is enabled
- `GOOGLE_OAUTH_REDIRECT_URI` when Google recovery/linking is enabled

For the production VPS/Dokploy environment, the expected public values are:

```text
SWIMPAY_CADDY_SITE_ADDRESS=www.swimpay.pro
CHECKOUT_BASE_URL=https://www.swimpay.pro/checkout
GOOGLE_OAUTH_REDIRECT_URI=https://www.swimpay.pro/auth/google/callback
```

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

Google OAuth is optional recovery/linking for merchant profiles.

In the Android merchant app, Google belongs to:

- `Se connecter`, for existing account recovery/login;
- `Paramètres > Sécurité`, for linking or saving a profile for future recovery.

Google must not be required for normal Android account creation and must not be
a mandatory onboarding step. Merchant access is still granted by SwimPay
merchant membership and device/session boundaries, not by a Google account
alone.

Do not commit Google OAuth secrets. Put local/staging credentials in ignored environment files or a server secret store.

For local dev without a public domain, use:

- Authorized JavaScript origin: `http://localhost:8080`
- Authorized redirect URI: `http://localhost:8080/auth/google/callback`

For VPS staging, configure the HTTPS staging origin and:

- `https://<staging-host>/auth/google/callback`

For production, configure:

- Authorized JavaScript origin: `https://www.swimpay.pro`
- Authorized redirect URI: `https://www.swimpay.pro/auth/google/callback`

## SDK/API Keys

Merchant API keys are server-side only. They must be stored hashed and verified with constant-time hash comparison helpers. Browser and Android snippets must never contain secret keys.

## Receiver Signals

Receiver signals must remain signed and redacted.

Staging may process one operator-owned real notification test
only inside the controlled staging scope. Raw notification title/body/text, raw
phone and raw card values are still forbidden for storage, upload and logs.

Synthetic receiver tests remain the default for local and repeatable validation.

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
