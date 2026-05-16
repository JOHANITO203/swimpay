# Android Release And Production Config

This document records the current production conversion path for the SwimPay Android merchant app.

## Release build

The release APK is built from the Android `release` build type.

Required values:

- `SWIMPAY_ANDROID_PRODUCTION_BACKEND_BASE_URL`
- `SWIMPAY_ANDROID_PRODUCTION_GOOGLE_SERVER_CLIENT_ID`
- `SWIMPAY_ANDROID_RELEASE_STORE_FILE`
- `SWIMPAY_ANDROID_RELEASE_STORE_PASSWORD`
- `SWIMPAY_ANDROID_RELEASE_KEY_ALIAS`
- `SWIMPAY_ANDROID_RELEASE_KEY_PASSWORD`

The Gradle release validation rejects localhost backends and requires HTTPS. The first production distribution may reuse the already validated staging Google/server values when those are intentionally copied into the production variables.

Release builds enable R8 minification and resource shrinking. The app keeps the Android worker, Credential Manager and Google ID token classes needed by runtime account recovery/linking.

## Backend production variables

`infra/docker-compose.yml` does not provide production defaults for runtime secrets. The server or Dokploy environment must inject:

- `DATABASE_URL`
- `CHECKOUT_BASE_URL`
- `PHONE_HMAC_SECRET`
- `WEBHOOK_SECRET_ENCRYPTION_KEY`
- `ADMIN_TOKEN_HMAC_SECRET`
- `POSTGRES_PASSWORD`

The production template is `.env.production.example`. It documents shape only; real values stay outside git.

## Google scope

Android Google is optional recovery/linking only:

- login recovery uses the Android Google ID token exchange endpoint;
- `Paramètres > Sécurité` links Google to an existing Android merchant profile;
- the app must not store Google tokens as profile data.

The web BFF Google redirect endpoints are still an explicit 501 seam. That does not block Android Google recovery/linking. Do not treat the web BFF seam as production-ready until a browser redirect/callback implementation and CSRF/session tests are added.

## Product boundary

Release configuration must not change confirmation semantics. Android never confirms orders locally and never sends fulfillment webhooks directly.
