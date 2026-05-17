# App Dark Card Workbench Surface Report

## Scope

Design-only update for the Home Dashboard dark card surface.

No backend, payment runtime, navigation, dashboard data, or UI copy was changed.

## Asset Added

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_surface_dark_black_brushed_workbench.png`
- Source: `C:\Users\Lenovo\Downloads\ChatGPT Image 17 mai 2026, 17_14_58 (1).png`
- Size: 1579x996
- Rendered with crop and clipped inside the card shape

## New Card Layer Intent

The new black brushed surface is now the first material layer of the dark Home Dashboard card. It acts as the main workbench surface on which the current card layers are printed.

Active dark card material stack:

1. dark gradient fallback
2. black brushed workbench surface
3. feathered armor texture
4. Oni/Yatagarasu artwork
5. reflection and card details

## Active Settings

- `surfaceTextureRes = R.drawable.card_surface_dark_black_brushed_workbench`
- `surfaceTextureAlpha = 0.86f`
- `surfaceTextureScale = 1f`
- `surfaceAccentTextureRes = R.drawable.card_overlay_dark_feathered_armor`
- `surfaceAccentTextureAlpha = 0.44f`
- `surfaceAccentTextureScale = 1f`

## Notes

The previous generated anodized gray-metal surface is no longer active for the dark Home Dashboard card, but the asset remains in the project for comparison or rollback.
