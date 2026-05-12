# Review Action State Test Report

Date: 2026-05-12

## Tests Added Or Updated

Backend:

- Android mobile manual confirmation through backend.
- Android mobile `manual_bank_check` confirmation with `confirmation_type=manual_bank_check`.
- Android mobile signal rejection with `scope=signal`.
- Android mobile order rejection with `scope=order`.
- The old test that blocked Android mobile confirmation was replaced because it contradicted current product truth.

Android JVM:

- `CONFIRMER REÇU` posts to backend confirmation endpoint.
- Confirmation request includes `feedback_label=true_payment`.
- Android does not include webhook behavior in action payload.
- Resolved backend action remains visible even when the review disappears from detail reload.
- Already-closed review errors show a resolved state, not a broken screen.

## Validation Passed

- `npm test -- --run apps/api/src/android-merchant.test.ts apps/api/src/reviews.test.ts apps/api/src/payment-sessions.test.ts`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests "com.swimpay.receiver.PremiumMerchantRuntimeContractTest" --no-daemon --stacktrace --max-workers=1`
- Full root `npm test`: 77 files, 663 tests.
- Full Android JVM tests: 211 tests.

## Guardrails Verified

- No Android local confirmation.
- No public webhook before backend merchant action.
- `official_bank_confirmation=false`.
- No raw notification/PAN/phone in action payloads.
- No auto-confirmation.

