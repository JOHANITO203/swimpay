# App Dark Theme Background Replacement Report

## Scope

Design-only replacement of the global dark theme background.

No backend, payment runtime, navigation, dashboard data, card data, or UI copy was changed.

## Asset Added

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/app_bg_dark_demonic_samurai.png`
- Source: `C:\Users\Lenovo\Downloads\demonic_samurai_overlay_transparent.png`
- Size: 841x1870
- Rendered with `ContentScale.Crop`

## Background Family Removed From Dark Theme

The previous dark background family in `PremiumPaperBackground` used procedural radial glow layers:

- cyan glow at top-right
- green/teal glow at lower-left
- base canvas glow composition

Those dark-only procedural glow layers were removed from the active dark background path.

## New Dark Background Path

`PremiumPaperBackground` now does:

1. draw `PremiumColors.Background` as fallback base;
2. if dark theme is active, render `app_bg_dark_demonic_samurai`;
3. keep the existing light theme Ryujin/Tsukuyomi background path unchanged.

## Visual Intent

The dark theme now has a single expressive visual base instead of mixed blue/green glow residue. This should make the dark card and overall dark dashboard feel more coherent with the Oni/Yatagarasu direction.

## Guardrails

- No payment claims were added.
- No text was changed.
- No runtime logic was changed.
- Light theme background layers were not changed.
