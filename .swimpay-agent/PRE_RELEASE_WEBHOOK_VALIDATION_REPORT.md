# Pre-Release Webhook Validation Report

generated_at: 2026-05-17
scope: staging release gate

## Executive status

Status: `passed`

The pre-release webhook gate is validated on staging.

The previous blocker:

- "Webhook reel non valide car webhook marchand encore not_configured"

is now resolved for validation purposes:

- a temporary merchant webhook endpoint was configured on staging;
- a real checkout/review/manual-confirmation flow was executed;
- `payment.confirmed` was delivered to the external receiver;
- delivery returned HTTP `200`;
- receiver-side signature verification passed;
- the temporary merchant configuration was removed after the proof.

SwimPay product truth remains intact: the tested event is a notification-signal based operational event after manual merchant confirmation. It is not an official bank confirmation.

## Environment facts

| Item | Result |
| --- | --- |
| Landing host | `https://www.swimpay.pro` serves landing, not the API |
| API host used for validation | `https://staging.swimpay.pro` |
| Webhook receiver host | `https://webhook.swimpay.pro/webhooks/swimpay` |
| Receiver deployment | Docker container on VPS `5.101.87.38`, behind Traefik |
| Merchant staging state after cleanup | `webhook_status=not_configured`, webhook URL empty |
| Repo mutation | No product/runtime code changes for this validation |

## Validation evidence

### Receiver health

Public receiver health passed:

- `https://webhook.swimpay.pro/health`
- HTTP `200`
- service: `swimpay-webhook-receiver`

### Signature probe

A signed probe was sent to the receiver before the real staging flow.

Result:

- HTTP `200`
- `signature_checked=true`
- `signature_ok=true`
- payload included:
  - `confirmation_type=notification_signal`
  - `official_bank_confirmation=false`

### Staging delivery loop probe

A backend delivery-loop test was queued against the active staging endpoint.

Result:

- delivery status: `delivered`
- attempt count: `1`
- HTTP status: `200`
- receiver signature verification: `true`

This proved that staging job-worker delivery to the external receiver was operational.

### Real checkout -> review -> manual confirmation -> webhook

Validated order:

- `external_id`: `codex-webhook-live-20260517055329`
- `order_id`: `735ec8b0-dc50-465c-8e26-ba57b8ca4e58`
- `payment_session_id`: `4b33121f-ecfa-4b7a-835a-fc089b2f7f22`
- `review_id`: `445a725a-81e2-4b71-839d-5dad598e5f35`

Final checkout state:

- order status: `manual_confirmed`
- payment session status: `manual_confirmed`
- buyer safe status: `confirmed`

Webhook delivery:

- event type: `payment.confirmed`
- delivery status: `delivered`
- attempt count: `1`
- HTTP status: `200`
- receiver path: `/webhooks/swimpay`
- receiver signature check: `true`
- receiver signature result: `true`

Public payload safety:

- `confirmation_type`: `notification_signal`
- `official_bank_confirmation`: `false`
- `decision`: `manual_confirmed`
- `status`: `confirmed`
- `reason_label`: `NO_NOTIFICATION_MANUAL_FALLBACK_CONFIRMED`

## Cleanup performed

The staging merchant integration was restored after validation.

Cleanup result:

- merchant webhook URL: empty
- merchant webhook status: `not_configured`
- temporary endpoint URL: `https://webhook.swimpay.pro/webhooks/swimpay`
- temporary endpoint status: `disabled`
- temporary backup table removed

The receiver container remains available on the VPS for future controlled validation unless explicitly removed.

## Product truth checks

Passed:

- No auto-confirmation was used.
- Confirmation happened only after manual merchant action.
- Public event used `payment.confirmed` only after manual confirmation.
- Public event included `confirmation_type=notification_signal`.
- Public event included `official_bank_confirmation=false`.
- Android did not send the public webhook.
- The backend/job-worker delivered the webhook.

## Release note update

Replace:

> Webhook reel non valide car webhook marchand encore not_configured.

With:

> Webhook reel valide sur staging le 2026-05-17 apres confirmation manuelle marchand. Livraison `payment.confirmed` recue par un backend marchand externe, HTTP 200, signature verifiee, payload conforme `notification_signal` et `official_bank_confirmation=false`. Configuration temporaire retiree apres test; marchand revenu `not_configured`.

## Remaining operational notes

- Rotate the staging/server values that were used for this controlled validation before inviting external merchants.
- For each real merchant, configure webhook URL through the merchant integration flow, not manual database edits.
- Keep `www.swimpay.pro` documented as landing-only until a production API host is intentionally routed.
- Keep API smoke tests pointed at `https://staging.swimpay.pro` unless production API routing is explicitly enabled.

## Release gate decision

Webhook release gate: `passed`

The remaining release decision should depend on the already completed app/API/landing/build checks, not on webhook delivery.
