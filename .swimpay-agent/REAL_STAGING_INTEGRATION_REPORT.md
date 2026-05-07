# Real Staging Integration Report

generated_at: 2026-05-08T00:00:00+03:00

## 1. VPS / Domain Status

Not deployed in this session. `staging.swimpay.pro` did not resolve successfully from this shell, and HTTPS `/api-health` did not return a usable response.

## 2. Staging Env Status

Staging env contract documented in `.swimpay-agent/STAGING_ENV_SECRET_CONTRACT.md`. Real secrets were not available and were not committed.

## 3. Migration / Seed Status

Migrations are ready. Seed script is ready and guarded by explicit staging flags. Not executed because no staging database connection was available.

## 4. Google OAuth Status

Blocked. Missing Google OAuth staging client ID, client secret and verified staging redirect URI.

## 5. SDK External App Integration

Created `examples/real-staging-merchant` with SDK order creation and verified webhook fulfillment behavior. Not run against staging because staging API key, webhook secret and public external app endpoint were unavailable.

## 6. Android Receiver Staging Setup

Blocked for staging registration. Local device was previously validated, but no staging backend URL/credentials were available for real staging registration and heartbeat.

## 7. Real Bank Notification Capture Result

Not executed. Real capture remains blocked until staging API, receiver registration, active payment context and final capture-start approval are all present.

## 8. Manual Review Result

Not executed. Requires real staging order, active receiver and real redacted signal.

## 9. Webhook Fulfillment Result

Not executed. External app harness is ready, but no staging delivery occurred.

## 10. Log / Privacy Review

Full staging logs unavailable because staging stack was not running. Local code changes preserve no raw notification storage/upload and public webhook final-event-only behavior.

## Local Validation

Passed:

- `npx vitest run tests/real-staging-external-app.test.ts` - 3 tests passed.
- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 71 test files / 494 tests passed.
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps\android-receiver\android\gradlew.bat -p apps\android-receiver\android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps\android-receiver\android\gradlew.bat -p apps\android-receiver\android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`
- SDK ADB path detected `R5CWA0FEPZW`, installed the debug APK, launched `com.swimpay.receiver/.MainActivity` and dumped the UI tree.

Blocked/failed:

- `adb devices -l` failed because `adb` is not in PATH.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` failed because Docker Desktop Linux engine pipe was unavailable.
- `https://staging.swimpay.pro/api-health`, `/v1/me`, `/v1/orders`, `/v1/receiver-devices/heartbeat` and `/v1/receiver/signals` did not return usable staging responses from this shell.

## 11. Blockers

- DNS/VPS staging endpoint not available.
- Docker Desktop Linux engine unavailable locally.
- Real staging secrets absent.
- Google OAuth staging credentials absent.
- External app public endpoint absent.
- Receiver staging registration not performed.
- Real bank notification capture not started.

## 12. Next Sprint Recommendation

Run REAL-2: operator-assisted VPS staging bring-up.

Required operator inputs:

- VPS SSH/session or deployment runner;
- DNS A record for `staging.swimpay.pro`;
- ignored staging env file values;
- Google OAuth staging credentials;
- external merchant app public URL and webhook secret;
- final capture-start command after staging receiver heartbeat passes.
