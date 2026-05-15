# Android Frontend Contract Wiring Plan

Date: 2026-05-15

## Goal

Align Android Merchant frontend actions with existing contracts and remove false UI affordances without adding new features.

## Phase 1 Completed In This Pass

- Wire dashboard widgets to existing screens.
- Wire dashboard `Voir tout`.
- Wire Business empty-state secondary action.
- Remove Business search/filter controls that had no behavior.
- Keep receiving-method CRUD wired and improve action feedback.

## Phase 2 Recommended

1. Keep Android manual confirmation backend-owned.
   - Product decision: Android Merchant may submit the merchant's manual confirmation.
   - Guardrail: Android must call the backend review action only; no local confirmation, no direct webhook delivery.
   - Tests must continue to assert `confirmReceived` uses `/v1/reviews/:id/confirm` and does not include webhook payloads.

2. Reconcile docs.
   - Update Android screen docs to prefer `/receiving-methods`.
   - Mark `/receiving-routes` as backend/internal compatibility.

3. Simplify integration UI.
   - Keep backend wiring.
   - Hide developer-only details behind explicit developer action.
   - Keep merchant default view: status, configure, test, guide.

4. Add static guardrails.
   - No source-visible `onValueChange = {}` in merchant runtime screens unless explicitly read-only.
   - No visible button/card with empty/default action in runtime entry points.
   - No Android-local confirmation or direct webhook emission.

5. Device QA.
   - Accueil metric cards route correctly.
   - Business empty-state action routes correctly.
   - Receiving-method actions call backend and show feedback.
   - Integration actions are still wired.
