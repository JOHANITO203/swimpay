# Payment Review State Machine Spec

Date: 2026-05-12

## Canonical Mapping

### Order

Existing SwimPay order states are kept:

- `created`
- `awaiting_buyer_identity`
- `payment_session_created`
- `receiver_arming`
- `receiver_armed`
- `payment_instructions_shown`
- `awaiting_payment`
- `buyer_claimed_paid`
- `signal_detected`
- `matching`
- `needs_review`
- `manual_confirmed`
- `rejected`
- `expired`
- `fulfilled`

Final states:

- `manual_confirmed`
- `rejected`
- `expired`
- `fulfilled`

### Payment Session

Existing SwimPay payment session states are kept:

- `created`
- `receiver_arming`
- `receiver_armed`
- `awaiting_payment`
- `buyer_claimed_paid`
- `signal_detected`
- `matching`
- `needs_review`
- `manual_confirmed`
- `rejected`
- `expired`

Final states:

- `manual_confirmed`
- `rejected`
- `expired`

### Review

Existing backend statuses are kept and mapped:

- product `open` / `needs_review` -> backend `open`
- product `merchant_confirmed` -> backend `confirmed`
- product `merchant_rejected` -> backend `rejected`
- product `cancelled` -> backend `cancelled`

## Canonical UI Actions

| UI label | Canonical action | Backend request |
|---|---|---|
| `CONFIRMER REÇU` | `confirm_received` | `POST /v1/reviews/:id/confirm` |
| `REJETER LE SIGNAL` | `reject_signal` | `POST /v1/reviews/:id/reject`, `scope=signal` |
| `Rejeter la commande` | `reject_order` | `POST /v1/reviews/:id/reject`, `scope=order` |

## Rules

### `confirm_received`

- Requires review status `open`.
- Accepts `notification_signal` and `manual_bank_check` reviews.
- Writes backend manual decision only.
- Sets order/session to `manual_confirmed`.
- Uses `confirmation_type=notification_signal` when review has `signal_id`.
- Uses `confirmation_type=manual_bank_check` when review has no `signal_id`.
- Always returns `official_bank_confirmation=false`.
- Emits final public confirmation only after backend accepts merchant action.
- Android never confirms locally.

### `reject_signal`

- Requires review status `open`.
- Rejects the review/signal.
- Does not emit `payment.confirmed`.
- Does not turn a fallback into bank confirmation.
- For no-signal fallback reviews, backend may coerce this to order-level rejection because there is no signal object to reject.

### `reject_order`

- Requires review status `open`.
- Sets order/session to `rejected`.
- Emits final public rejection only after backend accepts merchant action.
- Always keeps `official_bank_confirmation=false`.

### Invalid Or Final Reviews

Backend returns structured errors:

- `not_found`
- `review_not_open`
- `already_confirmed`
- `review_rejection_scope_conflict`

Android displays a short safe message and must not mutate local state as if the action succeeded.

## Receiver Armed Window

- Starts at `continue_to_bank` / `markReceiverArmed`.
- Current stored anchor: `payment_sessions.receiver_armed_at`.
- No-notification fallback due time: `receiver_armed_at + 120s`.
- Effective arm expiry: current payment session validity (`valid_until`) until an explicit `receiver_arm_expires_at` field is introduced.
- Ends on final payment state: `manual_confirmed`, `rejected`, `expired`, or session validity expiry.

