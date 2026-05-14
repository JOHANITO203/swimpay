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
| Bank icons | `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_*.png` and documented vector placeholders below | Android bank selector/manager, hosted checkout sender/receiver bank marks | Checkout may embed these same source assets as data URIs so the buyer flow does not create separate bank-logo variants. |
| Ozon Bank placeholder | `apps/android-receiver/android/app/src/main/res/drawable/ic_bank_ozon.xml` | Android bank selector/manager and review card placeholder | Documented placeholder `OZ` mark because no official Ozon Bank logo asset was provided in-repo. Replace with an official asset only after explicit product/design approval. |
| SBP placeholder mark | `apps/android-receiver/android/app/src/main/res/drawable/ic_payment_sbp_placeholder.xml` | Android merchant phone-transfer/SBP visual cue | Documented placeholder mark because no official SBP logo asset was provided in-repo. Use one consistent placeholder wherever `SBP` appears until an official approved asset is registered. |

## Checkout Bank Logo Resolution

Hosted checkout must resolve registered Android bank icons from the repository-root-relative paths above, not from the process working directory. This keeps staging/Docker rendering aligned with local browser baselines and avoids falling back to initials for Sberbank, T-Bank, VTB, Alfa-Bank and Gazprombank.

No checkout-only bank logo variants are allowed. If a bank has no registered official asset, use the documented neutral placeholder and keep a blocker instead of inventing a logo.

## Generated Runtime Marks

| Mark | Source path | Current use | Status |
| --- | --- | --- | --- |
| Android Compose `SwimPayLogo` | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt` | Android login/onboarding brand | Runtime-used Compose brand built from the registered `SwimPayWavesMark`; no new resource logo file. |
| Android Compose `SwimPayWavesMark` | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt` | Small top chrome / compact brand mark | Runtime-used vector-style mark for small UI spaces. Must remain token-driven and must not become a new resource logo file. |
| Android Compose `MockupLogo` | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMockupTokens.kt` | Android merchant mockup-mirror login/onboarding brand | Runtime-used only for the premium mockup mirror surfaces. It reuses Compose drawing and must not become an unregistered resource logo file. |
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
