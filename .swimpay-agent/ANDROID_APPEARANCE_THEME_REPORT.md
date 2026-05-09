# Android appearance theme report

generated_at: 2026-05-09T00:08:00+03:00

Implemented appearance settings.

## Result

- Added `PremiumThemeMode`: system, light and dark.
- Persisted theme preference locally.
- `MainActivity` resolves theme mode centrally and passes it into `SwimPayMerchantTheme`.
- Added Appearance screen with selected-state rows.
- Fix follow-up: `PremiumColors` now switches between light and dark token palettes, so existing premium Compose surfaces/text actually repaint when dark mode is selected.

## Boundary

- The app now has a central theme-mode switch and token-driven premium colors.
- No per-screen dark-mode hacks were introduced.

## Tests

- Added tests for theme mode persistence, central selection state and token palette switching.
