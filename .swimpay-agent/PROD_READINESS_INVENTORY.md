# Production Readiness Inventory

generated_at: 2026-05-06

## Scope

Audit-only inventory for SDK Web, SDK Android/APK, developer integration, webhooks, checkout, Android Receiver and SwimPay Intelligence.

No backend behavior, payment logic, Android notification processing or API contract was changed during this inventory.

## Top-level Areas

| Area | Main locations | Status | Notes |
| --- | --- | --- | --- |
| Backend API | `apps/api`, `packages/contracts`, `packages/security`, `packages/matching-core` | partially ready | Core routes and contracts exist, but production merchant auth/SDK packaging remain incomplete. |
| Web checkout | `apps/web/src/screens/CheckoutScreen.ts`, `apps/web/src/index.ts` | partially ready | Bank-first checkout, route reveal, recognition hints, receiver arming and claimed-paid flows exist. Some mock fallback behavior remains in web server provider. |
| Merchant web surfaces | `apps/web/src/screens/MerchantScreens.ts`, admin screens | prototype/demo | Useful static/admin surfaces exist, but not production-grade developer wizard or merchant app. |
| Android Receiver app | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver` | partially ready | Notification Access, exact package probing, premium UI and receiver foundations exist. Production receiver security hardening still needs a pass. |
| SwimPay Intelligence | `apps/android-receiver`, `packages/contracts`, `packages/matching-core`, `apps/signal-worker` | partially ready | Deterministic V1 and payment-intent gate exist. Durable learning storage exists. Real multi-bank production validation remains pending. |
| Webhooks | `apps/job-worker/src/webhooks.ts`, `docs/12_WEBHOOKS.md`, tests | partially ready | Signing/retry foundation exists. Public event taxonomy docs conflict with final manual-confirm-only direction. |
| SDK Web | no dedicated SDK package found | missing/partially ready | API and docs exist; packaged SDK/helper, typed errors and verifier export are missing. |
| SDK Android | no dedicated merchant Android SDK found | missing | Android Receiver is not the merchant SDK. Merchant app integration snippets/helpers are not production-ready. |
| Developer integration wizard | web/admin/Android connected-site surfaces | prototype | No complete Web/Android-only wizard with secret lifecycle. |
| VPS deploy | `infra/docker-compose.yml`, `infra/*`, env files | partially ready | Compact Compose and limits exist. HTTPS, backups, production env and monitoring need hardening. |

## Current Route and Package Map

### API routes observed

- Orders and checkout: `/v1/orders`, `/v1/orders/:id`, `/v1/payment-sessions/:id`, `/v1/checkout/:id/*`.
- Checkout arming and claim: `/v1/checkout/:id/continue-to-bank`, `/v1/checkout/:id/claimed-paid`.
- Merchant receiving routes: `/v1/merchant/receiving-routes`.
- Receiver lifecycle and signals: `/v1/receiver/devices`, `/v1/receiver/devices/:id/heartbeat`, `/v1/receiver/signals`.
- Reviews: `/v1/reviews`, `/v1/reviews/:id/confirm`, `/v1/reviews/:id/reject`.
- Android merchant: `/v1/android-merchant/dashboard-summary`, `/payments/:id`, `/connected-site`, `/connected-site/test`, `/configuration-test`.
- Intelligence: `/v1/intelligence/bank-profiles`, `/feedback`, `/unknown-shapes`.
- Admin/operator: bank evidence, profiles, intelligence feedback and unknown shape monitoring.

### Shared packages observed

- `packages/contracts`: order/session states, checkout contracts, Intelligence V1 contracts, payment intent and review copy helpers.
- `packages/matching-core`: deterministic matching and Payment Intent Gate.
- `packages/security`: HMAC, masking, API key/webhook secret hashing, redaction helpers.
- `packages/bank-templates`: synthetic/redacted bank template/profile fixtures.
- `packages/events`: internal event constants.
- `packages/database`: migrations.

## Production Readiness Summary

| Capability | Status | Production note |
| --- | --- | --- |
| Payment-intent-bound matching | partially ready | Model/runtime tests exist; audit still found stale docs/tests around auto-confirm and early webhooks. |
| Receiver arming on bank CTA | partially ready | `continue-to-bank` exists and transitions to `receiver_armed`; docs still contain older arming-at-session-creation language. |
| Buyer claimed paid non-confirming | partially ready | Contracts/tests preserve non-confirming semantics. |
| Manual merchant confirmation | partially ready | Review endpoints exist. Public webhook docs still include pre-confirm review/signal events. |
| Webhook signing | partially ready | Worker signs payloads; no dedicated SDK verifier package. |
| SDK Web | missing | Needs packaged helper and production docs around secure server-side order creation. |
| SDK Android | missing | Needs merchant app helper docs/snippets; no secret in APK rule must be explicit. |
| Developer wizard | prototype | Needs Web/Android-only production wizard and secret lifecycle. |
| Receiver Android | partially ready | Strong foundations; production keying/outbox/device validation and real bank shadow completion remain next. |
| Intelligence learning | partially ready | Durable passive storage exists; must remain read-only and retention-governed. |
| VPS | partially ready | Good Compose base; backups/HTTPS/env/monitoring are blockers before production. |

