# SwimPay Asset Registry

Generated: 2026-05-12

This registry is the visual source of truth for SwimPay Android Merchant and hosted checkout assets.

## Official Assets

| Asset | Source path | Allowed use | Notes |
| --- | --- | --- | --- |
| Android app icon | `apps/android-receiver/android/app/src/main/res/mipmap-*/ic_launcher.webp` | Android launcher, app switcher, install surface | Official runtime icon set. Do not replace with generated variants. |
| Android adaptive icon | `apps/android-receiver/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` | Android 8+ adaptive launcher icon | References `@mipmap/ic_launcher_foreground` and `@color/ic_launcher_background`. |
| Android round icon | `apps/android-receiver/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` | Android round launcher icon | Required by `android:roundIcon`; duplicate structure is intentional. |
| Launcher foreground WebP | `apps/android-receiver/android/app/src/main/res/mipmap-*/ic_launcher_foreground.webp` | Adaptive icon foreground only | Runtime-used by adaptive icon XML. |
| Bank icons | `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_*.png` | Android bank selector/manager only | Treat as sensitive official/trademark assets; do not reuse on web without explicit decision. |

## Generated Runtime Marks

| Mark | Source path | Current use | Status |
| --- | --- | --- | --- |
| Android Compose `SwimPayLogo` | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt` | Android top/login/onboarding brand | Runtime-used but not yet asset-aligned with launcher waves. Must not be copied into new variants. |
| Web dashboard `SwimPayBrand` | `apps/web/src/ui/Components.ts` | Merchant/admin web brand | Secondary/frozen dashboard surface. Do not expand without product decision. |
| Hosted checkout waves SVG | `apps/web/src/screens/CheckoutScreen.ts` | Buyer checkout brand | Runtime-used. Should be aligned to the official app logo in a future visual polish pass. |

## Deprecated / Candidate Cleanup

| Asset | Path | Status | Rule |
| --- | --- | --- | --- |
| Legacy launcher foreground vector | `apps/android-receiver/android/app/src/main/res/drawable/ic_launcher_foreground.xml` | `deprecated_asset`, candidate `safe_to_delete` | Do not delete until a clean Android build confirms no resource reference. |
| Legacy launcher background vector | `apps/android-receiver/android/app/src/main/res/drawable/ic_launcher_background.xml` | `deprecated_asset`, candidate `safe_to_delete` | Do not delete until a clean Android build confirms no resource reference. |

## Forbidden

- New SwimPay logo variants without updating this registry.
- New generated bank logos.
- Bitmap notification status icons.
- Preview/demo images in runtime resources.
- Checkout-only brand variants that contradict the official Android icon.

## Notification Icon Rule

Android notification status bar icons must be monochrome vector drawables. If a dedicated notification small icon is added later, it must be documented here before runtime use.

