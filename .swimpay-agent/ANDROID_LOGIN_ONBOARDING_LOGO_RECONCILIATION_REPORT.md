# Android Login / Onboarding Logo Reconciliation Report

## Scope

Reconciled the Android merchant login and onboarding brand mark with the current monochrome launcher identity.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumAccountEntryStaticTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`

## What Changed

- Added a shared `SwimPayLauncherBadge` composable in `PremiumComponents.kt`.
- Updated `SwimPayLogo` to delegate to the shared launcher badge.
- Updated login/account-entry surfaces to use the shared launcher badge instead of a local duplicate.
- Updated onboarding surfaces to use the shared launcher badge.
- Removed the old onboarding landing waves mark from the initial onboarding card.
- Switched logo rendering from `R.drawable.ic_launcher_foreground` to `R.mipmap.ic_launcher_foreground` for the reconciled launcher identity.

## What Was Not Changed

- No backend logic.
- No payment logic.
- No receiver runtime behavior.
- No navigation flow.
- No onboarding copy.
- No checkout SDK button behavior.

## Verification

Passed:

```powershell
.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.PremiumAccountEntryStaticTest.accountEntryScreensExposeCreateAndLoginBeforeOnboarding --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.premiumRuntimeBrandUsesOfficialLauncherAssetInsteadOfGeneratedWaterMark --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Result: `BUILD SUCCESSFUL`.

## Remaining Risk

This was verified with static/unit contracts and Kotlin compilation through the staging unit test task. A device visual check can still be useful before freezing the launcher/login/onboarding identity, but no APK was generated in this pass.
