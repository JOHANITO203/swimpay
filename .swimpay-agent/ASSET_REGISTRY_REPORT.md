# Asset Registry Report

generated_at: 2026-05-12T21:12:00+03:00

Updated `design/ASSET_REGISTRY.md`.

## Official Assets Identified

- Android app icon: `res/mipmap-*/ic_launcher.webp`.
- Android adaptive icon: `res/mipmap-anydpi-v26/ic_launcher.xml`.
- Android round icon: `res/mipmap-anydpi-v26/ic_launcher_round.xml`.
- Adaptive foreground: `res/mipmap-*/ic_launcher_foreground.webp`.
- Android notification small icon: `res/drawable/ic_notification_small.xml`.
- Runtime Android bank icons: `res/drawable-nodpi/ic_bank_*.png`.

## Generated Runtime Marks

- `PremiumComponents.kt::SwimPayLogo` consumes the official launcher asset with `painterResource(R.mipmap.ic_launcher)`.
- `PremiumComponents.kt::SwimPayWavesMark` is the compact Android runtime mark for small chrome spaces.
- `CheckoutScreen.ts::swimPayWavesSvg` is now documented as the checkout inline SwimPay mark aligned to the Android compact waves mark.
- `Components.ts::SwimPayBrand` remains a secondary/frozen dashboard generated mark.

## Duplicates / Candidate Cleanup

- `drawable/ic_launcher_foreground.xml` and `drawable/ic_launcher_background.xml` appear deprecated and should be deleted only after a focused build-verified cleanup.

## Rules Preserved

- No new logo variants without updating `design/ASSET_REGISTRY.md`.
- No generated/fake bank logos.
- Notification small icon is registered as a monochrome vector and used by local merchant notifications.
- Bank icons remain Android-only until provenance/licensing is documented.
- Checkout inline mark must not become a separate resource logo family.
