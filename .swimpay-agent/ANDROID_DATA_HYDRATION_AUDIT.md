# Android Data Hydration Audit

Generated: 2026-05-05

## Scope

Audited the active Android premium path:

`MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime -> ui/premium`

No backend APIs, contracts, payment logic, notification capture or review decisions were changed during the audit phase.

## Findings

| Screen / card | Current dependency | Pipeline | Issue | Fix direction |
| --- | --- | --- | --- | --- |
| Accueil dashboard summary | `GET /v1/android-merchant/dashboard-summary` | SwimPay backend state | Empty/offline dashboard could collapse into unavailable/empty despite local Receiver state being known. | Keep Accueil as content with local/system cards and show backend notice only for payment activity. |
| Accueil recent payments | dashboard endpoint recent rows | SwimPay backend state | No payments produced a dead generic activity state. | Show `Aucun paiement détecté pour le moment` and `Lancez un test`. |
| Accueil SwimPay Intelligence / phone / notifications | hardcoded UI text | local Android state | Rendered only inside content state, so backend failure hid local state. | Promote local system state into dashboard content fallback. |
| Revue | `GET /v1/reviews` | SwimPay backend state | Empty state used review copy but unavailable/offline used generic dead copy. | Empty = `Aucun paiement à confirmer`; offline = synchronization copy. |
| Paiement detail | `GET /v1/android-merchant/payments/:id` | SwimPay backend state | Missing detail correctly stays a non-fake error. | Keep safe error; do not invent payment detail. |
| Moyens de réception | merchant receiving route APIs | SwimPay backend state | Error copy was endpoint-specific and felt unavailable. | Offline copy should explain sync will resume. |
| Ventes | local placeholder until live order contract | frontend/local fallback | Empty state existed but wording did not match product truth. | Use `Vos ventes apparaîtront ici après validation des paiements.` |
| Site ou application | connected-site endpoint | webhook/business state | Webhook absence could make menu/business status feel broken. | Treat as optional unless configured. |
| Configuration test | configuration-test endpoint | SwimPay backend state + local readiness | Backend failure displayed `Test indisponible`. | Use action/offline copy without suggesting payment failure. |

## Root Cause

The premium UI had a single generic `PremiumScreenState.error()` default (`Données indisponibles`) and several screens converted backend or webhook failures into full-screen dead states. This made local Android truth invisible even when the Receiver was connected, Notification Access was enabled, banks were detected and no payment had simply arrived yet.

## Data Source Policy

- Local Android state should keep Accueil alive.
- Backend state should hydrate payments, reviews, methods and configuration results.
- Webhook/business state should be optional and isolated to the connected-site area.
- Mock/dev fallback must be explicit and must never masquerade as live payment data.
