# HARDEN-REAL-1 closeout report

generated_at: 2026-05-09T12:37:12+03:00

## Summary

The quality-audit blockers were corrected before any real bank notification testing.

No real bank notification was processed. No auto-confirmation was enabled. `payment.confirmed` semantics and public webhook taxonomy remain unchanged.

## Point 1 - Runtime / Payment Intent Gate

Completed:

- Signal runtime now rejects invalid signatures before parsing.
- Runtime trust gate now blocks untrusted receiver devices before review creation.
- Runtime trust gate now requires an exact trusted bank package/certificate match.
- Runtime now applies the Payment Intent Gate before review creation.
- No active payment intent now results in ignored/rejected signal handling, not merchant review.
- Receiving-route mismatches are classified before review.
- Negative directions remain blocked.

Main files:

- `apps/signal-worker/src/runtime.ts`
- `packages/matching-core/src/index.ts`
- `apps/signal-worker/src/runtime.test.ts`
- `packages/matching-core/src/payment-intent-gate.test.ts`

## Point 2 - Backend Production Auth / Secrets

Completed:

- Development bearer merchant shortcuts are blocked in production-mode endpoints that previously accepted them.
- `PHONE_HMAC_SECRET` now fails fast in production if missing.
- `WEBHOOK_SECRET_ENCRYPTION_KEY` now fails fast in production when the Postgres integration repository is used.
- API keys now have explicit SDK scopes for order creation/read operations.
- Webhook URL validation now requires HTTPS, rejects URL credentials, localhost/internal hosts and private/reserved IP ranges.

Main files:

- `apps/api/src/server.ts`
- `apps/api/src/developer-integration.ts`
- `apps/api/src/orders.ts`
- `apps/api/src/*test.ts`

## Point 3 - Android Hardening

Completed:

- Android merchant device proof now uses an asymmetric Android Keystore boundary.
- Private key stays on the device; only public key and challenge signature are sent.
- JVM signer exists only for tests.
- Notification hashes now use canonical redacted text so raw text does not become a durable hash input.
- Developer export copy now requires device unlock, has a short show-once window, and clears after copy/navigation.
- App lock prevents sensitive runtime loads while the UI is locked.

Main files:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantDeviceProofProvider.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverNotificationPipeline.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/*HardeningTest.kt`

## Point 4 - Webhook / CI Hygiene

Completed:

- Webhook worker can recover stale `delivering` deliveries after worker crash/timeout.
- Retry calculation and stale-claim behavior are tested.
- Webhook delivery loop docs describe stale recovery.
- CI workflow now validates root npm, Docker Compose config and Android unit/staging APK build.
- `.dockerignore` excludes local agent state, secrets, dependency output and Android build output.
- Tracked Gradle problem report was removed from source control.

Main files:

- `apps/job-worker/src/webhooks.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `.github/workflows/ci.yml`
- `.dockerignore`
- `.gitignore`
- `docs/WEBHOOK_DELIVERY_LOOP.md`

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 75 files, 554 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1` - 196 tests passed
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleStaging --no-daemon --stacktrace --max-workers=1`

## Blockers

No local HARDEN-REAL-1 code blocker remains.

Real bank notification capture remains gated by:

- installed staging APK proof on the target phone when needed;
- synthetic SDK order / hosted checkout / active receiving method proof;
- manual merchant review proof;
- final-only webhook rehearsal;
- explicit operator command to start real capture.

## Not Done

- No real bank notification capture.
- No public production deployment.
- No auto-confirmation.
- No LLM payment decision.
- No SMS, Accessibility, bank scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- No raw notification text, raw phone/card or secret exposure.
