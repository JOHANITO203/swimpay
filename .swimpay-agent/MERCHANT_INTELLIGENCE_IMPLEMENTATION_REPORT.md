# Merchant Intelligence Implementation Report

generated_at: 2026-05-12T07:00:00+03:00

## Sprint Results

1. Sprint 1 audit: completed. Current runtime was classified across Android listener/sweep, backend arming, fallback worker, reviews, notifications and DB migration surfaces.
2. Sprint 2 Receiver Health Gate: completed locally. `/v1/receiver-devices/heartbeat` now returns `receiver_health` with healthy/degraded/offline signal, notification access, listener recency, outbox depth and bank target count. Android derives `ReceiverRuntimeState`.
3. Sprint 3 active payment window: completed locally. Live listener and active sweeps now require active intent + receiver armed + Expected Payment Profile + locked receiving route before extraction.
4. Sprint 4 redacted-only buffer: completed locally. Recent observations are redacted-only, TTL-limited, duplicate-deduped and reject raw phone/card/raw notification markers.
5. Sprint 5 fallback + merchant notification: completed locally. Existing worker remains manual-review-only; Android notification copy is action-required and not proof wording.
6. Sprint 6 review UI: confirmed. Current merchant review UI already shows displayed amount, exact expected amount, detected amount, delta and risk labels.
7. Sprint 7 stabilization: completed locally. Reports/docs updated and full root/Android validation passed. ADB smoke was not run because no device was attached.

## Files Changed

- `apps/api/src/receiver-devices.ts`
- `apps/api/src/server.ts`
- `apps/api/src/receiver-devices.test.ts`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ActiveIntentNotificationSweep.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverRuntimeConfigStore.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverStatusViewModel.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantReviewNotifier.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- Android and API tests around these contracts.

## Guardrails Preserved

- No real bank notification capture was introduced.
- No auto-confirmation was introduced.
- Android still never confirms payments.
- Fallback remains a manual bank check review only.
- No public webhook fires before merchant manual decision.
- No raw notification text, raw phone/card, PAN or secrets are stored in the new surfaces.
- No SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad app enumeration was added.

## Targeted Validation Passed

- `npm test -- --run apps/job-worker/src/no-notification-fallback.test.ts apps/api/src/receiver-devices.test.ts`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests "com.swimpay.receiver.AndroidMerchantApiWiringTest" --tests "com.swimpay.receiver.ActiveIntentNotificationSweepTest" --tests "com.swimpay.receiver.ReceiverStatusViewModelTest" --tests "com.swimpay.receiver.AndroidReceiverRealRuntimeTest" --tests "com.swimpay.receiver.PremiumMerchantRuntimeContractTest" --no-daemon --stacktrace --max-workers=1`

## Full Validation

- `npm run android:doctor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 77 files, 661 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` passed.
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1` passed.
- ADB smoke not run: `adb.exe devices -l` returned no attached devices.

## Next Validation

Connect a merchant phone and run ADB smoke on receiver health, review list and local “Commande à vérifier” notification.
