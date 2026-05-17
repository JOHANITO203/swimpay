# App Dark Background Polish Report

## Scope

Design-only polish for the active dark theme background.

No backend, payment runtime, navigation, dashboard data, card data, or UI copy was changed.

## Asset Polished

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/app_bg_dark_demonic_samurai.png`

Backup before polish:

- `.swimpay-agent/assets/app_bg_dark_demonic_samurai_before_polish.png`

## Changes Applied

- Increased local contrast around dark armor/artwork zones.
- Slightly deepened shadow structure without fully crushing black detail.
- Added soft red glow from existing red luminous areas.
- Added a smaller hot glow around the brightest red accents.
- Preserved the asset alpha channel and original resolution.

## Removed Unused Glow Family

- Removed unused `PremiumBrandGradient.PaperGlow`.
- Dark procedural cyan/green glow layers were already out of the active `PremiumPaperBackground` path.

## Current Dark Background Stack

1. `PremiumColors.Background` fallback.
2. `app_bg_dark_demonic_samurai.png` as the only active dark background image.

Light theme Ryujin/Tsukuyomi background layers were not changed.

## Recommendation

Validate on device. If the red competes too much with cards, reduce component opacity or add a very light dark scrim later; do not reintroduce the old cyan/green glow family.
