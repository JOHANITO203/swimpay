# Next Action

generated_at: 2026-05-09T12:37:12+03:00

## Latest HARDEN-REAL-1 quality hardening

Completed:

1. Runtime/payment gate:
   - invalid signatures rejected before parsing;
   - untrusted receiver/device/package-cert blocked before review;
   - Payment Intent Gate applied before merchant review creation.
2. Backend production hardening:
   - production secrets fail fast when missing;
   - dev bearer shortcuts blocked in production-mode paths;
   - SDK API key scopes enforced;
   - webhook URLs restricted to safe HTTPS public hosts.
3. Android hardening:
   - Android Keystore asymmetric proof boundary;
   - redacted canonical notification hashing;
   - app-lock blocks sensitive runtime loads;
   - developer export copy requires device unlock and clears show-once values.
4. Webhook/CI hardening:
   - stale `delivering` recovery added;
   - CI workflow added for root, Compose and Android;
   - Docker/build output hygiene added.
5. Validation passed:
   - `npm run android:doctor`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test` - 75 files, 554 tests passed
   - `npm run build`
   - `docker compose --env-file .env.example -f infra/docker-compose.yml config`
   - Android JVM tests
   - Android staging APK build

Blocked:

- No local HARDEN-REAL-1 code blocker remains.
- Real notification testing is still gated by synthetic SDK order, hosted checkout, active receiving method, manual review and final-only webhook proof.

Next recommended action:

1. Review the HARDEN-REAL-1 diff and commit/push when ready.
2. Redeploy staging.
3. Run the synthetic SDK/checkout/manual-review/final-webhook rehearsal.
4. Only then decide whether to start real bank notification capture.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-09T02:03:00+03:00

## Latest Android dashboard metrics wiring

Completed:

1. Added real merchant metrics backend contracts:
   - `GET /v1/merchant/metrics/summary`
   - `GET /v1/merchant/metrics/timeseries`
2. Embedded `metrics_summary` and `metrics_timeseries` into the Android dashboard summary when available.
3. Wired Android Accueil:
   - main card: `Paiements confirmés`;
   - amount: real confirmed amount formatted in RUB;
   - shortcut cards: `À confirmer`, `Confirmés`, `Rejetés`, `Expirés`, `Échecs`, `Taux`.
4. Removed fake dashboard values and the hardcoded decorative chart path.
5. Wired review detail safe score and short timeline labels.
6. Validation passed:
   - `npm run android:doctor`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test` - 75 files, 536 tests passed
   - `npm run build`
   - `docker compose --env-file .env.example -f infra/docker-compose.yml config`
   - Android JVM tests
   - Android debug APK build

Blocked:

- No local metrics-specific blocker remains.
- Automatic commit is intentionally skipped because this worktree contains earlier Android settings/subscreen changes in addition to this metrics sprint.

Next recommended action:

1. Do a device visual smoke of Accueil and Revue after installing the APK.
2. Then continue the staging SDK/webhook rehearsal:
   - SDK order creation;
   - hosted checkout without Authorization;
   - active receiving-method route selection;
   - manual merchant review;
   - final-only webhook delivery.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T22:21:00+03:00

## Latest Developer Integration Wizard staging verification

Completed:

1. Fresh root validation passed:
   - `npm run android:doctor`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test` - 74 files, 530 tests passed
   - `npm run build`
   - `docker compose --env-file .env.example -f infra/docker-compose.yml config`
2. Local `main` was already aligned with `origin/main` at `5fedb0a`.
3. Staging health passed: `https://staging.swimpay.pro/api-health` reports production mode with database, NATS and Valkey `ok`.
4. Staging Developer Integration Wizard returns HTTP 200 and contains the external-app staging export block.
5. No real notification was processed and no payment/webhook semantics changed.

Blocked:

- Credential generation from this shell is blocked because no authenticated staging merchant BFF session/CSRF token, approved server-side merchant integration token, staging DB URL or external merchant app env target is available here.
- The staging wizard currently renders a pending/unavailable merchant connection state for unauthenticated HTTP access.

Next recommended action:

1. Open the staging merchant dashboard in the authenticated browser/session.
2. In Developer Integration Wizard, create/rotate the API key and webhook secret.
3. Copy show-once values directly into the external merchant app environment, not chat:
   - `SWIMPAY_STAGING_API_BASE_URL=https://staging.swimpay.pro`
   - `SWIMPAY_STAGING_SECRET_KEY`
   - `SWIMPAY_STAGING_WEBHOOK_SECRET`
   - `EXTERNAL_APP_BASE_URL`
4. Relaunch SDK order creation, hosted checkout without Authorization, active route selection, manual confirmation and final-only webhook delivery.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T22:00:00+03:00

## Latest Developer Integration Wizard staging flow

Completed:

1. Verified the backend lifecycle for merchant API key, webhook secret, webhook URL, safe test webhook and delivery history.
2. Verified the wizard keeps raw API keys/webhook secrets show-once only and masked on normal reads.
3. Added a staging export block for external merchant apps:
   - `SWIMPAY_STAGING_API_BASE_URL`
   - `SWIMPAY_STAGING_SECRET_KEY`
   - `SWIMPAY_STAGING_WEBHOOK_SECRET`
   - `SWIMPAY_WEBHOOK_URL`
   - `EXTERNAL_APP_BASE_URL`
   - `SWIMPAY_PUBLIC_WEBHOOK_EVENTS`
4. Verified Web snippets are server-side only for secrets and Android snippets contain no secrets/webhook handling.
5. No real notification was processed and no webhook/payment semantics changed.

Next recommended action:

1. Finish root validation for this wizard export patch.
2. Commit and push to `origin/main`.
3. Redeploy staging through Dokploy.
4. In the staging wizard, create/rotate the API key and webhook secret, then copy the show-once values into the external merchant app env without pasting them into chat.
5. Relaunch the SDK/webhook rehearsal.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T21:53:31+03:00

## Latest REAL-CAPTURE-2 staging synthetic upload proof rerun

Completed:

1. Confirmed local `main` is aligned with `origin/main` at `d45ba7f`.
2. Confirmed `https://staging.swimpay.pro/api-health` is healthy in production mode.
3. Confirmed the Samsung device is reachable over ADB.
4. Reran the staging APK synthetic signed upload proof.
5. Proof passed: `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=0`.
6. No real notification was processed.

Next recommended action:

1. Confirm Dokploy has redeployed commit `d45ba7f`.
2. Prepare staging external merchant app values without pasting secrets into chat:
   - `SWIMPAY_STAGING_API_BASE_URL=https://staging.swimpay.pro`
   - `SWIMPAY_STAGING_SECRET_KEY`
   - `SWIMPAY_STAGING_WEBHOOK_SECRET`
   - `EXTERNAL_APP_BASE_URL`
3. Run SDK order creation and hosted checkout rehearsal without dev bearer.
4. Rehearse manual confirmation and final-only webhook delivery.
5. Proceed to combined synthetic E2E metrics only after SDK/webhook rehearsal passes.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T21:14:08+03:00

## Latest REAL-CAPTURE-2 public checkout session fix

Completed:

1. Found the staging/prod blocker: hosted buyer checkout routes still depended on a development merchant bearer.
2. Added a regression proving buyer checkout progression works from `payment_session_id` without any Authorization header.
3. Updated API checkout routes to resolve merchant scope from the durable payment session.
4. Removed the dev Authorization header from the web checkout client.
5. Full local validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
6. No real notification was processed.

Next recommended action:

1. Commit and push this fix to `origin/main`.
2. Redeploy staging through Dokploy.
3. Run live staging SDK order creation and hosted checkout rehearsal without dev bearer.
4. Prove active payment intent + active receiving method + synthetic signed Android upload.
5. Rehearse merchant manual review and final-only webhook delivery.
6. Ask for explicit operator capture-start command only after those synthetic gates pass.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T20:05:48+03:00

## Latest RECEIVER-SIGN-1 staging upload proof passed

Completed:

