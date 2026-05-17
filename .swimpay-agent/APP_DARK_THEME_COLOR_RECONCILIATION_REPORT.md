# App Dark Theme Color Reconciliation Report

## Scope

Design-only color reconciliation for the Android Compose dark theme after the Oni/Samurai background replacement.

No backend, payment runtime, navigation, dashboard data, card data, or UI copy was changed.

## Files Modified

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDesignTokens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualDefaults.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualLayers.kt`

## Reconciliation Direction

The previous dark theme still used electric blue/cyan as the main component language. That conflicted with the new black/red Samurai background and Oni card.

The dark palette now uses:

- warm graphite surfaces;
- ember red primary actions;
- soft ivory-red highlights;
- muted rose/ash secondary text;
- warm red-brown borders;
- dark oxblood icon tiles and chips.

## Key Token Changes

- `PremiumColors.Blue`: blue accent replaced with ember red.
- `PremiumColors.ElectricBlue`: replaced with brighter ember highlight.
- `PremiumColors.Cyan`: replaced with warm ivory-red highlight.
- `PremiumColors.Teal`: replaced with crimson action accent.
- `PremiumColors.Surface`, `SurfaceAlt`, `PanelTint`, `IconTile`, `NeutralChip`: shifted from navy-blue to graphite/oxblood.
- `PremiumColors.Line`: shifted from blue border to warm red-brown border.

## Gradients

Dark `PremiumBrandGradient` values were adjusted:

- `Primary`: ember red gradient.
- `PrimaryDeep`: dark oxblood to black gradient.
- `PaymentCard`, `SbpCard`, `ReceivingSurface`: now have dark warm alternatives in dark mode.
- `ChartArea`: uses the reconciled ember/ivory accent tokens.

## Card Visual Cleanup

The Home Dashboard dark card no longer uses:

- cyan card edge;
- cold blue reflection.

It now uses:

- warm ivory-red edge;
- warm red/ivory reflection;
- graphite/oxblood surface gradient.

## Guardrails

- Semantic colors still preserve intent: success remains green, warning remains amber, danger remains red.
- No official payment confirmation language or payment behavior was touched.
- Light theme tokens were not changed.

## Recommendation

Validate on device. If the UI feels too red-heavy, reduce `PremiumColors.Teal`/`Blue` saturation before changing the background or card artwork.
