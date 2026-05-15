# SwimPay Adaptation Plan From Banking iOS Figma

Date: 2026-05-15

Scope: no code. This plan adapts useful design/system ideas from the Figma file without adding SwimPay features.

## Adaptation decision

Use this Figma file as an information architecture and component-system reference, not as a direct product copy.

The design is a retail banking super-app. SwimPay Merchant is not a bank and must remain a payment signal engine for merchants.

## What SwimPay can borrow

### 1. Screen organization

Borrow the separation between:

- home;
- history/list;
- detail;
- receipt/audit;
- services/actions;
- settings;
- support.

SwimPay mapping:

- `Home` -> merchant dashboard;
- `History` -> recent activity / payment signal history;
- `Transaction` -> review queue item;
- `Transaction detail` -> review detail;
- `Transaction receipt` -> operational decision receipt/audit summary;
- `Payments and services` -> merchant quick actions;
- `Support and chat` -> help/support;
- `Settings` -> simple settings.

### 2. Widget system

The `Widgets` section suggests reusable small surfaces.

SwimPay should use the same idea:

- status widget;
- payment-to-review widget;
- receiver health widget;
- integration status widget;
- receiving method widget;
- support widget.

Do not create new feature modules from the banking design.

### 3. Detail/receipt pattern

The banking design includes transaction detail and receipt screens.

SwimPay adaptation:

- review detail should be a clear operational record;
- decision receipt can show what was manually decided;
- no raw notification;
- no official bank confirmation wording.

### 4. Settings simplicity

Use banking-app settings grammar:

- clear grouped rows;
- simple labels;
- no developer console noise;
- no hidden critical settings.

SwimPay settings should keep:

- language;
- appearance;
- app lock;
- notifications;
- help/support;
- privacy;
- optional Google recovery/linking.

### 5. Phone transfer flow layout

The `Transfer by phone number` screen can inspire form structure:

- recipient/method identity;
- masked destination;
- bank/method selection;
- confirmation step;
- clear CTA.

SwimPay adaptation:

- receiving-method setup only;
- no payment initiation;
- no claim of SBP integration;
- SBP can remain a user-facing orientation label for phone-transfer receiving method.

## What SwimPay must not borrow

- full retail banking product scope;
- account/card ownership as the home model;
- investments;
- mortgage;
- loan calculator;
- insurance/policy detail;
- branch/ATM map;
- family banking;
- card ordering;
- cashback/loyalty as product feature;
- any “bank app” positioning.

## SwimPay adapted screen model

### Dashboard

Use:

- banking-style home clarity;
- compact widgets;
- recent activity list.

Do not use:

- personal balance card as dominant object;
- card number/carousel as primary UI.

Recommended dashboard modules:

- `SwimPay Intelligence`;
- `Paiements a examiner`;
- `Signaux detectes`;
- `Recepteurs`;
- `Integration`;
- recent activity.

### Review Queue

Use transaction-list discipline:

- one item per review;
- amount visible;
- bank/source visible;
- status visible;
- action visible.

Avoid:

- technical vectors;
- raw signal wording;
- risk-heavy language.

### Review Detail

Use transaction-detail discipline:

- top summary;
- structured rows;
- action zone;
- final decision evidence.

Avoid:

- raw notifications;
- event internals;
- hashes/payloads.

### Receiving Methods

Use transfer/service-card grammar:

- method cards;
- masked destination;
- bank logo/name;
- active/inactive status;
- simple actions.

### Integrations

Use service/status card grammar:

- site/application;
- status;
- test state;
- guide/action.

Hide:

- API key internals;
- raw secrets;
- low-level delivery rows;
- payloads.

### Receiver Health

Use health/status widgets:

- receiver active/offline;
- notification access;
- banks monitored;
- last contact;
- queue state.

Avoid:

- storage engine names;
- worker/heartbeat jargon visible by default.

## Token direction for future extraction

When detailed Figma extraction is available, map tokens into SwimPay as follows:

| Figma category | SwimPay destination |
|---|---|
| primary brand color | accent technical/integration if compatible |
| account-card colors | convert to merchant status cards |
| transaction row height | review queue row/token |
| receipt layout | review decision/audit summary |
| settings row style | settings menu rows |
| service grid spacing | quick action grid |
| input fields | receiving method and integration forms |
| bottom nav | Android merchant bottom navigation |

## No-code recommendation

Before coding from this Figma:

1. Re-run exact token extraction after Figma MCP limit resets.
2. Compare extracted tokens against current SwimPay Android tokens.
3. Keep only structure/readability improvements.
4. Reject feature-scope expansion.
5. Create one low-risk prototype screen first, preferably Settings or Review Queue.

## Guardrails

- No new features from the banking super-app.
- No backend or contract changes.
- No payment initiation.
- No official bank confirmation language.
- No personal-banking ownership metaphor.
- No fake runtime data.
- No visual freeze/golden update until operator approval.
