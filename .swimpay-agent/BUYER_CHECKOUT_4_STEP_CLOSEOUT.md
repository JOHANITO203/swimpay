# Buyer Checkout 4-Step Closeout

## Summary

The hosted buyer checkout is now aligned with the V1 four-step product flow:

1. buyer identity and sender method;
2. exact payment instructions;
3. open bank / arm receiver;
4. buyer paid claim and waiting state.

## Results

- Step 1 creates a durable Expected Payment Profile.
- Buyer identity normalization is deterministic and local.
- Card and phone sender hints are masked/HMACed and never returned raw.
- Step 2 filters merchant receiving routes by selected buyer method.
- Step 2 records payment instructions shown.
- Step 3 requires Step 2 and arms the receiver without confirming.
- Step 4 requires receiver armed and remains buyer claim only.
- Signal runtime carries expected profile data into Payment Intent Gate candidates.

## Boundaries Preserved

- No real bank notification processed.
- No auto-confirmation.
- No public webhook semantic change.
- No Android Receiver final confirmation.
- No raw notification text, raw phone/card, API keys or webhook secrets exposed.

## Remaining Follow-up

- Native Android bank package/deeplink launching is not implemented in this hosted-web sprint.
- Deeper card/name variant scoring can be handled in a dedicated matching sprint now that the data is persisted and carried into runtime candidates.

## Addendum 2026-05-09

Added the latest fallback and readiness extensions without processing real bank notifications:

- Active Intent Notification Sweep added on Android for active, armed payment-intent windows only.
- No-notification fallback added after 120 seconds from `receiver_armed` when no signal/review/final state exists.
- Job-worker polling can request due no-notification manual checks when `NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true`.
- Manual confirm after fallback uses `confirmation_type=manual_bank_check`, keeps `official_bank_confirmation=false`, and emits final webhook only after merchant action.
- SBP incoming real-world fixture variant now extracts rail, amount, sender name/bank hints and diagnostic balance.
- Card incoming real-world fixture variant now extracts rail, amount, source label, card network and receiver last4 without requiring sender hints.
- Ozon Bank added through the bank profile/registry mechanism as `review_only` with package validation pending.

Reports:

- `.swimpay-agent/ACTIVE_INTENT_NOTIFICATION_SWEEP_REPORT.md`
- `.swimpay-agent/NO_NOTIFICATION_MANUAL_FALLBACK_REPORT.md`
- `.swimpay-agent/BANK_TEMPLATES_REAL_WORLD_VARIANTS_REPORT.md`
- `.swimpay-agent/OZON_BANK_MANAGER_INTEGRATION_REPORT.md`

## Commands Run

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npx vitest run packages/contracts/src/payment-intent.test.ts apps/api/src/payment-sessions.test.ts apps/web/src/checkout.test.ts --reporter=dot`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm test -- --run apps/api/src/payment-sessions.test.ts apps/api/src/reviews.test.ts apps/job-worker/src/no-notification-fallback.test.ts packages/bank-templates/src/parser.test.ts packages/bank-templates/src/registry.test.ts`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests com.swimpay.receiver.ActiveIntentNotificationSweepTest --no-daemon --stacktrace --max-workers=1`
- `npm test -- --run packages/bank-templates/src/parser.test.ts packages/bank-templates/src/registry.test.ts packages/bank-templates/src/fixtures.test.ts packages/bank-templates/src/drift.test.ts`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

Final validation status: passed.

## Staging Migration

Apply after the VPS has the new repository files:

```bash
cd /etc/dokploy/compose/swimpay-swimpay-merchant-usjsm2/code
sudo docker exec -i swimpay-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < packages/database/migrations/015_no_notification_fallback_and_ozon_bank.sql
```
