# HOME_CARD_PREP_REPORT

generated_at: 2026-05-17
scope: Android Compose home/dashboard card visual preparation

## Home card found

File:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`

Composable concerned:

- `PremiumDashboardScreen`
- `PremiumDashboardContent`
- `MonthlyActivityCard`

The visible home/dashboard card prepared in this task is `MonthlyActivityCard`, the main gradient panel showing:

- wallet icon;
- `Aujourd'hui`;
- `Paiements recus`;
- monthly amount;
- live/pending status chip.

## What was prepared

Added a small layered card visual foundation:

- `CardVisual.kt`
- `CardVisualTheme.kt`
- `CardVisualLayers.kt`
- `CardVisualDefaults.kt`

Layer order:

1. `CardSurfaceLayer`
2. `ArtworkSkinLayer`
3. `SurfaceEffectsLayer`
4. `CardDetailsLayer`

`ArtworkSkinLayer` supports:

- `artworkRes: Int?`
- `artworkAlpha: Float`
- `artworkScale: Float`
- `artworkOffsetX: Dp`
- `artworkOffsetY: Dp`
- `artworkRotation: Float`

The artwork is clipped to the card shape, rendered above the surface, and remains behind card details.

## What changed in the dashboard

`MonthlyActivityCard` now uses:

- `CardVisual(...)`
- `CardVisualDefaults.HomeDashboard`

The existing dimensions and content were preserved:

- width: `fillMaxWidth()`
- height: `214.dp`
- text/content unchanged
- icon unchanged
- status chip unchanged
- business logic unchanged

A TODO was left for the later ratio migration:

```text
TODO: migrate card container from fixed height to bank-card aspectRatio(1.586f) after visual parity validation.
```

## What was not modified

- No payment logic.
- No backend models.
- No navigation.
- No state machine.
- No receiving-method mutation logic.
- No public webhook logic.
- No text copy changes.
- No real card numbers.
- No Visa/Mastercard/Mir logos.
- No dragon artwork activation in production runtime.

## Dragon artwork readiness

Expected future asset path:

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_artwork_dragon_gold.png`

Current status:

- asset is present in the repo at `drawable-nodpi/card_artwork_dragon_gold.png`;
- runtime default keeps `HomeDashboard` without artwork;
- `R.drawable.card_artwork_dragon_gold` is referenced only by `CardVisualDefaults.DragonGoldPreview`.

Preview hook:

- `CardVisualDefaults.DragonGoldPreview`
- `CardVisualDragonGoldPreview`

How to preview:

1. Open `CardVisualDragonGoldPreview` in Android Studio preview.
2. It uses `CardVisualDefaults.DragonGoldPreview`.
3. Keep production/default `HomeDashboard` unchanged until visual QA approves the new skin.

## Tests and verification

Added static architecture test:

- `AndroidMerchantVisualArchitectureTest.homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard`

Verified red first:

- failed while `CardVisual*` files were absent.

Verified green:

- targeted test passed after implementation.

Build verification:

- `./gradlew :app:assembleDebug` passed.

Golden screenshot note:

- Direct filtered run for `PremiumGoldenScreenshotTest.dashboardGolden` was attempted.
- Gradle returned `No tests found` because the project test task applies Roborazzi/golden exclusion rules for that include pattern.
- No dashboard golden baseline was updated.

## Remaining risks

- The home card still uses fixed height `214.dp`; aspect-ratio migration is intentionally deferred.
- Dragon visual QA still needs a visual screenshot/device pass before production activation.
- If future artwork is visually dense, text safe zones must be checked on small devices.
- If the artwork is large, memory and GPU overdraw should be reviewed before enabling it in production.