1. Red/green regression added for notification identity: `notification_hash` varies by snapshot time, `semantic_hash` stays stable.
2. Rebuilt and installed the staging APK on `SM-S916B`.
3. Reran the staging ADB proof after backend redeploy.
4. Final proof passed: `success=true acked=1 failed_retrying=0 status=201 code=none purged=1`.
5. Clean rerun after the last push/redeploy passed: `success=true acked=1 failed_retrying=0 status=201 code=none purged=0`.
6. No real notification was processed.

Next recommended action:

1. Keep real notification capture gated.
2. Prove active receiving method + active payment intent in staging.
3. Rehearse merchant manual review.
4. Rehearse final-only public webhook delivery.
5. Ask for the explicit operator capture-start command only after those synthetic proofs pass.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T19:44:07+03:00

## Latest RECEIVER-SIGN-1 staging proof alignment

Completed:

1. Installed the staging APK on `SM-S916B`.
2. Proved the app can silently align an existing receiver registration with the Android Keystore public key.
3. Added a staging-only ADB proof trigger: `com.swimpay.receiver.STAGING_PROOF`.
4. Proved the trigger uses the non-debug redaction, outbox, Android Keystore signing and `/v1/receiver/signals` upload path.
5. Confirmed the current failure is a backend signature rejection: `status=401 code=invalid_signature`.

Next recommended action:

1. Finish validation of the local changes.
2. Commit and push current `main`.
3. Let Dokploy redeploy staging from `origin/main`.
4. Rerun `adb shell am broadcast -a com.swimpay.receiver.STAGING_PROOF -p com.swimpay.receiver`.
5. Continue only if the proof returns `success=true acked=1 failed_retrying=0`.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T18:57:37+03:00

## Latest RECEIVER-SIGN-1 asymmetric receiver signing

Completed:

1. Migrated real Android Receiver signing from shared HMAC-like keys to Android Keystore asymmetric signing.
2. Backend signal ingestion now verifies `ecdsa_p256_sha256_der_v1` signatures with the registered PEM public key.
3. Receiver signal upload now requires `payload_hash`; shared `spk_` receiver keys are rejected.
4. Runtime config no longer persists a real-runtime shared signing key.
5. Debug-only smoke HMAC remains isolated from non-debug runtime.
6. Full validation passed locally: android doctor, typecheck, lint, full tests, build, Compose config, Android JVM tests and Android debug APK build.

Next recommended action:

1. Build/install the staging APK.
2. Re-run login/onboarding or receiver registration so staging stores the new PEM public key.
3. Run one synthetic redacted outbox upload to `https://staging.swimpay.pro`.
4. Only after that, continue the real-capture proof ladder.

Do not do:

- Do not process real bank notifications yet.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T18:14:42+03:00

## Latest INTEL-TOOLS-1 readiness matrix

Completed:

1. Created tasks 637 through 647 and updated the active task queue.
2. Created the SwimPay Intelligence tool inventory and per-tool readiness reports.
3. Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_READINESS_MATRIX.md`.
4. Confirmed code/test-level readiness for redaction, protected outbox, backend ingestion, anti-replay, parser/classifier synthetic fixtures, Payment Intent Gate, manual review, final-only webhooks, SDK guardrails and receiving methods.
5. Preserved the real-notification gate: no real bank notification was processed in this sprint.

Next recommended action:

Run the device/staging proof ladder before any real capture:

1. record bank target detection metrics on the installed staging APK;
2. verify Notification Listener Access state;
3. prove receiver registration and heartbeat against `https://staging.swimpay.pro`;
4. run one synthetic redacted outbox upload from the installed APK;
5. create an active payment intent using an active receiving method;
6. rehearse manual review and final-only webhook delivery to the staging external app;
7. ask for the final explicit operator capture-start command before one controlled real notification test.

Do not do:

- Do not process real bank notifications yet.
- Do not clear app data unless the operator explicitly approves it.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T17:45:00+03:00

## Latest REAL-CAPTURE-2 Intelligence tool inventory

Completed:

1. Created `.swimpay-agent/REAL_CAPTURE_2_INTELLIGENCE_TOOL_INVENTORY.md`.
2. Marked task 635 completed with findings.
3. Updated the Intelligence source-truth inventory: non-debug Android upload is now implemented, not no-op.
4. Recorded the remaining receiver signing contract gap: HMAC shared-key registration is functional but not the final asymmetric public-key model.

Next recommended action:

Run task 636, then 637:

1. record bank detection metrics on the installed staging APK;
2. verify Notification Listener Access state;
3. prove receiver registration and heartbeat against `https://staging.swimpay.pro`;
4. then run synthetic redacted outbox upload smoke before any real notification.

Do not do:

- Do not process real bank notifications yet.
- Do not clear app data unless the operator explicitly approves it.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T14:06:07+03:00

## Latest REAL-CAPTURE-2 Intelligence test ladder

Planned:

1. Created tasks 635 through 644 and updated the active task queue.
2. Created `.swimpay-agent/REAL_CAPTURE_2_INTELLIGENCE_TEST_PLAN.md`.
3. Defined sequential tool tests for bank detection, receiver auth/heartbeat, notification access gate, redaction/outbox/upload, backend Payment Intent Gate, SDK/webhook rehearsal and combined synthetic E2E.
4. Defined timing/queue/retry metrics for each stage.
5. Preserved a final explicit operator capture-start gate before any real bank notification capture.

Current confirmed evidence:

- Staging APK is installable and non-debuggable.
- Staging API health is reachable over HTTPS.
- Exact supported-bank visibility is fixed in the main Android manifest.
- The operator device now shows 5 detected supported bank apps.

Next recommended action:

Run task 635, then task 636. Bank detection is already fixed and should be recorded as the first REAL-CAPTURE-2 metric checkpoint before moving to receiver registration/heartbeat.

Do not do:

- Do not process real bank notifications before all synthetic gates pass and the final capture-start command is given.
- Do not clear app data unless the operator explicitly approves it.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

## Latest REAL-CAPTURE-1 staging APK/device gate

Completed:

1. Created tasks 628 through 634 and updated the active task queue.
2. Added an installable Android `staging` build type for non-debug runtime validation.
3. Added a guardrail test for the staging build type and Gradle metaspace.
4. Built the staging APK with `https://staging.swimpay.pro` and configured Google server client ID.
5. Fixed Gradle metaspace so `lintVitalAnalyzeStaging` passes without being excluded.
6. Installed and launched the staging APK on the operator Samsung device.
7. Verified staging API health over HTTPS.
8. Verified a clean Android relaunch has no SwimPay crash entries.
9. Created `.swimpay-agent/REAL_CAPTURE_1_REPORT.md`.

Current blockers:

- The device preserved existing app data, so login/create-account/onboarding was not replayed.
- Android visible state still shows receiving methods to add.
- Android Menu shows connected-site/webhook configuration as action-required.
- Signed synthetic signal upload from the installed staging APK was not executed.
- Real notification capture remains gated and has not started.

Next recommended action:

Run `REAL-CAPTURE-2`: operator-assisted Android staging account reset or in-app receiver refresh, then prove receiver registration/heartbeat, supported-bank activation and signed synthetic upload from the installed APK before the final real-notification capture-start gate.

Do not do:

- Do not process real bank notifications before the final capture-start command.
- Do not clear app data unless the operator explicitly approves it.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values, account data or secrets.

---

generated_at: 2026-05-08T13:05:00+03:00

## Latest staging-prod Android upload hardening

Completed:

1. Created tasks 623 through 627 and completed the active task queue.
2. Added non-debug Android upload transport from encrypted outbox to `/v1/receiver/signals`.
3. Guarded Android upload against raw notification, raw phone/card and unsafe payload leakage.
4. Allowed authenticated Android mobile sessions to register and heartbeat receivers against the backend.
5. Wired onboarding completion to receiver registration, heartbeat and persisted runtime bank-target config.
6. Neutralized active admin/operator `auto_confirm*` capability vocabulary in favor of manual-review readiness copy.
7. Hardened Compose defaults so staging/prod does not silently run with dev admin/session fallback.
8. Created `.swimpay-agent/STAGING_PROD_HARDENING_REPORT.md`.

