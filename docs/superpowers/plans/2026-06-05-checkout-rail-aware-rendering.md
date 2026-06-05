# Checkout Rail-Aware Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The web checkout renders mobile_money (XOF) and wallet_transfer (USD) routes with their own icons, labels and instructions in all three locales, instead of falling back to card/phone copy.

**Spec:** `docs/superpowers/specs/2026-06-05-checkout-rail-aware-rendering-design.md`

**Architecture:** One `railDescriptor()` helper replaces the binary `isPhone` branches at the four render points of `apps/web/src/screens/CheckoutScreen.ts` (route filtering, route selection cards, instructions step, instruction preview). ~10 new i18n keys × 3 locales, 2 new inline SVG icons. No backend change.

**Tech Stack:** TypeScript, vitest (HTML string assertions), Windows PowerShell (no `&&`). Tests: `npx vitest run apps/web/src/checkout.test.ts`.

---

### Task 1: Rail descriptor + i18n keys + icons

**Files:**
- Modify: `apps/web/src/screens/CheckoutScreen.ts` — `CheckoutCopy` interface (~lines 31-147), the three locale objects `fr`/`en`/`ru` (~149-501), `iconSvg` (~1541-1564), new helper next to `filterRoutesForSession` (~611)
- Test: `apps/web/src/checkout.test.ts`

- [ ] **Step 1: Write the failing test.** In `apps/web/src/checkout.test.ts`, find `FakeCheckoutSessionProvider.routes` (~lines 1545-1585; only phone/card routes today) and add two routes following the existing shape exactly (copy a neighbor and adjust):

```typescript
      {
        route_id: 'route_momo',
        bank_profile_id: 'orange_money_ci',
        rail_type: 'mobile_money',
        receiver_identifier_type: 'phone',
        receiver_identifier_masked: '+••• ••• ••67',
        route_code: 'OM-CI',
        display_label: 'Orange Money CI',
        enabled: true,
        recommended: false,
        review_policy: 'review_first',
        copy_action_available: true,
        buyer_status_label: 'review_beta',
        official_bank_confirmation: false
      },
      {
        route_id: 'route_wallet',
        bank_profile_id: 'wise_int',
        rail_type: 'wallet_transfer',
        receiver_identifier_type: 'email',
        receiver_identifier_masked: 'j•••@•••.com',
        route_code: 'USD-WISE',
        display_label: 'Wise USD',
        enabled: true,
        recommended: false,
        review_policy: 'review_first',
        copy_action_available: true,
        buyer_status_label: 'review_beta',
        official_bank_confirmation: false
      }
```

(Adapt field names to the provider's actual route type — read it first; extra/missing fields must match `BuyerSafeReceivingRoute`.) Then add a describe `rail-aware rendering`:

1. Route step, session with `payment_method: 'mobile_money'` (mirror how existing tests set the method/session stage): response contains the FR mobile-money recipient label `Compte mobile money`, contains `+••• ••• ••67`, and does NOT contain the card label used today for these routes.
2. Route step, `payment_method: 'wallet'`: contains `Wallet du marchand` and `j•••@•••.com`.
3. Instructions step with the wallet route selected: contains `E-mail du wallet` (email identifier) and `Wallet international`; with the mobile_money route selected: contains `Numéro mobile money` and `Mobile money`.
4. Same two assertions in EN (`Merchant wallet`, `Wallet email`) and RU (`Кошелёк продавца`, `E-mail кошелька`) using the locale query mechanism existing tests use (`?lang=en` / `?lang=ru` — read how the localization tests at ~lines 118-185 do it).
5. Non-regression: the existing phone/card tests stay untouched and green.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run apps/web/src/checkout.test.ts`
Expected: new tests FAIL (labels missing), old tests PASS.

- [ ] **Step 3: Extend `CheckoutCopy` + locales.** Add to the interface (names exact):

```typescript
  recipientMobileMoneyLabel: string;
  destinationMobileMoneyLabel: string;
  destinationMobileMoneyCopyLabel: string;
  mobileMoneyMethodLabel: string;
  recipientWalletLabel: string;
  destinationWalletEmailLabel: string;
  destinationWalletTagLabel: string;
  destinationWalletPhoneLabel: string;
  destinationWalletCopyLabel: string;
  walletMethodLabel: string;
```

Values — **fr**: `'Compte mobile money'`, `'Numéro mobile money'`, `'Numéro mobile money'`, `'Mobile money'`, `'Wallet du marchand'`, `'E-mail du wallet'`, `'Tag du wallet'`, `'Numéro lié au wallet'`, `'Identifiant du wallet'`, `'Wallet international'` ; **en**: `'Mobile money account'`, `'Mobile money number'`, `'Mobile money number'`, `'Mobile money'`, `'Merchant wallet'`, `'Wallet email'`, `'Wallet tag'`, `'Wallet phone number'`, `'Wallet identifier'`, `'International wallet'` ; **ru**: `'Счёт mobile money'`, `'Номер mobile money'`, `'Номер mobile money'`, `'Mobile money'`, `'Кошелёк продавца'`, `'E-mail кошелька'`, `'Тег кошелька'`, `'Номер кошелька'`, `'Идентификатор кошелька'`, `'Международный кошелёк'`.

- [ ] **Step 4: Descriptor helper.** Insert directly below `filterRoutesForSession`:

```typescript
interface RailDescriptor {
  icon: 'phone' | 'card' | 'mobile' | 'wallet';
  recipientLabel: string;
  destinationLabel: string;
  destinationCopyLabel: string;
  methodLabel: string;
}

/** Per-rail rendering descriptor — the single source for icons and labels at the
 * route-selection, instructions and preview render points. */
function railDescriptor(
  route: Pick<BuyerSafeReceivingRoute, 'rail_type' | 'receiver_identifier_type'>,
  copy: CheckoutCopy
): RailDescriptor {
  switch (route.rail_type) {
    case 'phone_transfer':
      return {
        icon: 'phone',
        recipientLabel: copy.recipientPhoneLabel,
        destinationLabel: copy.destinationPhoneLabel,
        destinationCopyLabel: copy.destinationPhoneCopyLabel,
        methodLabel: copy.phoneMethodFullLabel
      };
    case 'mobile_money':
      return {
        icon: 'mobile',
        recipientLabel: copy.recipientMobileMoneyLabel,
        destinationLabel: copy.destinationMobileMoneyLabel,
        destinationCopyLabel: copy.destinationMobileMoneyCopyLabel,
        methodLabel: copy.mobileMoneyMethodLabel
      };
    case 'wallet_transfer': {
      const destinationLabel =
        route.receiver_identifier_type === 'tag'
          ? copy.destinationWalletTagLabel
          : route.receiver_identifier_type === 'phone'
            ? copy.destinationWalletPhoneLabel
            : copy.destinationWalletEmailLabel;
      return {
        icon: 'wallet',
        recipientLabel: copy.recipientWalletLabel,
        destinationLabel,
        destinationCopyLabel: copy.destinationWalletCopyLabel,
        methodLabel: copy.walletMethodLabel
      };
    }
    default:
      return {
        icon: 'card',
        recipientLabel: copy.recipientCardLabel,
        destinationLabel: copy.destinationCardLabel,
        destinationCopyLabel: copy.destinationCardCopyLabel,
        methodLabel: copy.cardMethodLabel
      };
  }
}
```

- [ ] **Step 5: Icons.** In `iconSvg` (~1541), extend the union with `'mobile' | 'wallet'` and add before the final `return`:

```typescript
  if (icon === 'mobile') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="3"/><path d="M10 6h4"/><circle cx="12" cy="17" r="1"/></svg>`;
  }
  if (icon === 'wallet') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/><path d="M4 8V7a2 2 0 0 1 2-2h10"/><circle cx="16.5" cy="12.5" r="1"/></svg>`;
  }
