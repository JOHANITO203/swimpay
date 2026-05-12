# Visual Source Of Truth Audit

generated_at: 2026-05-12T21:12:00+03:00

## Result

The repository now has an asset registry and initial Android golden baselines. Android launcher resources remain the official asset family. Runtime brand rendering is still split across Android Compose, hosted checkout and the secondary web dashboard, but the hosted checkout has been aligned to the Android compact mark direction.

## Asset Classification

| Surface | Classification | Notes |
| --- | --- | --- |
| `mipmap-*/ic_launcher.webp` | `official_asset`, `runtime_used`, `unsafe_to_delete` | Android app launcher/app switcher icon. |
| `mipmap-*/ic_launcher_foreground.webp` | `official_asset`, `runtime_used`, `unsafe_to_delete` | Adaptive icon foreground. |
| `mipmap-anydpi-v26/ic_launcher.xml` | `official_asset`, `runtime_used`, `unsafe_to_delete` | Adaptive icon. |
| `mipmap-anydpi-v26/ic_launcher_round.xml` | `duplicated_asset`, `runtime_used`, `unsafe_to_delete` | Required duplicate for `roundIcon`. |
| `drawable-nodpi/ic_bank_*.png` | `official_asset`, `runtime_used`, `unsafe_to_delete` | Android bank manager icons. Provenance should be documented before broader reuse. |
| `drawable/ic_launcher_foreground.xml` | `duplicated_asset`, `deprecated_asset`, `safe_to_delete` candidate | Not currently referenced by adaptive icon XML. |
| `drawable/ic_launcher_background.xml` | `deprecated_asset`, `safe_to_delete` candidate | Not currently referenced by adaptive icon XML. |
| `PremiumComponents.kt::SwimPayLogo` | `official_asset_consumer`, `runtime_used` | Renders the official launcher asset with `painterResource(R.mipmap.ic_launcher)`. |
| `PremiumComponents.kt::SwimPayWavesMark` | `generated_runtime_mark`, `runtime_used` | Compact token-driven mark for small Android chrome; not a new file asset. |
| `apps/web/src/ui/Components.ts::SwimPayBrand` | `generated_runtime_mark`, `runtime_used`, `secondary_surface` | Web dashboard is secondary/frozen. |
| `CheckoutScreen.ts::swimPayWavesSvg` | `generated_runtime_mark`, `runtime_used`, `aligned_now` | Inline mark aligned to Android compact waves geometry and Android premium tokens. |

## Visual Risks

- Web dashboard `SwimPayBrand` remains visually separate and should stay frozen until prioritized.
- Golden screenshot coverage currently protects four Android screens only.
- Hosted checkout still needs browser screenshot baselines before further visual icon polish.

## Decision

No asset deletion was performed. No new logo/icon resource file was created.
