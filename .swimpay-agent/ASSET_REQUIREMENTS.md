# ASSET_REQUIREMENTS

generated_at: 2026-05-17
scope: future customizable card visual assets
mode: analysis only, no implementation

## Asset principles

The card visual should be asset-ready without using real payment-network branding or real card numbers.

Rules:

- Do not use Visa, Mastercard, Mir, or other real network logos unless product/legal explicitly approves later.
- Do not use real card numbers.
- Keep card identifiers masked and data-driven.
- Keep decorative art independent from text and operational data.
- Every runtime asset should be documented in `design/ASSET_REGISTRY.md` before use.

## Recommended coordinate system

Use the bank-card physical ratio as the design basis:

- ratio: `1.586:1`
- recommended design canvas: `1016 x 640 px`
- Android display target: scalable, clipped to card bounds
- safe-zone grid: reserve top-left brand, top-right logo, lower text band

The current component does not enforce this ratio. It uses `fillMaxWidth().height(190.dp)`, so the future refactor should introduce an aspect-ratio surface before relying on layered art.

## Required asset list

| Asset | Purpose | Format | Transparency | Recommended size | Naming |
| --- | --- | --- | --- | --- | --- |
| Face illustration without card | Decorative artwork placed on top of surface | WebP or PNG | Required | `1016x640` or larger same ratio | `card_artwork_<theme_id>.webp` |
| Surface texture | Material grain, paper, plastic, metal texture | WebP | Optional alpha, usually not required | `1016x640`; tileable optional | `card_texture_<theme_id>.webp` |
| Reflection overlay | Light streak or glass reflection | PNG or WebP | Required | `1016x640` | `card_reflection_<theme_id>.png` |
| Mask | Shape mask for artwork/effects | PNG alpha or vector path | Required if non-standard shape | `1016x640` | `card_mask_<theme_id>.png` |
| Border/edge | Custom edge line or bevel | PNG/SVG | Required if decorative | `1016x640` for PNG, vector preferred for simple edge | `card_edge_<theme_id>.svg` |
| Chip | Generic non-branded chip mark | SVG preferred, PNG allowed | Required | SVG viewport or `160x120` PNG | `card_chip_generic.svg` |
| Logo/merchant mark | SwimPay/merchant/bank-compatible mark | SVG preferred, PNG/WebP for bitmap | Required for non-Compose asset | `256x256` or vector | `card_logo_<theme_id>.svg` |
| Emboss highlight | Optional text emboss light/shadow overlay | PNG | Required if bitmap emboss | `1016x640` or text-local slices | `card_emboss_<theme_id>.png` |
| Noise layer | Subtle grain layer | WebP/PNG | Optional alpha | `512x512` tile or `1016x640` | `card_noise_<theme_id>.webp` |
| Metal sheen | Optional brushed/metal effect | WebP/PNG | Optional alpha | `1016x640` | `card_metal_<theme_id>.webp` |

## Format guidance

### PNG

Use for:

- alpha masks;
- reflection overlays;
- precise edge overlays;
- assets needing lossless transparency.

Avoid large uncompressed PNGs for full-card photographic texture unless quality requires it.

### WebP

Use for:

- full-card artwork;
- surface textures;
- noise;
- metal effects.

Recommended for Android runtime memory size when the asset is photographic or gradient-rich.

### SVG / Vector Drawable

Use for:

- generic chip;
- simple logo;
- simple border/edge;
- geometric marks.

Prefer vectors for small details to avoid blurry scaling.

## Layer-specific requirements

### CardSurfaceLayer

Needs:

- background color or gradient string/token;
- radius in dp or design units;
- optional texture asset;
- optional edge color or edge asset.

Asset constraints:

- texture must not include text;
- texture must not include chip/logo/card number;
- texture should be safe under all text colors or paired with typography tokens.

### ArtworkSkinLayer

Needs:

- `src`;
- opacity;
- blend mode;
- scale;
- x;
- y;
- rotate.

Asset constraints:

- artwork must be transparent if it should behave like a sticker/tattoo;
- artwork must not include masked card number, status, logo, or bank name;
- artwork should preserve empty safe zones or be allowed to sit behind details only.

### SurfaceEffectsLayer

Needs:

- reflection overlay;
- noise toggle/asset;
- metal toggle/asset.

Asset constraints:

- reflection should be subtle and not cover text;
- noise should be low contrast;
- metal effect must be clipped to card mask.

### CardDetailsLayer

Needs:

- chip asset;
- logo asset or Compose logo renderer;
- text style;
- masked destination;
- status/action labels;
- safe-zone definitions.

Asset constraints:

- chip must be generic and non-network-branded;
- logo must be registered and allowed by asset registry;
- no real card numbers in any static bitmap.

### InteractionLayer

Needs no bitmap by default.

May later need:

- focus ring token;
- pressed overlay token;
- disabled overlay token.

## Suggested theme object extensions

The requested theme object is a good starting point. Later, it may need:

```text
layout.safeZones
details.logoPosition
details.chipPosition
details.identifierPosition
assets.densityBucket
accessibility.label
```

Do not add these yet unless implementation proves they are needed.

## Asset naming policy

Recommended root if/when runtime assets are added:

- Android runtime: `apps/android-receiver/android/app/src/main/res/drawable-nodpi/`
- Vector details: `apps/android-receiver/android/app/src/main/res/drawable/`
- Design docs/previews: `design/card-themes/<theme_id>/`

Naming:

- lowercase;
- snake_case;
- theme id included;
- no spaces;
- no real network names.

Examples:

- `card_artwork_blue_wave.webp`
- `card_texture_blue_wave.webp`
- `card_reflection_soft_diagonal.png`
- `card_mask_rounded_standard.png`
- `card_chip_generic.svg`

## Current asset gap

Current repo has bank logos and app marks, but no dedicated card-skin assets. The current card is drawn entirely by Compose shapes, text, gradient, icon, and bank logo resources.
