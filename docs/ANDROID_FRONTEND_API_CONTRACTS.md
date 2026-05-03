# Android Frontend API Contracts

Sprint 7D defines typed Android frontend contracts for the merchant Receiver UI. Existing local Android models are reused where available; missing backend APIs are represented through mock repositories and documented in `.swimpay-agent/ANDROID_FRONTEND_API_GAPS.md`.

## Contract States

Each screen contract supports:

- loading;
- empty;
- success;
- action required;
- error.

## Contracts

### Onboarding Readiness

Source:

- existing `ReceiverOnboardingReadinessEvaluator`
- existing `NotificationAccessStatusReader`
- existing `AppNotificationPermissionReader`

Notification Listener Access remains separate from app notification permission.

### Bank Selection

Source:

- existing receiver-side bank profile selection model
- Sprint 7D merchant-facing screen model

The merchant-facing UI displays only five bank names and the beta manual validation badge.

### Receiving Methods

Current state:

- frontend contract exists;
- Android uses mock repository data until merchant route APIs are wired into the app.

Raw card/phone values are accepted only for create/edit flows. Saved display state is masked.

### Configuration Test

Current state:

- frontend contract exists;
- checklist uses local readiness and mock connected-site/method state until backend endpoints are available.

### Dashboard Summary

Current state:

- frontend contract exists;
- Android uses mock repository data for dashboard statistics and recent rows.

### Review Queue And Payment Detail

Current state:

- frontend contract exists;
- Android uses mock repository data for list/detail/actions until backend merchant review endpoints are connected to the app.

Review actions are modeled so `Rejeter le signal` does not reject an order by default.

### Connected Site

Current state:

- frontend contract exists;
- Android uses mock repository data for connected-site status and latest deliveries.

Developer details are hidden by default.

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
