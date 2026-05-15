# Android Orders / Ventes Restore Report

## Root cause

`Orders / Ventes` existed before the 13 May design pass as `PremiumMainTab.Orders`, backed by:

- `activeRuntime.loadOrders()`
- `PremiumOrdersScreen`
- `PremiumOrdersUiState`

The design pass replaced the main navigation model with five tabs and removed `Orders` from the bottom nav. The Settings row `Ventes` then routed to `PremiumMainTab.Receivers`, making the existing sales/orders feature hidden and misrouted.

## Restored

- Added `PremiumRoute.Orders`.
- Added `PremiumNavigation.openOrders()`.
- Settings row `Ventes` now routes to `PremiumNavigation.openOrders()`.
- `PremiumMerchantApp` now loads orders when entering `PremiumRoute.Orders`.
- `PremiumRoute.Orders` renders `PremiumOrdersScreen`.
- `PremiumOrdersScreen` supports a back action to return to Settings.

## Not changed

- No backend/API contract changed.
- No new feature was added.
- No payment/webhook/receiver/database/SDK logic changed.
- `OrderDetail` remains a placeholder and should be treated as a separate pre-existing partial feature, not completed in this pass.

## Guardrail

`AndroidRuntimeWiringGuardrailTest.existingOrdersSalesFeatureMustRemainReachableFromSettings` verifies:

- `PremiumRoute.Orders` exists.
- `PremiumNavigation.openOrders()` exists.
- runtime calls `activeRuntime.loadOrders()`.
- `PremiumOrdersScreen` remains reachable.

## Validation

- `npm run android:compile` passed.
- `.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidRuntimeWiringGuardrailTest` passed.
- `npm run android:assemble:staging` passed.
- `git diff --check` passed with CRLF warnings only.
