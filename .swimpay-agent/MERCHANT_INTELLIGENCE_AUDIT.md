# Merchant Intelligence Audit

generated_at: 2026-05-12T07:00:00+03:00

## Scope

Audit of the Android merchant receiver runtime, backend receiver arming, no-notification fallback, review creation, local merchant notifications and privacy boundaries.

No real bank notification was captured or processed.

## Findings

| Surface | Status | Notes |
| --- | --- | --- |
| `continue-to-bank` arming | already_implemented | Backend session fields include `receiver_armed_at`, route lock, payable amount and fallback markers from prior checkout work. |
| No-notification fallback worker | already_implemented | `swimpay-job-worker` polls sessions due after `receiver_armed_at + NO_NOTIFICATION_FALLBACK_MIN_SECONDS`, uses idempotency ledger and creates an open review only. |
| Android merchant review notification | partially_implemented | NotificationChannel and Android 13 permission guard existed. Copy was made explicitly action-only: “Commande à vérifier”. |
| Active notification sweep | partially_implemented | Sweep already filtered exact packages and stored redacted observations. Live listener now also checks the active intent window before extraction. |
| Active intent window | partially_implemented | The window now requires active payment intent, receiver armed, Expected Payment Profile and locked receiving route. |
| Redacted local buffer | partially_implemented | Buffer now has TTL, duplicate hash replacement and raw phone/card/raw-notification rejection. |
| Receiver Health | partially_implemented | Backend heartbeat now returns a typed `receiver_health` object. Android derives `ReceiverRuntimeState` for merchant UI. |
| Review UI amount truth | already_implemented | Merchant review detail already displays displayed amount, expected exact amount, detected amount, delta and risk label. |
| Public webhook guardrails | already_implemented | Fallback/manual review does not emit final public webhooks until merchant decision. |

## Risks Closed

- Live NotificationListener extraction can no longer run outside an active locked payment window.
- Recent observation buffer no longer keeps unlimited redacted entries.
- Merchant fallback notifications no longer imply a banking proof.
- Heartbeat response now exposes reliable receiver health fields for UI/readiness surfaces.

## Remaining Runtime Validation

- ADB smoke of receiver health, review list and local “Commande à vérifier” notification on the merchant phone.
- Staging verification that `NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true` and `NO_NOTIFICATION_FALLBACK_MIN_SECONDS=120`.
- Controlled checkout rehearsal without real bank notification capture.
