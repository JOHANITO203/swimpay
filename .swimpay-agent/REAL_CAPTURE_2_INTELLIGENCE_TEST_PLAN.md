# REAL-CAPTURE-2 Intelligence Test Plan

generated_at: 2026-05-08T14:06:07+03:00

## Objective

Prepare SwimPay Intelligence for real notification capture by testing each tool alone, then testing the complete staging payment chain with synthetic evidence before the first real notification capture.

## Test ladder

1. Inventory all active Intelligence tools and boundaries.
2. Prove exact supported-bank detection on the operator phone.
3. Prove Android mobile session, receiver registration and heartbeat.
4. Prove Notification Listener readiness and activated supported-bank gate.
5. Prove synthetic redaction -> encrypted outbox -> signed upload.
6. Prove backend ingestion and Payment Intent Gate.
7. Prove SDK order creation and final-only webhook rehearsal.
8. Prove combined synthetic E2E metrics.
9. Stop for final operator capture-start approval.
10. Capture exactly one operator-owned real bank notification if all prior gates pass.

## Metrics

- app launch to bank detection;
- receiver registration latency;
- heartbeat latency;
- redaction duration;
- outbox enqueue duration;
- signed upload duration;
- backend ingestion duration;
- matching/gate duration;
- review creation latency;
- manual confirmation to webhook delivery latency;
- webhook retry count;
- queue lag;
- failure reason codes.

## Non-negotiable boundaries

- Android does not confirm orders.
- Android does not send developer webhooks.
- No raw notification title/body/bigText/textLines storage or upload.
- No raw phone/card, account data or secrets in reports.
- No SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad installed-app enumeration.
- No auto-confirmation.
- Public webhooks remain final-only: `payment.confirmed`, `payment.rejected`, `payment.expired`.
- `payment.confirmed` fires only after merchant manual confirmation.

## Current evidence

- Staging APK is installable and non-debuggable.
- Staging API health is reachable over HTTPS.
- Operator device launches the staging APK.
- Exact supported-bank visibility is fixed in the main Receiver manifest.
- Operator device now shows 5 detected supported bank apps.
- Public buyer checkout API is now code-validated without a development merchant bearer.

## Current blockers

- Fresh login/create-account/onboarding has not been replayed because app data was preserved.
- Receiving methods exist and persist, but the active staging merchant method must be verified for the SDK rehearsal.
- Connected site/webhook remains action-required.
- Synthetic signed upload from installed staging APK still needs to be run.
- Public checkout fix must be pushed and redeployed before staging SDK checkout rehearsal.
- Real notification capture has not started.
