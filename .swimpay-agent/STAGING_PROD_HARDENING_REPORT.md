# Staging-prod hardening report

generated_at: 2026-05-08T13:05:00+03:00

## Scope

Priority hardening for the surfaces classified medium/partial before staging-prod:

1. Android non-debug signal upload to backend.
2. Android auth/login/onboarding product truth.
3. Admin `auto_confirm*` active vocabulary neutralization.
4. Staging/prod dev-surface cleanup.

No real bank notification was captured or processed in this sprint.

## Android non-debug upload result

Completed.

- Added a non-debug `SignalUploadWorker` path that loads the encrypted Android outbox and uploads due redacted signed payloads to `/v1/receiver/signals`.
- Added `SignalUploadFlusher` with HTTPS staging/prod support and localhost-only adb-reverse support for local smoke.
- Upload success acknowledges outbox items.
- Upload failures store safe retry metadata only.
- Unsafe payload guards reject raw notification keys, raw phone/card/card-number fields, PAN-like keys and `raw_text_present=true` before any upload attempt.
- Android still does not confirm orders and still does not send developer webhooks.

## Backend alignment

Completed.

- Receiver registration and heartbeat now accept authenticated Android mobile sessions in addition to web BFF sessions.
- Web BFF session mutations remain CSRF-protected.
- A signed Android signal uploaded with the registered receiver public key is accepted by the backend.
- The upload path preserves manual-confirmation-only behavior: signal upload alone does not emit `payment.confirmed`.

## Android auth/login/onboarding truth

Completed.

- Account entry remains before onboarding.
- `Creer un compte` creates the lightweight Android merchant account, stores the mobile session, then starts onboarding.
- Onboarding completion registers and heartbeats the receiver, persists merchant/device/runtime state, and enables only selected supported bank targets.
- Google remains optional recovery/linking through backend-owned flows and is not required during onboarding.
- Personal and business onboarding profiles keep the same merchant app rights and are not admin personas.

## Admin vocabulary result

Completed for active operator/admin surfaces.

- Active admin responses now expose manual review readiness vocabulary instead of active `auto_confirm*` capability vocabulary.
- Evidence/admin UI copy renders manual-review-only readiness and does not present V1 auto-confirmation as a capability.
- Historical schema/template/fixture `auto_confirm*` strings remain compatibility/debt only and do not enable runtime auto-confirmation.

## Staging/prod dev-surface cleanup

Completed for current compose/auth boundaries.

- `infra/docker-compose.yml` now defaults to staging/prod-safe auth posture: production node env, signed-token admin auth and no dev merchant session fallback unless explicitly overridden.
- Local development remains explicit in `.env.example`.
- Production admin override blanks dev tokens and keeps signed-token admin auth.
- Guardrails assert the main compose path does not silently default to dev admin/session behavior.

## Guardrails

Added or updated tests for:

- non-debug Android upload ack/retry behavior;
- HTTPS staging backend URLs;
- raw notification/phone/card rejection before upload;
- Android mobile-session receiver register/heartbeat;
- backend signed signal upload through the registered Android receiver;
- no `payment.confirmed` emitted from signal upload alone;
- active admin/operator surfaces not exposing `auto_confirm*` capabilities;
- staging/prod compose defaults staying dev-disabled.

## Commands run

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1`
- Focused targeted tests during implementation:
  - `npm test -- apps/api/src/receiver-devices.test.ts tests/production-admin-auth-preflight.test.ts apps/api/src/admin.test.ts apps/web/src/evidence-admin.test.ts`
  - `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.work.SignalUploadFlusherTest --tests com.swimpay.receiver.AndroidMerchantApiWiringTest --tests com.swimpay.receiver.AndroidReceiverRealRuntimeTest --no-daemon --stacktrace --max-workers=1`

## Remaining blockers

- Real device reinstall/ADB walkthrough was not rerun in this closeout turn.
- Real bank notification capture was not executed in this sprint.
- VPS/Dokploy redeploy was not executed by Codex in this sprint.
- A zero-string cleanup of inert legacy `auto_confirm*` schema/template/fixture vocabulary remains optional follow-up if required for external audit optics.

## Next recommended sprint

Run `REAL-CAPTURE-1`: controlled staging receiver reinstall and registration, heartbeat against `https://staging.swimpay.pro`, one operator-owned supported-bank notification capture, manual merchant review, and final-only webhook delivery proof.

Alternative if audit optics come first: run `VOCAB-MIGRATE-1` to migrate inert legacy `auto_confirm*` database/template vocabulary to manual-review naming without changing runtime behavior.
