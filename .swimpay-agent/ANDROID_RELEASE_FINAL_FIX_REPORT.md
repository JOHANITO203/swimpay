# Android Release Final Fix Report

## Scope

Final correction before production release APK generation.

## Evidence

The supplied CI logs in `logs_69632130896.zip` showed:

- root npm validation passed;
- Docker Compose config validation passed;
- Android validation failed at `:app:testStagingUnitTest`;
- failing tests:
  - `AndroidMerchantVisualArchitectureTest.homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard`;
  - `AndroidMerchantVisualArchitectureTest.developerIntegrationScreenUsesThemeTokensAndStandaloneBackground`;
  - `AndroidMerchantVisualArchitectureTest.premiumScreensUseSelectedToneAndElevationTokensForKnownHardcodes`;
  - `PremiumMerchantRuntimeContractTest.premiumRuntimeReceivingMethodsExposeTypedRowsAndSafeMutations`.

## Root Cause

The failures were caused by stale test contracts after the latest UI and receiving-method deletion hardening:

- the Home Dashboard DragonGold material texture alpha and gradient had intentionally moved from the older visual trial values;
- standalone screens now use `PremiumPaperBackground` instead of a direct `PremiumColors.Background` fill;
- onboarding selected rows still used direct color tokens instead of the selected tone token asserted by architecture tests;
- the runtime deletion test still mocked an update-style response, while the hardened backend contract requires `deleted: true` and `deleted_method_id`.

## Fix

- Reconciled onboarding selected states with `PremiumToneColors.Selected`.
- Updated visual architecture assertions to the current DragonGold material and standalone background contracts.
- Updated the receiving-method deletion runtime fixture to the real delete acknowledgement contract.
- Built a signed, non-debuggable, minified release APK.
- Replaced the downloadable landing APK with the new release artifact.

## Verification

- `:app:testStagingUnitTest` passed.
- `npm run android:assemble:release` passed.
- Release APK signing verified with `apksigner`.
- Release APK badging checked for package identity.

## Release Artifact

`apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk`

The landing download artifact was also updated:

`apps/landing/public/downloads/swimpay-merchant.apk`
