# Android Dynamic Background, Splash And Intelligence Report

Date: 2026-05-15

## Scope

UI-only Android Merchant update:

- dynamic light-theme blue app background;
- Compose startup splash overlay;
- SwimPay Intelligence card on Accueil.

No backend, contract, payment runtime, webhook runtime, receiver runtime or SDK logic
was changed.

## 21st References Adapted

- `efferd/gradient-background`: translated into a Cobalt Banking Blue light
  gradient foundation.
- `kokonutd/beams-background`: translated into subtle animated white beams over
  the light app background.
- `kokonutd/shape-landing-hero`: translated into a soft abstract blue shape in
  the light background.
- `aceternity/background-gradient-animation` and `aurora-background`: translated
  into animated radial aurora layers for the startup splash.
- `reapollo/hero-futuristic`, `vaib215/shaders-hero-section` and
  `isaiahbjork/voice-powered-orb`: translated into a compact animated
  SwimPay Intelligence orb/card on the home screen.

## Implementation

- `PremiumPaperBackground` now uses animated beams and Cobalt/Cyan gradients for
  light mode while preserving dark mode.
- `PremiumStartupSplashScreen` overlays the app at launch for a short startup
  moment. It is edge-to-edge and uses `R.mipmap.ic_launcher` in the center.
- `PremiumIntelligenceOrb` provides the tech/3D-like visual for the home card.
- `SwimPayIntelligenceCard` uses existing runtime title/body from dashboard
  state and does not introduce new product mechanics.

## Validation

- `npm run android:compile` passed.
- `npm run android:assemble:staging` passed.
- Targeted Android JVM tests passed:
  - `AndroidMerchantVisualArchitectureTest`
  - `PremiumNavigationStateTest`
- `git diff --check` passed.

