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
| Android notification small icon | `apps/android-receiver/android/app/src/main/res/drawable/ic_notification_small.xml` | Android local merchant notifications only | Official monochrome vector status icon. Keep vector-only; do not replace with bitmap. |
| Bank icons | `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_*.png` and documented vector placeholders below | Android bank selector/manager only | Treat official/trademark assets carefully; do not reuse on web without explicit decision. |
| Ozon Bank placeholder | `apps/android-receiver/android/app/src/main/res/drawable/ic_bank_ozon.xml` | Android bank selector/manager and review card placeholder | Documented placeholder `OZ` mark because no official Ozon Bank logo asset was provided in-repo. Replace with an official asset only after explicit product/design approval. |

## Generated Runtime Marks

| Mark | Source path | Current use | Status |
| --- | --- | --- | --- |
| Android Compose `SwimPayLogo` | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt` | Android login/onboarding brand | Runtime-used and now renders the official launcher asset through `painterResource(R.mipmap.ic_launcher)`. |
| Android Compose `SwimPayWavesMark` | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt` | Small top chrome / compact brand mark | Runtime-used vector-style mark for small UI spaces. Must remain token-driven and must not become a new resource logo file. |
| Web dashboard `SwimPayBrand` | `apps/web/src/ui/Components.ts` | Merchant/admin web brand | Secondary/frozen dashboard surface. Do not expand without product decision. |
| Checkout inline SwimPay mark | `apps/web/src/screens/CheckoutScreen.ts` | Buyer checkout brand | Runtime-used inline SVG aligned to Android compact waves mark and Android premium color tokens. It is not a new asset file and must not become a new resource logo file. |

## Deprecated / Candidate Cleanup

| Asset | Path | Status | Rule |
| --- | --- | --- | --- |
| Legacy launcher foreground vector | `apps/android-receiver/android/app/src/main/res/drawable/ic_launcher_foreground.xml` | `deprecated_asset`, candidate `safe_to_delete` | Do not delete until a clean Android build confirms no resource reference. |
| Legacy launcher background vector | `apps/android-receiver/android/app/src/main/res/drawable/ic_launcher_background.xml` | `deprecated_asset`, candidate `safe_to_delete` | Do not delete until a clean Android build confirms no resource reference. |

## Forbidden

- New SwimPay logo variants without updating this registry.
- New generated bank logos.
- Undocumented placeholder bank logos.
- Bitmap notification status icons.
- Preview/demo images in runtime resources.
- Checkout-only brand variants that contradict the official Android icon.

## Notification Icon Rule

Android notification status bar icons must be monochrome vector drawables. Runtime local notifications must use `@drawable/ic_notification_small`.
