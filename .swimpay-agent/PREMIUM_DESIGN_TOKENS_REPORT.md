# Premium Design Tokens Report

generated_at: 2026-05-12T20:05:00+03:00

## Existing System

Android already had `PremiumDesignTokens.kt` with:

- `PremiumColors`
- `PremiumRadius`
- `PremiumSpacing`
- `PremiumType`

## Added Token Primitives

Added:

- `PremiumElevation`
- `PremiumIconSize`
- `PremiumComponentSize`
- `PremiumTone`
- `PremiumToneColors`
- `PremiumBrandGradient`
- `ExternalBrandTokens.Google`

These provide a stricter vocabulary for shadows/elevation, touch targets, icon size, status tones, gradients and external brand colors.

## Follow-up Token Wiring

After the initial gate, a targeted second pass wired safe high-signal hardcodes to the new tokens:

- Premium buttons now use `PremiumComponentSize.ButtonHeight`, `PremiumRadius.Button` and `PremiumBrandGradient`.
- Google mark drawing now uses `ExternalBrandTokens.Google`.
- Onboarding selected surfaces now use `PremiumToneColors.Selected.background`.
- Known `3.dp` card elevations now use `PremiumElevation.Card`.

Added static JVM assertions to prevent those regressions from returning.

## Remaining Gaps

Several screens still contain hardcoded dp/sp/radius/color values. This sprint created the vocabulary and tests to prevent further drift, but did not refactor every existing screen value. The next polish sprint should migrate screen-by-screen.
