# SwimPay Adaptation Plan From Finance Management App Figma

Date: 2026-05-15

Scope: no code. This is a product/design adaptation note only.

## Adaptation decision

Use the Figma file as a softness/readability reference, not as a direct visual replacement.

SwimPay Merchant should remain:

- merchant operational
- payment-signal oriented
- simple and readable
- mobile-first
- not a consumer banking app
- not an official bank/PSP visual language

## What to borrow

1. Soft card hierarchy

- Use fewer, clearer cards.
- Keep one dominant primary card per screen.
- Secondary cards should be small and scannable.

2. Friendly onboarding rhythm

- One idea per screen.
- One primary CTA.
- Less technical explanation.

3. Glass navigation concept

- Bottom nav can remain frosted/dark-glass.
- It should feel integrated, not like a separate black slab.

4. Metric presentation

- Big amount/status first.
- Label second.
- Supporting metadata below.

5. Review/transaction list grammar

- Date or timing left/secondary.
- Merchant/bank/status in middle.
- Amount/action on the right.
- Enough row height for readable text.

## What not to borrow

- Personal card balance metaphor as core SwimPay dashboard.
- Personal bill categories like Water, Power, Wi-Fi, Grocery.
- Decorative lifestyle characters as primary operational content.
- Tiny chart/date labels.
- Pastel-only palette.
- Fake account numbers or fake runtime finance data.

## SwimPay adapted visual tokens

Use a darker, merchant-ready version of the Figma grammar:

### Background

- keep SwimPay dark base
- add soft blue/violet glow only as secondary atmosphere
- avoid light pastel full-screen backgrounds

Suggested:

- `bg.primary`: existing SwimPay dark/navy
- `bg.glow.blue`: transparent deep blue/violet radial glow
- `surface.glass`: dark glass card, not white glass

### Color mapping

| Figma token | SwimPay adaptation |
|---|---|
| `#233F78` deep blue | technical/integration accent |
| `#46639D` muted blue | secondary icon/text accent |
| `#7979FF` violet | intelligence/insight accent |
| `#0E8A8E` teal | neutral positive value, not final confirmation |
| `#DA879A` rose | warning/attention only, use sparingly |
| `#FFFFFF@0.72` glass nav | translate to dark glass nav |

### Radius

- card radius: keep around `14dp` to `16dp`
- bottom nav/card containers: `14dp` to `18dp`
- do not use oversized pill cards everywhere

### Typography

Do not import Nexa as a dependency unless product approves it.

Use Android/system typography mapping:

- screen title: `28sp` to `32sp`, semibold/bold
- section title: `18sp` to `22sp`
- card value: `24sp` to `32sp`
- row title: `15sp` to `16sp`
- metadata: minimum `12sp`

Reject:

- `7sp` labels
- cramped line heights

### Effects

Borrow the softness, reduce the decoration:

- card shadow: low opacity black/blue
- glass blur: modest if Compose implementation supports it
- no heavy large pastel blobs behind operational content

## Screen adaptation proposals

### Login / Welcome

Borrow:

- large clear headline
- short body
- single primary CTA
- soft background/glow

Adapt:

- no lifestyle illustration unless SwimPay-branded and useful
- keep login/create-account decision clear

### Dashboard

Borrow:

- dominant primary balance/status card
- small metric cards
- transaction/recent activity list rhythm

Adapt:

- primary card becomes `SwimPay Intelligence` / `Paiements a examiner`, not personal balance
- show operational counts and statuses, not fake spend categories

### Review Queue

Borrow:

- transaction row clarity
- amount/status/action separation

Adapt:

- row zones: bank logo, amount, reference, status, action
- keep manual review wording simple

### Review Detail

Borrow:

- one dominant top card
- supporting detail rows below

Adapt:

- avoid raw technical evidence
- keep action buttons clear and large

### Receiving Methods

Borrow:

- soft cards with method identity
- icon-led options

Adapt:

- bank logo + method type + masked destination
- SBP wording remains user-facing only for phone transfer orientation

### Integrations

Borrow:

- simple connected-card model
- status chip + primary action

Adapt:

- hide technical details by default
- avoid console-like API/secret presentation in merchant home flow

### Receiver Health

Borrow:

- health status as primary card
- small supporting status tiles

Adapt:

- labels should be merchant-readable: active, needs action, offline
- hide internals such as queue/storage/debug terms

### Security Settings

Borrow:

- grouped cards with simple icons

Adapt:

- language, appearance, app lock, notifications, help, privacy remain simple entries
- no remote session/device UI unless repository exists

## Product guardrails

- No fake runtime values.
- No official bank confirmation language.
- No personal banking metaphor that implies SwimPay holds money.
- No extra backend/API changes for visual adaptation.
- No Roborazzi/golden updates until an approved visual freeze.

## Recommended next step

If this direction is accepted, create a design-only task that updates SwimPay design tokens/components from this adaptation document, not directly from the Figma file.

That future task should start with:

- token mapping
- one-screen prototype
- device screenshot
- operator approval
- then broader application
