# Frontend Screen Realignment Report

generated_at: 2026-05-04T20:05:00+03:00

## Scope

Frontend-only pass. No backend, API contract, worker, database, payment decision, state machine or Android notification-processing logic was changed.

## Tasks Created

- `tasks/391_frontend_screen_inventory_audit.md`
- `tasks/392_merchant_onboarding_copy_alignment.md`
- `tasks/393_merchant_app_screen_gap_completion.md`
- `tasks/394_merchant_state_empty_error_screens.md`
- `tasks/395_iconography_and_visual_tokens_alignment.md`
- `tasks/396_buyer_checkout_screen_inventory_audit.md`
- `tasks/397_ui_copy_and_jargon_guardrails.md`
- `tasks/398_frontend_screen_realignment_closeout.md`

## Screens Audited

Audited the web merchant surface, web buyer checkout surface and Android frontend screen locations. Full inventory is in `.swimpay-agent/FRONTEND_SCREEN_INVENTORY.md`.

## Screens Created or Completed

Added web routes and renderers for:

- `/merchant/banks`
- `/merchant/orders`
- `/merchant/orders/:orderId`
- `/merchant/receiver-phone`
- `/merchant/tests`
- `/merchant/settings`
- `/merchant/connected-site`

Existing merchant screens retained:

- onboarding steps 1-5
- dashboard
- receiving methods
- review queue
- payment review detail

## Copy Alignment

The five web onboarding screens now use the approved French copy exactly for:

- `Recevez vos paiements plus facilement`
- `Connectez votre téléphone`
- `Choisissez vos banques`
- `Ajoutez votre moyen de réception`
- `Vérifiez que tout fonctionne`

Merchant screens avoid the forbidden technical vocabulary in default public UI.

## States Added

Added simple merchant-facing state panels for:

- ready
- action required
- empty
- error
- offline
- expired
- rejected
- receiver disconnected-style health copy
- webhook failed-style connected-site copy

These are visual states only and do not change backend state machines.

## Iconography / Tokens

Kept SwimPay premium fintech visual grammar:

- Deep navy text
- Teal/cyan accents
- Mint panels
- White surfaces
- Rounded cards
- Soft shadows
- Pill status chips

Icon slots use consistent placeholder bubbles. No fake official bank logos were added.

## Buyer Checkout Audit

Buyer checkout keeps the existing bank-first flow and endpoint behavior. Several buyer states are present through status mapping but remain partial visual states:

- searching signal
- signal detected
- verification in progress
- confirmed
- non-validated

No unsafe official bank confirmation claim was introduced.

## Tests

Updated `apps/web/src/copy-guardrails.test.ts` to cover:

- exact onboarding copy
- merchant screen routes for gaps
- forbidden jargon absence
- payment detail simple reason labels
- checkout no official bank confirmation wording
- normal UI masking for raw phone/card

Validation passed after implementation:

- `npm run typecheck`
- `npm run lint`
- `npm test` (54 files / 373 tests)
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

## Remaining Limits

- Android Compose screens were inventoried but not rewritten in this frontend web pass.
- Several web merchant routes are static/demo renderers pending live data wiring.
- Buyer checkout visual status states should receive a dedicated visual polish pass later.
- Browser screenshot QA remains recommended.

## Blockers

No critical blocker introduced.

## Next Recommended Step

Run a focused browser/device visual QA pass for these frontend screens, then do a small spacing/icon polish pass based only on screenshots and without touching backend/API logic.