```

- [ ] **Step 6: Typecheck** — `npm run typecheck` clean (helper not yet wired; unused warnings? eslint may flag unused `railDescriptor` — if so proceed to Task 2 before committing, or commit Tasks 1+2 together; choose committing after Task 2).

---

### Task 2: Wire the four render points

**Files:**
- Modify: `apps/web/src/screens/CheckoutScreen.ts` — `filterRoutesForSession` (~611-618), `renderReceivingRouteSelection` (~1007-1022), `renderInstructionsStep` (~1082-1120), `renderInstructionPreview` (~1346-1358)

- [ ] **Step 1: `filterRoutesForSession`** — replace the body with:

```typescript
  if (paymentMethod === 'card') return routes.filter((route) => route.rail_type === 'card_transfer');
  if (paymentMethod === 'sbp') return routes.filter((route) => route.rail_type === 'phone_transfer');
  if (paymentMethod === 'mobile_money') return routes.filter((route) => route.rail_type === 'mobile_money');
  if (paymentMethod === 'wallet') return routes.filter((route) => route.rail_type === 'wallet_transfer');
  return routes;
```

- [ ] **Step 2: Route selection cards** (~1007-1014) — replace:

```typescript
      const isPhone = route.rail_type === 'phone_transfer';
      const title = isPhone ? copy.recipientPhoneLabel : copy.recipientCardLabel;
```
with
```typescript
      const descriptor = railDescriptor(route, copy);
      const title = descriptor.recipientLabel;
```
and the icon line `${iconSvg(isPhone ? 'phone' : 'card')}` with `${iconSvg(descriptor.icon)}`.

- [ ] **Step 3: Instructions step** (~1082-1086) — replace:

```typescript
  const isPhone = selectedRoute.rail_type === 'phone_transfer';
  ...
  const destinationLabel = isPhone ? copy.destinationPhoneLabel : copy.destinationCardLabel;
  const destinationCopyLabel = isPhone ? copy.destinationPhoneCopyLabel : copy.destinationCardCopyLabel;
  const methodLabel = isPhone ? copy.phoneMethodFullLabel : copy.cardMethodLabel;
```
with
```typescript
  const descriptor = railDescriptor(selectedRoute, copy);
  ...
  const destinationLabel = descriptor.destinationLabel;
  const destinationCopyLabel = descriptor.destinationCopyLabel;
  const methodLabel = descriptor.methodLabel;
```
(keep the `amount` line between them untouched).

- [ ] **Step 4: Instruction preview** (~1352) — replace the ternary with `const destinationLabel = railDescriptor(selectedRoute, copy).destinationLabel;`.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run apps/web/src` then `npm run typecheck` then `npm run lint`
Expected: ALL PASS including the Task-1 tests; phone/card output byte-identical (descriptor returns the same strings).

- [ ] **Step 6: Commit (Tasks 1+2 together)**

```powershell
git add apps/web/src/screens/CheckoutScreen.ts apps/web/src/checkout.test.ts
git commit -m "feat(checkout): rail-aware rendering — mobile money (XOF) and wallet (USD) icons, labels, instructions"
```

---

### Task 3: VERIFY

- [ ] `npm test` full suite green; `npm run typecheck`; `npm run lint`; `git diff --stat` limited to the two files; summary with locale coverage table (3 langs × 4 rails).
