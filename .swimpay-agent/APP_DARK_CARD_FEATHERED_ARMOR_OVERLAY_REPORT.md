# App Dark Card Feathered Armor Overlay Report

## Scope

Design-only update for the Home Dashboard dark card surface.

No backend, payment runtime, navigation, dashboard data, or UI copy was changed.

## New Asset

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_overlay_dark_feathered_armor.png`
- Source: `dark_feathered_armor_overlay_transparent.png`
- Size: 1579x996
- Rendered with `ContentScale.Crop` and clipped inside the card shape

## Layer Stack

The dark card now uses two surface textures before artwork, then one finish texture after artwork:

1. brushed anodized metal base
2. Oni mask accent texture
3. Oni/Yatagarasu artwork
4. feathered armor finish overlay
5. reflection/details/text

## Blend Settings

The finish overlay uses a dedicated blend mode:

- `surfaceFinishTextureRes = R.drawable.card_overlay_dark_feathered_armor`
- `surfaceFinishTextureAlpha = 0.42f`
- `surfaceFinishTextureScale = 1f`
- `surfaceFinishTextureBlendMode = BlendMode.Overlay`

This keeps the feather/armor details fused into the metal surface instead of appearing as a flat image pasted over the card.

After ADB screenshot review, the finish layer was moved above the artwork and below details because the first placement under the artwork made the subtle armor details nearly invisible.

## Expected Result

- More detailed black armor material.
- Better relationship with the Yatagarasu/Oni artwork.
- Details remain below the artwork and below all card text.
- The base anodized texture remains the primary material.

## Recommendation

Validate on phone. If the finish layer is too busy, reduce `surfaceFinishTextureAlpha` first. If it is too subtle, raise it gradually before changing scale.
