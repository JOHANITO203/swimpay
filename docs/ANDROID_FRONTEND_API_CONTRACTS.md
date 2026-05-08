# Android Frontend API Contracts

Sprint 7D introduced typed Android merchant frontend contracts and mock repositories. Sprint 7E wired the pre-existing backend APIs. Sprint 7F closes the remaining mobile backend gaps with Android-specific merchant endpoints.

## Contract States

Each screen contract supports:

- loading;
- empty;
- success;
- action required;
- error.

## Authentication Boundary

Android uses an `AuthenticatedMerchantSession` model.

Current account and onboarding truth is defined in
`docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.

When no valid mobile merchant session exists, Android starts with an account
entry boundary before onboarding:

- `Créer un compte` creates a lightweight merchant account and starts onboarding.
- `Se connecter` recovers an existing account.

The backend should classify known/new device state through a privacy-safe
device proof such as an app install keypair and signed challenge. Do not rely on
raw device identifiers, advertising IDs, IMEI, raw Android ID or broad
fingerprint collection.

Google is optional account recovery/linking only. It appears in login and in
`Paramètres > Sécurité` for saving or linking a profile. It must not be required
for normal account creation and must not appear as a mandatory onboarding step.

Android Google sign-in is a recovery/linking surface. The expected client-side
provider is Android Credential Manager / Sign in with Google, which yields an ID
token for backend exchange. Android must not persist Google tokens or use Google
as mandatory onboarding.

Personal and business/commerce profile choices have the same app rights. The
Android UX must not expose them as admin personas. Account creation does not
collect merchant user first names or last names; the backend/app should use a
generated pseudonym/display handle.

### Android Account Endpoints

Backend endpoints:

- `POST /v1/android-merchant/auth/device-lookup`
- `POST /v1/android-merchant/auth/create-account`
- `POST /v1/android-merchant/auth/google/exchange`
- `POST /v1/android-merchant/auth/google/link`

APK backend target:

- default debug builds keep `http://127.0.0.1:8080` for adb reverse/local smoke;
- staging debug builds can be assembled with
  `-PswimpayBackendBaseUrl=https://staging.swimpay.pro`;
- external Android backend URLs must use HTTPS.

`device-lookup` accepts only privacy-safe install proof material. It must not
accept IMEI, raw Android ID, advertising ID, phone number, contact data or broad
fingerprint material.

`create-account` creates the lightweight Android merchant account before
onboarding. It returns a `mobile_session` token with the `spm_` prefix. Android
stores this mobile session in protected local storage and uses it only as an
Android merchant session bearer.

`google/exchange` is used by `Se connecter` after the Android Google provider
returns an ID token. It restores a linked profile or fails closed when Google is
not configured.

`google/link` is used from `Parametres > Securite` to save a recovery provider
for an existing mobile profile. It requires an authenticated Android mobile
session first; unauthenticated linking must return `401`.

The current install proof implementation is privacy-safe but not yet a strong
anti-replay identity. Production hardening must add server challenge issuance
and Android Keystore-backed private-key signing before treating device proof as
strong account recovery evidence.

For local/dev backend calls only, the app can use:

```text
Authorization: Bearer test_<merchant_id>
```

Missing auth maps to a safe disconnected/action-required state. The visible merchant UI must not show bearer tokens, API keys or webhook secrets.

## Wired Contracts

### Receiving Methods

Backend endpoints:

- `GET /v1/merchant/receiving-routes`
- `POST /v1/merchant/receiving-routes`
- `PATCH /v1/merchant/receiving-routes/:route_id`

Android maps saved routes to merchant UI rows with masked identifiers only. Raw card/phone values are accepted only during create submission and cleared from frontend state after submit.

### Review Queue

Backend endpoint:

- `GET /v1/reviews`

Android maps backend reason codes to simple labels:

- Validation manuelle en bêta
- Référence non visible
- Seul le montant a été reconnu
- Plusieurs paiements similaires
- Banque encore en test

Raw reason codes are not displayed in merchant mode.

### Review Actions

Backend endpoints:

- `POST /v1/reviews/:id/reject`

Android sends explicit action scope for rejection:

- `signal` for `Rejeter le signal`
- `order` for `Rejeter la commande`

Android does not directly send developer webhooks; webhook delivery remains backend responsibility after review action processing.

Android mobile sessions do not call the manual confirmation endpoint. Merchant
manual confirmation remains outside the Android Receiver boundary.

## Sprint 7F Mobile Endpoints

These endpoints are implemented and covered by API and Android repository tests. Live Docker-backed device validation must be rerun after the local Docker Desktop/containerd I/O issue recorded in `.swimpay-agent/BLOCKERS.md` is resolved.

### Dashboard Summary

Backend endpoint:

- `GET /v1/android-merchant/dashboard-summary`

Returns merchant-safe counts, receiver status and recent detected payments. It does not return raw card, raw phone, raw notification text or technical internals.

### Payment Detail

Backend endpoint:

- `GET /v1/android-merchant/payments/:id`

Returns safe detail for review/payment screens: expected and detected amount, bank display name, masked receiving method, payment reference, signal time, simple reason labels and allowed actions.

### Connected Site

Backend endpoints:

- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`

Developer details are hidden by default and appear only with an explicit developer mode flag. The test action is backend-owned; Android does not send developer webhooks directly.

### Configuration Test

Backend endpoint:

- `POST /v1/android-merchant/configuration-test`

The onboarding test path is webhook-test-only after the merchant chooses
`Ajouter maintenant` on the site/application step. Android may request the
backend-owned webhook test, but Android must not send developer webhooks
directly.

The test does not process real bank notifications, does not confirm real
payments and does not emit `payment.confirmed`.

If the merchant chooses `Configurer plus tard`, onboarding skips this test and
enters the app after a brief success state.

## Local Android Contracts

### Onboarding Readiness

Source:

- existing `ReceiverOnboardingReadinessEvaluator`;
- existing `NotificationAccessStatusReader`;
- existing `AppNotificationPermissionReader`.

Notification Listener Access remains separate from app notification permission.

### Receiver Health

Source:

- existing notification access reader;
- existing receiver status and diagnostics boundaries;
- outbox health model.

## Safety

- Android frontend contracts do not create payment decisions.
- Android does not confirm or auto-confirm payments.
- Webhook details are hidden in merchant mode.
- Raw notification text, raw phone, raw card and secrets are excluded from merchant-facing models.
- The app adds no SMS permission and no Accessibility scraping service.
