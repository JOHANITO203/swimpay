# Sprint 8B — Payment-Intent-Bound SwimPay Intelligence

## Result

Sprint 8B realigned SwimPay Intelligence around active buyer checkout payment intents while preserving Sprint 8A's deterministic, non-LLM, privacy-first foundation.

Core rule implemented:

- No active payment intent = no payment review.
- Background bank activity can remain passive learning/monitoring input, but it does not create merchant payment review.
- `J'ai payé` and bank launcher actions never confirm payment.
- Manual merchant confirmation remains required in V1, including for `Matching 100 %`.

## Preserved Sprint 8A Work

Preserved:

- Android Bank Notification Agent V1 foundation.
- Bank Target Lock.
- Privacy Firewall.
- Direction-aware shape hasher.
- Static five-bank profiles.
- Deterministic parser/classifier.
- Redacted signal upload contract.
- Passive feedback collector.
- Unknown shape monitoring.
- Local drift guard.
- Five-bank fixtures and safety guardrails.

No LLM logic, SMS, Accessibility scraping, bank app scraping, broad package enumeration, raw notification storage or auto-confirmation was added.

## Gap Audit

Created:

- `.swimpay-agent/SWIMPAY_INTELLIGENCE_GAP_AUDIT.md`

Findings:

- Sprint 8A correctly classified redacted bank signals, but did not yet make the active payment intent the mandatory gate before review creation.
- Checkout did not explicitly collect buyer recognition hints as a safe intent input model.
- The bank launcher step did not yet arm the receiver through a dedicated `receiver_armed` mutation.
- Learning metadata did not distinguish intent-bound feedback from background observations.

## Buyer Recognition Hints

Added contract-level safe derivation for:

- buyer first name;
- buyer last name;
- buyer phone HMAC/masked;
- buyer source card encrypted/HMAC/masked/last4.

Rejected fields:

- CVV/CVC/security code;
- expiration/expiry;
- PIN;
- SMS code;
- bank password.

Raw buyer source card and raw phone are not returned by the derivation contract.

Buyer copy added to checkout instructions:

- `Ces informations servent uniquement à reconnaître votre paiement.`
- `SwimPay ne débite pas votre carte.`
- `Sans ces informations, la validation peut prendre plus de temps.`

## Payment Intent Model

Added contract models/helpers for:

- `BuyerRecognitionHints`
- `PaymentIntent`
- `PaymentIntentRelation`
- `IntentBoundLearningMetadata`
- merchant review matching copy

Payment intent fields include display price, expected payment amount, reconciliation delta, generated reference, selected receiver bank, selected receiving method, buyer hints, expiry and status.

## Reconciliation Amount

Added bounded reconciliation amount builder:

- `display_price_minor`
- `reconciliation_delta_minor`
- `expected_payment_amount_minor`
- `buyer_visible_expected_amount_minor`
- `matching_amount_minor`

The buyer-visible expected amount and the matching amount are the same exact amount. Deltas beyond the configured bound are rejected.

## Receiver Armed / Bank Launcher

Added:

- `POST /v1/checkout/:id/continue-to-bank`
- web proxy `POST /checkout/:paymentSessionId/continue-to-bank`
- repository method `markReceiverArmed`

Behavior:

- requires route and payer launcher selection;
- sets payment session/order to `receiver_armed`;
- records `checkout.continue_to_bank`;
- returns `does_not_confirm_payment=true`;
- keeps `official_bank_confirmation=false`.

No new unsupported order status was introduced; the existing `receiver_armed` state is used.

## Payment Intent Gate

Added `evaluatePaymentIntentGate` in `packages/matching-core`.

Relations:

- `expected_payment_candidate`
- `ambiguous_activity`
- `unrelated_bank_activity`
- `negative_activity`
- `unknown_activity`
- `late_payment_candidate`

Review creation is allowed only for:

- expected payment candidate;
- ambiguous activity with active intent;
- unknown activity with active intent and amount/bank/time relation;
- late payment candidate when policy allows review.

Review creation is blocked for:

- no active intent;
- wrong bank;
- unrelated bank activity;
- negative categories.

All outputs set `autoConfirmAllowed=false`.

## Runtime Integration

