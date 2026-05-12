# Next Action

generated_at: 2026-05-13T00:59:00+03:00

## Completed Locally In This Pass

1. Persisted safe SDK/API `return_url` on orders for confirmed checkout return UX.
2. Exposed `return_url` through order, payment-session and checkout-status contracts.
3. Hosted checkout now uses stored merchant return URL before native-scheme/browser fallback.
4. Enriched final webhook payloads with `external_id`, amount, currency and status.
5. Final webhook worker now emits fulfillment webhooks for manual merchant decisions from both notification-signal reviews and no-notification manual-bank-check reviews.
6. Added targeted API/web/job-worker regression tests.

## Next Recommended Action

1. Apply migration `022_checkout_return_url_and_webhook_payload.sql` on staging.
2. Redeploy API, web and job-worker.
3. Create an external-app SDK order with `external_id` and `return_url`.
4. Confirm the review in Android Merchant.
5. Verify buyer checkout shows confirmed, then `Retourner au marchand` opens the configured return URL.
6. Verify the external backend receives signed `payment.confirmed`, verifies `SwimPay-Signature`, and fulfills by `external_id`.

## Do Not Do

- Do not use `return_url` as fulfillment proof.
- Do not put webhook secrets or API keys in `return_url`.
- Do not handle webhook secrets in Android.
- Do not change final-only webhook semantics.

## Previous Pass

## Completed Locally In This Pass

1. Fixed checkout `Retourner au marchand` for Android SDK custom return schemes.
2. `SwimPayCheckout.open(...)` now forwards `returnScheme` to hosted checkout as `swimpay_return_scheme`.
3. Hosted checkout now renders a safe native return URL after confirmation.
4. Unsafe return schemes are rejected and fall back to browser history.
5. Added targeted web and Android SDK guardrail tests.

## Next Recommended Action

1. Redeploy web to staging.
2. Rebuild/update the external Android app with the updated SDK code.
3. Open checkout with `SwimPayCheckoutOptions(returnScheme = "merchantapp", bankLauncherScheme = "merchantapp")`.
4. Confirm the review in Android Merchant.
5. Tap `Retourner au marchand` and verify the external app receives `merchantapp://swimpay-return?...`.

## Do Not Do

- Do not treat the app return as payment proof.
- Do not confirm locally in Android.
- Do not change webhook final-only semantics.

## Previous Pass

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
