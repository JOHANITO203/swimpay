# Frontend Browser QA Report

generated_at: 2026-05-04T22:15:00+03:00

## Scope

Frontend-only visual QA for merchant and buyer checkout screens.

No backend, API, contract, worker, database, payment decision, Android notification processing, webhook behavior, real notification handling or auto-confirmation logic was changed.

## Viewports Tested

- Mobile small equivalent: Chrome headless captured with 720px width because this local Windows headless build renders the CSS viewport at roughly 2x when asked for 360px. The 720px captures were used as the reliable mobile visual evidence.
- Mobile large equivalent: 860px wide capture.
- Tablet: 768px wide capture.
- Desktop: 1366px wide capture.

## Screens Inspected

Merchant screens:

- Onboarding 1: welcome.
- Onboarding 2: notification access.
- Onboarding 3: bank selection.
- Onboarding 4: receiving method.
- Onboarding 5: configuration test.
- Dashboard.
- Receiving methods.
- Review queue.
- Payment detail.
- Connected site/application.

Buyer checkout screens:

- Intro and bank-first selection.
- Route/method selection.
- Payer launcher.
- Card instructions.
- Phone instructions.
- Searching signal.
- Needs review.
- Confirmed.
- Expired.
- Rejected/not validated.
- Desktop QR handoff.

## Browser QA Artifacts

Representative screenshots were saved in `.swimpay-agent/browser-qa/`, including:

- `mobile-css__merchant-onboarding-1.png`
- `mobile-css__merchant-dashboard.png`
- `mobile-css__merchant-receiving-methods.png`
- `mobile-css__merchant-review-queue.png`
- `mobile-css__merchant-payment-detail.png`
- `mobile-css__merchant-connected-site.png`
- `mobile-css__checkout-bank.png`
- `mobile-css__checkout-route.png`
- `mobile-css__checkout-launcher.png`
- `mobile-css__checkout-instructions-card.png`
- `mobile-css__checkout-instructions-phone.png`
- `mobile-css__checkout-searching.png`
- `mobile-css__checkout-review.png`
- `mobile-css__checkout-confirmed.png`
- `mobile-css__checkout-expired.png`
- `mobile-css__checkout-rejected.png`
- `mobile-large-css__merchant-dashboard.png`
- `mobile-large-css__checkout-instructions-phone.png`
- `tablet__merchant-dashboard.png`
- `tablet__checkout-bank.png`
- `desktop__merchant-dashboard.png`
- `desktop__checkout-bank.png`
- `desktop__checkout-instructions-card.png`

## Problems Found

1. Small mobile capture initially showed right-side clipping on brand text, titles, subtitles, cards and checkout instruction rows.
2. The underlying issue was responsive contraction: flex/grid children and large headings did not always shrink or wrap safely.
3. Checkout destination rows and action rows needed stronger mobile wrapping so masked route values and copy buttons do not overflow.
4. Desktop QR handoff placeholder looked too weak compared with the premium card surface.
5. Chrome headless on this local machine left stale headless processes during an earlier screenshot attempt; these were stopped by matching only headless/screenshot command lines.

## Visual Fixes Applied

Updated `apps/web/src/ui/Components.ts`:

- Added shell-level horizontal overflow protection.
- Made `.screen` and `.screen-content` explicitly width-aware and shrinkable.
- Added mobile spacing reduction for 430px-class devices.
- Added safer brand sizing at narrow widths.
- Added mobile title and subtitle clamps.
- Added `min-width: 0` to cards and content regions that can overflow.
- Reduced mobile button/card/icon typography and spacing.
- Improved fixed bottom nav safe-area padding.

Updated `apps/web/src/screens/CheckoutScreen.ts`:

- Made buyer checkout content, cards, sections and side panels shrinkable.
- Added mobile wrapping for instruction destination rows.
- Made copy buttons full-width inside very narrow instruction rows.
- Reduced buyer checkout title/card sizes at narrow widths.
- Strengthened QR placeholder contrast and visual presence.

## Result

The reliable mobile/tablet/desktop screenshots show:

- no visible right-side clipping in the inspected mobile-equivalent screenshots;
- bottom navigation no longer covers inspected primary content;
- checkout card and phone instruction screens remain masked and action-oriented;
- desktop QR handoff is visually clearer;
- merchant and buyer wording remains safe and does not claim official bank confirmation.

## Limits

- The local Chrome headless 360px screenshot path is unreliable on this Windows setup because it captures a cropped physical slice. Reliable visual evidence was produced with CSS-equivalent mobile captures instead.
- This pass did not perform Android native visual QA.
- This pass did not modify copy beyond layout behavior.

## Safety

- No real bank notifications processed.
- No SMS or scraping introduced.
- No raw card, raw phone or raw notification text added to UI.
- No backend/API/contract changes.
- No payment logic or state machine changes.
- No auto-confirmation enabled.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: failed once because `.swimpay-agent/browser-qa/mock-server.mjs` needed an explicit `console` global for ESLint, then passed after adding that file-local lint annotation.
- `npm test`: passed, 54 files / 382 tests.
- `npm run build`: passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: passed.