Next recommended action:

Run `REAL-CAPTURE-1`: operator-assisted staging APK reinstall and receiver registration.

Required scope:

- install the fresh APK on the operator device;
- verify login/create-account -> onboarding -> receiver registration;
- verify heartbeat against `https://staging.swimpay.pro`;
- verify selected supported bank target is active;
- run one operator-owned real notification capture only after the final capture-start command;
- prove manual review only, then `payment.confirmed` only after merchant manual confirmation;
- prove final-only webhook delivery to the staging external app.

Do not do:

- Do not process customer data.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values or secrets.

---

generated_at: 2026-05-08T11:45:00+03:00

## Latest INTEL-TRUTH SwimPay Intelligence Source-of-Truth Audit

Completed:

1. Created tasks 612 through 622 and updated the active task queue.
2. Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_OF_TRUTH.md` as the central source of truth.
3. Created tool boundary map and per-surface audit reports.
4. Added `tests/swimpay-intelligence-source-truth.test.ts`.
5. Added a receiver signal regression proving legacy payloads with nested raw notification fields are rejected.
6. Fixed `apps/api/src/signals.ts` so legacy receiver signal payload validation rejects raw notification, phone/card and credential keys before normalization.

Current source truth:

- SwimPay Intelligence is a deterministic Payment Signal Engine.
- It is payment-intent-bound.
- V1 is manual-confirmation-only.
- Android captures/redacts/signs/uploads only.
- Backend decides and creates manual review only after Payment Intent Gate.
- Public fulfillment webhooks are only `payment.confirmed`, `payment.rejected` and `payment.expired`.
- `official_bank_confirmation=false`.

Next recommended action:

Run Sprint INTEL-FIX-1 before the next real notification capture attempt.

Required scope:

- wire safe non-debug Android staging signal upload transport;
- replace synthetic/debug hash vocabulary in real Android runtime evidence;
- rename or quarantine active admin/template auto-confirm vocabulary;
- rerun signed redacted synthetic staging signal upload before any real notification capture.

Do not do:

- Do not process real bank notifications until INTEL-FIX-1 passes and the operator gives final capture-start approval.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM payment decisions, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad package enumeration.
- Do not expose raw notification text, raw phone/card values or secrets.

---

generated_at: 2026-05-08T00:00:00+03:00

## Latest REAL-1 Real Staging Integration Test

Completed locally:

1. Created tasks 601 through 611 and updated the active task queue.
2. Created real staging inventory, VPS/domain plan, env secret contract, migration/seed report, OAuth report, Android setup report, real capture report, manual review/webhook report, observability report and closeout report.
3. Added `examples/real-staging-merchant`, a minimal external merchant staging app using `@swimpay/node`.
4. Added `tests/real-staging-external-app.test.ts` for SDK/webhook fulfillment guardrails.
5. Updated `docs/PRODUCTION_ENVIRONMENT.md` to distinguish controlled operator-owned real staging from public production.

Blocked externally:

- `staging.swimpay.pro` was not reachable as a healthy HTTPS staging host from this shell.
- No VPS access, staging env file, real secrets, Google OAuth staging credentials, staging API key or webhook secret were available.
- Docker Desktop Linux engine was unavailable locally for runtime `ps`.
- Receiver staging registration, real bank notification capture, manual review and webhook delivery were not executed.

Next recommended action:

Run REAL-2: operator-assisted VPS staging bring-up.

Required operator inputs:

- VPS SSH/session or deployment runner;
- DNS A record `staging.swimpay.pro -> <VPS IPv4>`;
- ignored staging env file with real secrets;
- Google OAuth staging app credentials;
- external app public URL;
- final capture-start command only after staging health, receiver registration and active payment intent are verified.

Do not do:

- Do not start public production.
- Do not use customer data.
- Do not capture real notifications until staging receiver heartbeat passes and the operator gives the final capture-start command.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not expose raw notification text, raw phone/card values or secrets.

---

generated_at: 2026-05-08T00:00:00+03:00

## Latest CR-4 Android Receiver Real Runtime Readiness

Completed:

1. Created tasks 585 through 591 and updated the active task queue.
2. Created `.swimpay-agent/ANDROID_RECEIVER_REAL_RUNTIME_INVENTORY.md`.
3. Added non-debug runtime gating for explicitly enabled supported bank package targets.
4. Wired accepted listener snapshots through the redaction pipeline before outbox enqueue.
5. Added runtime outbox enqueue with redacted payloads, local counter, payload hash and signature.
6. Added `StagingSyntheticNotificationHarness` for safe staging smoke without real notification capture.
7. Added Android guardrail tests for permissions, package enumeration, redaction boundary, Android-side confirmation separation and activated-bank-only listener entry.
8. Created `.swimpay-agent/ANDROID_RECEIVER_REAL_RUNTIME_REPORT.md`.

Next recommended action:

Run Sprint CR-5: production-mode staging validation with synthetic data only.

Required scope:

- validate Google OAuth live exchange through staging redirect URLs;
- run VPS staging with external secrets, HTTPS and migrations;
- register a staging receiver and send a signed synthetic redacted signal through the staging URL;
- keep real bank notification capture blocked until explicit operator approval.

Do not do:

- Do not process real bank notifications yet.
- Do not deploy public production.
- Do not enable auto-confirmation.
- Do not change `payment.confirmed` semantics.
- Do not add LLM logic, SMS, Accessibility, scraping or broad package enumeration.
- Do not expose secrets, raw notification text or raw PII.

---

generated_at: 2026-05-07T15:35:00+03:00

## Latest CR-3 Product Truth Contradiction Neutralization

Completed:

1. Removed the active `auto_confirmed` decision/state path from matching-core, contracts, payment-session mapping, signal-worker runtime, review queries, event constants and observability metrics.
2. Routed strong notification matches to manual review with `manual_confirmation_required_v1`.
3. Removed active runtime direct public signal/review webhook request behavior.
4. Updated active product docs and operator docs so V1 public fulfillment remains post-manual-confirmation only.
5. Added `tests/product-truth-runtime-neutralization.test.ts`.
6. Rebuilt `@swimpay/matching-core` output and validated targeted + full tests.

Next recommended action:

Run CR-4 only if a zero-string cleanup is required before external audit:

- rename inert `auto_confirm*` schema/template/config fields to V1 manual-review vocabulary;
- keep migrations additive/backward-compatible;
- do not change payment confirmation behavior.

Otherwise proceed to Android Receiver real-runtime staging smoke with synthetic/redacted signals only.

Do not do:

- Do not start real-world testing yet.
- Do not deploy public production.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not introduce LLM logic, SMS, Accessibility, scraping or broad app enumeration.
- Do not expose secrets or raw PII.

---

generated_at: 2026-05-07T15:10:00+03:00

## Latest CR-2 Runtime Product Truth Enforcement

Completed:

1. Created tasks 578 through 582 and updated the active task queue.
2. Created `.swimpay-agent/CR2_RUNTIME_PRODUCT_TRUTH_INVENTORY.md`.
3. Disabled active V1 auto-confirm behavior in `SignalRuntimeProcessor` by routing high-confidence matches to manual review with `manual_confirmation_required_v1`.
4. Removed active runtime-created public signal/review webhooks.
5. Restricted job-worker public webhooks to `payment.confirmed`, `payment.rejected` and `payment.expired`.
6. Updated E2E/private-beta/five-bank guardrails so internal review activity does not become public fulfillment webhook traffic.
7. Created `.swimpay-agent/CR2_RUNTIME_PRODUCT_TRUTH_REPORT.md`.

Next recommended action:

Run Sprint CR-3: Android Receiver real-runtime readiness and synthetic staging smoke.

Required scope:

- remove or isolate dormant repository-level auto-confirm/webhook delivery methods that are no longer called by active runtime;
- verify Android Receiver Bank Target Lock runtime against exact supported package probes only;
- validate Notification Access, receiver health and synthetic signed signal upload through staging;
- keep real notification capture paused until explicit operator consent.

Do not do:

- Do not start real-world testing yet.
- Do not deploy public production.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not introduce LLM logic, SMS, Accessibility, scraping or broad app enumeration.
- Do not expose secrets or raw PII.

---

generated_at: 2026-05-07T14:40:00+03:00

## Latest CR-1 Full Code Review Before Real-World Testing

Completed:

1. Created tasks 566 through 577 and updated the active task queue.
2. Created the full code review inventory and focused audits for product truth, auth/tenant isolation, payment/review flow, Receiver/Intelligence, webhook/SDK, Android/UI, database/migrations, security/privacy, VPS readiness and test coverage.
3. Created `.swimpay-agent/FULL_CODE_REVIEW_REPORT.md`.
4. Confirmed that Sprint 9K was local/staging-guardrail validation only: no VPS production-mode deployment, no live OAuth exchange and no real bank notification capture were executed.

Next recommended action:

Run Sprint CR-2: Runtime product-truth enforcement.

Required scope:

- disable/remove active V1 auto-confirm path in `SignalRuntimeProcessor` and legacy matching runtime use;
- force active signal processing through the Payment Intent Gate/manual-review path;
- split internal audit/review events from public merchant webhook delivery;
- restrict public worker event types to `payment.confirmed`, `payment.rejected` and `payment.expired`;
- add guardrail tests proving `Matching 100 %`, `receiver_armed` and `J'ai payé` never confirm payment;
- keep real notification capture and VPS deployment paused until CR-2 blockers are resolved.

