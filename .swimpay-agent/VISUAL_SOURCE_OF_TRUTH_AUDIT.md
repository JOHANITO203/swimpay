# Visual Source Of Truth Audit

generated_at: 2026-05-12T20:05:00+03:00

## Result

The current repository has no `design/` source of truth and no versioned visual reference screenshots. Android runtime assets exist, but brand rendering is split between launcher WebP/adaptive resources, Compose-drawn logo, web CSS brand mark and checkout inline SVG.

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
| `PremiumComponents.kt::SwimPayLogo` | `generated_asset`, `runtime_used` | Compose mark does not match launcher waves exactly. |
| `apps/web/src/ui/Components.ts::SwimPayBrand` | `generated_asset`, `runtime_used` | Web dashboard is secondary/frozen. |
| `CheckoutScreen.ts::swimPayWavesSvg` | `generated_asset`, `runtime_used` | Checkout brand is closer to waves, but still inline-generated. |

## Visual Risks

- SwimPay brand has multiple implementations: Android launcher waves, Android Compose Material `Water`, web `S`, checkout waves.
- Premium tokens exist but do not cover all radius/elevation/icon/status states.
- No screenshot/golden baseline prevents subtle visual regression.

## Decision

No asset deletion was performed in this sprint. The first lock is documentation + static tests. Cleanup and logo unification should be handled in a dedicated visual polish sprint with screenshots.

