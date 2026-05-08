# Beta Merchant Onboarding Flow

This flow is for private beta readiness. It does not authorize production rollout, real bank auto-confirmation or official bank confirmation claims.

## Merchant-facing Positioning

SwimPay detects merchant-side notification signals.

SwimPay does not provide official bank confirmation.

Ambiguous payments require review.

## Flow

Current Android account and onboarding truth is defined in
`docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.

1. Install SwimPay Receiver on the merchant Android device.
2. Show account entry if no valid mobile merchant session exists.
3. `Créer un compte` creates a lightweight merchant account and starts
   onboarding; `Se connecter` recovers an existing account.
4. Evaluate known/new-device state with privacy-safe device proof.
5. Enable Android Notification Listener Access.
6. Select supported activated bank targets from the V1 list.
7. Configure a receiving method.
8. Choose `Configurer plus tard` or `Ajouter maintenant` on site/application.
9. If `Configurer plus tard`, show a brief success state and enter the app.
10. If `Ajouter maintenant`, configure integration and run a backend-owned
    webhook test only.
11. Create a test order.
12. Receive a synthetic or approved shadow notification signal in review-only
    mode.
13. Merchant reviews the detected signal.
14. Any fulfillment webhook is backend-owned and emitted only after merchant
    manual confirmation or a terminal outcome; Android never sends developer
    webhooks.

Google is optional recovery/linking only and is not required for account
creation or onboarding.

## Permission Wording

Android gives a broad notification access permission. SwimPay applies a local allowlist: only notifications from banks selected by the merchant are analyzed. Other notifications are ignored locally.

Do not say that SwimPay can only read bank notifications. Android grants broader access; SwimPay narrows behavior locally.

## Beta Boundary

- no SMS reading;
- no bank app scraping;
- no official bank confirmation;
- no auto-confirm for real banks;
- no raw phone storage;
- no raw notification text storage by default;
- review-only/shadow-first runtime.