Do not do:

- Do not start real-world testing yet.
- Do not deploy public production.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not introduce LLM logic, SMS, Accessibility, scraping or broad app enumeration.
- Do not expose secrets or raw PII.

---

generated_at: 2026-05-07T13:25:00+03:00

## Latest Sprint 9K Production-mode Staging / VPS Validation

Completed so far:

1. Created Sprint 9K task files 546 through 555 and updated the task queue.
2. Created `.swimpay-agent/PROD_MODE_STAGING_INVENTORY.md`.
3. Added production-mode guardrail tests for BFF/CSRF, stored API keys and Receiver register/heartbeat.
4. Rejected `auto_confirm` and `autoConfirm` on `/v1/orders`.
5. Hardened Receiver registration and heartbeat to use BFF active merchant context + CSRF in production mode.
6. Added `docs/PRODUCTION_ENVIRONMENT.md`.
7. Added `scripts/seed-staging-auth-bff.mjs` for explicit synthetic staging identity/API-key/session seed.
8. Created `.swimpay-agent/VPS_STAGING_READINESS_AUDIT.md`.
9. Created `.swimpay-agent/PROD_MODE_STAGING_VALIDATION_REPORT.md`.

Next recommended action:

Run Sprint 9L on the VPS with synthetic data only:

- configure HTTPS staging URL and Google OAuth redirect;
- inject secrets outside git;
- run additive migrations;
- run the staging seed script with explicit confirmation;
- smoke BFF `/v1/me`, SDK order creation, Receiver registration/heartbeat and signed synthetic signal upload through the staging URL.

Do not do:

- Do not deploy public production yet.
- Do not process real bank notifications.
- Do not use real customer data.
- Do not enable auto-confirmation.
- Do not introduce LLM logic, SMS, Accessibility or broad app enumeration.

## Latest Sprint 9J Auth BFF Foundation

Completed:

1. Created Sprint 9J task files 535 through 545 and updated the task queue.
2. Created `.swimpay-agent/AUTH_BFF_INVENTORY.md`.
3. Added additive identity/session migration `010_auth_bff_foundation.sql`.
4. Added Auth BFF module for sessions, cookies, CSRF, roles, permissions, Google OAuth seam and API key verification.
5. Added BFF routes for dev bootstrap, `/v1/me`, logout and Google OAuth seam.
6. Wired Developer Integration lifecycle routes to BFF active merchant context and CSRF for session-backed mutations.
7. Wired `/v1/orders` to production stored API key verification.
8. Added Auth BFF tests and updated security/database docs.

Validation so far:

- Passed: `npx vitest run apps/api/src/auth-bff.test.ts`.
- Passed: `npm run typecheck`.

Next recommended action:

Run full Sprint 9J validation and then Sprint 9K production-mode staging auth validation:

- configure real Google OAuth provider values;
- seed production-mode merchant membership and API key data;
- run API in production-mode staging;
- prove local `test_*` bearers fail closed;
- prove BFF session + CSRF and stored API key paths work through the proxy.

Do not do:

- Do not deploy production from the local machine.
- Do not process real bank notifications without explicit consent.
- Do not enable auto-confirmation.
- Do not introduce LLM logic.
- Do not add SMS, Accessibility or broad app enumeration.
- Do not change SDK public webhook semantics.

## Latest Sprint 9I Live Receiver Validation

Completed:

1. Revalidated Docker/Compose live stack and `/api-health`.
2. Ran live Receiver registration smoke through the proxy.
3. Found and fixed safe error mapping for non-existent local/dev merchant bearers.
4. Rebuilt the API Docker image after adding the missing `packages/bank-templates` workspace copy.
5. Ran live Receiver heartbeat smoke and confirmed `bank_targets_missing`.
6. Ran live signal upload safety smoke and confirmed `raw_notification_rejected`.
7. Ran ADB reverse, app launch and UIAutomator dump on `R5CWA0FEPZW`.
8. Created `.swimpay-agent/SPRINT_9I_LIVE_RECEIVER_VALIDATION_REPORT.md`.

Validation:

- Passed: targeted receiver device regression test.
- Passed: API workspace build.
- Passed: API Docker image rebuild and API/proxy restart.
- Passed: `/api-health` with database, NATS and Valkey `ok`.
- Passed: live registration/heartbeat/raw-upload safety smoke.
- Passed: ADB device/reverse/launch/UIAutomator dump.

Next recommended action:

Run Sprint 9J production-mode staging/VPS validation:

- configure production-mode API environment;
- validate receiver registration without local `test_*` bearer seams;
- validate stale/future signal timestamp rejection in production mode;
- validate signed redacted signal upload with a production-registered receiver;
- keep real bank notification capture gated behind explicit consent.

Do not do:

- Do not process real bank notifications without explicit consent.
- Do not enable auto-confirmation.
- Do not introduce LLM logic.
- Do not add SMS, Accessibility or broad app enumeration.
- Do not change SDK public webhook semantics.

## Latest Sprint 9H Receiver / Intelligence Production Hardening

Completed:

1. Created Sprint 9H task files 525 through 534 and updated the task queue.
2. Created `.swimpay-agent/RECEIVER_INTELLIGENCE_PROD_INVENTORY.md`.
3. Hardened receiver registration/heartbeat production auth boundary against local `test_*` bearers.
4. Added richer receiver operational states and `bank_targets_missing` heartbeat warning/action.
5. Hardened signal upload eligibility for action-required receiver states.
6. Added production stale/future `observed_at` rejection before signal ingestion.
7. Added five-bank synthetic/redacted Payment Intent Gate fixture validation.
8. Added Receiver/Intelligence production guardrails.
9. Added `docs/INTELLIGENCE_RETENTION_POLICY.md`.
10. Updated receiver/security docs.

Validation:

- Passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests and Android debug APK build.
- Device QA passed on `R5CWA0FEPZW`: install, launch and UIAutomator dump.
- Docker live validation passed after Docker restart: sequential Compose build/up passed, services are healthy, and `/api-health` returns database, NATS and Valkey `ok`.

Next recommended action:

Run Sprint 9I live receiver validation:

- run live API smoke for production receiver auth rejection and stale signal rejection;
- rerun Android receiver heartbeat/signal smoke against live backend.

Do not do:

