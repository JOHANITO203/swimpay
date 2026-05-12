# SwimPay Brand Unification Audit

generated_at: 2026-05-12T21:12:00+03:00

## Runtime Marks Audited

| Surface | Current mark | Status | Action |
| --- | --- | --- | --- |
| Android Compose `SwimPayLogo` | `painterResource(R.mipmap.ic_launcher)` inside the premium logo container | aligned | Keep as primary Android runtime logo consumer. |
| Android Compose `SwimPayWavesMark` | Token-driven compact waves mark | aligned_compact_mark | Allowed for small chrome/onboarding spaces. Not a resource logo file. |
| Hosted buyer checkout | Inline SVG mark in `CheckoutScreen.ts` | aligned_now | Updated to use the compact Android waves geometry and Android premium color tokens. |
| Web dashboard `SwimPayBrand` | CSS/HTML generated `S` mark | secondary_inconsistent | Leave frozen for now. Do not expand dashboard web visual work without product decision. |
| Android launcher resources | `mipmap-*/ic_launcher.webp`, adaptive and round XML | official_asset | Do not delete or replace. |

## Checkout Color Alignment

Hosted checkout now defines Android-premium-equivalent tokens on `.app-shell-checkout`:

- `--sp-ink: #071126`
- `--sp-navy: #0F172A`
- `--sp-blue: #155BD8`
- `--sp-cyan: #16ADEC`
- `--sp-teal: #0EA5A4`
- `--sp-background: #F2F7FA`
- `--sp-surface: #FFFFFF`

The checkout primary gradient now uses:

- `var(--sp-teal) -> var(--sp-blue)`

The main checkout brand tile now uses:

- background `var(--sp-navy)`
- waves `var(--sp-cyan)`

This follows the Android app top-chrome mark direction without redesigning checkout layout.

## Asset Registry

Updated:

- `design/ASSET_REGISTRY.md`

The hosted checkout mark is documented as:

- inline runtime rendering;
- aligned to Android compact waves mark;
- not a new resource logo file;
- not allowed to drift into a separate checkout-only logo family.

## Safe Brand Unification Plan

1. Keep Android launcher icon assets as official source of truth.
2. Keep Android `SwimPayLogo` as the primary runtime logo consumer.
3. Use compact waves mark only in small chrome or checkout inline contexts.
4. Freeze web dashboard brand until the dashboard surface becomes product priority again.
5. Add future hosted checkout screenshot/golden coverage before further icon polish.
6. Do not delete deprecated drawable launcher candidates until a dedicated build-verified cleanup.

## Regression Tests

Added:

- `tests/checkout-brand-visual-contract.test.ts`

Coverage:

- checkout uses Android premium color values;
- checkout inline mark uses the compact app waves geometry;
- asset registry documents the checkout mark as aligned runtime rendering, not a new logo asset.

## Guardrails Preserved

- No new logo asset was created.
- No payment or webhook code changed.
- No Android bank/notification runtime behavior changed.
