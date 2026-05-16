# Android Integration API Key Mobile Fix

generated_at: 2026-05-17 02:30:49 +03:00

## Issue

The Android Merchant integration screen exposed `Créer clé API`, but tapping it returned the generic Android message `Integration indisponible`.

## Root Cause

The Android UI and runtime were still wired to the existing developer integration contracts:

- `POST /v1/merchant/integration/keys`
- `POST /v1/merchant/integration/keys/rotate`
- `POST /v1/merchant/integration/webhook-secret/rotate`
- `PUT /v1/merchant/integration/webhook-url`
- `POST /v1/merchant/integration/test-webhook`

The backend route resolver accepted Android mobile bearer sessions for these routes, but `androidMerchantMobilePermissions()` no longer included the integration mutation permissions after the security closeout. The request therefore failed at permission check with HTTP 403, and Android collapsed it into `Integration indisponible`.

## Fix

Restored the scoped Android mobile permissions for the already-existing backend-owned integration actions:

- `integration.keys.create`
- `integration.keys.rotate`
- `integration.webhook.update`
- `integration.webhook.test`
- `integration.delivery.retry`

This restores the preexisting Android feature without adding a new API contract or changing webhook/payment semantics.

## Security Guardrails Preserved

- Web/BFF session mutations still require CSRF.
- Android uses a valid `spm_...` mobile merchant bearer, not a dashboard cookie.
- API keys and webhook secrets remain show-once only on create/rotate/update responses.
- Normal integration reads do not return `secret_key_once` or `webhook_secret_once`.
- Responses do not echo the Android mobile session token.
- Android still does not send webhooks directly.
- No payment confirmation, webhook semantics, receiver runtime or database behavior was changed.

## Validation

- `npm test -- apps/api/src/android-merchant.test.ts -t "developer integration actions"`
- `npm test -- apps/api/src/android-merchant.test.ts`
- `npm test -- apps/api/src/auth-bff.test.ts -t "developer integration|CSRF|mutation"`
- `npm test -- apps/api/src/prod-mode-staging.test.ts -t "CSRF|integration"`
- `.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testStagingUnitTest --tests com.swimpay.receiver.PremiumMerchantRuntimeContractTest --tests com.swimpay.receiver.AndroidMerchantApiWiringTest --no-daemon --stacktrace --max-workers=1`

