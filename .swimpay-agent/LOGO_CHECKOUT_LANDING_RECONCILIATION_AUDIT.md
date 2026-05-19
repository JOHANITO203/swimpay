# Logo Checkout / Landing Reconciliation Audit

Date: 2026-05-19

## Scope

Audit only. No implementation was performed.

The buyer-facing SDK button labelled `Payer avec SwimPay` is explicitly out of scope for visual changes in this pass. Its current text, structure, behavior and icon usage should remain unchanged unless a later task says otherwise.

## Official Current Brand Source

- Android launcher icons: `apps/android-receiver/android/app/src/main/res/mipmap-*/ic_launcher.webp`
- Android adaptive foreground: `apps/android-receiver/android/app/src/main/res/mipmap-*/ic_launcher_foreground.webp`
- Android adaptive XML:
  - `apps/android-receiver/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
  - `apps/android-receiver/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
- Play Store source image: `apps/android-receiver/android/app/src/main/play_store_512.png`
- Notification vector: `apps/android-receiver/android/app/src/main/res/drawable/ic_notification_small.xml`
- Registry: `design/ASSET_REGISTRY.md`

Current launcher direction: white SwimPay symbol on black / graphite app tile.

## Checkout Findings

### Hosted Checkout Header

File:

- `apps/web/src/screens/CheckoutScreen.ts`

Current brand block:

- `renderCheckoutBrand(...)`
- `swimPayWavesSvg()`
- CSS classes:
  - `.checkout-brand`
  - `.checkout-brand-mark`
  - `.swimpay-waves-mark`
  - `.checkout-brand-copy`

Current issue:

- The checkout header still renders an inline legacy waves mark.
- It does not use the new launcher symbol.
- The palette is still blue/cyan token based:
  - `--sp-navy: #0F172A`
  - `--sp-blue: #155BD8`
  - `--sp-cyan: #16ADEC`
  - `--sp-teal: #0EA5A4`
- This visually conflicts with the new monochrome launcher direction.

Safe reconciliation target:

- Replace only the checkout header mark with the official launcher-style SwimPay symbol.
- Reconcile the header mark container to black/graphite with white symbol.
- Keep checkout flow, text, language selector, payment logic and button actions unchanged.

### Buyer SDK Button Snippet

Files:

- `apps/web/src/screens/MerchantScreens.ts`
- `apps/web/src/screens/SdkButtonIconAsset.ts`
- `apps/web/src/assets/swimpay-sdk-button-icon-96.png`
- `apps/web/src/assets/swimpay-sdk-button-icon.png`
- `packages/swimpay-node/README.md`
- `packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayButton.kt`

Current state:

- Web snippet embeds `swimpay-sdk-button-icon-96.png` as a data URI.
- Android SDK exposes `SwimPayButton`.
- Text remains `Payer avec SwimPay`.

Decision:

- Do not change this button in the next reconciliation task.
- Do not replace `swimpay-sdk-button-icon-96.png` yet.
- Do not change Android SDK button colors or behavior yet.

Reason:

- User explicitly requested that the `Payer avec SwimPay` button stays as-is.

## Landing Findings

### Header / Navbar

File:

- `apps/landing/src/components/Navbar.tsx`

Current state:

- Brand is text-only: `SwimPay`.
- No official launcher symbol is displayed.

Safe reconciliation target:

- Add a compact launcher-style symbol next to the wordmark, or create a shared `BrandMark` component.
- Keep navigation labels and download CTA unchanged.

### Hero

File:

- `apps/landing/src/components/Hero.tsx`

Current state:

- No brand icon in the hero.
- Phone mockup uses `apps/landing/public/images/swimpay-dashboard-dark-home.png`.
- CTA uses a generic `Download` icon.

Safe reconciliation target:

- Optional: add official SwimPay symbol in the hero badge or phone/app identity area.
- Do not alter the dashboard screenshot or phone layout unless requested.

### Footer

File:

- `apps/landing/src/components/Footer.tsx`

Current state:

- Footer uses a generic white square with the letter `S`.
- This is visibly inconsistent with the new launcher.

Safe reconciliation target:

- Replace the letter `S` tile with official launcher-style symbol.

### SEO / Manifest / Social Preview

Files:

- `apps/landing/index.html`
- `apps/landing/public/site.webmanifest`
- `apps/landing/public/images/swimpay-og.png`

Current state:

- OG image exists and is 1200x630.
- Manifest has no `icons` array.
- `index.html` has no explicit favicon / apple-touch-icon links.
- Metadata mentions SwimPay Merchant and SDK checkout correctly.
- No direct `Google AI Studio` text was found in landing or checkout source during this audit.

Safe reconciliation target:

- Add favicon / app icons derived from official launcher assets.
- Add manifest icons.
- Regenerate `swimpay-og.png` using the official logo direction.
- Keep SEO messaging aligned with current product truth.

## Existing Tests / Contracts Impacted

Current checkout brand contract:

- `tests/checkout-brand-visual-contract.test.ts`

The test currently expects the old inline waves mark and old blue/cyan palette. If the checkout header mark is reconciled, this test must be updated to assert the new official symbol contract.

SDK button guardrails:

- `tests/sdk-web-product-truth.test.ts`
- `tests/sdk-android-product-truth.test.ts`
- `apps/web/src/developer-wizard.test.ts`

These should continue to pass if the buyer SDK button is left unchanged.

## Recommended Next Implementation Scope

1. Create landing/shared web brand assets from the official launcher source:
   - favicon SVG or PNG
   - apple touch icon
   - web app icons for manifest
   - optional transparent symbol asset for landing/header/footer

2. Landing reconciliation:
   - `Navbar.tsx`: add official symbol near `SwimPay`
   - `Footer.tsx`: replace generic `S` tile
   - `index.html`: add favicon / apple touch icon links
   - `site.webmanifest`: add icon entries
   - regenerate `swimpay-og.png`

3. Checkout header-only reconciliation:
   - `CheckoutScreen.ts`: replace `swimPayWavesSvg()` usage in header only
   - keep all primary actions and SDK snippets unchanged
   - update `tests/checkout-brand-visual-contract.test.ts`
   - update `design/ASSET_REGISTRY.md`

## Explicit Non-Goals

- Do not change `Payer avec SwimPay` button behavior.
- Do not change SDK checkout business logic.
- Do not change Android SDK button behavior.
- Do not change payment states, webhook behavior or backend contracts.
- Do not introduce bank/PSP/network-card branding.
- Do not add official bank-confirmation language.
