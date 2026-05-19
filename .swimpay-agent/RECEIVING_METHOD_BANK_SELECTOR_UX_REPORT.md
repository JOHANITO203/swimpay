# Receiving Method Bank Selector UX Report

## Scope

Improved the Android Compose UX for choosing a receiving bank while adding or editing a merchant receiving destination.

## Problem

The previous vertical bank list consumed too much screen height. On smaller screens, the user could select a bank but had to scroll further to find the actual card or phone input field.

## Design Decision

Replaced the vertical bank rows with a compact horizontal chip selector:

- bank logo remains visible;
- selected state remains explicit;
- the list can grow horizontally without pushing the input field down;
- visual grammar follows the current premium surfaces, borders and selected cyan token.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`

## Surfaces Updated

- Onboarding step: `ReceivingMethodDetailsStep`
- Dashboard receiving methods: `ReceivingMethodDraftPanel`
- Receiving method edit panel in `PremiumReceivingMethodsStateScreen`

## Field Icon Behavior

The receiving destination field now displays a leading icon based on the selected method:

- card transfer: credit card icon;
- phone transfer: phone icon.

## What Was Not Changed

- No backend behavior.
- No payment state machine behavior.
- No navigation behavior.
- No receiving-method submission contract.
- No bank catalog content.

## Verification

Passed:

```powershell
.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.premiumReceivingMethodComposeExposesOperationalDraftWithoutRawSavedDisplay --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Passed:

```powershell
.\gradlew.bat :app:compileStagingKotlin --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

## Remaining Risk

The chip width is intentionally compact. Very long future bank names will ellipsize rather than expanding the layout. This is preferred for the current mobile UX because the field must stay reachable.
