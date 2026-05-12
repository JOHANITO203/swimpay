# Next Action

generated_at: 2026-05-12T19:05:00+03:00

## Latest Visual Quality Gate / Android Premium Design System

Completed locally:

1. Audited visual source of truth across Android assets, hosted checkout brand usage and premium tokens.
2. Created `design/ASSET_REGISTRY.md`.
3. Added centralized premium token primitives for elevation, icon sizes, component sizes, tones and gradients.
4. Added static Android visual guardrail tests for official assets and token availability.
5. Documented the screenshot/golden testing gap and a manual visual QA protocol.

Next recommended action:

1. Run full repo validation.
2. Add Paparazzi or an equivalent Compose screenshot testing dependency for stable Android Merchant screens.
3. Record goldens for dashboard, review list, review detail and Receiver Health.
4. Align runtime SwimPay marks to the official asset registry in a dedicated visual polish sprint.

Do not do:

- Do not change payment runtime logic for visual polish.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not create new logos or generated bank assets without updating `design/ASSET_REGISTRY.md`.

## Previous Mobile-First Review Actions Realignment

Completed locally:

1. Treated Android Merchant as the priority review-action surface.
2. Kept merchant web dashboard secondary/frozen without deleting it.
3. Root-caused a CSRF/BFF ordering bug where dashboard cookies could block Android mobile review actions.
4. Updated merchant context resolution so valid `spm_...` Android bearer tokens are resolved before dashboard BFF cookies on Android-enabled routes.
5. Added regression coverage for Android review action + stale dashboard cookie + no CSRF.
6. Targeted API tests passed.

Next recommended action:

1. Run full repo validation before push if this is bundled with the Android polish changes already in the worktree.
2. Redeploy staging.
3. Re-test Android Merchant review actions from the app:
   - `CONFIRMER RECU`;
   - `REJETER LE SIGNAL`;
   - `Rejeter la commande`.

Do not do:

- Do not build new merchant web dashboard features.
- Do not touch hosted buyer checkout or SDK web surfaces unless directly required.
- Do not process real bank notifications during this verification.
- Do not enable auto-confirmation.
- Do not change public webhook semantics.
- Do not expose raw PAN, raw phone, raw notification text or secrets.
