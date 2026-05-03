# Android Frontend API Contracts

Sprint 7D introduced typed Android merchant frontend contracts and mock repositories. Sprint 7E wires the parts that already have backend APIs and leaves the remaining areas explicitly mock-only.

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

## Mock-only Contracts

### Dashboard Summary

Current state:

- typed frontend contract exists;
- Android uses mock repository data for summary statistics and recent rows.

Missing endpoint:

- `GET /v1/android-merchant/dashboard-summary`

### Payment Detail

Current state:

- typed frontend/detail model exists;
- list data can come from `GET /v1/reviews`;
- dedicated payment detail endpoint remains missing.

Missing endpoint:

- `GET /v1/android-merchant/review-queue/:payment_id`

### Connected Site

Current state:

- typed frontend contract exists;
- Android uses mock repository data for connected-site status and latest deliveries.

Missing endpoints:

- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`

Developer details are hidden by default.

### Configuration Test

Current state:

- typed frontend contract exists;
- checklist uses local readiness and mock connected-site/method state until a backend endpoint is available.

Missing endpoint:

- `POST /v1/android-merchant/configuration-test`

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
