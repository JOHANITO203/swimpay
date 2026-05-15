# Android Frontend Wiring Closeout

Date: 2026-05-15

## Completed

- Audited active Android Merchant screens against current contract docs.
- Confirmed major runtime screens are repository-backed.
- Rewired dashboard metric cards and history link to real routes.
- Removed nonfunctional Business search/filter UI.
- Preserved receiving-method backend wiring and action feedback from the prior pass.
- Built the Android staging APK successfully.

## Remaining Blockers

1. Documentation drift:
   - older Android screen docs still mention `receiving-routes`.

2. Integration UI:
   - wired, but still too developer-heavy by default.

## Manual Confirmation Verification

- Android Merchant keeps `confirmReceived` as an existing app feature.
- The action calls `activeRuntime.confirmReceived(reviewId)`.
- Runtime calls `MerchantReviewActionsApiRepository.confirmReceived(...)`.
- Repository sends `POST /v1/reviews/:id/confirm`.
- Android does not confirm locally and does not send developer webhooks directly.

## Validation Required

- `npm run android:compile` - passed on 2026-05-15.
- `npm run android:assemble:staging` - passed on 2026-05-15.
- `git diff --check` - passed on 2026-05-15.
- Targeted Android JVM tests passed on 2026-05-15:
  - `PremiumMerchantRuntimeContractTest`
  - `AndroidMerchantVisualArchitectureTest`
  - `PremiumNavigationStateTest`

APK output:

- `apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk`
