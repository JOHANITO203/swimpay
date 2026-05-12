# Next Action

generated_at: 2026-05-12T22:55:00+03:00

## Completed Locally In This Pass

1. Audited buyer checkout final-state propagation after merchant review confirmation.
2. Confirmed backend manual review decision already updates the payment session to `manual_confirmed`.
3. Added status polling to the hosted checkout waiting screen.
4. Added no-store headers to API and hosted web checkout status endpoints.
5. Made rejected buyer-safe status explicit in the shared checkout contract.
6. Added targeted contract/API/web tests for confirmed/rejected final state propagation.

## Next Recommended Action

1. Redeploy API/web to staging.
2. Create/open a real external-app checkout URL.
3. Confirm the merchant review from Android Merchant.
4. Verify the buyer checkout updates to `Paiement confirme` without manual browser refresh.

## Do Not Do

- Do not enable auto-confirmation.
- Do not treat signal detection as confirmation.
- Do not process real bank notifications in this sprint.
- Do not change public webhook semantics.

## Previous Pass

## Completed Locally In This Pass

1. Removed stale visual blockers from `.swimpay-agent/BLOCKERS.md`.
2. Added Android Roborazzi goldens for:
   - Moyens de reception;
   - Developer Integration;
   - Mode confirmation.
3. Kept hosted checkout browser baselines active and regenerated after checkout bank-selector changes.
4. Marked Ozon Bank operator runtime-verified for manual-review-only V1 use.
5. Added Ozon Bank as selectable sender/receiver bank in contracts.
6. Added documented Ozon placeholder icon `ic_bank_ozon`.
7. Exposed bank logo asset keys in checkout sender-bank selection and receiver-bank payment instructions.
8. Rendered bank logos on Android Merchant review cards.
9. Replaced Android local notification small icons with registered monochrome vector `ic_notification_small`.

## Next Recommended Action

1. Apply migration `021_ozon_bank_runtime_verified.sql` on staging.
2. Build/install the staging APK for device verification.
3. Only after the staging smoke is clean, continue official bank logo polish if approved assets are provided.

## Do Not Do

- Do not enable auto-confirmation.
- Do not treat runtime verified as official bank confirmation.
- Do not process real bank notifications in this polish pass.
- Do not add unregistered/generated bank logos.
