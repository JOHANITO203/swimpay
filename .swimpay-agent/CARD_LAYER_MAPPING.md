# CARD_LAYER_MAPPING

generated_at: 2026-05-17
scope: current card visual to target layer mapping
mode: analysis only, no implementation

## Target model

Desired future structure:

```text
CardVisual
  CardSurfaceLayer
  ArtworkSkinLayer
  SurfaceEffectsLayer
  CardDetailsLayer
  InteractionLayer
```

The target model should let the card skin behave like an independent visual layer placed on a surface. The card data should remain safe, masked, and separate from decorative assets.

## Current elements and target layers

| Current element | Current location | Target layer | Keep / change |
| --- | --- | --- | --- |
| `Box(fillMaxWidth().height(190.dp))` | `MerchantReceivingVerificationCard` | `CardVisual` root | Keep default behavior initially, then replace fixed height with aspect-ratio driven sizing. |
| `clip(RoundedCornerShape(34.dp))` | `MerchantReceivingVerificationCard` | `CardSurfaceLayer` | Keep as default theme radius; move into theme surface contract. |
| `Brush.linearGradient(PremiumBrandGradient.PaymentCard)` | `MerchantReceivingVerificationCard` / `PremiumDesignTokens` | `CardSurfaceLayer` | Keep default gradient as `defaultTheme.surface.background`; allow theme override later. |
| White alpha border | `MerchantReceivingVerificationCard` | `CardSurfaceLayer` or `SurfaceEffectsLayer` | Keep as default edge; expose as `surface.edgeColor`/border style. |
| `SwimPay` brand text | `MerchantReceivingVerificationCard` | `CardDetailsLayer` | Keep default detail; should be optional/positioned by detail layout, not surface. |
| "Carte marchand" / "Carte a ajouter" | `MerchantReceivingVerificationCard` | `CardDetailsLayer` | Keep text behavior; decouple from decorative layers. |
| Bank logo | `PremiumBankLogo` | `CardDetailsLayer` | Keep current logo renderer; pass resolved logo explicitly instead of deriving from subtitle. |
| Credit-card fallback icon | `MerchantReceivingVerificationCard` | `CardDetailsLayer` | Keep fallback for default theme only; do not treat as artwork. |
| Destination/masked card text | `MerchantReceivingVerificationCard` | `CardDetailsLayer` | Keep masked-only display. Add safe text bounds before artwork is introduced. |
| Status/action text row | `MerchantReceivingVerificationCard` | `CardDetailsLayer` and maybe `InteractionLayer` | Keep visual output; later interaction layer can own press/focus states if card becomes clickable. |
| `method` prop | `MerchantReceivingVerificationCard` | Data adapter outside `CardVisual` | Keep at screen level; map to a smaller `CardDetails` model. |
| `language` prop | `MerchantReceivingVerificationCard` | Data/copy adapter outside visual layers | Keep outside pure visual theme to avoid mixing localization with skin rendering. |
| Bank lookup from subtitle | `bankProfileIdFromDisplay` | Data adapter | Replace later with explicit bank id from data model. |
| Hardcoded dimensions | `MerchantReceivingVerificationCard` | Theme/layout contract | Preserve defaults during migration; expose as defaults later. |

## Missing target pieces

### Missing `CardVisual`

There is no root visual primitive that owns:

- aspect ratio;
- clipping;
- layer order;
- asset bounds;
- safe zones;
- accessibility semantics;
- optional interaction state.

### Missing `CardSurfaceLayer`

Needed responsibilities:

- background color/gradient;
- radius;
- edge/border;
- optional surface texture;
- surface mask clipping.

Current equivalent:

- main Box background and border.

### Missing `ArtworkSkinLayer`

Needed responsibilities:

- decorative artwork image;
- opacity;
- blend mode;
- scale;
- x/y offsets;
- rotation;
- clipping to card mask.

Current equivalent:

- none.

### Missing `SurfaceEffectsLayer`

Needed responsibilities:

- reflection overlay;
- noise;
- metal sheen;
- subtle vignette;
- optional highlight pass.

Current equivalent:

- only the static gradient and border.

### Missing `CardDetailsLayer`

Needed responsibilities:

- brand text;
- bank logo or merchant mark;
- chip;
- masked identifier;
- status/action text;
- typography color;
- optional emboss treatment.

Current equivalent:

- all Text, `PremiumBankLogo`, and fallback icon inside the main function.

### Missing `InteractionLayer`

Needed responsibilities:

- click/tap target if card becomes interactive;
- pressed/focused/disabled states;
- accessibility label;
- shimmer/loading if needed.

Current equivalent:

- none for the card itself. Buttons below the card handle actions.

## What can be conserved

- The current dark-blue SwimPay gradient can become the default theme.
- The current `SwimPay` text can remain the default brand detail.
- `PremiumBankLogo` can be reused as the first logo renderer.
- Masked card values must remain masked-only.
- The current receiving-method screen call site can keep passing `method` during the first migration.
- Existing golden screenshots should remain the visual safety net.

## What should not be conserved as-is

- Subtitle string parsing for bank identity.
- Fixed `190.dp` height as the only sizing model.
- All card visual logic in `PremiumDashboardScreens.kt`.
- Hardcoded text positions and alpha values inside the data component.
- Bank-card surface and content details in the same composable.
- Any future use of real scheme logos or real card numbers.

## Recommended default layer order

1. `CardSurfaceLayer`
2. `ArtworkSkinLayer`
3. `SurfaceEffectsLayer`
4. `CardDetailsLayer`
5. `InteractionLayer`

Important: details must remain above artwork/effects unless a theme explicitly reserves safe zones and passes visual QA.
