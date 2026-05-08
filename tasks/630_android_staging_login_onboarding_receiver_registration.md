# Task 630 - Android staging login/onboarding receiver registration

Status: blocked_existing_device_state

Goal: validate the login/create-account -> onboarding -> receiver registration path on the operator device.

Scope:
- Launch the app.
- Inspect the visible state with UIAutomator.
- Verify the app can reach the staging backend through configured base URL.
- Validate receiver registration and persisted bank-target config without capturing real notifications.

Guardrails:
- Google remains optional recovery/linking only.
- Android never confirms payment.
- Android never sends developer webhooks.