Signal runtime now avoids creating payment reviews for unmatched/no-intent activity:

- no active candidate from the runtime matching path returns a rejected/ignored runtime result with `no_active_payment_intent_no_review`;
- no review item is created;
- no merchant payment webhook is requested.

This keeps background observations outside the payment-review flow.

## Merchant Review Copy

Added copy helper:

Strong match:

- `Nouveau paiement détecté`
- `Matching 100 %`
- `Veuillez confirmer ce paiement.`

Ambiguous match:

- `Paiement à vérifier`
- `Certains éléments correspondent, mais une confirmation est nécessaire.`

`Matching 100 %` remains manual review copy only and does not enable auto-confirmation.

## Intent-bound Learning Context

Added metadata:

- `learning_context`
- `intent_relation`
- `active_payment_intent_present`
- `collision_detected`
- `payment_window_status`
- `review_created`
- `profile_version`
- `shape_hash`

Feedback does not mutate runtime rules and does not promote profiles.

## Tests Added / Updated

Added:

- `packages/contracts/src/payment-intent.test.ts`
- `packages/matching-core/src/payment-intent-gate.test.ts`

Updated:

- `apps/api/src/payment-sessions.test.ts`
- `apps/web/src/checkout.test.ts`
- `apps/signal-worker/src/runtime.test.ts`

Covered:

- raw buyer card safety;
- no CVV/expiry/PIN/SMS/bank-password fields;
- bounded micro-delta;
- exact expected amount matching;
- rounded/display amount mismatch;
- reference/phone hint matching;
- no active intent no review;
- wrong bank no review;
- negative categories no review;
- unknown with/without active intent;
- late payment candidate review-only;
- collision cautious review;
- `J'ai payé` does not confirm;
- `Matching 100 %` still manual review;
- receiver arming through continue-to-bank.

## Validation

Targeted validation passed before the full run:

- `npm test -- --run packages/contracts/src/payment-intent.test.ts`
- `npm test -- --run packages/matching-core/src/payment-intent-gate.test.ts`
- `npm test -- --run apps/api/src/payment-sessions.test.ts`
- `npm test -- --run apps/web/src/checkout.test.ts`
- `npm test -- --run apps/signal-worker/src/runtime.test.ts`
- `npm test -- --run packages/contracts/src/intelligence.test.ts apps/api/src/intelligence.test.ts packages/matching-core/src/index.test.ts`
- `npm run typecheck`

Fresh required validation run:

- `npm run android:doctor` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 58 test files / 405 tests.
- `npm run build` — passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` — passed.
- Initial `docker compose --env-file .env.example -f infra/docker-compose.yml ps` — Docker was reachable but no services were running.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api proxy` — passed; rebuilt API/web images and started Postgres, Valkey, NATS, API, web and proxy.
- Final `docker compose --env-file .env.example -f infra/docker-compose.yml ps` — passed; Postgres, Valkey, NATS, API, web and proxy are healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` — passed; HTTP 200 with database, NATS and Valkey `ok`.
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` — passed.
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1` — passed.
- Initial `adb devices -l` — no authorized device was listed.
- After reconnect, `adb devices -l` — detected `R5CWA0FEPZW` / Samsung `SM_S916B`.
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` — passed.
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` — passed.
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` — passed.
- `adb -s R5CWA0FEPZW exec-out uiautomator dump /dev/tty` — passed; UIAutomator showed the active premium app shell with `Accueil`, `Revue`, `Ventes`, `Menu`, `SwimPay Intelligence`, `Téléphone connecté` and backend-friendly `Connexion en attente` copy.

## Blockers

No product blocker introduced.

Environment blockers:

- Docker live health blocker resolved after Docker restart and Compose service startup.
- API health through `http://localhost:8080/api-health` passed.
- Real-device smoke is no longer blocked after reconnect; install, launch and UIAutomator dump passed on `R5CWA0FEPZW`.

## Next Recommended Sprint

Sprint 8C:

- persist payment-intent-bound learning metadata durably;
- add operator read-only review surfaces for intent-bound feedback and background observations;
- keep runtime static/non-LLM/no auto-confirm;
- continue using synthetic/redacted data unless explicit real-notification consent is recorded.
