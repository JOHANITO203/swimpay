# App Dark Card Oni Mask Texture Report

## Scope

Design-only material pass for the Home Dashboard dark card.

No payment logic, backend flow, navigation, dashboard data, or UI copy was changed.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualDefaults.kt`
- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_overlay_dark_oni_mask_metal.png`

## Texture Direction

The previous dark card material was generic black metal. It added surface grain, but it did not feel connected to the Oni/Yatagarasu artwork.

The new accent texture is a transparent PNG in the same visual family as the Oni mask:

- graphite / gunmetal grain
- engraved ornamental curves inspired by the mask surface
- horn-like and feather-like sharp ribbing
- restrained red lacquer cracks
- asymmetric carved-metal shadows

The asset has no opaque background and is rendered only as an overlay.

## Layer Position

The existing `CardVisual` order is preserved:

1. base gradient
2. `SurfaceTextureLayer`
3. Oni/Yatagarasu artwork
4. surface reflection
5. card details and text

The material is additive inside `SurfaceTextureLayer`:

1. black-metal base texture
2. Oni-mask accent texture
3. Oni/Yatagarasu artwork

Both textures sit under the artwork and behind all text/details.

## Active Settings

- `surfaceTextureRes = R.drawable.card_overlay_dark_black_metal`
- `surfaceTextureAlpha = 0.46f`
- `surfaceTextureScale = 1.02f`
- `surfaceAccentTextureRes = R.drawable.card_overlay_dark_oni_mask_metal`
- `surfaceAccentTextureAlpha = 0.42f`
- `surfaceAccentTextureScale = 1.02f`
- `artworkAlpha = 0.78f`

## Expected Result

The dark card should now read as a deliberate Oni-themed material instead of a neutral dark plate:

- more visible personality under the artwork
- clearer texture distinction from the light DragonGold card
- still clipped inside the card shape
- still behind text, status chip, amount, and icon

## Recommendation

Validate on phone. If the surface feels too busy, reduce `surfaceAccentTextureAlpha` first. If it feels too flat, raise `surfaceTextureAlpha` before changing the component.
