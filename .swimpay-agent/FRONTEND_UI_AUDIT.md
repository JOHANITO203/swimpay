# Frontend UI Audit

Date: 2026-05-04

## Summary

The current web frontend is functional but too monolithic for the approved SwimPay visual direction.

The main issue is `apps/web/src/index.ts`, which currently mixes:
- Fastify route registration;
- public and admin contracts;
- API client implementations;
- merchant page rendering;
- checkout rendering;
- admin evidence rendering;
- status mapping helpers.

This makes visual iteration risky because changing one screen can accidentally affect unrelated checkout, admin or API proxy behavior.

## Existing Screens

Merchant-facing screens already present:
- home entry page;
- merchant onboarding by step;
- merchant dashboard;
- receiving methods;
- review queue;
- connected site/settings;
- admin evidence review.

Buyer checkout screens already present:
- checkout entry;
- receiver bank selection;
- receiving route reveal;
- payer launcher selection;
- payment instructions;
- status summary;
- buyer claimed paid action.

## Missing or Weak Screens

Screens that exist only as simplified or static surfaces:
- payment review detail;
- richer review queue rows;
- dashboard recent payment cards;
- connected site developer details mode;
- mobile bottom navigation on merchant pages;
- empty/error/action-required states.

## Monolithic Components

Risky files:

### `apps/web/src/index.ts`

Why risky:
- mixes routing, API clients, types and visual rendering;
- makes all merchant and checkout screens share one large edit surface;
- hard to apply the validated mobile-first design grammar screen by screen.

Suggested split:
- keep server route wiring in `index.ts`;
- move screen renderers to `apps/web/src/screens`;
- keep reusable UI in `apps/web/src/ui`;
- keep API clients later in `apps/web/src/data` if needed.

### `apps/web/src/ui/Components.ts`

Why risky:
- useful base exists, but components are too generic and inject repeated `<style>` blocks;
- does not yet provide all design primitives needed by the mockups.

Suggested split:
- keep small HTML helpers;
- add focused primitives such as `StatusPanel`, `BottomNav`, `ReviewPaymentCard`, `WebhookStatusCard`, `StepProgress`.

## Current Design System State

`apps/web/src/ui/Theme.ts` already includes the approved palette foundation:
- deep navy;
- teal;
- cyan;
- mint;
- white surface;
- light background;
- warning/success/danger/muted colors.

It needs stronger mobile layout utilities and more component primitives.

## Refactor Boundary

This realignment must not change:
- APIs;
- event names;
- checkout state machine;
- merchant review state machine;
- security logic;
- copy-details safety;
- webhook payload rules;
- auto-confirm gates.

## Proposed Target Structure

```text
apps/web/src/
  index.ts
  screens/
    CheckoutScreen.ts
    MerchantScreens.ts
    EvidenceAdminScreen.ts
  ui/
    Theme.ts
    Components.ts
```

Future optional split:

```text
apps/web/src/
  data/
    checkout-client.ts
    merchant-routes-client.ts
    evidence-client.ts
  screens/
    merchant/
      OnboardingScreens.ts
      DashboardScreen.ts
      ReceivingMethodsScreen.ts
      ReviewQueueScreen.ts
      ConnectedSiteScreen.ts
    checkout/
      CheckoutScreen.ts
```

## Recommendation

Refactor now only at the render/UI boundary. Keep API clients and business flow stable until the UI surfaces are clean and tested.
