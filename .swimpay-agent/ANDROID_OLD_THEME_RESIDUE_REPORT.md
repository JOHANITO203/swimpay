# Android Old Theme Residue Report

Date: 2026-05-14

## Removed or neutralized

- Old light palette neutralized by remapping `PremiumColors` to mockup dark values.
- Old bottom navigation structure replaced with 5 mockup tabs.
- Old shared card/button state surfaces replaced or neutralized by mockup glass/gradient implementations.
- Receiving setup bank selection old card structure replaced.

## Still visible or structurally partial

- Dashboard content is now dark/glass, but the live home layout still differs from mockup 07 in metric composition and chart positioning.
- Some secondary settings/help/language/support screens still call old component names, but those components now render dark mockup-styled surfaces.
- `PremiumColors.*` references remain in code for compatibility; visually they now map to the mockup palette.
- Screen 11 now has a dedicated visual list surface, but it still reuses `PremiumConnectedSiteUiState` rather than a richer integrations-list UI model.

## Blocking note

No screen is claimed pixel-perfect. This pass removes the most visible mixed-theme layer and prepares focused screen-by-screen layout matching.
