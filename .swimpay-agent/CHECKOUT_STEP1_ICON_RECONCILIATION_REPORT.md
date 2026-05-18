# Checkout Step 1 Icon Reconciliation Report

generated_at: 2026-05-18

## Scope

Updated only the hosted checkout Step 1 visual icon layer and SwimPay checkout mark.

Changed file:

- `apps/web/src/screens/CheckoutScreen.ts`

Updated generated visual baselines:

- `apps/web/visual-baselines/checkout/checkout_intro_mobile.png`
- `apps/web/visual-baselines/checkout/checkout_buyer_info_mobile.png`
- `apps/web/visual-baselines/checkout/checkout_instructions_mobile.png`
- `apps/web/visual-baselines/checkout/checkout_waiting_mobile.png`
- `apps/web/visual-baselines/checkout/checkout_instructions_desktop.png`

## What Changed

- Replaced the hosted checkout SwimPay SVG mark with the same three-wave geometry used by the Android merchant launcher icon.
- Kept the header treatment aligned with the launcher direction: dark rounded square, cyan wave mark.
- Added a compact `FR / EN / RU` selector in the checkout header.
- Expanded the Step 1 translation dictionary so the intro and buyer information panel are derived from the French base into English and Russian.
- Replaced Step 1 feature icons with common, immediately recognizable symbols:
  - card icon for guided payment;
  - clock icon for real-time tracking;
  - curved return arrow for return to merchant.

## What Did Not Change

- No checkout API changes.
- No payment state machine changes.
- No SDK runtime behavior changes.
- No backend or webhook logic changes.
- No payment confirmation wording was added.

## Screenshot

Primary Step 1 capture:

- `apps/web/visual-baselines/checkout/checkout_intro_mobile.png`

The capture now shows the language selector in the header.

## Verification

Passed:

```powershell
npm run typecheck --workspace @swimpay/web
```

Passed:

```powershell
npx vitest run apps/web/src/checkout.test.ts apps/web/src/copy-guardrails.test.ts
```

The checkout test now asserts that:

- the `FR / EN / RU` selector is rendered;
- English renders Step 1 buyer-form labels;
- Russian renders Step 1 buyer-form labels;
- no forbidden payment-confirmation wording is introduced.

Passed:

```powershell
npm run checkout:screenshot:record
```

Passed:

```powershell
npm run checkout:screenshot:verify
```

Passed:

```powershell
npm run build --workspace @swimpay/web
```

## Decision

Ready for visual review. The change is intentionally limited to Step 1 icons and brand mark reconciliation.
