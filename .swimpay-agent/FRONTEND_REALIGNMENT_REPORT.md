# Frontend Realignment Report

Date: 2026-05-04

## Result

Passed for the UI-scope implementation.

The web frontend was realigned toward the approved SwimPay mobile-first visual grammar without changing APIs, event names, checkout state machines, merchant review state machines or security logic.

## Audit

Created `.swimpay-agent/FRONTEND_UI_AUDIT.md`.

Key finding:
- `apps/web/src/index.ts` was the main monolithic frontend surface.
- It mixed route registration, API clients, contracts and HTML rendering for merchant, checkout and admin screens.

## Structure Created

New screen modules:
- `apps/web/src/screens/MerchantScreens.ts`
- `apps/web/src/screens/CheckoutScreen.ts`
- `apps/web/src/screens/EvidenceAdminScreen.ts`

Strengthened shared UI files:
- `apps/web/src/ui/Theme.ts`
- `apps/web/src/ui/Components.ts`

`apps/web/src/index.ts` now keeps route wiring and providers while delegating visual rendering to `screens/`.

## Components Created or Reinforced

- AppShell
- SwimPayBrand
- PageHeader
- Button
- Card
- StatusChip
- StatusPanel
- StepProgress
- OptionButton
- MetricCard
- CopyField
- ReviewPaymentCard
- PaymentAmountBlock
- BottomNav
- EmptyState

## Merchant Screens Separated

- Onboarding Welcome
- Connect Phone
- Choose Banks
- Add Receiving Method
- Test Configuration
- Dashboard
- Receiving Methods
- Review Queue
- Payment Detail
- Connected Site

## Checkout Visual Consistency

The checkout render path was moved to `CheckoutScreen.ts` and given the shared visual grammar.

Preserved:
- bank-first receiver-bank selection;
- route reveal;
- payer launcher selection;
- payment instructions;
- copy-details safety;
- buyer claimed paid does not confirm payment;
- official bank confirmation remains false.

## Copy Guardrails

Added/updated UI tests to verify:
- onboarding copy appears on separated screens;
- forbidden merchant-facing jargon does not appear;
- payment review detail uses simple merchant labels;
- raw phone/card values are not rendered in normal UI;
- checkout does not claim official bank confirmation.

## Limits

- This pass refactors the server-rendered web frontend. It does not change Android Compose UI.
- The merchant review detail is currently a visual/static route for frontend separation; backend review action integration remains governed by existing APIs and Android/backend sprints.
- The visual system is implemented as lightweight HTML/CSS helpers, not React components.

## Safety

No real bank notifications were processed.
No SMS, scraping, app enumeration, raw notification text, raw phone/card rendering, official bank confirmation claim or auto-confirm enablement was added.

## Validation

Passed:
- `npm run typecheck`
- `npm run lint`
- `npm test` (54 test files, 372 tests)
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` (all services healthy)
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` (database, nats and valkey ok)

## Next Recommendation

Frontend polish pass with browser screenshots:
- run the web app locally;
- capture mobile and desktop screenshots for onboarding, dashboard, receiving methods, review queue/detail, connected site and checkout;
- adjust spacing/overflow only after screenshot evidence.
