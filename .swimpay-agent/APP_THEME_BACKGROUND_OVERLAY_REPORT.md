# App Theme Background Overlay Report

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/app_bg_ryujin_tsukuyomi_overlay.png`

## Overlay Placement

- Global background entry point: `PremiumPaperBackground`.
- The existing Compose background remains the base layer.
- The myth overlay is rendered after the current canvas background and before all screen content.
- Existing callers remain unchanged, so the overlay is applied wherever `PremiumPaperBackground` is used:
  - main premium shell
  - onboarding background screens

## Asset Handling

- Expected asset name: `app_bg_ryujin_tsukuyomi_overlay.png`.
- Expected path: `apps/android-receiver/android/app/src/main/res/drawable-nodpi/app_bg_ryujin_tsukuyomi_overlay.png`.
- The asset is now present at the expected path.
- The code still uses a dynamic resource lookup by name, so the build also remains safe if the asset is removed during visual iteration.

## Runtime Settings

- `useNaturalLightLayer = true`
- `useMythBackgroundOverlay = true`
- `mythBackgroundOverlayAlpha = 1f`
- `mythBackgroundOverlayScale = 1f`
- `mythBackgroundOverlayOffsetX = 0.dp`
- `mythBackgroundOverlayOffsetY = 0.dp`
- `contentScale = ContentScale.Crop`
- `Modifier.matchParentSize()`
- Natural light layer:
  - moon halo center: `x = 0.31`, `y = 0.66`, radius `0.54 * minDimension`
  - cloud halo center: `x = 0.88`, `y = 0.40`, radius `0.46 * minDimension`

## Visual Impact

- The current calibration pass intentionally shows only the base dark background plus the myth overlay in the light/blue theme.
- Previous disabled light paper glow layers have been removed after visual validation.
- The replacement asset `ryujin_tsukuyomi_polish_overlay_transparent.png` is now used under the runtime resource name `app_bg_ryujin_tsukuyomi_overlay.png`.
- The overlay alpha is `1f` because the PNG already carries its own transparency and should act as the base visual layer.
- A natural light layer is added above the PNG, aimed at the moon and cloud areas, to make the screen read as light/blue without returning to the old electric glow stack.
- It is only rendered in the light/blue premium palette branch.
- It stays behind cards, text, quick actions, bottom navigation, and all interactive components.
- The base solid background is preserved.
- Payment review detail screens now use the shared `PremiumPaperBackground` instead of placing a full-screen `PremiumColors.Background` layer over it.

## Debug Finding

- The first pass made the overlay too hard to read because the provided PNG has a mostly opaque center and the previous `0.08f` alpha darkened the visual field.
- Payment detail review screens also had their own full-screen background layer, which hid the shared background system and made the layer model inconsistent.
- The current strategy is layer isolation: keep only the validated myth base plus natural light halos, then recolor components against this stable background.

## Screens To Recheck With Asset Present

- Home dashboard
- Monthly activity card
- quick actions
- review list/detail surfaces
- bottom navigation
- onboarding screens that use `PremiumPaperBackground`

## Remaining Risks

- Final readability should be checked on device because the overlay is a tall image and may crop differently across screen ratios.
- If the image still competes with text on compact screens, lower alpha toward `0.12f`.
- If the background feels too empty later, add one new named layer instead of restoring the removed electric glow stack.
- If the image has important subject matter near the bottom, it may compete with the bottom navigation and should be repositioned in the asset itself.

## Verification

- `.\gradlew.bat :app:compileStagingKotlin --no-daemon --max-workers=1 --no-watch-fs` passed after adding the asset.
