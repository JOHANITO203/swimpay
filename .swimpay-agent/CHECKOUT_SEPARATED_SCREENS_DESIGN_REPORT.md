# Checkout Separated Screens Design Report

Date: 2026-05-10

## Scope

Refactor design-only of the hosted buyer checkout page.

This sprint did not change:
- payment confirmation semantics;
- webhook semantics;
- receiver notification capture;
- matching decisions;
- PAN/phone privacy boundaries;
- Android runtime behavior.

## Current UX Audit

The previous checkout was functionally useful but visually behaved like a long continuous block. On mobile it made the buyer see intro, form, summary and status material in one vertical run, which reduced the guided flow feeling.

Main issues addressed:
- too much stacked content visible at once;
- weak separation between onboarding, buyer info, instructions and waiting state;
- less premium visual hierarchy than the target mockups;
- typography and numeric data did not yet use the intended fintech pairing;
- copy actions were present but not visually prioritized enough;
- step progress was functional but not close to the segmented Apple-like reference.

## Design References

Used:
- `ui-ux-pro-max` checklist for mobile-first layout, touch targets, accessibility, reduced motion and premium fintech hierarchy;
- 21st component inspiration for checkout/payment layout patterns, without copying unsafe card-CVV/expiry patterns;
- public Google Stitch reference only as inspiration: https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/. No installed Google Stitch MCP connector was available in this workspace.

## Visual Tokens Applied

- Primary: `#00AFC2`
- Navy text: `#061426`
- Page background: `#F7FAFC`
- Surface: `#FFFFFF`
- Card radius: `32px`
- Button radius: `22px`
- Shadow: diffuse Apple-like elevation
- Display font: Outfit
- Interface font: Inter
- Data font: JetBrains Mono

## Implementation

Changed files:
- `apps/web/src/screens/CheckoutScreen.ts`
- `apps/web/src/ui/Components.ts`

The checkout is now structured as separated visual screens:
1. Intro
2. Buyer information
3. Payment instructions
4. Payment status

The backend state machine is preserved. Existing internal checkout steps still map into the new visual stages, so the UX changed without changing the payment runtime.

## Components/Surfaces Added

In `CheckoutScreen.ts`:
- checkout brand header;
- segmented progress bar;
- intro card;
- feature cards;
- isolated buyer identity card;
- method selector cards;
- secure method-specific input behavior;
- instruction card;
- copyable payment rows;
- session countdown pill;
- status timeline;
- trust footer.

The buyer information card is hidden until the user taps the intro CTA, so the page no longer reads as one long block.

## Business Rules Preserved

- `Continuer vers ma banque` / bank open path still only arms the receiver.
- `J'ai paye` remains a buyer claim only.
- No payment is confirmed by the checkout UI.
- Signal detected copy does not imply final confirmation.
- Public fulfillment remains final-only after merchant manual confirmation.
- PAN/phone are not displayed after submit.
- No raw notification text, API key, webhook secret, raw phone or raw card values were exposed.

## Accessibility and Motion

Implemented:
- icon-only copy buttons have labels;
- form labels are visible;
- mobile-first max-width flow;
- touch-friendly CTA sizes;
- `prefers-reduced-motion` fallback for animations;
- screen-reader fallback text for legacy labels used by tests and business copy.

## Validation

Fresh validation run:
- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: pass, 78 files / 607 tests
- `npm run build`: pass
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: pass
- `npm run android:doctor`: pass

Android Gradle was not run because this was a web-only checkout design change.

## Known Limits

- No browser screenshot verification was run in this pass.
- No staging redeploy was triggered in this pass.
- Google Stitch was checked as a public reference, but no Stitch MCP integration was installed/callable here.

## Next Logical Step

1. Deploy/sync to staging.
2. Open a real hosted checkout URL on mobile and desktop.
3. Verify the four visual screens:
   - intro;
   - buyer info;
   - instructions;
   - waiting/status.
4. Confirm copy buttons, bank open CTA and buyer paid claim still hit the existing backend routes.
5. Then move to Android runtime validation sprint for launcher/deeplink behavior.
