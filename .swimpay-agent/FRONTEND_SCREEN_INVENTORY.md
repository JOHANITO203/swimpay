# SwimPay Frontend Screen Inventory

generated_at: 2026-05-04T20:05:00+03:00

Scope: frontend-only audit for `apps/web` and Android frontend surfaces. Backend APIs, contracts, workers and payment logic were not changed.

## Summary

The web frontend now has separated renderer functions for the merchant screens and checkout screens. Android frontend screens exist separately under `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium` and the older mock/reference package under `ui/screens`.

Status key:
- `exists`: route/component is present and usable.
- `partial`: surface exists but still needs visual or state polish.
- `missing`: no dedicated route/component found.

## Merchant Screens

| # | Screen | Status | File / component | Route | Visual state | Labels | Components | Remaining debt |
|---|---|---|---|---|---|---|---|---|
| 1 | Onboarding bienvenue | exists | `MerchantScreens.ts` / `renderWelcomeStep`; Android `PremiumOnboardingScreens.kt` | `/merchant/onboarding/1` | Premium card stack | aligned on web | `PageHeader`, `OptionButton`, `Button` | Android copy audit still recommended |
| 2 | Connecter téléphone | exists | `renderConnectPhoneStep`; Android `PremiumOnboardingScreens.kt` | `/merchant/onboarding/2` | action-required panel | aligned on web | `StatusPanel`, `Button` | Android live permission UX remains native-only |
| 3 | Choisir banques | exists | `renderChooseBanksStep` | `/merchant/onboarding/3` | five bank cards | aligned | `OptionButton`, `StatusChip` | official bank logo assets not integrated |
| 4 | Ajouter moyen de réception | exists | `renderReceivingMethodStep` | `/merchant/onboarding/4` | card/phone choice | aligned | `OptionButton`, `Button` | form capture remains outside this static screen |
| 5 | Vérifier configuration | exists | `renderConfigurationTestStep` | `/merchant/onboarding/5` | checklist ready | aligned | `Card`, `StepProgress` | live test action remains backend/API responsibility |
| 6 | Tableau de bord | exists | `renderMerchantDashboard` | `/merchant/dashboard` | ready state + metrics | aligned | `StatusPanel`, `MetricCard`, `ReviewPaymentCard`, `BottomNav` | browser screenshot QA pending |
| 7 | Moyens de réception | exists | `renderMerchantReceivingMethodsPage` | `/merchant/receiving-methods` | list + empty fallback | aligned | `Card`, `EmptyState`, `StatusChip` | create/edit form is minimal |
| 8 | Banques | exists | `renderMerchantBanksPage` | `/merchant/banks` | enabled/configure/pause | aligned | `Card`, `StatusChip` | no dedicated backend data wiring in web route |
| 9 | Paiements à vérifier | exists | `renderMerchantReviewQueuePage` | `/merchant/review-queue` | list + filters | aligned | `ReviewPaymentCard`, `Button` | static fixture rows in web demo |
| 10 | Détail paiement | exists | `renderMerchantPaymentDetailPage` | `/merchant/review-queue/:paymentId` | review detail | aligned | `StatusPanel`, `PaymentAmountBlock`, `Button` | confirm/reject is display-only in web demo route |
| 11 | Commandes | exists | `renderMerchantOrdersPage` | `/merchant/orders` | order rows | aligned | `Card`, `StatusChip`, `BottomNav` | backend live order list not wired here |
| 12 | Détail commande | exists | `renderMerchantOrderDetailPage` | `/merchant/orders/:orderId` | detail rows | aligned | `StatusPanel`, `PaymentAmountBlock` | backend live detail not wired here |
| 13 | Site ou application connecté | exists | `renderConnectedSitePage` | `/merchant/connected-site` | active + latest deliveries | aligned | `StatusPanel`, `Card`, `PaymentAmountBlock` | developer details are still a link placeholder |
| 14 | Téléphone Receiver | exists | `renderReceiverPhonePage` | `/merchant/receiver-phone` | action-required health | aligned | `StatusPanel`, `PaymentAmountBlock` | live receiver status not wired in web route |
| 15 | Tests | exists | `renderTestsPage` | `/merchant/tests` | ready/action/error states | aligned | `StatusPanel`, `Button` | test execution remains backend-owned |
| 16 | Paramètres | exists | `renderSettingsPage` | `/merchant/settings` | section shell | aligned | `Card`, `BottomNav` | settings subsections are shell links |

