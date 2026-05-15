# SwimPay Figma Fusion Prototype Report

Date: 2026-05-15

Scope: design prototype only. No Android runtime, backend, contracts, payment, webhook, receiver, database or SDK files changed.

## Prototype created

File:

- `design/prototypes/swimpay-figma-fusion-prototype.html`

Screen:

- Merchant home / SwimPay Intelligence prototype

## Fusion direction

### Base visual DNA from first Figma audit

Used as the primary card language:

- semi-transparent frosted cards;
- soft glass surfaces;
- white/blue translucent overlays;
- large rounded cards;
- pastel glow accents;
- compact transaction-style rows;
- floating bottom glass navigation.

Adaptation for SwimPay:

- darkened the pastel foundation into a merchant-safe navy background;
- preserved the glass/card transparency feeling without using low-contrast consumer-finance white cards;
- kept gradients and glow as accents, not as the whole product identity.

### Complementary structure from second Figma audit

Used as screen composition inspiration:

- richer mobile banking module map;
- service/action grid;
- activity/transaction list grammar;
- settings/support/navigation patterns;
- detail-first but merchant-friendly hierarchy.

Rejected from the second source:

- loans, investments, mortgage, family banking and branch/ATM concepts;
- bank-account ownership language;
- product surfaces that would make SwimPay look like a bank or PSP.

## SwimPay-specific concept

The prototype restores `SwimPay Intelligence` as the central card:

- shows merchant review workload;
- frames intelligence as signal analysis and review preparation;
- keeps manual review language;
- avoids official bank confirmation wording.

## Visual tokens used in prototype

Colors:

- background: `#020817`, `#07111F`;
- glass: `rgba(255,255,255,0.07-0.17)`;
- border: `rgba(255,255,255,0.12-0.22)`;
- accent green: `#39FF88`;
- cyan: `#2DD8FF`;
- blue: `#2491FF`;
- violet: `#8B5CF6`;
- gold: `#FFC933`;
- red: `#FF4D6D`.

Radii:

- primary glass card: `30px`;
- secondary card: `24px`;
- pills/buttons: `14-18px`;
- bottom nav: `26px`.

Effects:

- glass blur: `18-28px`;
- frosted card shadow: `0 24px 70px rgba(0,0,0,0.42)`;
- green glow: `0 0 42px rgba(57,255,136,0.16)`.

Typography:

- system sans stack;
- large merchant greeting;
- large hero metric;
- readable card labels;
- no tiny `7sp` labels from the first design.

## Product guardrails

Kept:

- payment signal / manual review framing;
- SBP only as user-facing receiving-method orientation in activity example;
- merchant actions: review, methods, integration, help.

Avoided:

- official bank confirmation claims;
- fake bank/PSP positioning;
- new product features;
- technical terms such as HMAC, parser, DLQ, raw payload or worker.

## Suggested next design step

If this direction is accepted, the next prototype should be a two-screen pair:

- dashboard/home;
- review detail.

That pair would test whether the transparent-card language still works when decisions and evidence are present.
