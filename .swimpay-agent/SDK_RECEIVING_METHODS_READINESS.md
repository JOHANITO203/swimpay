# SDK And Receiving Methods Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: ready with staging rehearsal pending.

The SDK and receiving methods contracts are implemented and covered by tests. Live staging SDK order and checkout rehearsal is still required.

## Evidence

- `packages/swimpay-node/src/index.test.ts`
- `packages/swimpay-node/src/orders.ts`
- `packages/swimpay-node/src/webhooks.ts`
- `packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayCheckout.kt`
- `tests/sdk-android-product-truth.test.ts`
- `apps/api/src/payment-sessions.test.ts`
- `apps/web/src/checkout.test.ts`
- `apps/web/src/merchant-routes-admin.test.ts`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantApiWiringTest.kt`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| @swimpay/node order creation | ready | Server-side payload and idempotency tested. |
| Reject auto_confirm / autoConfirm | ready | Node SDK validation tests reject both. |
| Webhook verification | ready | Raw-body signature and event parsing tested. |
| @swimpay/android opens checkout only | ready | SDK contains checkout open/return helpers only. |
| Card receiving method creation | ready | API test creates masked card with last4 and HMAC. |
| Phone receiving method creation | ready | Route tests cover phone transfer masking/HMAC. |
| masked_value | ready | API/web tests assert masked values only. |
| last4 | ready | API test asserts last4. |
| bank_id | ready | API tests bind bank profile id. |
| active/inactive | ready | API route update/disable tests exist. |
| checkout uses active only | ready with staging proof pending | Buyer-safe active route flow and public checkout progression without dev Authorization are tested; live staging proof pending. |

## Missing Proof

Live staging external app order creation, hosted checkout route selection without dev bearer, and final webhook verification after manual confirmation.
