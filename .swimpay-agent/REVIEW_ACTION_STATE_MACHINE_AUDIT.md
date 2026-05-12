# Review Actions + Payment State Machine Audit

Date: 2026-05-12

## Summary

Real device testing showed that Android Merchant can display a `manual_bank_check` review and its action buttons, but action execution returns `Action indisponible`.

Root cause found before implementation:

- `GET /v1/reviews` uses Android Merchant mobile authentication.
- `POST /v1/reviews/:id/reject` uses Android Merchant mobile authentication.
- `POST /v1/reviews/:id/confirm` still requires dashboard/BFF merchant context with CSRF and does not allow Android mobile sessions.
- Android mobile permissions include `payments.review.read` and `payments.review.reject`, but not `payments.review.confirm`.
- Existing `apps/api/src/android-merchant.test.ts` explicitly asserted that Android mobile confirmation must be rejected. That test is now contradictory with the current product truth: Android may call backend manual confirmation, but must not confirm locally.

## Backend Review Actions

| Area | Status | Evidence |
|---|---|---|
| `GET /v1/reviews` | aligned | Uses `requireAndroidMerchantId`, lists open reviews for the mobile merchant. |
| `POST /v1/reviews/:id/reject` | partial | Uses `requireAndroidMerchantId`; supports `scope=signal` and `scope=order`. |
| `POST /v1/reviews/:id/confirm` | contradictory | Uses `resolveMerchantContext(... requireCsrf: true)` without `allowAndroidMobile`; Android token receives auth/CSRF failure. |
| Confirm body validation | aligned | Accepts optional `actor_id`, `reason`, `feedback_label` with `true_payment` allowed. |
| Reject body validation | aligned | Accepts `scope=signal/payment_session/order` and safe rejection reasons. |
| `manual_bank_check` confirmation type | aligned | Repository derives `manual_bank_check` when `review.signal_id` is absent. |
| Public webhook guardrail | aligned | Review event remains final-only after merchant action; `official_bank_confirmation=false`. |
| Structured errors | partial | Backend has `review_not_open`, `not_found`, `already_confirmed`, `review_rejection_scope_conflict`; missing canonical aliases like `review_already_final`. |

## Android Review Actions

| Area | Status | Evidence |
|---|---|---|
| Review queue/detail loading | aligned | Mobile app reads `/v1/reviews` and `/v1/android-merchant/payments/:id`. |
| `CONFIRMER REÇU` | partial | UI button exists locally, posts `/v1/reviews/:id/confirm`, but backend rejects mobile auth. |
| `REJETER LE SIGNAL` | partial | Posts `/v1/reviews/:id/reject` with `scope=signal`, valid reason `wrong_signal`. Needs ADB verification after confirm fix. |
| `Rejeter la commande` | partial | Posts `/v1/reviews/:id/reject` with `scope=order`, valid reason `buyer_not_recognized`. Needs ADB verification. |
| Error display | partial | Non-2xx is currently collapsed to `Action indisponible`, hiding the specific backend reason. |
| Local confirmation | aligned | Android does not update payment state without backend response. |

## Shared Contracts

| Contract | Status | Notes |
|---|---|---|
| `OrderStatus` | aligned | Uses SwimPay states including `receiver_armed`, `needs_review`, `manual_confirmed`, `rejected`, `expired`. |
| `PaymentSessionStatus` | partial | Lacks explicit `cancelled`; otherwise aligned with current V1 flow. |
| `ReviewStatus` | partial | Existing statuses are `open`, `confirmed`, `rejected`, `cancelled`; product names map to `open`, `confirmed`, `rejected`. |
| `ConfirmationType` | aligned | `notification_signal` or `manual_bank_check`, never official bank confirmation. |
| Review actions | partial | Backend action strings are internal `confirmed`/`rejected`; UI-level canonical actions need mapping. |

## Current Runtime States

| State Surface | Status | Notes |
|---|---|---|
| `review_queue` fallback review | aligned | No-signal fallback creates open review with no `signal_id`, which maps to `manual_bank_check`. |
| `orders` on confirm | aligned | Moves to `manual_confirmed`, not direct PSP/bank confirmation. |
| `payment_sessions` on confirm | aligned | Moves to `manual_confirmed` and releases route lock/amount lease. |
| `reject_signal` | aligned | For signal reviews it can reject only the signal/review without final public confirmed webhook. |
| `reject_order` | aligned | Order-scope rejection moves order/session to `rejected`. |

## Receiver Armed Window

| Area | Status | Evidence |
|---|---|---|
| `receiver_armed_at` write | aligned | `markReceiverArmed` writes `receiver_armed_at` when `continue_to_bank` transitions from `receiver_arming`. |
| `receiver_arm_expires_at` | missing | No dedicated column found; current effective window is `payment_sessions.valid_until` / expiry. |
| Fallback 120s anchor | aligned | Worker and repository logic use `receiver_armed_at + NO_NOTIFICATION_FALLBACK_MIN_SECONDS`. |
| Disarm on final state | partial | Final state updates release route lock/amount lease, but no explicit receiver arm expiry column is cleared. |

## Classification

- aligned: review listing, reject endpoint auth, manual bank check confirmation type, no auto-confirmation, public webhook guardrails, fallback timestamp anchor.
- partial: Android action UX/error mapping, ReviewStatus naming, missing explicit receiver arm expiry, structured error taxonomy.
- missing: Android-mobile permission for `payments.review.confirm`; optional dedicated `receiver_arm_expires_at`.
- contradictory: Android mobile confirmation was deliberately blocked by existing API test while the current product truth requires backend-owned manual confirmation from Android.
- unsafe: none found that auto-confirms locally or treats fallback as bank confirmation.
- needs_tests_only: `reject_signal` and `reject_order` need ADB verification after API alignment.

