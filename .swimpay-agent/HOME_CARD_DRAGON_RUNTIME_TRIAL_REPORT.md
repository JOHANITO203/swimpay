# Home Card Dragon Runtime Trial Report

## Scope

Prepared a controlled local activation path for the Android Compose Home Dashboard card dragon-gold trial theme.

Update: the dashboard default has since been promoted locally to the dragon-gold trial theme by changing `useDragonGoldHomeCard` to `true`.

No backend, navigation, user setting, merchant data, payment logic, or production default was changed.

## Flag location

The local flag was added to `MonthlyActivityCard` in:

`apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`

```kotlin
useDragonGoldHomeCard: Boolean = true
```

The production dashboard call still omits this argument, so it now receives the dragon-gold trial theme by default.

## Theme selection

`MonthlyActivityCard` now selects the visual theme locally:

```kotlin
val cardTheme = if (useDragonGoldHomeCard) {
    CardVisualDefaults.HomeDashboardDragonGoldTrial
} else {
    CardVisualDefaults.HomeDashboard
}
```

Legacy fallback when explicitly disabled:

```kotlin
CardVisualDefaults.HomeDashboard
```

Trial theme:

```kotlin
CardVisualDefaults.HomeDashboardDragonGoldTrial
```

## How to activate locally

For local dashboard testing only, call:

```kotlin
MonthlyActivityCard(
    label = ...,
    amount = ...,
    usesLiveApi = ...,
    language = ...,
    useDragonGoldHomeCard = true
)
```

This is currently demonstrated in the Compose preview:

```kotlin
MonthlyActivityCardDragonGoldRuntimeTrialPreview
```

No app setting, backend flag, remote config, or runtime product feature was added.

## What was not modified

- `CardVisualDefaults.HomeDashboard` was not modified.
- Production dashboard behavior now uses `HomeDashboardDragonGoldTrial` through the local default flag.
- Navigation was not modified.
- Texts were not modified.
- Displayed dashboard data was not modified.
- No card-network logo was added.
- No real payment-card number was added.
- Backend and payment runtime were not touched.

## Verification

Commands run:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.dashboardMetricsAreBackendWiredAndKeepShortLabels --no-daemon --max-workers=1 --no-watch-fs
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest --no-daemon --max-workers=1 --no-watch-fs
.\gradlew.bat :app:assembleDebug --no-daemon --max-workers=1 --no-watch-fs
```

Result: all passed.

## Risks before production default

- The trial theme still needs final review inside the real app dashboard on physical devices.
- Small-width screenshots passed, but real device font scaling should still be checked before default activation.
- The current switch is intentionally local code only; a production rollout would need an explicit product decision and controlled runtime mechanism.

## Recommendation

Keep `CardVisualDefaults.HomeDashboard` intact as the explicit fallback.

Use `useDragonGoldHomeCard = false` only for local comparison against the old blue card. Continue validating the dragon-gold default on physical devices before release.
