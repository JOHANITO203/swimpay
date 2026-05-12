# Next Action

generated_at: 2026-05-12T19:05:00+03:00

## Latest Mobile-First Review Actions Realignment

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
