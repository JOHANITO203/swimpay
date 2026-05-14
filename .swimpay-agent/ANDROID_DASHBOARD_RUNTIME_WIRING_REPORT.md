# Android Dashboard Runtime Wiring Report

generated_at: 2026-05-14T00:00:00+03:00

## Scope

Screen: Dashboard / Accueil.

## Result

- Status: wired_to_existing_runtime.
- Repository reused: `MerchantDashboardApiRepository`.
- Fallback repository reused: `MerchantOrdersApiRepository` only when dashboard summary lacks confirmed activity.
- Endpoints reused:
  - `GET /v1/android-merchant/dashboard-summary`
  - `GET /v1/android-merchant/orders`
  - `GET /v1/merchant/receiving-methods`

## Changes

- Removed `debug`/`staging` forced dashboard preview fixture from `PremiumDashboardScreen`.
- Runtime now renders the `PremiumScreenState<PremiumDashboardUiState>` supplied by `PremiumMerchantRuntime`.
- Backend-unavailable summary no longer displays fake `0 RUB` loaded revenue.
- Missing dashboard metrics now display honest unavailable values instead of invented zeros.

## States

- Loading: existing `PremiumScreenState.Loading`.
- Empty/degraded: existing local-system fallback with backend notice.
- Error/offline: existing `PremiumScreenState.Offline`.
- Content: backend/repository content.

## Fake Runtime Data Removed

- `85 920 RUB` forced dashboard fixture removed from runtime path.
- `Excellent`/static fake dashboard preview no longer replaces staging runtime.

