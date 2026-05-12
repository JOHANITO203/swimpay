# Asset Registry Report

generated_at: 2026-05-12T20:05:00+03:00

Created `design/ASSET_REGISTRY.md`.

## Official Assets Identified

- Android app icon: `res/mipmap-*/ic_launcher.webp`.
- Android adaptive icon: `res/mipmap-anydpi-v26/ic_launcher.xml`.
- Android round icon: `res/mipmap-anydpi-v26/ic_launcher_round.xml`.
- Adaptive foreground: `res/mipmap-*/ic_launcher_foreground.webp`.
- Runtime Android bank icons: `res/drawable-nodpi/ic_bank_*.png`.

## Duplicates / Generated Assets

- `PremiumComponents.kt::SwimPayLogo` is a Compose-generated runtime mark and does not exactly match launcher icon assets.
- `Components.ts::SwimPayBrand` is a CSS/HTML generated web dashboard mark.
- `CheckoutScreen.ts::swimPayWavesSvg` is an inline generated checkout mark.
- `drawable/ic_launcher_foreground.xml` and `drawable/ic_launcher_background.xml` appear deprecated and should be deleted only after a focused build-verified cleanup.

## Rules Added

- No new logo variants without updating `design/ASSET_REGISTRY.md`.
- No generated/fake bank logos.
- Notification small icon must be monochrome vector if added later.
- Bank icons remain Android-only until provenance/licensing is documented.

