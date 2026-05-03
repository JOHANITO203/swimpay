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

- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject`

Android sends explicit action scope for rejection:

- `signal` for `Rejeter le signal`
- `order` for `Rejeter la commande`

Android does not directly send developer webhooks; webhook delivery remains backend responsibility after review action processing.

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

Runs non-confirming readiness checks and returns merchant-facing checklist labels. It does not confirm real payments and does not emit `payment.confirmed`.

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
