# Buyer Checkout Screen Inventory

Generated: 2026-05-04T21:05:00+03:00

Scope: hosted buyer checkout frontend only.

No backend, API, contract, worker, payment decision, webhook, database or Android notification-processing logic was changed.

## Summary

The buyer checkout is implemented in:

- Component: `apps/web/src/screens/CheckoutScreen.ts`
- Route: `GET /checkout/:paymentSessionId`
- Status route used by existing frontend/API contract: `GET /checkout/:paymentSessionId/status`
- Tests: `apps/web/src/checkout.test.ts`, `apps/web/src/copy-guardrails.test.ts`

Before this pass, the screen existed but was visually monolithic: instructions rendered before the buyer selected a bank/route/launcher, and several buyer status states were represented only indirectly by a summary chip.

After this pass, the buyer checkout is split into visible stages and dedicated state panels while preserving the existing server route and checkout APIs.

## Screen Inventory

| # | Expected screen | Status | File/component | Route | Visual state | Copy status | Remaining debt |
|---|---|---|---|---|---|---|---|
| 1 | Pay with SwimPay intro | exists | `renderBuyerIntro` | `/checkout/:id` | Premium card with benefits and CTA | aligned | Could add real brand artwork later |
| 2 | Choisir une banque | exists | `renderReceiverBankSelection` | `/checkout/:id` | Bank-only cards | aligned | Real bank logos can replace initials later |
| 3 | Choisir comment payer | exists | `renderReceivingRouteSelection` | `/checkout/:id` after bank selected | Method cards | aligned | Form submission enhancement can be added without API changes |
| 4 | Instructions carte | exists | `renderInstructions` card variant | `/checkout/:id` after route and launcher selected | Masked card, amount, reference, actions | aligned | Full copy reveal remains delegated to copy-details endpoint |
| 5 | Instructions téléphone | exists | `renderInstructions` phone variant | `/checkout/:id` after route and launcher selected | Masked phone, amount, reference, sender-phone field, actions | aligned | Sender-phone persistence wiring remains existing API responsibility |
| 6 | Ouvrir votre banque | exists | `renderPayerLauncherSelection` | `/checkout/:id` after route selected | Launcher cards with open/copy fallback copy | aligned | Verified deep links are still not invented |
| 7 | Paiement en attente | exists | `renderCheckoutStatePanel` | `/checkout/:id` | Dedicated state card | aligned | None |
| 8 | Recherche du signal | exists | `renderCheckoutStatePanel` | `/checkout/:id` | Dedicated state card | aligned | None |
| 9 | Signal détecté | exists | `renderCheckoutStatePanel` | `/checkout/:id` | Dedicated state card | aligned | None |
| 10 | Vérification en cours | exists | `renderCheckoutStatePanel` | `/checkout/:id` | Dedicated state card | aligned | None |
| 11 | Paiement validé | exists | `renderCheckoutStatePanel` | `/checkout/:id` | Dedicated state card | aligned | Must remain merchant/manual/controlled policy result, not official bank confirmation |
| 12 | Session expirée | exists | `renderCheckoutStatePanel` | `/checkout/:id` | Dedicated state card, visible even before selections | aligned | None |
| 13 | Paiement non validé | exists | `renderCheckoutStatePanel` | `/checkout/:id` | Dedicated state card, visible even before selections | aligned | None |

## Desktop QR Handoff

Status: exists.

Implemented as `renderDesktopQrHandoff` in the checkout side panel:

- QR placeholder for the checkout session;
- amount;
- reference;
- explicit `Copier les détails` action label;
- manual instruction text.

The handoff card does not render raw card or phone values.

## Guardrails Checked

- Bank step does not show route details.
- Instructions step shows masked route details only.
- Raw card and phone are not rendered in normal HTML.
- No official bank confirmation claim.
- No payment guarantee claim.
- No auto-confirmation wording.
- No backend jargon in buyer checkout copy.

## Remaining Visual Debt

- The QR is currently a visual placeholder. A real QR can be added later if it encodes only a checkout session URL and does not embed raw destination values.
- Real bank logos are not introduced in this pass to avoid fake or approximate brand assets.
- Buyer-side browser screenshot QA is recommended as the next polish step.
