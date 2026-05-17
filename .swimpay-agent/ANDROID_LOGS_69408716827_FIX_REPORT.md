# Android CI Logs 69408716827 Fix Report

## Source

- Archive reviewed: `C:\Users\Lenovo\Downloads\logs_69408716827.zip`
- Failing job: `Android receiver validation`
- Passing jobs in the archive: `Root npm validation`, `Docker Compose config`

## Failure

The Android staging unit job failed on two stale visual architecture guardrails:

- `AndroidMerchantVisualArchitectureTest.dashboardMetricsAreBackendWiredAndKeepShortLabels`
- `AndroidMerchantVisualArchitectureTest.homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard`

During the full local Android validation, one additional local-only brittleness appeared:

- `AndroidMerchantVisualArchitectureTest.reviewDecisionActionsRunNetworkCallsOffTheComposeMainThread`

## Root Cause

The runtime implementation had already evolved correctly:

- `CardVisualLayers.kt` now renders texture through reusable layer helpers instead of the old direct `theme.surface.surfaceTextureRes ?: return` shape.
- `MonthlyActivityCard` now selects the home card theme with a `when` branch so the dark theme can use `CardVisualDefaults.HomeDashboardDark`, while the explicit DragonGold trial still maps to `CardVisualDefaults.HomeDashboardDragonGoldMaterial`.
- The source-slicing helper in the test was sensitive to Windows CRLF line endings when searching for `\n` markers.

No Android payment review runtime behavior was changed.

## Fix Applied

Updated `AndroidMerchantVisualArchitectureTest` so it validates the current architecture:

- accepts `textureRes ?: return` inside the reusable texture layer path;
- requires `SurfaceFinishTextureLayer(` to keep the material layer guardrail;
- requires the `when` theme selection branch for dark, DragonGold, and fallback home cards;
- normalizes CRLF to LF inside `sourceFunction` and `sourceBetween`.

## Verification

Passed:

```powershell
.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.dashboardMetricsAreBackendWiredAndKeepShortLabels --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Passed:

```powershell
.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.reviewDecisionActionsRunNetworkCallsOffTheComposeMainThread --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Passed:

```powershell
.\gradlew.bat :app:testStagingUnitTest :app:assembleStaging --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Result: `BUILD SUCCESSFUL`, `59 actionable tasks: 3 executed, 56 up-to-date`.

## Production Impact

- No backend changes.
- No navigation changes.
- No payment review logic changes.
- No Android runtime confirmation behavior changes.
- The fix is limited to test guardrails and local source parsing robustness.
