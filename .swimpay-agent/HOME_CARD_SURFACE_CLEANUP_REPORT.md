# Home Card Surface Cleanup Report

## Scope

Visual-only cleanup for the Android Compose Home Dashboard card surface.

No business logic, navigation, displayed data, backend model, payment logic, or production default activation was changed.

## Files touched

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualDefaults.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/HomeCardDragonQaScreenshotTest.kt`

## Previous gradient

The production Home Dashboard card remains unchanged:

```kotlin
listOf(PremiumColors.Teal, PremiumColors.Blue, PremiumColors.ElectricBlue)
```

This is visually strong and blue-forward. With the dragon-gold artwork enabled, it tints the illustration heavily and pushes the result toward electric blue instead of black/gold premium.

## New trial gradient

Added only for `CardVisualDefaults.HomeDashboardDragonGoldTrial`:

```kotlin
listOf(
    Color(0xFF02040A),
    Color(0xFF090D16),
    Color(0xFF15110A)
)
```

The surface direction is deep black, very dark night graphite, and a subtle warm black. The goal is to absorb the artwork instead of recoloring it.

## Artwork parameters

The dragon artwork parameters were intentionally kept unchanged:

```kotlin
artworkRes = R.drawable.card_artwork_dragon_gold
artworkAlpha = 0.36f
artworkScale = 1.08f
artworkOffsetX = 0.dp
artworkOffsetY = 0.dp
artworkRotation = 0f
```

This isolates the test to surface cleanup only.

## Preview comparison

Available comparative previews:

- `CardVisualHomeDefaultPreview`
- `CardVisualDragonGoldPreview`
- `CardVisualDragonGoldTrialPreview`

Captured screenshots:

- `.swimpay-agent/screenshots/home_card_default_390.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_390.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_320.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_trial_390.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_trial_320.png`

## Visual result

The cleaned surface removes the electric-blue color cast from the artwork. The dragon-gold illustration reads as black/gold instead of blue/gold, and the card feels more premium and less saturated.

The artwork remains behind the card details and clipped inside the rounded card shape.

## Readability

Observed on generated 390 dp and 320 dp captures:

- Main amount remains highly readable.
- `Paiements recus` label remains readable.
- `Aujourd'hui` label remains readable.
- Wallet icon remains visible.
- Status chip remains visible.
- No visible overflow from the artwork.
- No real card-network logo was added.
- No real payment-card number or sensitive card data was added.

## Verification

Commands run:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard --no-daemon --max-workers=1 --no-watch-fs
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest --no-daemon --max-workers=1 --no-watch-fs
.\gradlew.bat :app:recordRoborazziDebug --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest --no-daemon --max-workers=1 --no-watch-fs
```

All passed after rerunning Gradle sequentially. Parallel Gradle runs caused native-memory daemon crashes on this Windows machine, so screenshot validation was rerun with one worker and file watching disabled.

## Recommendation

Keep `CardVisualDefaults.HomeDashboard` as the production default for now.

Use `CardVisualDefaults.HomeDashboardDragonGoldTrial` as the preferred visual QA candidate for the dragon-gold skin. It is visually stronger than `DragonGoldPreview` on the old blue surface, but should still remain inactive in production until final device review approves the dashboard card in real app context.
