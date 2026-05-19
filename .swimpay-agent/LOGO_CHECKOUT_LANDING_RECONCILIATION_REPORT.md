# Logo Checkout / Landing Reconciliation Report

Date: 2026-05-19

## Result

The launcher logo direction is now reconciled with:

- the landing page navbar;
- the landing page footer;
- landing favicon / manifest / Apple touch icon;
- landing social preview image;
- the hosted checkout header brand mark.

The `Payer avec SwimPay` SDK button was intentionally not modified.

## Files Added

- `apps/landing/src/components/BrandMark.tsx`
- `apps/landing/public/favicon.svg`
- `apps/landing/public/brand/swimpay-icon.svg`
- `apps/landing/public/brand/swimpay-symbol.svg`
- `apps/landing/public/swimpay-icon-192.png`
- `apps/landing/public/swimpay-icon-512.png`
- `apps/landing/public/apple-touch-icon.png`
- `tests/landing-brand-visual-contract.test.ts`

## Files Updated

- `apps/landing/src/components/Navbar.tsx`
- `apps/landing/src/components/Footer.tsx`
- `apps/landing/index.html`
- `apps/landing/public/site.webmanifest`
- `apps/landing/public/images/swimpay-og.png`
- `apps/web/src/screens/CheckoutScreen.ts`
- `tests/checkout-brand-visual-contract.test.ts`
- `design/ASSET_REGISTRY.md`

## Checkout Boundary

Changed:

- the hosted checkout header brand mark now renders the official launcher-style symbol inline;
- the header mark container uses black / graphite with a white symbol.

Not changed:

- checkout state machine;
- payment flow;
- language selector behavior;
- payment action buttons;
- SDK snippets;
- `Payer avec SwimPay` button asset, text, colors, behavior and code.

## Landing Boundary

Changed:

- navbar uses the official `BrandMark`;
- footer no longer uses the generic letter `S` tile;
- favicon and install icons are declared;
- OG image is regenerated in the monochrome launcher direction.

Not changed:

- landing navigation structure;
- APK download URL;
- hero phone screenshot;
- copy and SEO product truth.

## Verification

Passed:

- `npx vitest run tests/checkout-brand-visual-contract.test.ts tests/landing-brand-visual-contract.test.ts apps/web/src/developer-wizard.test.ts tests/sdk-web-product-truth.test.ts tests/sdk-android-product-truth.test.ts`
- `npm run build --workspace @swimpay/landing`

## Remaining Risks

- The merchant/admin web dashboard still has older brand components and was left untouched.
- The hosted checkout palette still contains older blue/cyan tokens outside the header mark; this was intentionally not broadened because the requested scope was logo reconciliation.
