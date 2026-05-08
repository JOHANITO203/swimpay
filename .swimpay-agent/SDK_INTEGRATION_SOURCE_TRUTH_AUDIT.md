# SDK / Integration Source Truth Audit

Date: 2026-05-08

## Node SDK

Files:
- `packages/swimpay-node/src/orders.ts`
- `packages/swimpay-node/src/webhooks.ts`

Result:
- Creates orders server-side only.
- Rejects `auto_confirm` and `autoConfirm` inputs.
- Requires raw body for webhook verification.
- Accepts only `payment.confirmed`, `payment.rejected`, `payment.expired`.
- Rejects official-bank-confirmation truthy payloads and raw PII keys.

## Android SDK

Files:
- `packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayCheckout.kt`

Result:
- Opens checkout URL.
- Parses return URL.
- Does not contain merchant secret key.
- Does not handle webhooks.
- Does not confirm payment.
- Does not interact with Receiver notification internals.

## Developer Integration Wizard

Result:
- Snippets keep secret key server-side.
- Android examples use checkout helper only.
- Webhook fulfillment is shown only after verified `payment.confirmed`.

## Result

Aligned.