- Do not process real bank notifications without explicit consent.
- Do not enable auto-confirmation.
- Do not introduce LLM logic.
- Do not add SMS, Accessibility or broad app enumeration.
- Do not change SDK public webhook semantics.

## Latest Sprint 9G Developer Wizard Auth Hardening

Completed:

1. Continued Sprint 9G in multi-agent mode.
2. Created task files 519 through 525 and updated the task queue.
3. Created `.swimpay-agent/DEVELOPER_WIZARD_AUTH_INVENTORY.md`.
4. Added a centralized server-side merchant bearer resolver.
5. Prevented production from using local `test_*` merchant bearer fallback.
6. Disabled Developer Integration Wizard actions when backend lifecycle auth is unavailable.
7. Added API production guard for `/v1/merchant/integration*` local bearer rejection.
8. Fixed receiving-method admin writes to include Authorization and Content-Type.
9. Added focused guardrail tests.

Validation:

- Code validation passed: android doctor, typecheck, lint, test and build.
- Compose config validation passed.
- Live Docker validation passed after Docker restart: sequential Compose build/up passed, services are healthy, `/api-health` returns HTTP 200, and `/merchant/developer-integration` returns HTTP 200 through the proxy.

Next recommended action:

Run Sprint 9H for production merchant auth/session and API key verification:

- add real merchant session/cookie boundary for `/merchant/*`;
- add CSRF protection for merchant POST forms;
- verify production API keys against stored `api_keys`;
- replace process-global merchant identity with authenticated merchant context;
- add production env/Compose guardrails for merchant auth configuration.

Do not do:

- Do not put secret keys in browser or Android snippets.
- Do not expose webhook secrets after show-once responses.
- Do not add public fulfillment webhooks for internal signal/review events.
- Do not enable auto-confirmation.
- Do not claim official bank confirmation.
- Do not make Android handle webhooks or local fulfillment.

## Latest Sprint 9D Developer Integration Wizard

Completed:

1. Created Sprint 9D task files 494 through 501 and completed the task queue.
2. Created `.swimpay-agent/DEVELOPER_WIZARD_INVENTORY.md`.
3. Added `/merchant/developer-integration`.
4. Added Web/Android-only integration selection.
5. Added masked credentials and webhook configuration states.
6. Added safe `@swimpay/node` Web snippets.
7. Added safe `@swimpay/android` Android snippets.
8. Added safe public V1 webhook delivery history.
9. Added wizard guardrail tests.

Next recommended action:

Run Sprint 9E for Developer Integration Backend Lifecycle: merchant-scoped credentials, safe show-once secret handling, webhook URL persistence, delivery history and backend-owned retry/test endpoints.

## Latest Sprint 9E Developer Integration Backend Lifecycle

Completed:

1. Created Sprint 9E task files 502 through 511 and updated the task queue.
2. Added merchant-scoped integration credentials read model.
3. Added secret key generate/rotate lifecycle with show-once responses.
4. Added webhook secret generate/rotate lifecycle with show-once responses.
5. Added webhook URL save/update validation.
6. Added merchant-scoped delivery history.
7. Added backend-owned webhook test and retry endpoints.
8. Added backend guardrail tests for secret masking, public event scope and product truth.

Next recommended action:

Run Sprint 9F for Developer Integration Wizard live UX wiring and credential lifecycle polish: connect the visual wizard controls to the Sprint 9E lifecycle endpoints, add forms for webhook URL save/test/retry, and keep show-once secret reveal UX explicit and safe.

Do not do:

- Do not put secret keys in browser or Android snippets.
- Do not expose webhook secrets after the show-once lifecycle response.
- Do not expose raw webhook payloads in delivery history.
- Do not add public fulfillment webhooks for internal signal/review events.
- Do not enable auto-confirmation or claim official bank confirmation.

## Latest Sprint 9F Developer Integration Wizard Live UX Wiring

Completed:

1. Created Sprint 9F task files 512 through 518 and updated the task queue.
2. Added a server-side `MerchantIntegrationClient` seam to the web app.
3. Wired `/merchant/developer-integration` to Sprint 9E live lifecycle endpoints.
4. Added form actions for key generation/rotation, webhook secret rotation, webhook URL save, webhook test and delivery retry.
5. Rendered live Merchant ID, public key, masked secrets, webhook URL/status, public events and delivery history.
6. Kept one-time raw secrets limited to immediate action responses.
7. Updated web guardrail tests and product-truth docs tests.

Next recommended action:

Run Sprint 9G for production merchant session/auth hardening and final browser QA of the live Developer Integration Wizard. Replace local/dev bearer assumptions with the intended authenticated merchant session boundary.

Do not do:

- Do not put secret keys in browser or Android snippets.
- Do not expose webhook secrets after the show-once lifecycle response.
- Do not expose raw webhook payloads in delivery history.
- Do not add public fulfillment webhooks for internal signal/review events.
- Do not enable auto-confirmation or claim official bank confirmation.

Do not do:

- Do not put secret keys in browser or Android snippets.
- Do not add public fulfillment webhooks for internal signal/review events.
- Do not enable auto-confirmation.
- Do not claim official bank confirmation.
- Do not make Android handle webhooks or local fulfillment.

## Latest Sprint 9C Android Merchant SDK Production Helper

Completed:

1. Created `@swimpay/android` under `packages/swimpay-android`.
2. Added Kotlin source helper `com.swimpay.sdk.SwimPayCheckout`.
3. Added checkout URL validation, Custom Tabs launch and `ACTION_VIEW` fallback.
4. Added return/deep-link parsing with non-confirming typed statuses.
5. Added safe SDK models and errors.
6. Added Android merchant quickstart docs and a minimal example.
7. Added static guardrail tests proving the helper is separate from the Receiver and contains no secret/webhook/notification-processing behavior.

Next recommended action:

Start Sprint 9D for Developer Integration Wizard production readiness: integration type selection, webhook URL setup, secret masking/show-once behavior, test webhook and safe Web/Android snippets.

Do not do:

- Do not put SwimPay secrets in Android APK or browser snippets.
- Do not make Android return/deep-link status a payment confirmation.
- Do not add webhook handling to the merchant Android SDK.
- Do not modify Receiver notification processing during SDK work.
- Do not enable auto-confirmation or claim official bank confirmation.

## Latest Sprint 9B SDK Web Production Readiness

Completed:

1. Created `@swimpay/node` under `packages/swimpay-node`.
2. Added server-side SwimPay client construction.
3. Added `swimpay.orders.create` with safe payload validation and idempotency header support.
4. Added raw-body webhook verification using the existing SwimPay HMAC signature scheme.
5. Added typed public webhook parsing for `payment.confirmed`, `payment.rejected` and `payment.expired`.
6. Added typed SDK errors that avoid leaking secrets.
7. Added SDK quickstart docs and a minimal Node example.
8. Added product truth guardrail tests for SDK-facing docs/examples.

Next recommended action:

Start Sprint 9C for Android merchant SDK/helper and Developer Integration Wizard production readiness. Keep Android snippets secret-free and ensure mobile apps call merchant backends rather than SwimPay with a merchant secret.

Do not do:

- Do not add a secret key to browser or Android code.
- Do not expose internal signal/review events as fulfillment webhooks.
- Do not enable auto-confirmation.
- Do not process real bank notifications.
- Do not add LLM, SMS, Accessibility scraping or broad app enumeration.

## Latest Product Truth Cleanup

Completed:

1. Cleaned public webhook docs for manual-confirm-only V1.
2. Cleaned API spec order and checkout examples for payment-intent-bound receiver arming.
3. Updated product requirements and signal runtime docs.
4. Added SDK-facing product truth guardrail tests.

Next recommended action:

Start SDK Web production readiness: create a small server-side helper package or exported helpers for order creation, webhook verification, typed webhook events and safe examples. Keep Android SDK work separate and keep secret keys out of APKs.

Do not do:

