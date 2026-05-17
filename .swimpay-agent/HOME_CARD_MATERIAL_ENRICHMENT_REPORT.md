# Home Card Material Enrichment Report

## Scope

Added optional surface material texture support to the Android Compose `CardVisual` layer system and enabled it for the Home Dashboard DragonGold material theme.

No backend, navigation, payment logic, dashboard data, or business text was changed.

## Files modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualTheme.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualLayers.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisual.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualDefaults.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/HomeCardDragonQaScreenshotTest.kt`

## Asset

Added:

`apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_texture_brushed_black_metal.webp`

## Texture support

Added optional surface texture fields to `CardSurfaceTheme`:

```kotlin
surfaceTextureRes: Int?
surfaceTextureAlpha: Float
surfaceTextureScale: Float
surfaceTextureContentScale: ContentScale
```

If `surfaceTextureRes` is `null`, the texture layer returns early and the build/runtime continue normally.

## Layer order

The card now renders in this order:

1. `CardSurfaceLayer` - base gradient / surface
2. `SurfaceTextureLayer` - brushed black metal texture
3. `ArtworkSkinLayer` - dragon artwork
4. `SurfaceEffectsLayer` - optional effects
5. `CardDetailsLayer` - text, icon, chip and details

The texture is clipped to the same rounded card shape as the surface and artwork.

## Theme integration

The blue fallback remains unchanged:

```kotlin
CardVisualDefaults.HomeDashboard
```

The DragonGold material theme now uses:

```kotlin
surfaceTextureRes = R.drawable.card_texture_brushed_black_metal
surfaceTextureAlpha = 0.16f
surfaceTextureScale = 1f
```

Runtime Home Dashboard uses:

```kotlin
CardVisualDefaults.HomeDashboardDragonGoldMaterial
```

## Previews

Updated comparative previews:

- `MonthlyActivityCardLegacyBluePreview`
- `MonthlyActivityCardDragonGoldPreview`
- `MonthlyActivityCardDragonGoldMaterialPreview`

## Visual impact

The material layer reads as a subtle brushed black-metal surface. It enriches the dark graphite base without changing dashboard text, data, or layout. The alpha is intentionally low so the dragon remains dominant and the texture does not create a dirty/noisy surface.

Generated comparison captures:

- `.swimpay-agent/screenshots/home_card_legacy_blue_fallback_390.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_default_candidate_390.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_default_candidate_320.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_material_390.png`

## Readability checks

Required checks:

- `Aujourd'hui` remains above all visual layers.
- `Paiements reçus` remains above all visual layers.
- Main amount remains above all visual layers.
- Wallet icon and status chip remain in `CardDetailsLayer`.
- Texture is below artwork and details.
- Texture is clipped inside the rounded card.
- Blue fallback is still available.

## Risks remaining

- Final perceived texture strength should be checked on the physical device after reinstalling a staging APK that includes the new `.webp`.
- If the texture reads too visible on OLED/high-brightness screens, reduce `surfaceTextureAlpha` from `0.16f` toward `0.12f`.
- If the texture is too invisible, increase carefully toward `0.18f` or `0.20f`; avoid exceeding `0.22f`.

## Recommendation

Keep `0.16f` as the first material candidate. It is inside the requested subtle premium range and keeps the texture subordinate to the dragon artwork and dashboard details.

## Verification

Passed:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest --no-daemon --max-workers=1 --no-watch-fs
.\gradlew.bat :app:assembleDebug --no-daemon --max-workers=1 --no-watch-fs
.\gradlew.bat :app:recordRoborazziDebug --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest --no-daemon --max-workers=1 --no-watch-fs
.\gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard --no-daemon --max-workers=1 --no-watch-fs
```
