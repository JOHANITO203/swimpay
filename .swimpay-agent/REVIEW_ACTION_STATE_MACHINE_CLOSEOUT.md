# Review Action State Machine Closeout

Date: 2026-05-12

## 1. Why `Action indisponible` happened

Android could read reviews but could not confirm them because `/v1/reviews/:id/confirm` required dashboard/BFF CSRF auth and did not allow Android mobile sessions. The mobile permission list also missed `payments.review.confirm`.

## 2. Backend actions supported

- Confirm received: `POST /v1/reviews/:id/confirm`
- Reject signal: `POST /v1/reviews/:id/reject`, `scope=signal`
- Reject order: `POST /v1/reviews/:id/reject`, `scope=order`

## 3. Canonical states

- Order final states: `manual_confirmed`, `rejected`, `expired`, `fulfilled`.
- Payment session final states: `manual_confirmed`, `rejected`, `expired`.
- Review states: `open`, `confirmed`, `rejected`, `cancelled`.

## 4. `CONFIRMER REÇU` on `manual_bank_check`

Implemented and covered by backend test. It confirms through backend merchant action with `confirmation_type=manual_bank_check` and `official_bank_confirmation=false`.

## 5. `REJETER LE SIGNAL`

Supported via `scope=signal`. For no-signal fallback reviews, backend may coerce to order-level rejection because there is no signal object.

## 6. `Rejeter la commande`

Supported via `scope=order`, sets order/session to `rejected` through backend.

## 7. Receiver armed duration

The explicit receiver arm window is now represented by `receiver_arm_expires_at`, initialized from `payment_sessions.valid_until`.

## 8. Fallback 120s timestamp

The fallback is anchored on `receiver_armed_at`, not `buyer_claimed_paid_at`.

## 9. Tests passed

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- Android targeted JVM tests
- Android full JVM tests
- Android debug APK build
- Android staging APK build

## 10. Blockers before polish

- Staging must be redeployed with this backend change.
- Staging DB must apply `packages/database/migrations/019_review_action_state_machine.sql`.
- Real device button success against staging should be verified only after redeploy/migration. The APK was installed and launched, but live staging action success was not claimed before backend redeploy.