- Do not enable auto-confirmation.
- Do not treat `J'ai paye` as confirmation.
- Do not publish signal/review internal events as fulfillment webhooks.
- Do not process real bank notifications.
- Do not add LLM, SMS, Accessibility scraping or broad installed-app enumeration.

## Latest Production Readiness Audit

Completed:

1. Created tasks 460 through 468 and updated the active task queue.
2. Audited SDK Web, SDK Android, Developer Integration Wizard, webhooks, checkout, Android Receiver, SwimPay Intelligence, secondary surfaces and VPS readiness.
3. Created production readiness reports under `.swimpay-agent/`.
4. Confirmed Sprint 8A/8B/8C Intelligence work should be preserved.
5. Identified product truth contradictions that must be cleaned before SDK publication.

Next recommended action:

Run a product truth cleanup sprint before SDK implementation. First split public merchant webhooks from internal events, remove or future-gate V1 auto-confirm docs/tests, update API examples around buyer recognition hints and receiver arming, then build SDK Web on top of that cleaned contract.

Do not do:

- Do not process real bank notifications without explicit consent.
- Do not enable auto-confirmation.
- Do not publish SDK docs while public webhook semantics still conflict with manual-confirm-only V1.
- Do not put a SwimPay secret key in any Android APK or Android snippet.
- Do not add LLM, SMS, Accessibility scraping, bank app scraping, `QUERY_ALL_PACKAGES` or broad installed-app enumeration.

## Latest Sprint 8C Durable Intelligence Feedback Persistence

Completed:

1. Closed the Sprint 8C persistence audit for passive Intelligence feedback and unknown-shape monitoring.
2. Added durable PostgreSQL-backed feedback/unknown-shape persistence.
3. Added the `IntelligenceRepository` seam with PostgreSQL persistence and local/test fallback.
4. Kept `POST /v1/intelligence/feedback` and `GET /v1/intelligence/unknown-shapes` safe and non-mutating.
5. Added read-only operator endpoints for Intelligence feedback and unknown-shape monitoring.
6. Added the web operator Intelligence monitoring surface.
7. Preserved explicit contract flags: `official_bank_confirmation=false`, `mutates_runtime_rules=false`, `promotes_profile=false` and `auto_confirm_allowed=false`.
8. Confirmed feedback and unknown-shape observations remain supervised monitoring input only.
9. Validated Docker live health and live persistence/admin endpoints after Docker was resumed.
10. Created Sprint 8C audit and closeout reports.

Next recommended action:

Run Sprint 8D for retention/operations policy around durable Intelligence records: retention windows, redacted export boundaries, operator metrics and cleanup jobs. Keep runtime rules static and review-first.

Do not do:

- Do not process real bank notifications without explicit consent.
- Do not enable auto-confirmation.
- Do not add LLM calls, SMS, Accessibility scraping, bank app scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Do not store raw notification text or expose raw PII.
- Do not mutate classifier rules from feedback automatically.
- Do not promote bank profiles from feedback automatically.
- Do not create payment reviews or payment webhooks from feedback alone.

## Latest Sprint 8B Payment-Intent-Bound Intelligence

Completed:

1. Preserved Sprint 8A deterministic Intelligence foundation.
2. Added payment-intent gap audit.
3. Added buyer recognition hint contracts with safe phone/source-card derivation.
4. Added bounded reconciliation amount model.
5. Added required `Continuer vers ma banque` receiver-arming flow.
6. Added Payment Intent Gate model and tests.
7. Updated runtime behavior so no active intent creates no merchant payment review.
8. Added merchant review copy for strong and ambiguous matches.
9. Added intent-bound passive learning metadata.
10. Added fraud/error guard tests.
11. Reconnected Samsung `SM_S916B` / `R5CWA0FEPZW`, installed the debug APK, launched the app and captured a UIAutomator smoke dump.

Next recommended action:

Run Sprint 8C for durable intent-bound feedback/unknown-shape persistence and operator read-only learning surfaces. Keep runtime static, deterministic, non-LLM and review-first.

Do not do:

- Do not process real bank notifications without explicit consent.
- Do not enable auto-confirmation.
- Do not add LLM calls, SMS, Accessibility scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Do not store raw notification text or expose raw PII.
- Do not mutate classifier rules from feedback automatically.

## Latest Sprint 8A Deterministic Notification Agent

Completed:

1. Added deterministic Android-side bank notification agent models.
2. Added direction-aware shape hashing with personal data removed from canonical shapes.
3. Added static, versioned profiles for the five V1 banks.
4. Added deterministic parser/classifier behavior with `autoConfirmAllowed=false`.
5. Extended redacted receiver signal contracts with safe Intelligence V1 metadata.
6. Added passive feedback ingestion and read-only unknown shape monitoring.
7. Added local drift guard that becomes more cautious without mutating profiles or disabling banks.
8. Added synthetic/redacted five-bank regression fixtures and safety guardrails.

Next recommended action:

Run Sprint 8B for durable persistence and operator review surfaces for passive feedback/unknown shapes, still using synthetic/redacted data unless explicit real-notification consent is recorded.

Do not do:

- Do not process real bank notifications without explicit consent.
- Do not enable auto-confirmation.
- Do not add LLM calls, SMS, Accessibility scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Do not store raw notification text or expose raw PII.
- Do not mutate classifier rules from feedback automatically.

## Latest Android Data Hydration Pass

Completed:

1. Audited why Android premium screens showed unavailable data too often.
2. Kept the scope frontend-only under `ui/premium`.
3. Made Accueil render local/system state cards independently of webhook delivery history.
4. Replaced dead dashboard empty states with `Aucun paiement détecté pour le moment` and `Lancez un test`.
5. Replaced empty review copy with `Aucun paiement à confirmer`.
6. Made connected-site/webhook missing state optional.
7. Added backend synchronization fallback copy.
8. Added Android hydration guardrail tests.

Next recommended action:

Run a real-device visual pass after reinstalling the APK, then add a lightweight local receiving-method count to Accueil if the merchant still sees `À vérifier` too often.

Do not do:

- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not add SMS, Accessibility scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Do not expose raw card, raw phone, raw notification text, package/cert, HMAC or webhook secrets.
- Do not change backend APIs or payment/review logic for visual hydration.

## Latest Android Local Merchant State Refinement

Completed:

1. Audited local Android premium merchant state sources.
2. Kept the scope Android premium frontend/runtime only.
3. Reused the existing receiving-routes repository for the Accueil `Moyens de réception` card.
4. Replaced `À vérifier` with `1 actif`, `N actifs`, `À ajouter` or `Connexion en attente`.
5. Refined Ventes to show a local intentional empty state without fake live sales.
6. Added Android JVM tests for receiving-method count, Ventes copy, webhook-optional behavior, no raw PII and no forbidden jargon.

Next recommended action:

Add a tiny persisted local merchant summary so Accueil can show `Configuré` for receiving methods even when the backend is temporarily unreachable after onboarding.

Do not do:

- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not add SMS, Accessibility scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Do not expose raw card, raw phone, raw notification text, package/cert, HMAC or webhook secrets.
- Do not change backend APIs or payment/review logic for this local-state refinement.

## Latest Android Onboarding Full Implementation

Sprint 7K Android onboarding full implementation passed validation.

Completed:

1. Audited the active onboarding path.
2. Kept `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime` as the active path.
3. Kept `ui/premium` as the active visual source.
4. Replaced the extra landing-first behavior with direct onboarding when onboarding is incomplete.
5. Implemented the corrected six-step onboarding sequence:
   - Welcome;
   - Notification Access;
   - Compatible Bank Detection + Bank Selection;
   - Receiving Method;
   - Site or Application Connection;
   - Configuration Test.
6. Merged compatible-bank search and bank selection into one soft UI step.
7. Preserved exact-package Bank Target Lock behavior only for supported V1 banks.
8. Kept Notification Access as a real Android settings gate.
9. Made site/application connection skippable.
10. Kept configuration test non-confirming and Android-owned only as readiness UI.

Next recommended action:

