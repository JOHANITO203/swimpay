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

## Pre-release correction notes

Before producing the next signed release APK, make sure the release candidate includes the latest Android/UI fixes and that the backend deployed behind the APK includes the matching contract fixes.

Current must-include items:

- Receiving-method add form opens immediately in the visible area after `Ajouter une carte` or `Ajouter téléphone SBP`.
- The receiving-method form keeps the existing business contract: Android submits `MerchantReceivingMethodDraft.toSubmission()` through the existing repository path.
- Android Merchant `Créer clé API` requires the API backend fix from `.swimpay-agent/ANDROID_INTEGRATION_API_KEY_MOBILE_FIX_REPORT.md`.
- The API backend must allow valid Android mobile `spm_...` sessions to use the existing `/v1/merchant/integration*` actions.
- Web/BFF session mutations must still require CSRF.
- API keys and webhook secrets must remain show-once only and absent from normal reads.
- Android export/copy text must not include the mobile bearer token.

Minimum release smoke before distribution:

1. Install the signed release candidate.
2. Create or recover a merchant account with Google optional recovery.
3. Force-stop and relaunch; verify local session restoration.
4. Add a card receiving method and a phone/SBP receiving method.
5. Edit and delete a receiving method.
6. Open `Business` / integration detail and create an API key.
7. Confirm that normal reload shows only the masked key, not the show-once raw key.
8. Create a test order through API/SDK, open `checkout_url`, complete buyer claim, verify it arrives in `Revue`, and confirm manually.

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
