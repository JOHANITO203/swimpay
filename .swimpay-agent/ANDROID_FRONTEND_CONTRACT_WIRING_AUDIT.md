# Android Frontend Contract Wiring Audit

Date: 2026-05-15

Scope: Android Merchant frontend screens, UI actions, repositories and backend contracts.

Forbidden scope during this audit: backend behavior changes, payment runtime changes, webhook semantics changes, database migrations, receiver runtime changes.

## Screen Wiring Matrix

| Screen | Runtime source | Current wiring | Notes |
|---|---|---|---|
| Accueil | `GET /v1/android-merchant/dashboard-summary` via `MerchantDashboardApiRepository` | partially wired | Dashboard data is live. Quick widgets were visual-only before this pass; now route to existing Reviews/Business screens. |
| Revue | `GET /v1/reviews` via `MerchantReviewQueueApiRepository` | wired | Local filters operate on live review items. |
| Détail review | `GET /v1/android-merchant/payments/:id`; confirmation via `POST /v1/reviews/:id/confirm`; rejection via `POST /v1/reviews/:id/reject` | wired | Confirm/reject actions are backend-owned. Android submits the merchant's manual decision but never confirms locally. |
| Paiement / Moyens de réception | `/v1/merchant/receiving-methods` CRUD endpoints | wired | Add/edit/disable/default/delete callbacks are live. This pass improved visible action feedback and confirmations. |
| Business / Ventes | `GET /v1/android-merchant/orders` via `MerchantOrdersApiRepository` | wired | Nonfunctional decorative search/filter controls were removed. Empty-state link now routes to Reviews. |
| Sites / Intégrations | `GET /v1/android-merchant/connected-site`; test/update/create/rotate through developer integration repository | wired | Still contains developer-focused concepts. Should remain secondary and hidden by default where possible. |
| Receiver Health | local receiver status, notification access and enabled bank state | wired | Uses local runtime state; no backend-only fake health status found. |
| Réglages | local settings store plus navigation to settings subroutes | wired | Language, appearance, security, support and Google link surfaces exist. |
| Sécurité | local app-lock settings; Google link through account auth repository | wired | Google link uses token provider and backend link endpoint when available. |
| Onboarding | account/session repositories, receiving-method API, receiver registration | wired | Receiving method persistence is backend-owned before onboarding completion. |

## Backend Endpoints Reused

- `POST /v1/android-merchant/auth/device-lookup`
- `POST /v1/android-merchant/auth/create-account`
- `POST /v1/android-merchant/auth/google/exchange`
- `POST /v1/android-merchant/auth/google/link`
- `GET /v1/android-merchant/dashboard-summary`
- `GET /v1/reviews`
- `GET /v1/android-merchant/payments/:id`
- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject`
- `GET /v1/merchant/receiving-methods`
- `POST /v1/merchant/receiving-methods`
- `PATCH /v1/merchant/receiving-methods/:method_id`
- `POST /v1/merchant/receiving-methods/:method_id/disable`
- `POST /v1/merchant/receiving-methods/:method_id/set-default`
- `DELETE /v1/merchant/receiving-methods/:method_id`
- `GET /v1/android-merchant/orders`
- `GET /v1/android-merchant/connected-site`
- `POST /v1/android-merchant/connected-site/test`
- `POST /v1/android-merchant/configuration-test`

## Runtime Fake Data Check

- Preview methods remain in UI state companion objects and default composable parameters. These are acceptable for previews/tests.
- Active runtime routes in `PremiumMerchantApp` load state through `PremiumMerchantRuntime`.
- No `merchant.example` runtime display was found in active Android runtime paths.
- No user-visible `wallet` wording was found in active Android premium source.

## Action Wiring Found

- Dashboard metric cards: previously visual-only, now navigate to real existing tabs.
- Dashboard payment history `Voir tout`: previously visual-only, now opens Business.
- Business empty-state secondary action: previously text-only, now opens Reviews.
- Receiving-method add/edit/disable/default/delete: live callbacks already existed; this pass added visible feedback/confirmation.

## Validation

- `npm run android:compile` passed.
- `npm run android:assemble:staging` passed.
- `git diff --check` passed.
- Targeted Android JVM tests passed for runtime contracts, visual architecture and navigation state.