Do a user visual pass through onboarding on the device, then continue with onboarding visual micro-polish only if spacing/readability issues remain.

Do not do:

- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not add SMS, Accessibility scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Do not expose raw card, raw phone, raw notification text, package/cert, HMAC or webhook secrets.
- Do not change backend APIs or payment/review logic.

## Latest Sprint 7K Android Premium Merchant Operating Model

Sprint 7K is implemented and code validated pending commit.

Completed:

1. Created tasks 413 through 424 and updated the task queue.
2. Kept `ui/premium` as the Android merchant visual source of truth.
3. Added Bank Target Lock with exact supported package probing only.
4. Added debug/operator-scoped exact manifest visibility for the five supported V1 bank packages without `QUERY_ALL_PACKAGES`.
5. Added premium bank detection labels: `Détectée`, `Non détectée`, `Activée`, `À configurer`.
6. Updated premium navigation to include Accueil, Revue, Ventes, Menu, Mode de confirmation and Sécurité.
7. Updated Accueil, Revue, Ventes and Menu surfaces around the premium merchant operating model.
8. Added display-only Mode de confirmation screen using IA wording.
9. Added display-only Sécurité screen.
10. Added Android JVM/static tests for Bank Target Lock, navigation, safety and copy guardrails.

Next recommended action:

Commit `sprint 7K: android premium merchant operating model`, then reconnect/authorize the device for ADB smoke and continue with a focused Bank Target Lock activation/sub-state sprint.

Do not do:

- Do not process real bank notifications during frontend/model consolidation.
- Do not enable auto-confirmation.
- Do not add SMS, Accessibility scraping, `QUERY_ALL_PACKAGES` or broad app enumeration.
- Do not expose raw card, raw phone, raw notification text, package/cert, HMAC or webhook secrets.
- Do not change backend APIs or payment/review logic.

## Latest Sprint 7M Android Premium Sub-screen State Work

Sprint 7M is implemented and code/device validated, with Docker live health blocked by the local Docker Desktop pipe.

Completed:

1. Created tasks 429 through 434 and updated the task queue.
2. Used multi-agent read-only audits for receiving methods, bank management, Receiver health, settings navigation and copy guardrails.
3. Added typed premium receiving-method rows and safe mutation state models.
4. Added dedicated premium bank-management and Receiver-health state screens.
5. Routed settings menu rows through explicit `PremiumNavigation` helper functions.
6. Removed merchant-facing `SBP` receiving-method wording from premium UI copy.
7. Added Android JVM tests for sub-screen states, safe copy, navigation helpers and forbidden wording.
8. Created `.swimpay-agent/ANDROID_PREMIUM_SUBSCREEN_STATES_REPORT.md`.
9. Validated android doctor, typecheck, lint, tests, build, Compose config, Android JVM tests and Android debug APK build.
10. Installed and launched the APK on Samsung `SM_S916B` / `R5CWA0FEPZW`; UIAutomator confirmed the premium menu and `Banques` sub-screen.

Next recommended action:

Recover Docker Desktop live health validation, then run Sprint 7N: Android premium order-detail and deeper operational sub-states.

Do not do:

- Do not change backend APIs or payment/review logic during this frontend pass.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card, raw phone, raw notification text, package/cert, HMAC or webhook secrets.

## Latest Sprint 7J Cleanup

Android frontend source-of-truth cleanup is complete pending final validation/commit.

Completed:

1. Created Sprint 7J tasks 413 through 416.
2. Updated `.swimpay-agent/TASK_QUEUE.md`.
3. Created `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`.
4. Deleted confirmed-dead legacy visual files under `ui/screens/*`.
5. Deleted legacy visual renderer/model files:
   - `AndroidMerchantScreenRenderer.kt`
   - `AndroidMerchantViewComponents.kt`
   - `AndroidMerchantVisualDesign.kt`
6. Replaced legacy visual architecture assertions with premium-source assertions.
7. Created `.swimpay-agent/ANDROID_FRONTEND_SOURCE_OF_TRUTH_REPORT.md`.

Next recommended action:

Run Sprint 7K — Android Premium Navigation and State Foundation.

Do not do:

- Do not reintroduce `ui/screens/*`.
- Do not bypass `PremiumMerchantRuntime`.
- Do not delete `AndroidMerchantApiWiring.kt` or `AndroidMerchantUiModels.kt`.
- Do not change backend APIs, payment logic, notification processing or auto-confirmation during frontend navigation work.

## Latest Android Frontend Planning

Multi-agent Android frontend audit completed.

Created:

- `.swimpay-agent/ANDROID_FRONTEND_SUBSCREENS_MULTI_AGENT_REPORT.md`

Findings:

