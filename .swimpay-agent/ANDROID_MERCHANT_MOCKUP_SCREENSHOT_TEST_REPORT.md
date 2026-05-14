# Android Merchant Mockup Screenshot Test Report

Date: 2026-05-13
Agent: 8 / QA Roborazzi
Scope: `PremiumGoldenScreenshotTest.kt`

## Implemented

Added and recorded the required 14-screen Roborazzi matrix. Worker B preserved the same 14 target names and rewired `11_integrations_list.png` from the settings summary to the standalone integrations list screen.

- `01_login_welcome.png`
- `02_notification_access.png`
- `03_bank_selection.png`
- `04_receiving_setup.png`
- `05_site_app_setup.png`
- `06_webhook_test.png`
- `07_dashboard_home.png`
- `08_review_queue.png`
- `09_review_detail.png`
- `10_receiving_methods.png`
- `11_integrations_list.png`
- `12_integration_detail.png`
- `13_receiver_health.png`
- `14_security_settings.png`

Snapshot output directory:

- `apps/android-receiver/android/app/src/test/snapshots/`

## Test State

The screenshot matrix uses deterministic test-only state. Runtime screens still use repository/backend state.

- onboarding targets use an explicit initial state hook with default runtime behavior unchanged;
- bank targets use V1 supported bank profile IDs;
- receiving setup uses a test-only masked/card route submission;
- webhook test copy remains backend-owned and test-only;
- review detail uses redacted evidence and `notification_signal` boundary copy.
- `11_integrations_list` now renders `PremiumIntegrationsListStateScreen(state = ..., onOpenIntegration = ..., onAddSite = ..., onOpenDeveloperGuide = ...)` with deterministic connected-site state.

## Guardrails

Added/kept static checks for:

- all 14 requested capture names exist;
- unsafe public labels are not present in target premium runtime source;
- review detail uses redacted audit evidence;
- webhook and receiver copy do not imply Android-owned confirmation;
- Google is optional and only surfaced in security/recovery paths.

Current guardrail status:

- The test source now asserts that reference 11 uses `PremiumIntegrationsListStateScreen` and not `PremiumSettingsScreen`.
- Android compilation now handles the `IntegrationsList` route.
- Roborazzi record and verify both pass for the updated 14-screen matrix.
- `PremiumReferencePngComparisonTest` now checks all 14 reference/golden PNG pairs and writes `.swimpay-agent/ANDROID_MERCHANT_REFERENCE_PIXEL_DIFF_REPORT.md`.

## Commands Run

```powershell
$env:GRADLE_OPTS='-Xmx256m -Xms64m'; .\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1
$env:GRADLE_OPTS='-Xmx256m -Xms64m'; npm run android:screenshot:record
$env:GRADLE_OPTS='-Xmx256m -Xms64m'; npm run android:screenshot:verify
```

Prior sprint result: PASS.

Roborazzi record and verify both completed successfully for the 14 target screenshots.

Follow-up targeted command:

```powershell
$env:GRADLE_OPTS='-Xmx256m -Xms64m'; .\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.PremiumNavigationStateTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest --tests com.swimpay.receiver.ui.premium.PremiumGoldenScreenshotTest.referenceMatrixContainsAllFourteenRequestedScreenNames --tests com.swimpay.receiver.ui.premium.PremiumGoldenScreenshotTest.referenceElevenUsesDedicatedIntegrationsListScreen --no-daemon --stacktrace --max-workers=1
```

Result: PASS.

The earlier non-exhaustive `PremiumMerchantApp.kt` branch was fixed by loading the existing connected-site state for `PremiumRoute.IntegrationsList`.

Reference PNG comparison command:

```powershell
$env:GRADLE_OPTS='-Xmx256m -Xms64m'; .\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.ui.premium.PremiumReferencePngComparisonTest --no-daemon --stacktrace --max-workers=1
```

Result: PASS. The generated metric report classifies all 14 normalized comparisons as `partial`, which is expected for a measurement aid comparing tall OS-chrome references to compact Roborazzi Compose goldens.

## 2026-05-14 Follow-up Correction

Current implementation state after the latest multi-agent pass:

- `PremiumGoldenScreenshotTest` now contains direct numbered Roborazzi tests for `01_login_welcome.png` through `14_security_settings.png`.
- `02` through `06` render deterministic onboarding steps through `PremiumOnboardingFlow(initialState = ...)`; the default runtime onboarding state remains unchanged.
- `07`, `08`, `09`, `10`, `12`, `13` and `14` render the corresponding production Compose screens with deterministic test state.
- `11_integrations_list.png` currently renders the closest available production integration surface, `PremiumConnectedSiteStateScreen`; there is no `PremiumIntegrationsListStateScreen` production component in the current tree.
- Latest validation:
  - `npm run android:compile`: PASS.
  - `npm run android:test`: PASS.
  - `npm run android:visual:record`: PASS.
  - `npm run android:visual:verify`: PASS.

Note: a transient Kotlin incremental-cache/daemon warning appeared when compile and test were run concurrently. Both commands completed successfully, and the subsequent single-command Roborazzi record/verify run was clean.
