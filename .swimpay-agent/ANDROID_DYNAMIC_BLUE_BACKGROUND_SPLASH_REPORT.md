# Android Dynamic Blue Background + Splash Report

Date: 2026-05-15

## Scope

Android Merchant visual shell only.

No backend, API contract, payment runtime, receiver runtime, database, SDK or business logic was changed for this task.

## 21st Inspiration Mapping

### Light App Background

Inspired by:
- `efferd/gradient-background/default`
- `kokonutd/beams-background/default`
- `kokonutd/shape-landing-hero/default`

Implemented as:
- blue/white premium gradient foundation;
- animated diagonal blue/cyan beams;
- soft abstract translucent shape layer;
- edge-to-edge background continuing behind system bars.

Primary visual direction:
- cobalt banking blue;
- soft white/blue surfaces;
- cyan glow accents;
- launcher-icon coherent blue gradient mood.

### Splash Screen

Inspired by:
- `aceternity/background-gradient-animation/default`
- `aceternity/aurora-background/default`

Implemented as:
- fullscreen edge-to-edge animated aurora background;
- moving radial blue/cyan gradient fields;
- subtle animated beams;
- current APK launcher icon centered in a premium rounded container.

Runtime behavior:
- splash appears after app launch as a visual startup overlay;
- splash is time-bounded;
- app route/data loading continues behind the overlay;
- splash does not fake backend readiness or block business state hydration.

### SwimPay Intelligence Card

Inspired by:
- `reapollo/hero-futuristic/default`
- `vaib215/shaders-hero-section/default`
- `isaiahbjork/voice-powered-orb/default`

Implemented as:
- home-screen `SwimPay Intelligence` card;
- animated tech orb only, without developer-console vocabulary;
- uses existing dashboard readiness title/text when available;
- keeps merchant-friendly wording.

## Files Updated

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`

## Safety Result

- Backend untouched.
- API contracts untouched.
- Payment/manual confirmation logic untouched.
- Receiver runtime untouched.
- No new feature behavior added.
- Visual components are Compose-only.

## Validation

Passed:
- `npm run android:compile`
- `apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests "com.swimpay.receiver.AndroidMerchantVisualArchitectureTest" --tests "com.swimpay.receiver.PremiumNavigationStateTest" --no-daemon --stacktrace --max-workers=1`
- `npm run android:assemble:staging`
- `git diff --check`

## Remaining Visual QA

Manual device review still recommended for:
- splash motion intensity;
- status bar readability on the new light gradient;
- SwimPay Intelligence card placement in the real home scroll;
- visual coherence with the launcher icon on physical display brightness.