1. The active Android merchant frontend source of truth is `ui/premium`, mounted through `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
2. Legacy/mock frontend files under `ui/screens/*` are not referenced by the active app and are candidates for deletion after build/test.
3. `AndroidMerchantApiWiring.kt`, `AndroidMerchantUiModels.kt`, `PremiumMerchantRuntime.kt`, `MainActivity.kt`, manifest guardrails and Android tests must be preserved.
4. The next safe frontend wave should be split into sprints:
   - Sprint 7J: source-of-truth cleanup and legacy purge.
   - Sprint 7K: typed navigation and reusable state components.
   - Sprint 7L: onboarding and dashboard completion.
   - Sprint 7M: receiving methods and bank management.
   - Sprint 7N: reviews and orders.
   - Sprint 7O: connected site, receiver health and configuration test.
   - Sprint 7P: real-device visual QA and responsive hardening.

Recommended next action:

Start Sprint 7J before continuing real-notification shadow testing.

Do not do:

- Do not delete `AndroidMerchantApiWiring.kt`.
- Do not delete `AndroidMerchantUiModels.kt`.
- Do not bypass `PremiumMerchantRuntime`.
- Do not change backend APIs, payment logic, notification processing or auto-confirmation.
- Do not capture real bank notifications during frontend cleanup.

## Latest Android Onboarding Fix

Android premium onboarding now uses real Notification Listener Access state and persists onboarding completion.

Completed:

1. Added a persisted premium onboarding completion store.
2. Completed onboarding now starts future app launches at the merchant dashboard instead of relaunching onboarding.
3. The authorization step now opens Android Notification Listener settings when access is disabled.
4. The authorization step only continues when Notification Listener Access is enabled.
5. Removed unsafe `Policy Engine` / `AI (EXPERT)` / payment automation wording from onboarding.
6. Added Android JVM/static tests for this behavior.

Current blocker:

- ADB currently lists no connected devices, so the rebuilt APK could not be installed/launched in this pass.

Next recommended action:

Reconnect or re-authorize the phone for ADB, then install and launch the existing debug APK without clearing app data.

## Latest Sprint 7I Attempt

Sprint 7I Sberbank real-notification shadow test is preflighted, but live capture has not started.

Completed:

1. Created Sprint 7I task files 407 through 412.
2. Updated `.swimpay-agent/TASK_QUEUE.md`.
3. Created `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md`.
4. Ran Docker/API/Node/Android validation.
5. Verified backend health after starting Docker Desktop.
6. Verified ADB device, reverse, APK install and app launch.
7. Verified Notification Listener Access includes SwimPay.
8. Verified exact Sberbank package `ru.sberbankmobile` exists on device.
9. Verified Sberbank backend state safely without exposing certificate hashes.
10. Created `.swimpay-agent/SPRINT_7I_SBERBANK_SHADOW_REPORT.md`.

Blocked:

1. Explicit live-capture consent phrase is still required.

## Next Recommended Action

Continue Sprint 7I only after the operator explicitly confirms:

`I consent to one controlled Sberbank real-notification shadow test now.`

Then run exactly one controlled Sberbank notification shadow capture, redacted and review-first.

## Do Not Do

- Do not capture real bank notifications without explicit consent.
- Do not process non-Sberbank notifications.
- Do not enable auto-confirmation.
- Do not enable raw notification storage.
- Do not change production trust.
- Do not read SMS.
- Do not scrape bank apps.
- Do not use Accessibility scraping.
- Do not claim official bank confirmation.

## Latest Frontend Work

Frontend browser/device visual QA pass is complete.

Completed:

1. Rebuilt the web frontend.
2. Added a local browser-QA mock server for frontend-only screenshot capture.
3. Captured merchant and buyer checkout screens across mobile-equivalent, mobile-large, tablet and desktop viewports.
4. Fixed visual-only responsive issues:
   - right-side clipping on small screens;
   - overly wide titles/brand rows;
   - non-shrinking cards/flex rows;
   - checkout instruction rows and copy actions;
   - QR handoff visual strength.
5. Created `.swimpay-agent/FRONTEND_BROWSER_QA_REPORT.md`.
6. Kept backend APIs, contracts, workers, payment logic, database, Android notification processing, webhooks and auto-confirmation unchanged.

## Next Recommended Action

Run a final real-device/browser visual review from the user-facing app shell, then continue with focused UI polish only where screenshots or device usage show concrete friction.

## Do Not Do

- Do not change checkout APIs or contracts during visual polish.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card/phone or raw notification text.
- Do not claim official bank confirmation.

---

## Latest Android Frontend Cleanup

Sprint 7J Android frontend source-of-truth cleanup is complete.

Completed:

1. Created tasks 413 through 416 and updated the task queue.
2. Created `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`.
3. Deleted confirmed-dead legacy Android visual files under `ui/screens`.
4. Deleted old mock visual files:
   - `AndroidMerchantScreenRenderer.kt`;
   - `AndroidMerchantViewComponents.kt`;
   - `AndroidMerchantVisualDesign.kt`.
5. Replaced legacy visual tests with premium source-of-truth tests.
6. Created `.swimpay-agent/ANDROID_FRONTEND_SOURCE_OF_TRUTH_REPORT.md`.
7. Installed and launched the debug APK on the connected Samsung device.

## Next Recommended Action

Run Sprint 7K: Android Premium Navigation and State Foundation.

Recommended scope:

- typed premium route tree;
- typed bottom-tab model;
- reusable loading/empty/error/action-required states;
- sub-screen navigation for receiving methods, banks, orders, connected site, receiver health and configuration test;
- no backend/API/payment behavior changes.

## Do Not Do

- Do not reintroduce `ui/screens` as a visual source.
- Do not delete runtime/API/model/notification guardrail files.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw PII.

---

## Latest Android Premium Navigation Work

Sprint 7K Android premium navigation/state foundation is complete and validated.

Completed:

1. Created tasks 417 through 422 and updated the task queue.
2. Added typed premium routes and typed premium bottom tabs.
3. Replaced raw route string and raw tab integer navigation in `PremiumMerchantApp`.
4. Added `PremiumScreenState` for loading, empty, action-required, error, offline and content states.
5. Added `PremiumStatePanel` as a reusable state component.
6. Added typed destination placeholders for future sub-screens.
7. Added Android JVM tests for routes, tabs, safe state copy and premium architecture.
8. Validated root checks, Android JVM tests, Android debug APK build, Docker Compose health and API health.
9. Installed and launched the debug APK on the connected Samsung device; UIAutomator showed the premium shell and typed bottom navigation.

## Next Recommended Action

Run Sprint 7L: Android Premium Screen State Rollout.

Recommended scope:

- dashboard loading/empty/error/action-required;
- review queue empty/error/action-required;
- payment detail missing/error state;
- orders empty/error state;
- menu sub-screen links wired to full premium screens.

## Do Not Do

- Do not change backend/API/payment/review behavior during state rollout.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card, raw phone, raw notification text or webhook secrets.

---

## Latest Android Premium State Work

Sprint 7L Android premium screen state rollout is implemented pending final commit.

Completed:

1. Created tasks 423 through 428 and updated the task queue.
2. Used multi-agent read-only audits for dashboard/orders, reviews/detail and menu sub-screen state gaps.
3. Changed `PremiumMerchantRuntime` dashboard, reviews, payment detail, receiving methods, connected site, configuration test and orders loaders to return typed `PremiumScreenState`.
4. Updated `PremiumMerchantApp` to hold and route typed screen states.
5. Updated dashboard, orders, settings, receiving methods, connected site, configuration and review screens to render loading/empty/error/action-required states through `PremiumStatePanel`.
6. Prevented empty/error repository states from showing preview payment/order data.
7. Added/updated Android tests for the premium state rollout.
8. Created `.swimpay-agent/ANDROID_PREMIUM_STATE_ROLLOUT_REPORT.md`.
9. Rebuilt, reinstalled and relaunched the APK on Samsung `SM_S916B` / `R5CWA0FEPZW`.
10. Fixed and revalidated the visible UTF-8 copy issue reported on-device: `Données indisponibles` and `RÉESSAYER` now render correctly.

Next recommended action:

Recover Docker Desktop/live backend validation, then commit Sprint 7L and run Sprint 7M: Android premium receiving methods and bank management state completion.

Do not do:

- Do not add backend APIs or change existing contracts during Sprint 7M unless explicitly requested.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card, raw phone, raw notification text, webhook secrets or technical merchant jargon.

---

## Latest Frontend Work

Buyer checkout UX realignment is complete.

Completed:

1. Created tasks 399 through 406 and updated the task queue.
2. Created `.swimpay-agent/BUYER_CHECKOUT_SCREEN_INVENTORY.md`.
3. Created `.swimpay-agent/BUYER_CHECKOUT_UX_REPORT.md`.
4. Reworked hosted checkout into staged buyer screens:
   - Pay with SwimPay intro;
   - bank-first selection;
   - payment method reveal;
   - payer launcher;
   - card/phone instructions;
   - buyer-safe checkout states;
   - desktop QR handoff.
5. Added tests for bank-step privacy, card/phone masking, buyer status panels and safe wording.
6. Kept backend APIs, contracts, workers, payment decisions, webhooks, database and Android notification processing unchanged.

## Next Recommended Action

Run browser screenshot QA for `/checkout/:paymentSessionId` across:

1. small mobile viewport;
2. large mobile viewport;
3. tablet;
4. desktop.

Then do a small visual-only spacing/QR polish pass if screenshots reveal layout issues.

## Do Not Do

- Do not change checkout APIs or contracts during visual QA.
- Do not process real bank notifications.
- Do not enable auto-confirmation.
- Do not expose raw card/phone or raw notification text.
- Do not claim official bank confirmation.

---

## Latest Receiving Methods Work

Merchant receiving methods are implemented and local validation passed.

Next recommended action:

1. Apply migration `011_receiving_route_hmac_last4.sql` on staging before redeploy testing.
2. Reinstall Android APK and replay: login/create account -> onboarding -> add card/phone method -> Menu > Moyens de reception.
3. Continue with checkout staging E2E once at least one active receiving method exists.

Do not do:

- Do not process real bank notifications in this receiving-method validation pass.
- Do not enable auto-confirmation.
- Do not expose raw card/phone, CVV, expiry, PIN, SMS code or bank credentials.
- Do not claim official bank confirmation.

---

## Latest Developer Integration Android Work

Developer Integration Wizard is now available from Android as a backend-owned merchant integration surface.

Next recommended action:

1. Commit and push the Android/backend Wizard bridge.
2. Let Dokploy staging redeploy.
3. Verify `https://staging.swimpay.pro/api-health`.
4. Install the rebuilt APK on the operator phone if a device pass is requested.
5. In Android Menu > Integration developpeur:
   - create or rotate API key;
   - rotate webhook secret if needed;
   - save webhook URL;
   - run backend-owned test webhook.
6. Put show-once values into the external merchant app environment, not chat.
7. Run SDK order creation and final-only webhook rehearsal.

Do not do:

- Do not process real bank notifications yet.
- Do not put API keys or webhook secrets in Android/browser snippets.
- Do not let Android send developer webhooks directly.
- Do not enable auto-confirmation or change `payment.confirmed` semantics.