## Buyer Checkout Screens

| # | Screen | Status | File / component | Route | Visual state | Labels | Debt |
|---|---|---|---|---|---|---|---|
| 17 | Pay with SwimPay intro | exists | `CheckoutScreen.ts` / `renderCheckoutPage` | `/checkout/:paymentSessionId` | summary + instructions shell | safe | copy still uses existing checkout structure |
| 18 | Choisir une banque | exists | `renderReceiverBankSelection` | same | bank-first list | safe | visual polish deferred |
| 19 | Choisir comment payer | exists | `renderReceivingRouteSelection` + `renderPayerLauncherSelection` | same | route + launcher choices | safe | not separate pages |
| 20 | Instructions carte | partial | `renderInstructions` | same | selected route instructions | safe | card/phone distinction is data-driven, not separate component |
| 21 | Instructions téléphone | partial | `renderInstructions` | same | selected route instructions | safe | same as above |
| 22 | Ouvrir votre banque | exists | `renderPayerLauncherSelection` | same | fallback launcher list | safe | no real installed-app detection |
| 23 | Paiement en attente | partial | `mapCheckoutStatus` + page summary | `/checkout/:id/status` | status chip | safe | could become dedicated screen state |
| 24 | Recherche du signal | partial | status mapping | `/checkout/:id/status` | status API | safe | no dedicated visual panel yet |
| 25 | Signal détecté | partial | status mapping/runtime docs | `/checkout/:id/status` | status API | safe | no dedicated visual panel yet |
| 26 | Vérification en cours | partial | `needs_review` mapping | same | buyer-safe status | safe | no dedicated visual panel yet |
| 27 | Paiement validé | partial | recognized statuses | same | status chip | safe | no dedicated visual panel yet |
| 28 | Session expirée | exists | expired status renders existing page | same | expired copy in tests | safe | could use stronger visual state |
| 29 | Paiement non validé | partial | rejected/not_validated mapping | same | status API | safe | no dedicated visual panel yet |

## Component Inventory

- Shell and layout: `AppShell`, `SwimPayBrand`, `PageHeader`, `BottomNav`.
- Base primitives: `Button`, `Card`, `StatusChip`, `StatusPanel`, `IconBubble`, `StepProgress`.
- Merchant data cards: `MetricCard`, `ReviewPaymentCard`, `PaymentAmountBlock`, `EmptyState`.
- Checkout primitives: `CopyField`, `OptionButton`.

## Iconography

Current frontend uses consistent icon bubbles and letter placeholders when official/verified bank logos are not integrated. This avoids approximating real bank logos. A future visual pass should replace placeholders with a vetted icon set and official bank brand assets only when approved.

## Jargon / Copy Findings

Merchant web UI is guarded against:
- HMAC, package/cert, TO_VERIFY, approved_for_review_only, official_bank_confirmation.
- signal runtime, template confidence, receiver route, webhook payload.
- auto-confirm bancaire, confirmation bancaire officielle, Payment Signal Engine, bank evidence, production trust.

Allowed merchant wording is used:
- paiement détecté, à vérifier, validé, rejeté, moyen de réception, téléphone connecté, site ou application connecté, notification envoyée, validation manuelle en bêta.

## Risk Notes

- Web merchant screens are still demo/static in several places and should not be mistaken for live backend route coverage.
- Buyer checkout has the correct bank-first logical flow, but several buyer status states remain partial visual states.
- Android premium UI has separate screens and runtime wiring, but this inventory did not rewrite Android Compose screens.
