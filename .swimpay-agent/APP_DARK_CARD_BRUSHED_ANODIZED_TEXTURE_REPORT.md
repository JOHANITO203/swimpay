# App Dark Card Brushed Anodized Texture Report

## Scope

Design-only update for the Home Dashboard dark card surface material.

No backend, payment logic, navigation, data model, or UI text was changed.

## New Asset

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_overlay_dark_brushed_anodized_metal.png`
- Size: 1586x1000
- Transparent PNG overlay

The previous texture assets were kept:

- `card_overlay_dark_black_metal.png`
- `card_overlay_dark_oni_mask_metal.png`

## Visual Direction

The new base texture follows the provided reference:

- horizontal brushed-metal fibers
- graphite / black anodized surface
- soft satin highlight through the upper-middle area
- darker lower and edge pressure
- restrained machining irregularities
- no decorative background baked into the image

## Active Dark Card Stack

The dark Home Dashboard card now uses:

1. dark gradient surface
2. brushed anodized metal texture
3. Oni mask accent texture
4. Oni/Yatagarasu artwork
5. reflection/details/text

Active settings:

- `surfaceTextureRes = R.drawable.card_overlay_dark_brushed_anodized_metal`
- `surfaceTextureAlpha = 0.58f`
- `surfaceTextureScale = 1.02f`
- `surfaceAccentTextureRes = R.drawable.card_overlay_dark_oni_mask_metal`
- `surfaceAccentTextureAlpha = 0.32f`
- `surfaceAccentTextureScale = 1.02f`

## Intent

The card should now have a clearer material hierarchy:

- the brushed anodized metal creates the premium physical card surface;
- the Oni mask texture adds identity and relation to the artwork;
- the artwork remains dominant and readable;
- details remain above all texture layers.

## Recommendation

Validate on device. If the surface is too bright, reduce `surfaceTextureAlpha`. If the Oni identity is too quiet, raise `surfaceAccentTextureAlpha` slightly before touching the artwork.
