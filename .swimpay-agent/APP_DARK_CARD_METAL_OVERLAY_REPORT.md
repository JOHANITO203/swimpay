# App Dark Card Metal Overlay Report

## Scope

Design-only polish for the Home Dashboard dark card material layer.

No backend, payment runtime, navigation, dashboard data, review logic, or text copy was changed.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualDefaults.kt`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_overlay_dark_black_metal.png`

## Layer Placement

The dark card still uses the existing `CardVisual` order:

1. `CardSurfaceLayer`
2. `SurfaceTextureLayer`
3. `ArtworkSkinLayer`
4. `SurfaceEffectsLayer`
5. `CardDetailsLayer`

The new metal material is rendered by `SurfaceTextureLayer`, so it sits above the dark gradient and below the Oni/Yatagarasu artwork.

## Material Change

Previous dark texture:

- `card_texture_brushed_black_metal.webp`
- `surfaceTextureAlpha = 0.24f`
- visually too neutral under the dark artwork

New dark texture:

- `card_overlay_dark_black_metal.png`
- transparent PNG, 1586x1000
- black-metal fibers, cold brushed streaks, subtle forged veins and scratches
- no opaque background baked into the asset
- `surfaceTextureAlpha = 0.74f`
- `surfaceTextureScale = 1.02f`

Artwork adjustment:

- `artworkAlpha` moved from `0.80f` to `0.78f`
- this keeps the artwork dominant while allowing the metal layer to be visible underneath

## Visual Intent

The dark card now has a stronger material identity:

- more visible black-metal texture
- colder premium shine
- clearer distinction from the flat dark gradient
- same visual family as the light card layer system

## Guardrails

- No network payment logos were added.
- No real card number or sensitive data was added.
- Default layer contract remains unchanged.
- The light fallback and DragonGold material card were not modified.

## Recommendation

Ready for device review as the next visual iteration. If the metal layer feels too active on the physical phone, reduce only `surfaceTextureAlpha` before changing the asset or component contract.
