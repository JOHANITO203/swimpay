# Android Dashboard Chart Hydration Report

## Scope

The Android merchant home dashboard was partially hydrated: the dashboard cards consumed backend/state metrics, but the chart card did not expose visible hydrated values.

## Root Cause

`PremiumMerchantRuntime` already loaded `metrics_timeseries` into `chartPoints`, and the chart drew the line from those points. The UI card, however, only displayed a static chart title plus the canvas. There was no visible amount/rate summary bound to the timeseries state, so the card appeared unhydrated.

## Fix

- Added chart summary fields to `PremiumDashboardUiState`:
  - `chartConfirmedAmountLabel`
  - `chartConfirmationRateLabel`
- Derived these labels from backend `dashboardTimeseries`.
- Updated the Accueil chart card to render compact `Montant` and `Taux` values above the existing line chart.
- Preserved the existing visual language and layout.
- No payment runtime, webhook, confirmation, or receiver behavior changed.

## Tests

- `PremiumMerchantRuntimeContractTest.premiumRuntimeUsesLiveMerchantRepositoriesAndKeepsUiSafe`
- `AndroidMerchantVisualArchitectureTest.dashboardMetricsAreBackendWiredAndKeepShortLabels`
- Wider targeted Android suite:
  - `AndroidDataHydrationTest`
  - `PremiumMerchantRuntimeContractTest`
  - `AndroidMerchantVisualArchitectureTest`

Result: passing.
