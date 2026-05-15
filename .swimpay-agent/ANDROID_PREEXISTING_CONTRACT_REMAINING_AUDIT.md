# Android Preexisting Contract Remaining Audit

Date: 2026-05-15

Scope: audit only. No backend, API, database, payment runtime, webhook runtime, receiver runtime, SDK or Android UI implementation changes.

Baseline used: `2149c8e`, the pre-design Android Merchant commit before 2026-05-13 00:00.

## Question

Verify whether `OrderDetail` is the only remaining preexisting Android Merchant contract/surface not restored after the design and runtime wiring passes.

## Sources inspected

- `git show 2149c8e:apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `git show 2149c8e:apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumNavigationState.kt`
- `git show 2149c8e:apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `git show 2149c8e:apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- Current Android premium route/runtime files.
- Current `AndroidMerchantApiWiring.kt`.
- `docs/06_API_SPEC.md`.
- `apps/api/src/server.ts`.
- Existing restoration reports in `.swimpay-agent`.

## Result summary

`OrderDetail` is the only named pre-design Android Merchant route still not implemented as an Android runtime detail screen.

Important nuance: it was already a placeholder before the design pass. The audit did not find evidence that Android had a completed pre-design `OrderDetail` runtime contract, `loadOrderDetail()` method, dedicated repository method, or row click wiring that was lost during the design pass.

The restored `Orders/Ventes` list is a real preexisting feature and is now reachable again. `OrderDetail` is a preexisting route stub, not a restored-but-broken completed feature.

## Contract matrix

| Surface | Pre-design contract/source | Current status | Remaining issue |
|---|---|---|---|
| Account entry | Android auth repository, local mobile session store | Restored/wired | None found |
| Google recovery/link | `googleExchange`, `googleLink`, local session persistence | Restored/wired | Device staging test still operator-owned |
| Onboarding | Bank targets, receiving method creation, receiver registration | Present/wired | None found in this audit |
| Dashboard | `activeRuntime.loadDashboard()` -> `/v1/android-merchant/dashboard-summary` | Present/wired | None found |
| Reviews queue | `activeRuntime.loadReviews()` -> `/v1/reviews` | Present/wired | None found |
| Review detail | `activeRuntime.loadPaymentDetail(reviewId)` and review actions | Present/wired | None found |
| Review actions | `confirmReceived`, `rejectSignal`, `rejectOrder` | Present/wired | None found |
| Orders/Ventes list | `activeRuntime.loadOrders()` -> `/v1/android-merchant/orders` | Restored/reachable from Settings | None found |
| Order detail | `PremiumRoute.OrderDetail(orderId)` | Placeholder only | No Android detail repository/loader found |
| Receiving methods | `/v1/merchant/receiving-methods` list/create/edit/disable/default/delete | Present/wired | None found |
| Banks | Bank package probe/local target state | Present/wired | None found |
| Receiver health | Local receiver/runtime state and notification access | Present/wired | None found |
| Integrations | Existing single connected-site/developer integration contract | Present/wired | Multi-site is not a preexisting Android contract |
| Configuration test | Existing backend-owned configuration test path | Present/wired | None found |
| Confirmation mode | Manual V1 settings screen | Present | None found |
| Security/App lock | Local settings store, Google link | Present/wired | Remote sessions/devices repository does not exist |
| Language | Local settings store | Present/wired | None found |
| Appearance | Local settings store | Present/wired | None found |
| Help/support | Help screen and support ticket repository | Present/wired | None found |

## OrderDetail findings

Pre-design:

- `PremiumRoute.OrderDetail(val orderId: String)` existed.
- The route branch rendered a `PremiumStatePanel` placeholder with `Commande a synchroniser`.
- `LaunchedEffect(route, ...)` explicitly did nothing for `is PremiumRoute.OrderDetail`.
- No `PremiumNavigation.openOrder(...)` helper was found.
- `PremiumOrdersScreen` rows rendered `OrderCard(...)` without row-click navigation to detail.
- `PremiumMerchantRuntime` had `loadOrders()` but no `loadOrderDetail()`.
- `MerchantOrdersApiRepository` had `list(...)` but no detail method.

Current:

- `PremiumRoute.OrderDetail(val orderId: String)` still exists.
- The route still renders a placeholder.
- No current route opens `PremiumRoute.OrderDetail(...)`.
- The `Orders/Ventes` list is now reachable again through `PremiumRoute.Orders`.

Backend/API:

- `GET /v1/orders/{order_id}` exists in `docs/06_API_SPEC.md`.
- `GET /v1/orders/:id` exists in `apps/api/src/server.ts`.
- That endpoint is an SDK/developer order read contract, not currently wrapped by a dedicated Android Merchant order-detail repository.

## Remaining real gaps

These are not lost completed pre-design Android features:

- `OrderDetail`: preexisting Android route stub with no completed Android detail contract.
- Integrations multi-site list: current/preexisting Android model is single connected-site integration.
- Remote sessions/devices in Security: no real repository exists; UI must stay honest/unavailable or simple.

## Conclusion

Completed pre-design Android Merchant contracts appear restored or still present.

`OrderDetail` is the only remaining named route/surface from the pre-design Android app that is still not implemented beyond a placeholder. However, it should be treated as a preexisting partial/stub, not as a feature that the design pass broke.

No backend change is required to close this audit.

If the operator wants `OrderDetail` implemented later, the smallest safe follow-up is an Android-only wiring task that adapts the existing `GET /v1/orders/:id` response into a simple merchant order detail screen, with loading/empty/error states and no new business behavior.
