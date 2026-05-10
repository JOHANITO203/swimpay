# Progress Log

## 2026-05-10T11:45:00+03:00 - Merchant Readiness Gate completed

- Added the shared `MerchantPaymentReadiness` contract and `GET /v1/merchant/readiness`.
- Enforced merchant setup readiness before SDK/API-key order creation.
- Merchants without active checkout-safe receiving routes now receive structured `409 merchant_payment_setup_required`.
- Prevented not-ready merchants from creating payable orders, payment sessions, amount leases, Expected Payment Profiles or receiver-armed states.
- Wired Android merchant dashboard readiness copy so missing receiving methods show an action-required state.
- Wired web merchant dashboard and connected-site surfaces to show payment unavailable/action-required copy when no active route exists.
- Added Node SDK, API, Android and web tests for readiness behavior.
- Updated legacy payable-order fixtures so they explicitly include active checkout-safe receiving routes.
- Full validation passed: android doctor, typecheck, lint, full Vitest suite with 77 files / 619 tests, TypeScript build, Compose config, Android JVM tests and Android debug APK build.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

## 2026-05-10T00:03:15+03:00 - P0-WIRE-1 runtime wiring

- Wired amount lease allocation into hosted checkout receiving-route selection.
- The checkout transaction now reserves an active lease for `merchant_id + route_id + rail + payable_amount_minor` and persists display amount, reconciliation delta and payable amount together.
- Manual merchant confirmation marks active leases `used`; merchant rejection releases active leases.
- Wired bank route certification into checkout route discovery and route selection.
- Wired bank route certification into signal runtime trust gates so package-validation-pending and disabled certifications are rejected before parser/review creation.
- Preserved Ozon Bank as review-only/package-validation-pending; runtime capture remains disabled until exact package/cert evidence is validated.
- Added durable worker idempotency wrapper and PostgreSQL implementation over `worker_idempotency_ledger`.
- Wrapped webhook delivery attempts and no-notification fallback creation with idempotency keys to prevent duplicate side effects.
- Full validation passed: android doctor, typecheck, lint, full Vitest suite with 77 files / 599 tests, TypeScript build, Compose config, replay, matching, privacy and webhook scripts.
- Android source was not touched, so Android Gradle tests/builds were not required in this sprint.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

## 2026-05-09T23:18:00+03:00 - External P0 delta hardening completed

- Audited 25 external P0 recommendations against the current SwimPay product truth and codebase.
- Preserved the product decision to keep PAN entry in hosted checkout Step 1 while hardening it as strict sensitive data.
- Strengthened PAN/card credential rejection and redaction across Fastify logs, observability sanitization, Android receiver contracts, Node SDK order/webhook parsing and public webhook worker payload guards.
- Added redacted receiver signal evidence envelopes and persisted evidence-safe metadata on signal ingestion.
- Added deterministic confidence vectors and collision pressure to matching-core and persisted them for new signal reviews.
- Added PostgreSQL foundations for amount leases, worker idempotency ledger and bank route certification matrix.
- Added deterministic replay/privacy/webhook/matching scripts.
- Validation passed: android doctor, typecheck, lint, full Vitest suite with 76 files / 593 tests, TypeScript build, Compose config and P0 replay script.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

## 2026-05-09T12:37:12+03:00 - HARDEN-REAL-1 quality hardening completed

- Corrected the multi-agent quality-audit blockers before real notification testing.
- Hardened signal runtime so invalid signatures, untrusted receivers/devices and untrusted package/certificate evidence are blocked before parsing or merchant review creation.
- Applied Payment Intent Gate before review creation; no active payment intent remains a no-review path.
- Hardened backend production behavior: required secrets fail fast, dev bearer shortcuts are not accepted in production-mode paths, SDK API key scopes are enforced and webhook URLs must be safe HTTPS public hosts.
- Hardened Android: merchant device proof now uses an asymmetric Android Keystore boundary, redaction/canonical hashing avoids durable raw notification text inputs, app lock blocks sensitive runtime loads and developer export copy is device-unlock gated with show-once cleanup.
- Hardened webhook delivery: stale `delivering` rows can be recovered after worker crash/timeout.
- Added CI workflow and Docker/build-output hygiene; removed a tracked Gradle problem report from source control.
- Validation passed: android doctor, typecheck, lint, full Vitest suite with 75 files / 554 tests, TypeScript build, Compose config, Android JVM tests and Android staging APK build.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

## 2026-05-08T20:05:48+03:00 - RECEIVER-SIGN-1 staging upload proof passed

- Investigated the post-redeploy `timestamp_out_of_range` result from the staging ADB proof.
- Confirmed the backend signature verifier was working because the error advanced from `invalid_signature` to timestamp validation.
- Found the root cause: repeated synthetic proof signals could dedupe against an old outbox record because `notification_hash` did not include snapshot time.
- Added a failing Android regression first, then fixed `NotificationCoalescer` so `notification_hash` is event-time-sensitive while `semantic_hash` remains stable for equivalent notification shape/content.
- Added staging-only cleanup for old non-acked synthetic proof records outside the timestamp window.
- Rebuilt and installed `app-staging.apk` on Samsung `SM-S916B`.
- Final ADB proof passed against `https://staging.swimpay.pro`: `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=1`.
- Clean rerun after the final push/redeploy also passed: `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=0`.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

## 2026-05-08T19:44:07+03:00 - RECEIVER-SIGN-1 staging proof alignment

- Added Android receiver registration freshness tracking through local `receiverKeyId` persistence.
- Added `ReceiverRuntimeRegistrationCoordinator` so completed staging sessions silently re-register when the stored receiver key is missing, stale or tied to stale notification-access state.
- Updated onboarding completion to persist the active Android Keystore key id with the receiver device state.
- Added a staging-only ADB proof receiver for `com.swimpay.receiver.STAGING_PROOF`.
- The staging proof uses the real non-debug path with current mobile session, runtime config, Android Keystore signer, redacted synthetic supported-bank snapshot, encrypted outbox and `/v1/receiver/signals` upload.
- Installed the staging APK on Samsung `SM-S916B`; logcat showed receiver registration alignment succeeded with the current Android Keystore key.
- The staging proof upload reached backend and returned `status=401 code=invalid_signature`.
- Current root-cause assessment: local `main` is ahead of `origin/main`, so staging needs the backend asymmetric verifier commit pushed and redeployed before this proof can pass.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

## 2026-05-08T18:57:37+03:00 - RECEIVER-SIGN-1 asymmetric receiver signing

- Created tasks 656 through 664 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/RECEIVER_SIGNING_INVENTORY.md` and receiver signing implementation reports.
- Migrated real Android Receiver signing from shared HMAC-like runtime keys to Android Keystore EC P-256 signing.
- Updated Android registration to send a PEM public key and removed real-runtime shared key persistence.
- Updated signal upload to include `payload_hash` and sign canonical redacted payloads before outbox upload.
- Updated backend signal verification to `ecdsa_p256_sha256_der_v1` using the registered receiver public key.
- Added guardrails rejecting `spk_` shared receiver keys, missing `payload_hash`, HMAC runtime signing, and HMAC backend verification.
- Full validation passed: receiver contract/backend tests, receiver device tests, production staging boundary tests, durable worker E2E receiver path, production guardrails, full Vitest suite, android doctor, typecheck, lint, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- Remaining proof: install/re-register the staging APK and run one synthetic redacted asymmetric upload before real notification capture.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

## 2026-05-08T18:14:42+03:00 - INTEL-TOOLS-1 SwimPay Intelligence readiness matrix

- Created tasks 637 through 647 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/INTELLIGENCE_TOOLS_INVENTORY.md`.
- Created readiness reports for Bank Target Lock, Notification Listener, Redaction/Outbox/Upload, Receiver Registration/Heartbeat, Backend Signal Ingestion, Parser/Shape/Classifier, Payment Intent Gate/Review, Manual Confirmation/Webhooks and SDK/Receiving Methods.
- Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_READINESS_MATRIX.md`.
- Classified code/test-ready tools: exact supported-bank gate, redaction pipeline, protected outbox, backend signed ingestion, anti-replay, parser/classifier synthetic fixtures, Payment Intent Gate, review queue, manual confirmation, final-only webhooks, SDK guardrails and receiving methods.
- Classified partial real-capture tools: installed APK Notification Listener proof, staging receiver registration/heartbeat, synthetic redacted upload, receiver signing contract, shape metrics on real-like notifications and operator/admin vocabulary cleanup.
- Validation passed: git diff check (CRLF warning only), android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Preserved the capture gate: real bank notifications remain blocked until all synthetic/device proofs pass and the operator gives a final explicit capture-start command.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

## 2026-05-08 - REAL-1 Real Staging Integration Test

- Created tasks 601 through 611 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Audited real staging readiness across Compose, env templates, production env docs, migrations, seed script, Auth BFF, Google OAuth seam, SDK Web, Android Receiver, Developer Integration Wizard, webhook worker, signal worker and proxy assumptions.
- Created `.swimpay-agent/REAL_STAGING_INTEGRATION_INVENTORY.md`.
- Created `.swimpay-agent/VPS_DOMAIN_STAGING_DEPLOY_PLAN.md` for `staging.swimpay.pro`.
- Created `.swimpay-agent/STAGING_ENV_SECRET_CONTRACT.md` without committing real secrets.
- Created `.swimpay-agent/STAGING_MIGRATION_AND_SEED_REPORT.md`.
- Added `examples/real-staging-merchant`, a minimal external merchant app with `POST /create-order`, `GET /orders/:id/status` and `POST /webhooks/swimpay`.
- Added `tests/real-staging-external-app.test.ts` for SDK order creation and final-event webhook fulfillment guardrails.
- Updated `docs/PRODUCTION_ENVIRONMENT.md` to allow controlled operator-owned real staging while preserving no public production and no auto-confirmation.
- Created Google OAuth, Android Receiver staging setup, real bank notification capture, manual review/webhook and observability reports.
- Created `.swimpay-agent/REAL_STAGING_INTEGRATION_REPORT.md`.
- Local validation passed: targeted real staging external app test, android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests and Android debug APK build.
- Device smoke passed with SDK ADB path on Samsung `SM-S916B` / `R5CWA0FEPZW`: install, launch and UIAutomator dump.
- Staging execution blocked: no reachable `staging.swimpay.pro` health response, no VPS/session, no staging secrets, no Google OAuth credentials, no staging API key/webhook secret and local Docker engine unavailable.
- No real bank notification was captured in this session.
- No raw notification text was stored/uploaded, no customer data was used, no auto-confirmation was enabled and no public webhook semantics changed.

## 2026-05-08 - CR-4 Android Receiver Real Runtime Readiness

- Created tasks 585 through 591 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/ANDROID_RECEIVER_REAL_RUNTIME_INVENTORY.md`.
- Confirmed the listener path was synthetic/debug-only because runtime package gating accepted only the debug app package and non-debug upload remained fail-safe.
- Added non-debug runtime package gating through `enabledBankPackages`, backed by the exact V1 bank target list.
- Updated the notification listener to load runtime config, reject unsupported packages early, process accepted snapshots through the redaction pipeline and enqueue only redacted outbox payloads.
- Added `ReceiverRuntimeConfigStore` and `ReceiverRuntimeOutboxController`.
- Added `StagingSyntheticNotificationHarness` for synthetic staging smoke without real bank notification capture.
- Added `AndroidReceiverRealRuntimeTest` guardrails for activated-bank-only listener entry, redaction, outbox safety, synthetic harness behavior and forbidden Android capabilities.
- Updated the legacy pipeline package-gate test to match the new immediate unsupported-package ignore reason.
- Created `.swimpay-agent/ANDROID_RECEIVER_REAL_RUNTIME_REPORT.md`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests and Android debug APK build.
- Device QA passed on Samsung `SM-S916B` / `R5CWA0FEPZW`: APK install, app launch and UIAutomator dump succeeded.
- No real bank notifications were processed.
- No SMS, Accessibility, scraping, broad package enumeration, raw notification storage/upload, Android-side payment confirmation or public fulfillment callback behavior was added.

## 2026-05-07 - CR-1 Full Code Review Before Real-World Testing

- Created tasks 566 through 577 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/FULL_CODE_REVIEW_INVENTORY.md`.
- Created `.swimpay-agent/PRODUCT_TRUTH_FULL_AUDIT.md`.
- Created `.swimpay-agent/AUTH_BFF_TENANT_ISOLATION_AUDIT.md`.
- Created `.swimpay-agent/PAYMENT_INTENT_REVIEW_FLOW_AUDIT.md`.
- Created `.swimpay-agent/RECEIVER_INTELLIGENCE_CODE_AUDIT.md`.
- Created `.swimpay-agent/WEBHOOK_SDK_CONTRACT_AUDIT.md`.
- Created `.swimpay-agent/ANDROID_RECEIVER_UI_AUDIT.md`.
- Created `.swimpay-agent/DATABASE_MIGRATIONS_DATA_INTEGRITY_AUDIT.md`.
- Created `.swimpay-agent/SECURITY_PRIVACY_SECRET_HANDLING_AUDIT.md`.
- Created `.swimpay-agent/VPS_DEPLOYMENT_READINESS_FULL_AUDIT.md`.
- Created `.swimpay-agent/TEST_COVERAGE_QUALITY_GATES_AUDIT.md`.
- Created `.swimpay-agent/FULL_CODE_REVIEW_REPORT.md`.
- Critical blockers found before real-world testing: legacy runtime auto-confirm path, internal public webhook event path, synthetic/debug-only Android Receiver real notification boundary, fail-closed Google OAuth seam and missing real VPS production-mode staging.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Docker live validation was blocked: Docker client context `desktop-linux` could not connect to `//./pipe/dockerDesktopLinuxEngine`, and `/api-health` was unreachable.
- No product behavior, payment runtime, webhook semantics, Android notification processing, SDK contracts or database schema were changed.

## 2026-05-07 - Sprint 9J Auth BFF Merchant/Admin Foundation

- Created tasks 535 through 545 and updated the active task queue.
- Created `.swimpay-agent/AUTH_BFF_INVENTORY.md`.
- Added additive migration `010_auth_bff_foundation.sql` for users, merchant memberships, admin roles and BFF sessions.
- Added `apps/api/src/auth-bff.ts` for opaque sessions, HttpOnly cookie helpers, CSRF, role/permission mapping, Google OAuth provider seam and stored API key verification.
- Added BFF endpoints: `/auth/google/start`, `/auth/google/callback`, dev-only `/auth/dev/bootstrap-session`, `/v1/me` and `/auth/logout`.
- Wired `/v1/merchant/integration*` to authenticated active merchant context when BFF session-backed, with CSRF on BFF POST/PUT/retry mutations.
- Kept local `Bearer test_*` fallback available only outside production.
- Wired `/v1/orders` to resolve production merchant identity from stored hashed API keys.
- Added `apps/api/src/auth-bff.test.ts` for BFF session, CSRF, permission, tenant isolation and API key guardrails.
- Updated `docs/05_DATABASE_SCHEMA.md` and `docs/11_SECURITY_AND_PRIVACY.md`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Docker live validation passed with sequential Compose build/up. Migration `010_auth_bff_foundation.sql` was applied to the existing local Postgres volume, Compose services are healthy and `/api-health` reports database, NATS and Valkey `ok`.

## 2026-05-07 - Sprint 9I Live Receiver Validation

- Continued after Sprint 9H commit with a live backend/Android smoke, without real bank notification capture.
- Verified Docker Compose services and `/api-health`; local API environment is `development`.
- Live smoke found that a syntactically valid local/dev `Bearer test_<uuid>` with no matching merchant row returned a PostgreSQL foreign-key HTTP 500.
- Added a regression test and mapped that storage failure to the safe authenticated-merchant 401 response.
- Rebuilt the API image and fixed the API Dockerfile to include `packages/bank-templates` after cache invalidation exposed the missing workspace copy.
- Re-ran live registration: invalid local/dev merchant returned safe HTTP 401 without PostgreSQL details.
- Re-ran live registration/heartbeat with an existing local smoke merchant: registration returned 201 and heartbeat returned `bank_targets_missing` with `configure_bank_targets`.
- Re-ran live signal upload safety smoke: `raw_text_present=true` returned HTTP 400 `raw_notification_rejected`.
- Re-ran ADB device check, reverse, app launch and UIAutomator dump on `R5CWA0FEPZW`; premium shell was visible and no raw PII appeared in the dump.
- Created `.swimpay-agent/SPRINT_9I_LIVE_RECEIVER_VALIDATION_REPORT.md`.

## 2026-05-07 - Sprint 9H Docker Recovery Validation

- User restarted Docker Desktop and requested continuation.
- Re-ran sequential Compose live validation with `COMPOSE_PARALLEL_LIMIT=1`.
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api swimpay-web swimpay-signal-worker swimpay-job-worker proxy`.
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build`.
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml ps`; API, web, signal worker, job worker, Postgres, NATS and Valkey are healthy; proxy is running.
- PASS: `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`; database, NATS and Valkey returned `ok`.
- Updated Sprint 9H report, blockers and next action to mark the Docker live blocker resolved.

## 2026-05-06 - Product Truth Cleanup Before SDK

- Created tasks 469 through 473 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Rewrote `docs/12_WEBHOOKS.md` so public V1 webhooks are post-review or terminal outcomes only.
- Updated `docs/06_API_SPEC.md` to remove `auto_confirm` examples and document `continue-to-bank` / `claimed-paid` semantics.
- Rewrote `docs/01_PRODUCT_REQUIREMENTS.md` around payment-intent-bound manual-confirmation V1.
- Rewrote `docs/SIGNAL_RUNTIME_PIPELINE.md` around Payment Intent Gate and manual confirmation.
- Added `tests/product-truth-docs.test.ts` for SDK-facing documentation guardrails.
- Ran validation successfully: targeted product-truth test, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Docker live `ps` and `/api-health` are blocked because the Docker Desktop Linux engine pipe is unavailable in this shell and no local API server is reachable.
- No backend implementation, Android notification processing, payment runtime, database schema, workers or contracts were changed.

## 2026-05-06 - Production Readiness Audit Before SDK / Receiver Hardening

- Created tasks 460 through 468 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/PROD_READINESS_INVENTORY.md`.
- Created `.swimpay-agent/SDK_WEB_AUDIT.md`.
- Created `.swimpay-agent/SDK_ANDROID_AUDIT.md`.
- Created `.swimpay-agent/DEVELOPER_INTEGRATION_WIZARD_AUDIT.md`.
- Created `.swimpay-agent/RECEIVER_INTELLIGENCE_PROD_AUDIT.md`.
- Created `.swimpay-agent/SECONDARY_SURFACES_HYDRATION_AUDIT.md`.
- Created `.swimpay-agent/PRODUCT_TRUTH_CONTRADICTION_AUDIT.md`.
- Created `.swimpay-agent/VPS_PRODUCTION_READINESS_AUDIT.md`.
- Created `.swimpay-agent/PROD_READINESS_AUDIT_REPORT.md`.
- Confirmed SDK Web and SDK Android are not yet packaged production SDKs.
- Confirmed Receiver/Intelligence foundations are aligned but still need production hardening.
- Identified stale docs/tests around auto-confirmation and pre-confirmation public webhooks.
- Ran validation: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests and Android debug APK build passed.
- Installed and launched the debug APK on Samsung `SM_S916B` via ADB transport id `2`, then captured a UIAutomator dump.
- Docker live health was not available because no Compose services were running; `/api-health` refused the connection.
- No backend API, payment logic, Android notification processing, contracts, workers or state machines were changed.

## 2026-05-06 - Sprint 8B Payment-Intent-Bound SwimPay Intelligence

- Created tasks 450 through 459 and updated the active task queue.
- Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_GAP_AUDIT.md`.
- Preserved Sprint 8A deterministic/non-LLM/privacy-first Intelligence foundation.
- Added buyer recognition hint contracts for first name, last name, phone HMAC/mask and source-card encrypted/HMAC/masked/last4 derivation.
- Added bounded reconciliation amount/payment intent builder with buyer-visible exact expected amount.
- Added required `Continuer vers ma banque` receiver-arming flow and audit event without confirmation semantics.
- Added Payment Intent Gate relations and runtime integration so no active payment intent creates no merchant payment review.
- Added strong/ambiguous merchant review copy while keeping `Matching 100 %` manual-review-only.
- Added intent-bound passive learning metadata and fraud/error guard tests.
- Ran fresh validation: android doctor, typecheck, lint, full Vitest suite, build, Compose config, Android JVM tests and Android debug APK build.
- Reconnected Samsung `SM_S916B` / `R5CWA0FEPZW`, installed the debug APK, launched it and captured a UIAutomator smoke dump.
- Docker live validation passed after Docker restart and Compose startup: Postgres, Valkey, NATS, API, web and proxy are healthy, and `/api-health` returns database, NATS and Valkey `ok`.
- No real bank notifications were processed; no LLM, SMS, Accessibility scraping, raw notification storage or auto-confirmation behavior was added.

## 2026-05-06 - Sprint 8A Deterministic Bank Notification Agent V1

- Created tasks 439 through 449 and updated the active task queue.
- Added deterministic Android `BankNotificationAgentV1` models and orchestration without Android-side payment confirmation.
- Added direction-aware shape hashing that preserves incoming/outgoing/negative-category semantics while removing personal data.
- Added static five-bank Intelligence V1 profile distribution for Sberbank, T-Bank, VTB, Alfa-Bank and Gazprombank.
- Added deterministic parser/classifier output with `autoConfirmAllowed=false` for every category.
- Extended the redacted receiver signal contract additively with safe Intelligence V1 metadata.
- Added passive feedback validation and backend ingestion through `POST /v1/intelligence/feedback`.
- Added read-only unknown shape monitoring through `GET /v1/intelligence/unknown-shapes`.
- Added local drift guard behavior that routes to more cautious local review mode without disabling banks or mutating profiles.
- Added five-bank synthetic/redacted regression fixtures and safety guardrail tests.
- Real bank notifications were not processed; no LLM, SMS, Accessibility scraping, raw notification storage or auto-confirmation behavior was added.

## 2026-05-05 — Android Local Merchant State Refinement

- Created tasks 434 through 438 and updated the active task queue.
- Created `.swimpay-agent/ANDROID_LOCAL_MERCHANT_STATE_AUDIT.md`.
- Created `.swimpay-agent/ANDROID_LOCAL_MERCHANT_STATE_REFINEMENT_REPORT.md`.
- Updated Accueil local cards so `Moyens de réception` now uses receiving-routes repository state.
- Added count/action values: `1 actif`, `N actifs`, `À ajouter`, `Connexion en attente`.
- Refined Ventes empty/local state and removed fake-live sales metrics for non-live data.
- Added Android JVM tests for local merchant state, Ventes safety and merchant copy guardrails.
- Backend APIs, contracts, payment logic, review logic, notification capture, webhooks and auto-confirmation were not changed.

## 2026-05-05T00:00:00+03:00 - Sprint 7J Android Frontend Source-of-truth Cleanup

- Created tasks 413 through 416 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`.
- Replaced old visual architecture test coverage with premium-source-of-truth assertions in `AndroidMerchantVisualArchitectureTest.kt`.
- Verified the new test failed before purge because legacy files were still present.
- Deleted confirmed-dead legacy visual files under `ui/screens/*`.
- Deleted `AndroidMerchantScreenRenderer.kt`, `AndroidMerchantViewComponents.kt` and `AndroidMerchantVisualDesign.kt`.
- Preserved `MainActivity.kt`, `PremiumMerchantApp.kt`, `PremiumMerchantRuntime.kt`, `AndroidMerchantApiWiring.kt`, `AndroidMerchantUiModels.kt`, `NotificationAccessStatusReader.kt`, `ReceiverOnboardingReadiness.kt` and `AndroidManifest.xml`.
- Created `.swimpay-agent/ANDROID_FRONTEND_SOURCE_OF_TRUTH_REPORT.md`.
- No backend, API, contracts, payment logic, review logic, Android notification processing, real bank notification capture, installed-app enumeration, raw PII exposure or auto-confirmation behavior was changed.

## 2026-05-05T00:00:00+03:00 - Android Frontend Sub-screens Multi-agent Audit

- Ran a multi-agent audit for the Android merchant frontend source of truth, legacy/mock UI, and API/contract guardrails.
- Confirmed the active Android app path is `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
- Confirmed `ui/premium` should become the only visual source of truth.
- Confirmed `ui/screens/*` is not referenced by the active app and is a safe purge candidate after build/test.
- Identified medium-risk legacy files that need test replacement before deletion: `AndroidMerchantScreenRenderer.kt`, `AndroidMerchantViewComponents.kt`, `AndroidMerchantVisualDesign.kt`.
- Confirmed `AndroidMerchantApiWiring.kt`, `AndroidMerchantUiModels.kt`, `PremiumMerchantRuntime.kt`, manifest permission guardrails and Android tests must be preserved.
- Created `.swimpay-agent/ANDROID_FRONTEND_SUBSCREENS_MULTI_AGENT_REPORT.md`.
- Proposed Sprint 7J through 7P to split cleanup, typed navigation, sub-screens, states, operational screens and device QA.
- No backend, API, contracts, payment logic, Android notification processing, real bank notification capture, raw PII exposure or auto-confirmation behavior was changed.

## 2026-05-04T23:58:46+03:00 - Sprint 7I Sberbank Shadow Preflight

- Created Sprint 7I tasks 407 through 412 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/SBERBANK_SHADOW_CONSENT.md` with consent state `pending_explicit_operator_confirmation`.
- Started Docker Desktop after the Linux engine pipe was initially unavailable.
- Verified Compose services healthy and `http://localhost:8080/api-health` returning database, NATS and Valkey `ok`.
- Ran validation: `npm run android:doctor`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, Compose config, Android assembleDebug and Android debug unit tests.
- Verified ADB device `R5CWA0FEPZW`, reverse, APK install and app launch.
- Verified Notification Listener Access includes SwimPay.
- Verified exact Sberbank package `ru.sberbankmobile` exists on device without broad app enumeration.
- Verified safe backend Sberbank state without full cert output: `sber_ru` exists, `auto_confirm_status=disabled`, `ru.sberbankmobile` evidence exists.
- Found preflight warning: latest local Sberbank evidence status is `production_trust_revoked`, not literal `approved_for_review_only`.
- No real Sberbank notification was captured, read, uploaded, logged, parsed or matched.
- No manual review or webhook was performed.
- Created `.swimpay-agent/SPRINT_7I_SBERBANK_SHADOW_REPORT.md`.

## 2026-05-04T22:15:00+03:00 - Frontend Browser QA and Responsive Fixes

- Continued the frontend-only QA pass after the checkpoint commit.
- Created `.swimpay-agent/browser-qa/mock-server.mjs` to serve frontend screens with mock data without touching backend APIs, contracts or payment logic.
- Rebuilt the web frontend and captured browser screenshots for merchant onboarding, dashboard, receiving methods, review queue/detail, connected site and buyer checkout states.
- Tested mobile-equivalent, mobile-large, tablet and desktop widths. The local Windows Chrome headless path crops direct 360px captures, so reliable mobile evidence was captured through CSS-equivalent 720px screenshots.
- Fixed visual-only responsive issues in `apps/web/src/ui/Components.ts` and `apps/web/src/screens/CheckoutScreen.ts`.
- Added shrink-safe screen/content wrappers, mobile type/spacing clamps, instruction-row wrapping, full-width narrow copy controls and a stronger QR handoff placeholder.
- Created `.swimpay-agent/FRONTEND_BROWSER_QA_REPORT.md`.
- No backend, API, contract, worker, database, payment decision, webhook, Android notification processing, real bank notification or auto-confirmation logic was changed.

## 2026-05-04T21:05:00+03:00 - Buyer Checkout UX Realignment

- Created tasks 399 through 406 and updated the task queue.
- Created `.swimpay-agent/BUYER_CHECKOUT_SCREEN_INVENTORY.md`.
- Created `.swimpay-agent/BUYER_CHECKOUT_UX_REPORT.md`.
- Audited the hosted buyer checkout screens in `apps/web/src/screens/CheckoutScreen.ts`.
- Refactored the buyer checkout presentation into staged surfaces: Pay with SwimPay intro, bank selection, payment method selection, payer launcher, card/phone instructions, buyer status panels and desktop QR handoff.
- Kept the bank selection step bank-only; no card or phone route details are shown before bank selection.
- Added separate masked card and masked phone instruction variants.
- Added buyer-safe status panels for awaiting payment, searching signal, signal detected, needs review, confirmed, expired and not validated states.
- Updated web checkout tests and copy guardrails to cover safe wording, masking and official-bank-confirmation avoidance.
- Backend APIs, contracts, workers, payment logic, webhooks, database, Android notification processing, real bank notifications and auto-confirmation were not changed.

## 2026-05-04T20:05:00+03:00 - Frontend Screen Inventory and Gap Completion

- Created tasks 391 through 398 and updated the task queue.
- Created `.swimpay-agent/FRONTEND_SCREEN_INVENTORY.md`.
- Created `.swimpay-agent/FRONTEND_SCREEN_REALIGNMENT_REPORT.md`.
- Audited web merchant screens, web buyer checkout screens and Android frontend screen locations.
- Aligned web onboarding copy to approved French merchant wording.
- Added missing web merchant routes/screens for banks, orders, order detail, receiver phone, tests, settings and connected site.
- Added simple visual states for ready, action required, empty, error, offline, expired and rejected cases.
- Kept iconography conservative with consistent placeholder bubbles; no fake official bank logos were added.
- Strengthened web UI copy guardrails for forbidden jargon, official bank confirmation claims and raw phone/card leakage.
- Full required validation passed: `npm run typecheck`, `npm run lint`, `npm test` (54 files / 373 tests), `npm run build` and Compose config.
- Backend APIs, contracts, workers, payment decisions, state machines, Android notification processing, real bank notifications and auto-confirmation were not changed.

## 2026-05-04T17:36:31+03:00 - Android Premium Contract/API Continuation

- Added/validated `PremiumMerchantRuntime` as the contract boundary between the premium Compose merchant UI and Sprint 7F Android merchant repositories.
- Premium dashboard, reviews, payment detail, connected site and configuration states now load through typed repository contracts when backend access is available.
- Review actions remain backend-owned; Android does not send developer webhooks directly.
- Signal rejection remains signal-scoped by default; order rejection remains explicit.
- Multi-agent review found the local/dev runtime boundary was too permissive; `MainActivity` now uses `PremiumMerchantRuntime.forAppBuild()`, and non-debug builds use a disconnected session instead of a test bearer token.
- `/v1/reviews` was kept as the explicit existing authenticated review API contract for Android merchant queue/actions.
- Full Node validation passed: `npm test` reported 54 files / 372 tests.
- Android validation passed with local SDK env: `:app:testDebugUnitTest` and `:app:assembleDebug`.
- Installed and launched the debug APK on Samsung SM-S916B `R5CWA0FEPZW` via ADB transport `25`.
- Captured UI tree and screenshot under `.swimpay-agent/visual-qa-android/`.
- Fresh live backend validation is currently blocked because Docker Desktop is not reachable through `dockerDesktopLinuxEngine`; `http://localhost:8080/api-health` is unreachable.
- No real bank notification, SMS, Accessibility scraping, installed-app enumeration, official bank confirmation claim, raw PII exposure or auto-confirmation was added.

## 2026-05-04T02:55:00+03:00 - Frontend UI Realignment

- Created tasks 381 through 390 and updated the task queue.
- Created `.swimpay-agent/FRONTEND_UI_AUDIT.md`.
- Split active web screen rendering out of `apps/web/src/index.ts` into:
  - `apps/web/src/screens/MerchantScreens.ts`;
  - `apps/web/src/screens/CheckoutScreen.ts`;
  - `apps/web/src/screens/EvidenceAdminScreen.ts`.
- Strengthened `apps/web/src/ui/Theme.ts` and `apps/web/src/ui/Components.ts` with SwimPay visual tokens and reusable UI primitives.
- Realigned merchant onboarding, dashboard, receiving methods, review queue, payment detail and connected site surfaces with the provided mobile-first fintech grammar.
- Applied a visual consistency pass to checkout without changing API/state-machine behavior.
- Added copy guardrail coverage for onboarding screens and payment review detail.
- Targeted validation passed: web typecheck, lint and web UI tests.
- No real bank notification processing, SMS, scraping, raw PII exposure, official bank confirmation claim or auto-confirm enablement was added.


## 2026-05-04T01:44:42+03:00 - Sprint 7F Revalidation After Docker Recovery

- Revalidated Docker Desktop/containerd after local recovery: Docker client/server `28.4.0`, Compose `v2.39.2-desktop.1`, Docker info responsive.
- Fixed Compose `swimpay-web` healthcheck from `/health` to `/`, matching the current web liveness route and unblocking proxy dependency health.
- Applied additive migrations `006_checkout_bank_selection.sql` and `007_hybrid_receiving_routes.sql` to the existing local Postgres volume because it predated Sprint 7A/7B schema additions.
- Rebuilt/restarted `swimpay-api` and `proxy`; Compose status shows Postgres, Valkey, NATS, API, web, proxy, signal worker and job worker healthy.
- Verified `http://localhost:8080/api-health` returned HTTP 200 with database, NATS and Valkey `ok`.
- Revalidated Sprint 7F live endpoints using the local UUID merchant token:
  - `GET /v1/android-merchant/dashboard-summary` HTTP 200.
  - `GET /v1/android-merchant/payments/:id` HTTP 200 for an existing local review.
  - `GET /v1/android-merchant/connected-site` HTTP 200.
  - `GET /v1/android-merchant/connected-site?developer_mode=true` HTTP 200.
  - `POST /v1/android-merchant/connected-site/test` HTTP 202 with backend-owned test queueing.
  - `POST /v1/android-merchant/configuration-test` HTTP 200 and non-confirming result.
- Added a validation-only robustness test for legacy unlinked review rows so Android payment detail no longer fails with a UUID parse error when a local review has no linked payment session.
- Revalidated Android: `assembleDebug` and `testDebugUnitTest` passed with `ANDROID_HOME` and `ANDROID_SDK_ROOT` set to `C:\Users\Lenovo\AppData\Local\Android\Sdk`.
- Real-device QA passed on `R5CWA0FEPZW`: adb authorized, reverse `tcp:8080`, APK install, `MainActivity` launch and UI-tree dump.
- Current visible UI dump showed onboarding/Notification Access/five-bank selection and no forbidden technical/raw-PII visible text.
- Full validation passed: android doctor, typecheck, lint, full npm test suite (54 files / 370 tests), build, Compose config, Compose ps, API health, Android assembleDebug, Android JVM tests and ADB install/launch.
- No real bank notification, customer data, installed-app enumeration, SMS, Accessibility scraping, official bank confirmation claim, raw phone/card display, raw notification text or auto-confirmation was added.

## 2026-05-03T23:20:11+03:00 - Sprint 7F Android Mobile Backend Gap Closure

- Created tasks 404 through 411 and updated the task queue to Sprint 7F.
- Added Android-specific merchant endpoints for dashboard summary, payment detail, connected site status, connected site test and configuration test.
- Kept all Sprint 7F responses merchant-safe: no raw card, raw phone, raw notification text, package/cert, HMAC, template internals or webhook secrets.
- Connected-site test remains backend-owned and test-only; Android does not send developer webhooks directly.
- Configuration test runs non-confirming readiness checks and does not emit `payment.confirmed`.
- Wired Android repositories for dashboard, payment detail, connected site, connected-site test and configuration test.
- Updated `.swimpay-agent/ANDROID_FRONTEND_API_GAPS.md`, `docs/ANDROID_FRONTEND_API_CONTRACTS.md` and `docs/ANDROID_MERCHANT_APP_SCREENS.md`.
- Added `apps/api/src/android-merchant.test.ts` and expanded `AndroidMerchantApiWiringTest.kt`.
- Validation passed for `npm run android:doctor`, `npm run typecheck`, `npm run lint`, `npm test` (53 files / 366 tests), `npm run build`, Compose config, Android assembleDebug and Android JVM tests.
- Installed and launched the debug APK on Samsung SM-S916B `R5CWA0FEPZW`; UI-tree scroll dumps showed onboarding, Notification Access, bank/configuration sections, dashboard/recent payments, review queue, connected site and action-required states.
- UI-tree scans found no forbidden merchant-facing jargon and no obvious raw card/phone/customer values.
- Docker Desktop/containerd failed during local rebuild/restart with I/O errors and Compose health degraded; this blocks live Docker-backed endpoint QA and the Sprint 7F commit condition.
- No real bank notification, customer data, installed-app enumeration, SMS, Accessibility scraping, official bank confirmation claim, raw phone/card display, raw notification text or auto-confirmation was added.

## 2026-05-03T20:20:00+03:00 - Sprint 7D Android Merchant Frontend UX Screens

- Created tasks 381 through 393 and updated the task queue to Sprint 7D order.
- Created `docs/ANDROID_MERCHANT_UX_LANGUAGE.md`, `docs/ANDROID_MERCHANT_APP_SCREENS.md` and `docs/ANDROID_FRONTEND_API_CONTRACTS.md`.
- Created `.swimpay-agent/ANDROID_FRONTEND_API_GAPS.md` for Android merchant frontend mock repository gaps.
- Added `AndroidMerchantUiModels.kt` with merchant copy constants, screen models, masked receiving method display, review reason labels, review action contracts and frontend API contract models.
- Replaced the default Android `MainActivity` text dump with a real merchant-facing native UI surface using SwimPay teal/blue cards and simple French copy.
- Kept debug smoke actions in a clearly separated debug-local panel for debug builds.
- Added `AndroidMerchantUiContractTest.kt` covering exact copy, forbidden jargon, Notification Access gate states, five-bank selection, masked card/phone display, review queue/detail actions, connected site developer-details boundary, API mock gaps and forbidden Android permissions.
- TDD cycle: Android JVM test failed first because the Sprint 7D UI classes did not exist, then passed after implementation.
- No real bank notification, customer data, SMS, Accessibility scraping, broad app enumeration, official bank confirmation claim, raw card/phone display or Android payment confirmation was added.

## 2026-05-03T16:45:40+03:00 - Sprint 7A Agent 5 QA/docs/safety scaffolding

- Created tasks 340 through 349 and updated the task queue to Sprint 7A order.
- Created `docs/DEVELOPER_PLUGIN_INTEGRATION.md` with developer checkout/webhook guidance.
- Documented receiver banks as merchant-side receiving banks and payer bank launchers as buyer-side UX helpers only.
- Documented that payer launcher selection does not prove payment, does not alter matching trust and does not enable confirmation.
- Documented public webhook disclosure with `confirmation_type=notification_signal` and `official_bank_confirmation=false`.
- Created `.swimpay-agent/SPRINT_7A_REPORT.md` and updated `.swimpay-agent/NEXT_ACTION.md` and `.swimpay-agent/BLOCKERS.md`.
- No code files were edited by Agent 5.
- No real bank notification, customer data, SMS, bank app scraping, broad installed-app enumeration, raw phone, raw notification text, production trust request/approval or auto-confirmation was used.

## 2026-05-02 - Task 029 durable worker E2E tests

Plan:
- Add an in-process durable E2E harness under `tests/` using local fakes and existing runtime abstractions.
- Cover API order/session creation, receiver signal ingestion, signal runtime decisions, review rejection API semantics, webhook delivery processing and worker-boundary handlers.
- Keep external dependencies mocked or in-memory; do not call external network services or live NATS.
- Add privacy assertions across API responses, runtime events, audit payloads and webhook payloads.
- Update docs and local agent reports after validation.

Guardrails:
- No Android Receiver app logic.
- No production deployment.
- No real bank package/cert verification.
- No PSP, SBP, SMS reading, bank app scraping or official bank confirmation behavior.
- No broad parser/matching changes.

TDD evidence:
- `npm test -- --run tests/durable-worker-e2e.test.ts` failed first on an invalid-envelope expectation that did not match the current JetStream wrapper error text.
- The test assertion was corrected to the existing wrapper behavior: `Invalid JetStream event payload: raw_pii_field_present`.
- `npm test -- --run tests/durable-worker-e2e.test.ts` then passed with 7 tests.

Implementation result:
- Added `tests/durable-worker-e2e.test.ts`.
- Added `docs/DURABLE_WORKER_E2E_TESTS.md`.
- Updated local development and implementation notes.
- Covered API order/session creation, receiver signal ingestion, signal runtime processing, review semantics, webhook delivery, retry/dead behavior, duplicate signal protection and worker-boundary error handling.
- Kept live NATS, live PostgreSQL and external merchant endpoints mocked or in-memory.

Final validation:
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 28 test files and 171 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- `git diff --check`: PASS

Result:
- Task 029 completed.
- Next task is 030_runtime_observability.

## 2026-05-02 - Task 028 review rejection semantics

Plan:
- Add failing API tests for default signal-scope review rejection, explicit payment-session/order scopes, idempotency, conflict handling and validation.
- Change review rejection so it no longer rejects order/session by default.
- Add database support for storing rejection scope on review actions.
- Update event catalog/docs/state-machine guidance.

TDD evidence:
- `npm test -- --run apps/api/src/reviews.test.ts` failed first because default reject still rejected order/session, scopes were ignored, idempotency returned `review_not_open`, and invalid scope/reason were accepted.
- After implementation, `npm test -- --run apps/api/src/reviews.test.ts` PASS.

Implementation result:
- Added explicit review rejection scopes: `signal`, `payment_session`, and `order`.
- Default rejection scope is now `signal`.
- Signal-scope rejection updates the review and linked signal only.
- Payment-session scope rejects the linked session without rejecting the order.
- Order scope explicitly rejects the order and linked session.
- Same-scope repeated rejection is idempotent-safe.
- Conflicting scope escalation after a resolved rejection returns `review_rejection_scope_conflict`.
- Rejection reasons are constrained to documented reason codes.
- Redacted audit events are written for review action creation, review rejection, signal rejection, and scoped order/session state changes.

Final validation:
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 27 test files and 164 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Result:
- Task 028 completed.
- Next task is 029_durable_worker_e2e_tests.

## 2026-05-02 - Task 027 signal runtime pipeline

Plan:
- Verify task 026 migration integrity before touching runtime code.
- Add tests first for parser/runtime, matching decisions, review/webhook requests, idempotency and privacy.
- Implement only the `signal.received` runtime path in `swimpay-signal-worker`.
- Keep `signal.verified`, `signal.parsed` and `match.scored` consumers as safe stubs for later tasks.

Migration integrity preflight:
- Inspected `packages/database/migrations/001_initial_schema.sql` diff from task 026.
- The task 026 edits were additive/alignment changes for webhook delivery fields and indexes, mirrored by migration `002_webhook_delivery_loop.sql`.
- No destructive table drop, documentation deletion, raw PII column, or unsafe payment state change was found.

Implementation notes:
- Added `apps/signal-worker/src/runtime.ts` with a deterministic signal processor, in-memory test repository and PostgreSQL runtime repository.
- Wired `signal.received` to the processor when `DATABASE_URL` is configured.
- Updated the API NATS publisher to publish existing internal events as JetStream-compatible envelopes on the event subject, so `signal.received` reaches the durable consumer path.
- Parser input uses redacted notification fields only.
- Auto-confirm remains blocked for TO_VERIFY/pending app metadata, untrusted profiles/templates, amount-only signals and negative directions.

Validation so far:
- `npm test -- --run apps/signal-worker/src/runtime.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

Final validation rerun after API JetStream publisher alignment:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

Result:
- Task 027 completed.
- Next task is 028_review_rejection_semantics.

## 2026-05-02 - Foundation baseline

- Repository foundation exists.
- First Codex foundation task completed.
- Next task is Order API + Payment Session.
- Previous validation commands passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`

## 2026-05-02 - Task 003 order API

- Implemented `POST /v1/orders`.
- Implemented `GET /v1/orders/:id`.
- Added a Postgres-backed order repository with injectable test repository support.
- Added phone normalization, HMAC, and masking helpers in `@swimpay/security`.
- Created a payment session placeholder in `receiver_arming` status.
- Created a redacted `order.created` audit event for order creation.
- Did not implement payment matching, payment auto-confirmation, PSP/SBP behavior, SMS reading, bank app scraping, or official bank confirmation.

## 2026-05-02 - Task 004 payment sessions

- Implemented payment session read/checkout status endpoint at `GET /v1/payment-sessions/:id`.
- Added payment session transition guard helpers.
- Added expiry resolution for active sessions after `valid_until`.
- Added redacted audit events for session creation and receiver arming request during order creation.
- Did not implement receiver device registration, Android app behavior, matching decisions, or payment confirmation.

## 2026-05-02 - Task 005 receiver device registration

- Implemented `POST /v1/receiver-devices/register`.
- Implemented `POST /v1/receiver-devices/heartbeat`.
- Stored receiver public key, app version, Android version, notification access status, health status, and heartbeat time.
- Added redacted audit event for receiver registration.
- Did not create trusted bank package names or certificate fingerprints.
- Did not implement Android capture, signal upload, or final payment decisions.

## 2026-05-02 - Task 006 Android Receiver core

- Added `@swimpay/android-receiver` as a typed workspace package.
- Implemented local allowlist filtering for notification packages and strict certificate mismatch rejection.
- Implemented bank notification snapshot extraction for title, body, bigText, subText, textLines, metadata, and ticker text.
- Implemented privacy redaction before payload creation and encrypted outbox persistence before upload envelope construction.
- Implemented signed upload envelope construction with `event_id`, `notification_hash`, monotonic `local_counter`, and signature.
- Implemented heartbeat payload construction without payment decision data.
- Did not build a full Android/Gradle app, request Android permissions, read SMS, scrape bank apps, upload non-allowlisted notifications, or implement final payment confirmation logic.

## 2026-05-02 - Task 007 signal ingestion endpoint

- Implemented `POST /v1/receiver/signals`.
- Verified receiver device existence before accepting a signal.
- Verified deterministic foundation signatures before storage.
- Rejected duplicate `event_id` values.
- Rejected duplicate `notification_hash` values.
- Rejected local counter regressions.
- Checked bank profile existence and records first-seen package/cert pairs as `pending_verification`.
- Stored received signals without raw notification text.
- Added redacted audit storage and `signal.received` internal event publication.
- Did not implement parsing, matching, scoring, review creation, webhook delivery, or payment confirmation.

## 2026-05-02 - Task 008 bank profiles and parser

- Implemented deterministic parser helpers in `@swimpay/bank-templates`.
- Added V1 bank profiles in `learning` status with no trusted package names or certificate fingerprints.
- Added RUB amount/currency extraction for `₽`, `руб.`, and `RUB`.
- Added Russian phone normalization for `+7`, `8`, spaces, and punctuation.
- Added SwimPay reference extraction.
- Added direction classification for incoming customer transfer, outgoing payment, cashback, refund, promo, failed, and unknown.
- Added negative keyword gate and signal quality scoring.
- Added parser tests with Russian examples and negative-direction protections.
- Did not wire parser output into matching, review, webhook, or payment confirmation logic.

## 2026-05-02 - Task 009 matching core

- Implemented deterministic matching core in `@swimpay/matching-core`.
- Added candidate search by merchant, active session status, exact amount/currency, and signal observation time window.
- Added score computation for amount, currency, phone, reference, direction, trust inputs, and time window.
- Added internal decisions for `auto_confirmed`, `needs_review`, `rejected`, and `wait`.
- Enforced that amount-only signals require review and cannot auto-confirm.
- Enforced phone exact or reference exact for auto-confirm.
- Enforced collision routing to review.
- Enforced duplicate signal and already-confirmed-order rejection.
- Enforced negative/unsafe direction rejection.
- Did not wire matching core into DB writes, review queue creation, webhook delivery, or public payment confirmation.

## 2026-05-02T07:13:52.151Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:14:29.352Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:33:56.056Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:39:10.076Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:43:23.083Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:50:38.987Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T07:58:27.953Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T08:03:35.633Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T08:07:53.143Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T09:36:24.873Z - Agent validation fail

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- FAIL: `npm test` (Tests, exit 1)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T09:36:59.638Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 010 review queue plan

- Scope: implement review creation helper, merchant review list endpoint, manual confirm endpoint, manual reject endpoint, review actions, review audit events, and a template feedback hook placeholder.
- Boundaries: no checkout implementation, no webhook worker implementation, no parser/matching changes beyond accepting review creation inputs, no auto-confirmation logic, no official bank wording.
- Security/privacy checks: responses must expose masked phone/reference values only; audit payloads must be redacted; raw notification text and raw phone numbers must not be introduced.
- Validation after implementation: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and Docker Compose config through the agent validator.

## 2026-05-02 - Task 010 review queue completed

- Implemented review queue API endpoints: `GET /v1/reviews`, `POST /v1/reviews/:id/confirm`, and `POST /v1/reviews/:id/reject`.
- Added review creation foundation for ambiguous `needs_review` matches, including persisted match metadata and redacted `review.created` audit payload.
- Manual confirmation now records a review action, stores a manual signal match, updates order/session state to `manual_confirmed`, writes redacted audit data, and emits `review.confirmed`.
- Manual rejection now records a review action, updates order/session state to `rejected`, writes redacted audit data, and emits `review.rejected`.
- Review list responses expose masked phone/reference fields only and do not expose raw notification text.
- Did not implement hosted checkout, webhook delivery, parser/matching worker wiring, PSP/SBP behavior, SMS reading, bank app scraping, or official bank confirmation.

## 2026-05-02 - Task 011 hosted checkout plan

- Scope: implement a minimal hosted checkout UI foundation in `apps/web`, with summary, buyer identity, payment instructions, waiting status, result text, timer, copy buttons, open-bank placeholder, paid-claim button, and polling endpoint.
- Boundaries: no payment confirmation, no API-side buyer-claimed-paid state transition, no bank integration, no PSP/SBP behavior, no raw phone storage.
- Security/product wording: the page must describe SwimPay recognition from merchant-side notification signals only and must not claim official bank confirmation or guaranteed payment.
- Validation after implementation: targeted web tests, then full agent validation.

## 2026-05-02 - Task 011 hosted checkout completed

- Refactored `apps/web` into a testable `buildWebServer()` foundation with conditional runtime startup.
- Implemented `GET /checkout/:paymentSessionId` for the hosted checkout page.
- Implemented `GET /checkout/:paymentSessionId/status` for browser polling mapped from backend session states.
- Implemented `POST /checkout/:paymentSessionId/claimed-paid` as a safe claim endpoint that explicitly does not confirm payment.
- Added checkout tests covering safe wording, buyer phone explanation, status polling, and the non-confirming paid button.
- Did not implement webhooks, admin dashboard, real bank opening integration, API-side buyer state persistence, or payment confirmation behavior.

## 2026-05-02 - Task 012 webhook worker plan

- Scope: implement a signed webhook delivery foundation in `apps/job-worker`, including public event payload creation, HMAC headers, delivery processing, retry scheduling, delivery logging contract, replay, and endpoint/event duplicate prevention.
- Boundaries: no production external calls in tests, no payment decision logic, no fake confirmation, no checkout/admin work.
- Security/product wording: every payment event must include `confirmation_type = notification_signal` and `official_bank_confirmation = false`; webhook secrets are used only for HMAC signing and are not exposed.
- Validation after implementation: targeted webhook tests, then full agent validation.

## 2026-05-02 - Task 012 webhook worker completed

- Implemented public webhook event payload creation with mandatory notification-signal disclosure.
- Implemented `SwimPay-Event-Id`, `SwimPay-Timestamp`, and `SwimPay-Signature` headers with HMAC-SHA256 signing.
- Implemented a testable `WebhookDeliveryWorker` with enqueue, delivery, retry scheduling, terminal failure, and manual replay.
- Implemented duplicate endpoint/event delivery prevention while allowing manual replay to keep the original event id and create a new delivery id.
- Added meaningful webhook tests for disclosure, signing, duplicate prevention, retry exhaustion, and replay.
- Did not implement live NATS consumption, Postgres-backed delivery polling, admin UI, PSP/SBP behavior, or payment decision logic.

## 2026-05-02 - Task 018 bank template package setup plan

- Scope: integrate the downloaded bank-template package assets into `packages/bank-templates`, keep package metadata/build compatibility, and add a setup test for TypeScript exports plus YAML/JSONL asset presence.
- Boundaries: do not rewrite the pack, do not implement parser core beyond existing foundation, do not promote templates or package/cert metadata to trusted.
- Safety checks: YAML/JSONL assets must remain trackable; no real bank package or certificate values are introduced as verified/trusted by this task.

## 2026-05-02 - Task 018 bank template package setup completed

- Imported bank-template pack directories into `packages/bank-templates`: `banks`, `fixtures`, `operations`, `policies`, `schemas`, and `shared`.
- Imported `packages/bank-templates/INDEX.md` and the pack `src/README.md`.
- Added tests proving workspace TypeScript exports are available and YAML/JSONL assets are present and not ignored by `.gitignore`.
- Did not implement final parser logic, bank profile trust promotion, real package/cert verification, or payment decision behavior.

## 2026-05-02 - Task 019 bank profile registry plan

- Scope: load V1 bank profile YAML assets, validate required fields, expose profile runtime behavior, and evaluate bank app package/cert trust gates.
- Boundaries: no template parser core, no trust promotion, no real package/cert verification, no payment auto-confirmation logic.
- Safety checks: unknown profiles must route to review-only behavior; `TO_VERIFY` package/cert entries must be untrusted and block auto-confirm candidates.

## 2026-05-02 - Task 019 bank profile registry completed

- Added `BankProfileRegistry` with default loading from `packages/bank-templates/banks/*/profile.yml`.
- Added YAML profile validation for required fields, statuses, app verification state, field priority, and supported locales.
- Added runtime behavior exposure for backend logic, including unknown-profile review-only fallback.
- Added bank app trust evaluation where `TO_VERIFY` and `pending_verification` cannot pass the trusted gate.
- Added registry tests covering all five V1 profiles, alias lookup for `sber_ru`, unknown bank fallback, `TO_VERIFY` rejection, validation failures, and explicit directory loading.
- Did not implement parser core, template promotion, real app/cert trust, or payment confirmation behavior.

## 2026-05-02 - Task 020 bank template parser core plan

- Scope: harden the deterministic parser with explicit RU text normalization, amount/currency extraction, visible phone extraction, masked-phone detection, reference extraction, direction classification, negative gates, signal quality, and reason codes.
- Boundaries: no LLMs, no payment confirmation, no trust promotion, no worker/database wiring.
- Safety checks: cashback, refund, outgoing, failed, promo, unknown, and masked-phone-only cases must not become auto-confirm candidates.

## 2026-05-02 - Task 020 bank template parser core completed

- Reworked parser core to normalize RU text deterministically before matching.
- Added actual Russian keyword support for incoming, cashback, refund, outgoing, promo, and failed classifications.
- Added masked-phone detection as a weak review hint only; it does not populate normalized sender phone and disables auto-confirm candidate output.
- Added `allowAutoConfirmCandidate` output that is true only for incoming transfer with amount, RUB currency, phone or reference, and no masked-phone-only identity.
- Added tests for cashback, refund, outgoing, failed, promo, incoming transfer, text normalization, masked-phone weak signal, and negative gates before incoming classification.
- Did not wire parser output into worker/database decisions, promote templates, or implement payment confirmation behavior.

## 2026-05-02T10:00:33.072Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:05:50.128Z - Agent validation fail

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- FAIL: `npm test` (Tests, exit 1)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:06:32.297Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:10:54.665Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:14:08.775Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:18:17.859Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:25:04.710Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 021 bank template fixtures tests plan

- Scope: load JSONL fixtures from global, adversarial, and bank-specific bank-template assets and compare parser output to expected labels.
- Boundaries: no parser trust promotion, no payment confirmation, no worker/database wiring, no real bank package or cert values.
- Safety checks: amount-only, cashback, refund, outgoing, failed, promo, and adversarial fixtures must never become auto-confirm candidates.

## 2026-05-02 - Task 021 bank template fixtures tests completed

- Added a JSONL fixture loader for global, adversarial, and bank-specific redacted fixture files.
- Added deterministic placeholder materialization for safe parser inputs without storing raw notification text.
- Added fixture corpus tests for expected direction labels, amount/phone/reference extraction flags, reason codes, and auto-confirm candidate flags.
- Added explicit negative checks proving amount-only and non-customer-transfer fixtures cannot become auto-confirm candidates.
- Hardened parser direction support for outgoing transfer fixtures and added reason codes for amount-only, balance disambiguation, and non-customer-transfer cases.
- Did not implement drift radar, template learning, trust promotion, or payment confirmation behavior.

## 2026-05-02 - Task 022 bank template drift radar plan

- Scope: implement a pure bank-template drift radar based on YAML templates, canonicalized notification shapes, similarity, unknown rate, extraction success, phone/reference visibility, and parser confidence metrics.
- Boundaries: no automatic trust promotion, no parser learning lifecycle, no database/worker wiring, no payment confirmation, no real bank package/cert values.
- Safety checks: new template candidates must stay untrusted, and critical drift must disable auto-confirm eligibility for the affected bank.

## 2026-05-02 - Task 022 bank template drift radar completed

- Added `packages/bank-templates/src/drift.ts` with known-template loading, canonicalization, similarity scoring, drift metrics, candidate detection, status classification, and `template.drift_detected` event creation.
- Added tests for similarity, new candidate safety, critical drift bank auto-confirm disabling, drift event reason codes, and default YAML template loading against fixture materialized samples.
- New template candidates are emitted with `status: new`, `recommendedStatus: learning`, and `allowAutoConfirmCandidate: false`.
- Critical drift returns `recommendedBankAutoConfirmStatus: review_only` and `autoConfirmAllowedForBank: false`.
- Did not implement template learning, trust promotion, admin controls, or payment confirmation behavior.

## 2026-05-02 - Task 013 bank template learning plan

- Scope: implement deterministic template learning primitives for canonicalization, hashing, stats updates, lifecycle recommendation, reliability scoring, shadow evidence, and basic mutation prediction.
- Boundaries: no database/worker wiring, no automatic trust without evidence, no payment confirmation, no LLMs, and no real bank package/cert values.
- Safety checks: raw inputs must become redacted templates, false positives must degrade the template, new templates must start in learning, and mutation candidates must remain untrusted.

## 2026-05-02 - Task 013 bank template learning completed

- Added `packages/bank-templates/src/learning.ts` with redacted canonical template generation, SHA-256 template hashes, learning stats updates, reliability scoring, lifecycle recommendations, and safe mutation candidates.
- Added tests for raw notification redaction, stable hashing, seen count increments, false-positive review-only degradation, no promotion without human evidence, trusted-low-amount requirements, and mutation candidate safety.
- Lifecycle recommendations support `new`, `learning`, `shadow_testing`, `trusted_low_amount`, `trusted`, `degraded`, `review_only`, and `disabled`.
- Trusted lifecycle statuses require evidence thresholds and shadow/reviewer agreement; new mutations remain `status: new` and `allowAutoConfirmCandidate: false`.
- Did not wire learning into workers, databases, admin controls, or payment confirmation behavior.

## 2026-05-02 - Task 014 deployment docker compose plan

- Scope: harden the single-server Docker Compose deployment with a proxy, private data/service networks, health checks, log rotation, and 2 GB RAM-conscious memory limits.
- Boundaries: no production deployment, no production secrets, no Kubernetes, no Kafka, and no unrelated application behavior.
- Safety checks: PostgreSQL, Valkey, NATS, API, web, and workers must not publish host ports; only the proxy may publish a local public port.

## 2026-05-02 - Task 014 deployment docker compose completed

- Added Caddy proxy service as the only host-port-publishing service, defaulting to `HTTP_PORT=8080` for local development.
- Moved API and web from published ports to private `expose` entries and routed `/v1/*`, `/api/*`, and web traffic through Caddy.
- Kept PostgreSQL, Valkey, and NATS on the private Compose network without public host ports.
- Added service health checks, configurable Docker log rotation, and memory limits appropriate for the compact V1 single-server target.
- Added deployment tests asserting required services, proxy-only public ports, private data services, health checks, and log rotation.
- Did not deploy, add production secrets, Kubernetes, Kafka, or any product feature behavior.

## 2026-05-02 - Task 015 security hardening plan

- Scope: strengthen shared security helpers, API logger redaction, API key/webhook secret hashing, phone HMAC/masking tests, webhook signature tests, and receiver anti-replay/signature tests.
- Boundaries: no production secrets, no deployment, no PSP/SBP behavior, no raw phone storage, no raw notification storage, and no unrelated product features.
- Safety checks: sensitive values must be redacted from logs, API keys/webhook secrets must hash without raw storage, and signature verification must fail on tampering.

## 2026-05-02 - Task 015 security hardening completed

- Added API key hash/verify helpers and webhook secret hash/verify helpers in `@swimpay/security`.
- Added recursive log redaction and shared Fastify logger redaction paths for authorization, signatures, secrets, raw notification text, and raw payload fields.
- Updated the API service to use redacted Fastify logging options.
- Extended tests for API key hashing, webhook secret hashing, phone HMAC/masking, sensitive log redaction, webhook signature verification/tamper rejection, and existing receiver signature rejection.
- Did not introduce production secrets, raw phone storage, raw notification storage, or payment confirmation behavior.

## 2026-05-02T10:36:28.979Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:44:03.737Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:48:38.989Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:53:38.485Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T10:59:41.205Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 016 end-to-end tests plan

- Scope: add meaningful in-process E2E coverage for order/session matching inputs, safe incoming signal decision, signed webhook delivery, review routing, unsafe direction rejection, duplicate signal rejection, and collision handling.
- Boundaries: no production external calls, no new product feature implementation, no raw phone or raw notification fixtures, no official bank confirmation wording.
- Safety checks: tests must use fake redacted data, verify unsafe paths do not auto-confirm, and verify public webhook disclosure fields remain `confirmation_type: notification_signal` and `official_bank_confirmation: false`.

## 2026-05-02 - Task 016 end-to-end tests completed

- Added `tests/e2e-payment-signal-flow.test.ts` covering a foundation payment signal flow across matching-core and webhook worker primitives.
- Verified safe incoming signal matching can produce `auto_confirmed` only with exact identity and trust gates, then enqueues and delivers a signed webhook with notification-signal disclosure fields.
- Verified missing phone/reference routes to review, cashback and outgoing signals reject, duplicate signals reject, and amount collisions route to review.
- Used HMAC values derived from redacted placeholders only; no raw notification text, raw phone fixtures, production calls, PSP/SBP behavior, or official bank confirmation wording were introduced.

## 2026-05-02T11:05:00.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 017 admin console minimal plan

- Scope: add minimal operator admin API endpoints for bank profiles, template registry, drift events, webhook failures, receiver health, and audit event search.
- Scope: allow an operator to mark a template `degraded` or `review_only` with a redacted audit event.
- Boundaries: no browser UI, no template promotion, no package/cert trust verification, no raw PII exposure, no unsafe bulk admin actions, no payment decision changes.
- Safety checks: operator-only placeholder auth, redacted action reasons, canonical/redacted template fields only, and audit events for every mutation.

## 2026-05-02 - Task 017 admin console minimal completed

- Added `apps/api/src/admin.ts` with a Postgres admin repository and in-memory test repository.
- Added `/v1/admin/bank-profiles`, `/v1/admin/templates`, `/v1/admin/drift-events`, `/v1/admin/webhook-failures`, `/v1/admin/receiver-health`, and `/v1/admin/audit-events`.
- Added `/v1/admin/templates/:id/degrade` and `/v1/admin/templates/:id/review-only` actions that update template status and write redacted operator audit events.
- Added admin API tests covering read views, operator authorization, template degradation, review-only marking, redacted reasons, and audit event creation.
- Did not implement template promotion, bank app/cert trust verification, dangerous admin actions, raw PII access, PSP/SBP behavior, or official bank confirmation wording.

## 2026-05-02T11:18:00.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T11:19:10.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Task 023 bank template admin console plan

- Scope: extend the admin template foundation with safe bank-template actions: promote, degrade, review-only, disable, and mark false positive.
- Boundaries: no browser UI, no real package/cert verification workflow, no invented bank package/cert values, no raw PII access, no payment confirmation behavior.
- Safety checks: trusted promotions must fail if false positives exist, if evidence thresholds are missing, or if bank app metadata is still `TO_VERIFY`; disable and false-positive actions must block template auto-confirm eligibility.

## 2026-05-02 - Task 023 bank template admin console completed

- Added template promotion endpoint with explicit `target_status` for `shadow_testing`, `trusted_low_amount`, and `trusted`.
- Added disable and false-positive endpoints for bank templates.
- Added promotion guards for false positives, evidence thresholds, and verified non-`TO_VERIFY` bank app metadata.
- False-positive marking increments `false_positive_count`, moves the template to `review_only`, lowers reliability, and disables auto-confirm eligibility.
- Disable immediately returns `auto_confirm_allowed_by_template: false` and writes a redacted operator audit event.
- Added tests for promotion success, false-positive promotion blocking, `TO_VERIFY` trust blocking, false-positive marking, disable behavior, operator auth, and redacted audit events.
- Did not implement real package/cert verification, template merging, browser UI, PSP/SBP behavior, raw PII access, or official bank confirmation wording.

## 2026-05-02T11:28:00.000Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02 - Autonomous run complete

- Completed all pending root tasks in the configured queue from 010 through 023.
- No tasks were skipped or blocked.
- Wrote `.swimpay-agent/AUTONOMOUS_RUN_REPORT.md`.
- Next recommended root task: none currently queued.

## 2026-05-02T11:12:08.578Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)

## 2026-05-02T11:18:17.068Z - Agent validation pass

- PASS: `npm run typecheck` (Typecheck, exit 0)
- PASS: `npm run lint` (Lint, exit 0)
- PASS: `npm test` (Tests, exit 0)
- PASS: `npm run build` (Build, exit 0)
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config` (Docker Compose config, exit 0)
## 2026-05-02T14:35:00+03:00 - Task 024 plan

Task: `024_operator_auth_and_admin_rbac`

Plan:

- Create Phase 2 task files 024-031 and replace the completed foundation queue with the durable runtime queue.
- Add failing tests for centralized operator roles/permissions and admin endpoint auth/RBAC behavior.
- Implement RBAC constants and auth helpers in `@swimpay/security`.
- Replace API admin placeholder auth with configured dev-token auth and signed-token production foundation.
- Require explicit permissions for admin reads and dangerous bank-template actions.
- Update local docs and agent reports.

Guardrails:

- No production deployment.
- No production secrets.
- No PSP/SBP/SMS/scraping behavior.
- No official bank confirmation wording.
- No raw phone or raw notification storage.
- No implementation of tasks 025-031.

## 2026-05-02T14:47:23+03:00 - Task 024 implementation

Result: implemented.

Changes:

- Added Phase 2 task files `024` through `031`.
- Replaced the active queue with Phase 2 durable runtime tasks and marked `024` complete.
- Added centralized operator roles, permissions, role-permission mappings, dev-token auth and signed-token verification in `@swimpay/security`.
- Admin endpoints now reject missing auth and placeholder `Bearer admin_<operator_id>` tokens.
- Admin endpoints now enforce explicit permissions for reads, template promotion, degradation/review-only, disable and false-positive actions.
- Template audit events now use the authenticated operator id instead of accepting an actor override from request body.
- Added `docs/ADMIN_AUTH_AND_RBAC.md` and updated local development/implementation notes.

Targeted TDD evidence:

- `npm test -- packages/security/src/index.test.ts`: RED, then PASS after implementation.
- `npm test -- apps/api/src/admin.test.ts`: RED, then PASS after implementation.
- `npm run typecheck`: PASS after implementation.

## 2026-05-02T14:50:30+03:00 - Task 024 validation pass

Final validation:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 22 test files and 123 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Notes:

- Initial full `npm test` failed because `tests/agent-framework.test.ts` still asserted the old task queue. The test was updated to verify the Phase 2 queue order and the full test suite then passed.
- No blockers were added.

## 2026-05-02T15:10:00+03:00 - Task 025 plan

Task: `025_nats_jetstream_consumers`

Plan:

- Add typed NATS/JetStream runtime helpers in `@swimpay/events` instead of scattering NATS code across services.
- Define the `SWIMPAY_EVENTS` stream subjects from the internal event catalog.
- Add a runtime internal event envelope with validation and raw-PII field rejection.
- Add durable consumer definitions and an explicit ack/nack/term handler wrapper.
- Register safe stub consumers in signal worker and job worker.
- Update docs and local agent reports.

Guardrails:

- No webhook delivery loop.
- No parser, matching, review or payment decision runtime wiring.
- No Android receiver implementation.
- No raw phone or raw notification storage.
- No official bank confirmation wording.

## 2026-05-02T15:16:00+03:00 - Task 025 implementation

Result: implemented.

Changes:

- Added `nats` as the NATS client dependency for `@swimpay/events`.
- Added `InternalEventEnvelope`, NATS config parsing, stream configuration, publish/connect/close helpers, durable consumer definitions, consumer option summaries, and message processing with explicit ack/nack/term behavior.
- Added `payment_session.expired` to the internal event catalog for the job worker expiry consumer.
- Signal worker now registers durable consumer skeletons for `signal.received`, `signal.verified`, `signal.parsed`, and `match.scored`.
- Job worker now registers durable consumer skeletons for `webhook.delivery_requested`, `order.expired`, and `payment_session.expired`.
- Worker health responses now include NATS connection state and registered consumer metadata.
- Added documentation in `docs/NATS_JETSTREAM_CONSUMERS.md`, `docs/07_EVENT_CATALOG.md`, `docs/IMPLEMENTATION_NOTES.md`, and `docs/LOCAL_DEVELOPMENT.md`.

Targeted TDD evidence:

- `npm test -- packages/events/src/jetstream.test.ts`: RED, then PASS after implementation.
- `npm test -- apps/signal-worker/src/consumers.test.ts apps/job-worker/src/consumers.test.ts`: RED, then PASS after implementation.
- `npm run typecheck`: PASS after fixing NATS enum typing and event envelope narrowing.

## 2026-05-02T15:19:08+03:00 - Task 025 validation pass

Final validation:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 25 test files and 136 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Notes:

- NATS consumers intentionally acknowledge only validated known events for now.
- Durable webhook delivery remains task 026.
- Live signal parser/matching/review runtime integration remains task 027.
- No blockers were added.

## 2026-05-02T15:22:00+03:00 - Task 026 plan

Task: `026_postgres_webhook_delivery_loop`

Plan:

- Add failing tests for durable webhook statuses, claim behavior, retry/dead transitions, signed headers with delivery id, PII rejection, NATS event handling and fallback polling.
- Extend the existing webhook worker foundation instead of creating a second webhook system.
- Add a minimal database migration for payload JSON, max attempts, HTTP status, updated timestamps, replay linkage and replay-safe endpoint/event uniqueness.
- Connect the job worker `webhook.delivery_requested` consumer to the delivery processor.
- Keep PostgreSQL as the source of truth and avoid Valkey locks for delivery state.
- Update docs and local agent reports.

Guardrails:

- No signal runtime pipeline.
- No parser/matching/review runtime integration.
- No Android Receiver logic.
- No payment auto-confirmation.
- No production deployment.
- No raw phone or raw notification payload exposure.

## 2026-05-02T15:34:00+03:00 - Task 026 implementation

Result: implemented.

Changes:

- Reworked `apps/job-worker/src/webhooks.ts` around explicit durable statuses: `pending`, `delivering`, `delivered`, `failed`, `dead`, and `cancelled`.
- Added in-memory and PostgreSQL repository support for claiming due deliveries, claiming by delivery id, and claiming by event id.
- Added `FOR UPDATE SKIP LOCKED`-based Postgres claim SQL.
- Added signed delivery headers with `SwimPay-Delivery-Id`.
- Added deterministic retry scheduling for attempts 1 through 7.
- Added sanitized network/HTTP error recording and terminal `dead` state.
- Added raw PII field-marker rejection for webhook payload data.
- Added internal replay helper behavior that keeps the original public event id and creates a new delivery id.
- Added `apps/job-worker/src/webhook-runtime.ts` for worker config, NATS handler and fallback polling loop.
- Connected job worker `webhook.delivery_requested` to the delivery processor while leaving order/session expiry consumers as safe stubs.
- Added migration `002_webhook_delivery_loop.sql`.
- Updated webhook docs, schema docs, event catalog, local development notes and implementation notes.

Targeted TDD evidence:

- `npm test -- apps/job-worker/src/webhooks.test.ts apps/job-worker/src/webhook-runtime.test.ts`: RED, then PASS after implementation.
- `npm run typecheck`: PASS after implementation.
- `npm test -- apps/job-worker/src/webhooks.test.ts apps/job-worker/src/webhook-runtime.test.ts apps/api/src/admin.test.ts tests/foundation.test.ts`: PASS.

## 2026-05-02T15:37:20+03:00 - Task 026 validation pass

Final validation:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 26 test files and 144 tests passed
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Notes:

- Webhook delivery is now durable and Postgres-backed.
- The fallback polling loop is disabled by default and enabled with `WEBHOOK_WORKER_ENABLED=true`.
- The signal parser/matching/review runtime pipeline remains task 027.
- No blockers were added.
# 2026-05-02 - Task 030 Runtime Observability

Plan:
- Add a small shared observability package for redaction, structured logs, in-process metrics, safe health snapshots and lightweight worker status helpers.
- Protect API observability through existing admin RBAC and avoid introducing a new product surface.
- Instrument safe paths only: API order/session creation, signal decisions, webhook delivery outcomes and JetStream ack/nack bookkeeping.
- Add focused tests first, then implement only the observability plumbing.

Result:
- Added `@swimpay/observability` with deep sensitive-field redaction, structured logger, metrics registry, health snapshot builder, worker status tracker and webhook queue summary helper.
- API health now includes uptime and timestamp; API requests return `X-Correlation-Id`.
- Added RBAC-protected `GET /v1/admin/metrics` and `GET /v1/admin/runtime-status`.
- Instrumented order/session creation, receiver signal ingestion duplicates, review confirm/reject, signal runtime parse/review/reject/auto-confirm decisions, webhook delivery outcomes and JetStream ack/nack/error counters.
- Expanded existing security log redaction for phones, notification text, raw bodies/titles, tokens and passwords.
- Added `docs/RUNTIME_OBSERVABILITY.md` and updated local development and implementation notes.

Validation:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3B Android Receiver MVP Foundation

Plan:
- Create tasks 037 through 041 and move the task queue to Sprint 3B.
- Prepare `apps/android-receiver` for Android MVP work with Kotlin-source-ready structure and local TypeScript tests.
- Add listener boundary, allowlist/package verification, snapshot extraction/coalescing, privacy firewall and local parser hints.
- Preserve all Android guardrails: no SMS, no scraping, no raw PII upload, no payment confirmation, backend decides.

Result:
- Added task files `037_android_project_setup` through `041_privacy_firewall_and_local_parser`.
- Added `apps/android-receiver/README.md`, config placeholder and Android source skeleton.
- Added `AndroidReceiverNotificationListener`, `BankPackageVerificationStatuses`, `evaluateAllowedBankPackage`, `buildNotificationSnapshot`, `NotificationCoalescer` and `runPrivacyFirewall`.
- Added tests for listener ignore behavior, `TO_VERIFY` untrusted behavior, snapshot coalescing, privacy redaction and local parser hints.
- Replaced Android Receiver examples that used real-looking package names with synthetic package/cert values.
- Added `docs/ANDROID_RECEIVER_MVP_FOUNDATION.md`.

Validation:
- `npm test -- --run apps/android-receiver/src` PASS
- `npm run typecheck --workspace @swimpay/android-receiver` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS (`32` test files, `214` tests)
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
- Android/Gradle tests not run because the repo does not yet include a Gradle wrapper or Android SDK build configuration.

# 2026-05-02 - Sprint 3C Receiver Lifecycle, Signed Upload, Outbox and Health

Plan:
- Create tasks 042 through 048 and move the task queue to Sprint 3C.
- Add testable receiver clients for registration, signed heartbeat and signed signal upload.
- Add encrypted outbox retry modeling, safe receiver health warnings and a local backend smoke plan.
- Document Android Gradle readiness without adding unstable Gradle tooling.

Result:
- Added task files `042_receiver_device_registration_client` through `048_android_gradle_readiness_plan`.
- Added lifecycle helpers in `apps/android-receiver/src/index.ts`.
- Added `apps/android-receiver/src/android-receiver-lifecycle.test.ts`.
- Added `scripts/receiver-local-smoke.mjs` and `npm run smoke:receiver`.
- Added `docs/ANDROID_RECEIVER_LIFECYCLE.md` and `docs/ANDROID_GRADLE_READINESS_PLAN.md`.
- Updated Android Receiver docs, local development notes, implementation notes and agent queue state.

Validation:
- `npm test -- --run apps/android-receiver/src/android-receiver-lifecycle.test.ts` RED first, then PASS after implementation.
- `npm run typecheck --workspace @swimpay/android-receiver` PASS
- `npm test -- --run apps/android-receiver/src` PASS
- `npm test -- --run apps/android-receiver/src tests/agent-framework.test.ts` PASS
- `npm run smoke:receiver` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS (`33` test files, `223` tests)
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
- Android/Gradle tests not run because no Gradle wrapper or Android SDK build configuration exists yet.

# 2026-05-02 - Sprint 3D Android Runnable App Setup

Plan:
- Create tasks 049 through 056 and move the task queue to Sprint 3D.
- Add Android Gradle project files without inventing a wrapper JAR.
- Add manifest, status screen/model, Android Keystore signer skeleton, encrypted outbox platform boundary and WorkManager retry skeleton.
- Add emulator smoke documentation and closeout review.
- Keep Android capture/filter/redact/sign/upload only.

Result:
- Added Gradle project files under `apps/android-receiver/android`.
- Added `MainActivity`, `ReceiverStatusViewModel`, Android Keystore signer, fake signer, encrypted outbox interfaces/adapters and `SignalUploadWorker`.
- Added `docs/ANDROID_EMULATOR_SMOKE_TEST.md`.
- Added `.swimpay-agent/ANDROID_MVP_CLOSEOUT_REVIEW.md`.
- Added static tests in `apps/android-receiver/src/android-runnable-app.test.ts`.
- Added `npm run android:doctor`.

Validation:
- `npm test -- --run apps/android-receiver/src/android-runnable-app.test.ts` RED first, then PASS after implementation.
- `npm test -- --run apps/android-receiver/src tests/agent-framework.test.ts` PASS
- `npm run android:doctor` PASS as diagnostic; Java and Android SDK present, Gradle unavailable.
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS (`34` test files, `227` tests)
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
- Android Gradle assemble not run because no `gradle` command is available and no wrapper JAR is checked in.
# 2026-05-02 - Task 031 Android Receiver Contract Validation

Plan:
- Add shared Android Receiver contract DTOs and validators in `@swimpay/contracts`.
- Strengthen existing receiver registration, heartbeat and signal upload endpoints around those contracts.
- Keep Android as capture/filter/redact/sign/upload only; backend remains the only decision maker.
- Reject raw phone/raw notification fields by default and document restricted debug behavior as not implemented.
- Add tests first for contract validation, API behavior, anti-replay/privacy and observability counters.

Result:
- Added shared Android Receiver DTOs, validation helpers, error codes, snapshot/coalescing contracts and canonical signed payload generation in `@swimpay/contracts`.
- Strengthened receiver registration, heartbeat and signal upload API validation.
- Rejected raw phone fields, raw notification text, missing signatures, invalid timestamps, invalid currency and non-integer minor-unit amounts before persistence.
- Preserved `TO_VERIFY` package/cert metadata as untrusted and non-confirming.
- Added receiver observability counters for registration, heartbeat, accepted signals, rejected signals and invalid signatures.
- Updated Android Receiver contract/spec documentation and local development notes.

Validation:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

Completed at: 2026-05-02T17:48:21+03:00.

# 2026-05-02 - Sprint 3A / Task 032 Device Signature Verification Hardening

Plan:
- Add tests first for explicit receiver signature algorithm, unknown device rejection, suspended/revoked device rejection, invalid signature rejection and local counter replay protection.
- Keep the verifier deterministic and testable without introducing a production bypass.
- Preserve Android as capture/redact/sign/upload only; backend remains the decision point.

Result:
- Added explicit `hmac_sha256_canonical_v1` receiver signature algorithm constant.
- Changed signature verification to return a typed result with algorithm and failure reason.
- Blocked suspended, revoked and disabled receiver devices from signal upload before signature persistence.
- Added rejected-signal metrics for unknown and disabled devices.
- Documented the current deterministic verifier and future asymmetric verification requirement.

Validation:
- `npm test -- --run packages/contracts/src/android-receiver.test.ts apps/api/src/signals.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 033 Live Docker Runtime Smoke Tests

Plan:
- Add a local smoke checker for Docker Compose runtime readiness.
- Verify service presence, private infrastructure exposure, healthchecks and log rotation.
- Document exact local commands without deploying to production or changing product behavior.

Result:
- Added `npm run smoke:runtime`.
- Added a Compose config inspector for expected services, internal private network, healthchecks, log rotation and host port exposure.
- Added unit tests for safe Compose shape, forbidden infrastructure ports and missing runtime healthchecks.
- Added `docs/LIVE_DOCKER_RUNTIME_SMOKE.md` and local development notes.

Validation:
- `npm test -- --run tests/live-runtime-smoke.test.ts` PASS
- `npm run smoke:runtime` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 034 Backend Receiver Signal Live Flow

Plan:
- Strengthen the in-process durable E2E receiver upload flow around response semantics.
- Verify accepted receiver uploads remain backend-decision-pending and cannot imply payment confirmation.
- Document the synthetic backend flow and privacy constraints.

Result:
- Added assertions that API receiver signal upload returns `status: received`, `accepted: true` and `next_action: backend_decision_pending`.
- Verified the response does not include `official_bank_confirmation`.
- Preserved the existing runtime check that `TO_VERIFY` bank metadata routes to review and never auto-confirms.
- Added `docs/BACKEND_RECEIVER_SIGNAL_LIVE_FLOW.md`.

Validation:
- `npm test -- --run tests/durable-worker-e2e.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 035 Bank App Verification Workflow

Plan:
- Add a guarded operator/admin workflow for observed bank app package/certificate metadata.
- Keep `TO_VERIFY` metadata untrusted and impossible to verify automatically.
- Audit verification actions and avoid exposing full certificate fingerprints.

Result:
- Added `GET /v1/admin/bank-app-signatures`.
- Added `POST /v1/admin/bank-app-signatures/:id/verify`.
- Verification requires `promote_bank_templates`, writes `admin.bank_app_signature.verified`, and updates admin repository state.
- Added tests for listing metadata, blocking `TO_VERIFY`, verifying synthetic observed metadata, and permission denial.
- Added `docs/BANK_APP_VERIFICATION_WORKFLOW.md`.

Validation:
- `npm test -- --run apps/api/src/admin.test.ts` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

# 2026-05-02 - Sprint 3A / Task 036 Phase 2 Closeout Review

Plan:
- Create Phase 2 closeout review.
- Create Sprint 3A report.
- Update blockers, next action and queue state.

Result:
- Added `.swimpay-agent/PHASE_2_CLOSEOUT_REVIEW.md`.
- Added `.swimpay-agent/SPRINT_3A_REPORT.md`.
- Updated `.swimpay-agent/BLOCKERS.md`, `.swimpay-agent/NEXT_ACTION.md`, `.swimpay-agent/CURRENT_TASK.md` and `.swimpay-agent/TASK_QUEUE.md`.

Validation:
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
## 2026-05-02 - Sprint 4A / Android Toolchain Activation and Build Validation

Plan:
- Improve Android toolchain diagnostics without faking Gradle success.
- Document safe Gradle wrapper generation policy.
- Record `assembleDebug` and Android JVM test status honestly.
- Keep Node/Compose validation passing.

Result:
- Added Sprint 4A task files `057` through `061`.
- Updated `.swimpay-agent/TASK_QUEUE.md` to Sprint 4A.
- Improved `npm run android:doctor` to report Java, Android SDK, Gradle, Gradle wrapper, Android module path and `assembleDebug` readiness.
- Added `docs/GRADLE_WRAPPER_POLICY.md`.
- Added `docs/ANDROID_JVM_UNIT_TEST_PLAN.md`.
- Added `.swimpay-agent/ANDROID_BUILD_TOOLCHAIN_REPORT.md` and `.swimpay-agent/SPRINT_4A_REPORT.md`.
- Java and Android SDK are available.
- Gradle and the Gradle wrapper are unavailable, so `assembleDebug` and Android JVM tests remain blocked and are not claimed as passed.

Validation:
- `npm run android:doctor` PASS as diagnostic
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

## 2026-05-02 - Sprint 4B / Gradle Wrapper Generation and Android Build Execution

Plan:
- Bootstrap Gradle without a privileged/global install.
- Generate the wrapper through the official Gradle wrapper task.
- Run Android `assembleDebug` and JVM tests if the wrapper works.
- Triage any Android build failures without weakening safety rules.

Result:
- Downloaded Gradle `8.11.1` from `services.gradle.org` to a temporary local cache outside the repo.
- Verified the Gradle ZIP SHA256 against the official Gradle checksum file.
- Generated `gradlew`, `gradlew.bat`, `gradle-wrapper.properties` and `gradle-wrapper.jar` through `gradle wrapper`.
- Verified wrapper properties point to `https://services.gradle.org/distributions/gradle-8.11.1-bin.zip`.
- Added Android `gradle.properties` with AndroidX enabled.
- Aligned Java and Kotlin compile targets to 17.
- Added Android JVM tests for status warnings, canonical payload signing, fake signer behavior and encrypted outbox boundaries.
- `assembleDebug` and `testDebugUnitTest` pass with `ANDROID_HOME` set to the local SDK.

Validation:
- `npm run android:doctor` PASS
- `.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace` PASS
- `.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

## 2026-05-02 - Sprint 4C / Android Emulator Smoke Validation

Plan:
- Create Sprint 4C task files 068 through 074 and move the task queue to emulator smoke validation.
- Add an emulator doctor that reports adb, emulator command, AVDs, running devices, APK path and local backend URL guidance.
- Document Notification Access manual flow and local backend receiver smoke expectations.
- Do not claim APK install or emulator smoke success unless adb confirms a running device.

Result:
- Added `scripts/android-emulator-doctor.mjs`.
- Added `npm run android:emulator-doctor`.
- Added task files `068_emulator_environment_doctor` through `074_emulator_smoke_closeout_review`.
- Updated Android receiver docs, local development notes and implementation notes with emulator smoke status and commands.
- Created `.swimpay-agent/EMULATOR_SMOKE_REPORT.md`.
- Created `.swimpay-agent/SPRINT_4C_REPORT.md`.

Environment findings:
- SDK adb is available at `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
- No Android Emulator command is available under the local SDK.
- No AVD is configured.
- No running adb device is attached.
- The debug APK exists at `apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`.

Validation:
- `npm run android:doctor` PASS
- `npm run android:emulator-doctor` PASS as diagnostic, with live emulator blocked
- `npm test -- --run apps/android-receiver/src/android-runnable-app.test.ts` PASS
- `npm test -- --run tests/agent-framework.test.ts` PASS
- `.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace` PASS
- `.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS

Notes:
- APK install, Notification Access live validation, receiver registration, heartbeat, synthetic signal upload and outbox offline/online smoke are blocked until an emulator/device is available.
- No critical SwimPay blockers were added.

## 2026-05-02 - Sprint 4D / ADB Real Device Receiver Smoke

Plan:
- Locate ADB even though it is not in PATH.
- Detect and authorize the connected Android phone.
- Build, install and launch the SwimPay Receiver APK on the real device.
- Configure adb reverse for backend port `3000`.
- Open Notification Access settings and verify Android system-level listener state.
- Attempt the safest possible backend smoke, using synthetic data only.

Result:
- ADB found at `C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
- Selected physical USB device serial `R5CWA0FEPZW` for Samsung `SM_S916B`.
- Device authorization status is `device`.
- `:app:assembleDebug` PASS.
- `:app:testDebugUnitTest` PASS.
- APK install PASS.
- App launch PASS.
- adb reverse `tcp:3000 tcp:3000` PASS.
- Notification Access enabled at Android system level for `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`.

Blocked live backend steps:
- `http://localhost:3000/health` did not respond.
- Docker Desktop Linux engine pipe was unavailable.
- Receiver registration, heartbeat, synthetic signal upload and outbox offline/online smoke were not run against a live backend.

Safety checks:
- No real bank notifications used.
- No real customer data used.
- No SMS permission or scraping behavior added.
- No Android payment confirmation or auto-confirmation added.
# 2026-05-02T21:34:45+03:00 - Sprint 4E Backend Live Smoke + Receiver Debug Triggers

- Created Sprint 4E task files 083-089 and updated the task queue.
- Diagnosed `localhost:3000/health`: API port 3000 is private in Compose; correct host route is `http://localhost:8080/api-health`.
- Fixed Docker build failures by copying declared workspace packages into service Dockerfiles.
- Fixed PostgreSQL local Docker network connectivity with `listen_addresses = '*'` while keeping Postgres unexposed publicly.
- Added `npm run backend:doctor`.
- Verified Compose stack healthy and API health dependencies OK.
- Re-established ADB reverse on real device `R5CWA0FEPZW` for port 8080.
- Rebuilt, reinstalled and launched the Android APK.
- Added live Notification Access status reading; device UI now shows Notification Access enabled and listener connected.
- Added debug-only receiver smoke action panel with safe wording and synthetic/redacted boundaries.
- Ran synthetic backend registration, heartbeat and signal upload; signal returned `backend_decision_pending`.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Gradle assembleDebug, Gradle JVM tests, Compose ps and API health.
- Non-critical limitation: app-side network execution/outbox retry smoke remains for Sprint 4F.

# 2026-05-02T22:09:47+03:00 - Sprint 4F Device-side Network Smoke Wiring

- Created Sprint 4F task files 090-096 and updated the task queue.
- Added debug-only Android backend config with default `http://127.0.0.1:8080`.
- Added debug-only localhost cleartext network security for the debug source set only.
- Added Android debug HTTP client for `/api-health`, receiver registration, heartbeat and signal upload.
- Wired debug panel actions to real app-side network calls.
- Added synthetic redacted signal signing with compact stable JSON compatible with the backend HMAC verifier.
- Fixed initial real-device upload `401`: Kotlin canonical JSON included spaces while backend stable JSON is compact.
- Added local counter advancement so upload followed by outbox flush does not replay the same counter.
- Wired debug outbox enqueue/flush behavior; real-device flush returned `acked=1 failed_retrying=0`.
- Rebuilt, installed and launched the APK on real device `R5CWA0FEPZW`.
- Ran real app-side smoke over `adb reverse tcp:8080 tcp:8080`; register, heartbeat, synthetic signal upload, outbox enqueue and flush all passed.
- Updated Android docs, local development docs, `.swimpay-agent/SPRINT_4F_REPORT.md`, `.swimpay-agent/REAL_DEVICE_SMOKE_REPORT.md`, `.swimpay-agent/BLOCKERS.md` and `.swimpay-agent/NEXT_ACTION.md`.

Validation:
- `npm run android:doctor` PASS
- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm test` PASS
- `npm run build` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` PASS
- `GET http://localhost:8080/api-health` PASS
- `.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace` PASS
- `.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace` PASS
- `adb devices -l` PASS
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080` PASS
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk` PASS
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity` PASS

Safety checks:
- No real bank notification used.
- No real customer data used.
- No SMS, scraping or Accessibility behavior added.
- No Android payment confirmation or auto-confirmation added.
- No raw phone or raw notification text uploaded/displayed.
- `TO_VERIFY` package/cert metadata remains untrusted.
## 2026-05-02T23:00:00+03:00 - Sprint 4G Persistent Outbox and Live Status

- Created tasks 097 through 103.
- Persisted debug receiver device state and local anti-replay counter.
- Added persistent protected outbox storage for redacted signed payloads.
- Added bounded retry policy and manual debug flush against persisted entries.
- Added live debug backend `/api-health` refresh to the Android status screen.
- Added debug-only broadcast smoke automation to avoid unsafe UI tapping.
- Real-device offline/online smoke passed using local Caddy proxy stop/start.
- No real bank notifications, customer data, SMS, scraping, Android confirmation or raw PII were used.

## 2026-05-02T23:30:00+03:00 - Sprint 4H Android Production Storage and Worker Hardening

- Created tasks 104 through 111 and updated the task queue.
- Added production/debug signing policy; production rejects the JVM fake signer.
- Added Android Keystore-backed protected outbox storage adapter.
- Added migration from legacy debug outbox storage into protected storage.
- Added outbox cleanup for old acknowledged and expired records.
- Hardened WorkManager retry boundaries with unique work, network constraint and bounded attempts.
- Kept debug smoke broadcast/actions debug-only and release manifest free of debug receiver, SMS and Accessibility service.
- Added Android JVM and static tests for storage security, signing policy, retry planning and debug/release separation.
- Real-device background retry smoke passed with synthetic redacted data only.
- No real bank notifications, customer data, SMS, scraping, Android confirmation or raw PII were used.

## 2026-05-02T23:55:28+03:00 - Sprint 4I Synthetic Notification Listener E2E and Receiver Diagnostics

- Created tasks 112 through 120 and updated the task queue.
- Added a debug-only synthetic notification source inside the Android Receiver.
- Added synthetic package/cert metadata marked `synthetic_debug_only` and accepted only in debug mode.
- Added NotificationListener pipeline pieces: snapshot extraction, allowlist gate, coalescer, privacy firewall, local hints, persistent outbox enqueue and signed upload flush.
- Added receiver diagnostics model with safe status, queue counts and redacted error summaries.
- Added Android JVM and static tests for synthetic package gating, coalescing, redaction, diagnostics and Sprint 4I task order.
- Real-device deterministic synthetic notification pipeline passed through outbox/backend with `acked=1 failed_retrying=0`.
- Synthetic notification posting passed, but live NotificationListener capture must be rerun after manually re-enabling Android Notification Access because reinstall/data clear removed the OS listener grant.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, Gradle assembleDebug, Gradle JVM tests, ADB reverse/install/launch and debug broadcast smoke.
- No real bank notifications, customer data, SMS, scraping, Android confirmation, raw PII or real bank package/cert values were used.

## 2026-05-03T00:31:25+03:00 - Phase 4J Receiver Onboarding Gate

- Created tasks 129 through 135 and updated the task queue.
- Added `ReceiverOnboardingReadinessEvaluator` and readiness states.
- Made Notification Listener Access mandatory for `receiver_ready`, `capture_enabled` and normal upload readiness.
- Separated app notification permission from Notification Listener Access in status/readiness.
- Added Android action for `android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`.
- Added regrant detection when previous listener access was true but the current platform check is false after reinstall/data clear.
- Added bank selection readiness gate; `TO_VERIFY` and review-only banks can reach `ready_review_only`, not auto-confirm readiness.
- Updated Android docs, local development docs, app README and `.swimpay-agent/RECEIVER_ONBOARDING_GATE_REPORT.md`.
- Added Android JVM and static tests for onboarding gates.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Gradle assembleDebug and Gradle JVM tests.

## 2026-05-03T00:52:04+03:00 - Phase 4J-B Real NotificationListener Replay After Onboarding Gate

- Created tasks 136 through 140 and updated the task queue.
- Verified backend health at `http://localhost:8080/api-health`.
- Verified real device `R5CWA0FEPZW` is authorized and adb reverse `tcp:8080 tcp:8080` works.
- Verified Android Notification Listener Access includes `com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService`.
- Rebuilt, installed and launched the debug APK.
- Replayed the debug-only synthetic notification source on the real device.
- Captured live listener diagnostics with safe metadata only: synthetic package label, notification id/tag, post time, field count and result.
- Tightened the listener prefilter so non-allowlisted packages are ignored before snapshot extraction.
- Made synthetic debug notification ids/tags unique per replay to avoid stale same-id notification updates.
- Verified the listener-created outbox entry flushed through WorkManager with `acked=1 failed_retrying=0`.
- No real bank notification, customer data, SMS, scraping, Android confirmation, raw phone, raw notification text or real bank package/cert value was used.

## 2026-05-03T01:20:17+03:00 - Sprint 4K Receiver Bank Selection Readiness and Resilience

- Created tasks 141 through 147 and updated the task queue.
- Added receiver-side bank profile selection model with `selected`, `review_only`, `synthetic_debug_only` and verification status fields.
- Kept V1 `TO_VERIFY` bank profiles review-only and untrusted for production readiness.
- Added `ready_review_only` tests for selected `TO_VERIFY` banks and synthetic debug profiles.
- Added bank selection onboarding/debug UI model with safe French review-only warning.
- Added PII-safe `ReceiverOperatorDiagnosticsExport`.
- Updated Android status screen to show selected banks, trusted bank count and review-only warning.
- Real-device restart smoke passed: after app force-stop/relaunch, synthetic debug notification was captured, enqueued and uploaded with `acked=1 failed_retrying=0`.
- Real-device offline/online persistent outbox smoke passed: local proxy outage produced `failed_retrying=1`; after proxy restore and app relaunch, flush produced `acked=1 failed_retrying=0`.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, Gradle assembleDebug, Gradle JVM tests, ADB reverse/install/launch and debug broadcast smoke.
- No real bank notification, customer data, SMS, scraping, Android confirmation, raw phone, raw notification text or real bank package/cert value was used.

## 2026-05-03T01:36:30+03:00 - Sprint 4L Bank Package Evidence Dry Run Readiness

- Created tasks 148 through 154 and updated the task queue.
- Added receiver-side bank package evidence observation, policy and diagnostics models.
- Added Android PackageManager evidence collector for explicit package-name checks only; no app enumeration was added.
- Kept `TO_VERIFY`, pending and observed package/cert evidence review-only until explicit operator review.
- Kept synthetic debug package/cert metadata debug-only and non-production trust evidence.
- Added PII-safe diagnostics with masked certificate hashes and redacted reason codes.
- Added `docs/BANK_PACKAGE_EVIDENCE_DRY_RUN.md` and updated Android Receiver, security, local development and bank verification docs.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, Gradle assembleDebug, Gradle JVM tests, ADB reverse/install/launch.
- No real bank notification, customer data, SMS, scraping, Android confirmation, raw phone, raw notification text or real bank package/cert value was used.

## 2026-05-03T01:52:33+03:00 - Sprint 4M Operator-reviewed Bank Evidence Workflow

- Created tasks 155 through 161 and updated the task queue.
- Added `bank_package_evidence` migration with review-only statuses.
- Added backend evidence validation and repository support.
- Added `POST /v1/bank-evidence` receiver intake endpoint.
- Added RBAC-protected `GET /v1/admin/bank-evidence`, detail, approve-review-only and reject endpoints.
- Added audit events for evidence submission, review, approval and rejection.
- Added Android debug-only synthetic bank evidence submission action.
- Added backend API, Android JVM and static tests for evidence workflow safety.
- Updated database, Android Receiver, security, local development and bank evidence docs.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, Gradle assembleDebug, Gradle JVM tests, ADB reverse/install/launch.
- No real bank notification, customer data, SMS, scraping, Android confirmation, raw phone, raw notification text or real bank package/cert value was used.

## 2026-05-03T02:13:21+03:00 - Sprint 4N Synthetic Evidence Operator Review Rehearsal

- Created tasks 162 through 168 and updated the task queue.
- Rebuilt the local Compose API/web images so `/v1/bank-evidence` and `/v1/admin/bank-evidence` were active in the live backend.
- Applied additive migration `004_bank_package_evidence.sql` to the existing local Postgres volume.
- Used real device `R5CWA0FEPZW` with adb reverse `tcp:8080 tcp:8080`.
- Triggered Android debug action `submit_synthetic_bank_evidence`; backend stored synthetic evidence `1a9d9a24-c100-4a4c-8aba-d5e97373fb9b`.
- Approved the synthetic evidence as `approved_for_review_only`; response kept `trusted: false` and `auto_confirm_enabled: false`.
- Submitted and rejected a second synthetic fixture `c09d4c00-b75b-4397-bf47-29dbd4979852`.
- Verified redacted audit events for submission, review, approve-review-only and rejection.
- Created `docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md`.
- Stabilized Android Gradle validation for this 7 GB Windows host by reducing daemon heap to `-Xmx768m`, capping metaspace and using one Gradle worker after an out-of-memory daemon crash.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, Gradle assembleDebug, Gradle JVM tests, ADB reverse/install/launch.
- No real bank notification, real bank package/cert, customer data, installed-app enumeration, SMS, scraping, Android confirmation, raw phone or raw notification text was used.

## 2026-05-03T10:55:00+03:00 - Sprint 4O Bank Evidence Production Trust Policy

- Created tasks 169 through 175 and updated the task queue.
- Added production trust policy statuses: `production_trust_requested`, `production_trust_approved`, `production_trust_revoked`.
- Added additive migration `005_bank_evidence_production_trust_policy.sql`.
- Added owner/admin-only permissions for production trust request, approval and revocation.
- Added admin endpoints for request/approve/revoke production trust.
- Enforced dual-control: requester cannot approve the same evidence.
- Kept production trust metadata-only; responses still keep `trusted: false` and `auto_confirm_enabled: false`.
- Added redacted audit events for production trust transitions.
- Added `docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md` and updated RBAC, schema, security and runbook docs.
- Added API/static tests for trust guards, RBAC, dual-control, revocation, audit and no-Pii behavior.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health and local API/proxy rebuild after applying migration 005.
- No real bank evidence, real notification, customer data, installed-app enumeration, SMS, scraping, Android confirmation, raw phone or raw notification text was used.

## 2026-05-03T11:20:00+03:00 - Sprint 4P Real Bank Evidence Dry-run Planning

- Created tasks 176 through 182 and updated the task queue.
- Added strict explicit package-name policy for real PackageManager evidence dry runs.
- Added Android lookup result model with `FOUND`, `PACKAGE_NOT_FOUND` and `INVALID_PACKAGE_NAME`.
- Hardened PackageManager evidence lookup to inspect one exact package only and fail safely when absent.
- Added debug/operator action `submit_explicit_package_evidence` with `package_name` and optional `bank_profile_id` extras.
- Kept all submitted explicit evidence as backend `pending_operator_review`, `trusted: false` and `auto_confirm_enabled: false`.
- Created `docs/REAL_BANK_EVIDENCE_DRY_RUN_RUNBOOK.md` and updated receiver/security/runbook docs.
- Added Android JVM and static tests for explicit input, package-not-found, no enumeration, no raw PII and no auto-confirm behavior.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, Android assembleDebug and Android JVM tests.
- No live real evidence was collected because no explicit real package name was provided by the operator/user.

## 2026-05-03T11:35:33+03:00 - Sprint 4Q Real Package Evidence Dry Run

- Created tasks 183 through 188 and updated the task queue.
- Recorded operator-selected package `ru.sberbankmobile` in `.swimpay-agent/REAL_PACKAGE_EVIDENCE_INPUT.md`.
- Verified real device `R5CWA0FEPZW`, adb reverse `tcp:8080 tcp:8080`, Compose service health and API health at `http://localhost:8080/api-health`.
- Built, installed and launched the debug Android Receiver APK.
- App-side debug PackageManager lookup returned `package_not_found`; exact ADB PackageManager metadata lookup for `ru.sberbankmobile` found the package without installed-app enumeration.
- Submitted exact metadata evidence `f4069615-028b-4329-a136-115495bd058c` to `/v1/bank-evidence` as `pending_operator_review`.
- Approved the evidence as `approved_for_review_only`; response kept `trusted: false`, `production_trusted_app_metadata: false` and `auto_confirm_enabled: false`.
- Verified redacted audit events for submission, review and approve-review-only with masked certificate hash `fea43e...99a2ea`.
- Verified `sber_ru` bank profile stayed `learning`; `bank_app_signatures` did not gain a production-trusted real package signature.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, Android assembleDebug and Android JVM tests.
- No real notification, customer data, installed-app enumeration, SMS, scraping, production trust, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T11:54:16+03:00 - Sprint 4R Android Package Visibility Evidence Hardening

- Created tasks 189 through 195 and updated the task queue.
- Added `docs/ANDROID_PACKAGE_VISIBILITY_POLICY.md`.
- Added exact debug/operator manifest visibility for `ru.sberbankmobile`; no main/release query and no broad visibility were added.
- Added `PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED` lookup status and safe operator messages for package visibility limitations.
- Kept evidence lookup one explicit package at a time with no installed-app enumeration.
- Retested real device `R5CWA0FEPZW`: backend health, adb reverse, APK build/install/launch and app-side explicit evidence submission all passed.
- App-side evidence submission created `878ddd87-2e69-40b1-9cc7-da15d95a6b0b` as `pending_operator_review` with `trusted: false`, `production_trusted_app_metadata: false` and `auto_confirm_enabled: false`.
- Added Android JVM/static tests for visibility semantics, exact debug query, no `QUERY_ALL_PACKAGES`, no enumeration, no SMS, no Accessibility scraping and no auto-confirm behavior.
- No real notification, customer data, installed-app enumeration, SMS, scraping, production trust, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T12:20:25+03:00 - Sprint 4S Operator Review UX and Evidence Lifecycle Hardening

- Created tasks 196 through 202 and updated the task queue to Sprint 4S.
- Added operator review dashboard response fields: `submitted_at` and `production_trust_status`.
- Changed exact duplicate evidence submission to idempotent success with `duplicate: true` and no duplicate audit event.
- Kept changed package certificate submissions as new `pending_operator_review` evidence rows.
- Added explicit evidence review reason codes with optional redacted notes; invalid reason codes are rejected.
- Added `POST /v1/admin/bank-evidence/:id/deprecate`, redacted `bank_evidence.deprecated` audit event and non-destructive deprecated lifecycle behavior.
- Added metadata-only admin evidence filters for status, bank profile, package name, source and submitted date range.
- Updated bank evidence runbook, production trust policy, database schema notes, security/privacy notes and Android Receiver contract docs.
- Added backend/API and orchestration tests for duplicate handling, changed certs, dashboard DTOs, reason validation, deprecation, filtering and Sprint 4S task queue ordering.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps and API health.
- Android Gradle validation was not run because Sprint 4S did not touch Android code.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T12:35:24+03:00 - Sprint 4T Evidence Lifecycle UI/API Rehearsal and Admin Audit Visibility

- Created tasks 203 through 209 and updated the task queue to Sprint 4T.
- Added `GET /v1/admin/bank-evidence/review-dashboard` for operator evidence lifecycle rehearsal.
- Dashboard responses include status counts, review queue, recent evidence, safe next actions and explicit safety flags.
- Extended admin audit event search with `object_id`, `actor_id`, `created_after` and `created_before`.
- Kept certificate hashes masked and audit/dashboard payloads free of raw phone, raw notification text, raw title/body, secrets and full certificate hashes.
- Created `docs/BANK_EVIDENCE_LIFECYCLE_REHEARSAL.md` and updated the bank evidence operator runbook and security/privacy notes.
- Added backend/API tests for dashboard and audit trace filtering plus Sprint 4T queue ordering.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps and API health.
- Android Gradle validation was not run because Sprint 4T did not touch Android code.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T12:47:04+03:00 - Sprint 4U Operator Evidence Review UI/API Rehearsal and Production Trust Guard Validation

- Created tasks 210 through 216 and updated the task queue to Sprint 4U.
- Added `scripts/evidence-lifecycle-rehearsal.mjs` and `npm run rehearsal:evidence`.
- Added non-destructive rehearsal plan mode with `npm run rehearsal:evidence -- --plan`.
- Added local dashboard/audit redaction inspection for evidence lifecycle rehearsal.
- Added optional production trust dual-control guard validation for explicit local/dev evidence ids.
- Fixed rehearsal false positives so UUIDs and timestamps are not treated as raw phone values.
- Rebuilt the local API container so the Sprint 4T dashboard endpoint was available in Compose.
- Ran local rehearsal successfully; dashboard/audit checks passed.
- Ran optional guard rehearsal on local evidence `f4069615-028b-4329-a136-115495bd058c`; same-actor approval stayed blocked and auto-confirmation stayed disabled.
- Added tests for rehearsal plan, redaction, production trust guard inspection, injected fetch execution and Sprint 4U queue/script wiring.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust approval, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T12:59:29+03:00 - Sprint 4V Evidence Operator UI Surface and Production Trust Audit Drill

- Created tasks 217 through 224 and updated the task queue to Sprint 4V.
- Added `GET /admin/evidence-review` in `swimpay-web`.
- Added a web-side admin evidence client for the existing evidence dashboard and audit event APIs.
- Rendered evidence status counts, pending queue, recent evidence and redacted audit traces.
- Added production trust audit drill copy: review-only evidence is not production trust, auto-confirm remains disabled and production trust requires dual-control.
- Kept the page read-only; it cannot request, approve or revoke production trust.
- Added defensive web rendering so full certificate hashes, raw phone, raw notification text, raw title/body, tokens and secrets are not shown.
- Added tests for the evidence operator page, safe unavailable state and Sprint 4V queue ordering.
- Rebuilt `swimpay-web` locally and verified `http://localhost:8080/admin/evidence-review` returns HTTP 200 with safety checks passing.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, operator UI page check and `npm run rehearsal:evidence`.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust approval, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T13:09:06+03:00 - Sprint 4W Evidence Production Trust Dual-operator Rehearsal and Operator Handoff

- Created tasks 225 through 232 and updated the task queue to Sprint 4W.
- Added `scripts/evidence-production-trust-handoff.mjs` and `npm run handoff:evidence-trust`.
- Added a non-mutating handoff plan for production trust metadata review.
- Added guarded default execution that checks evidence dashboard/audit access and redaction without mutating evidence.
- Added explicit mutating drill support requiring `SWIMPAY_EVIDENCE_ID`, requester token, approver token and `SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true`.
- Added handoff inspection for request, same-actor dual-control block, second-operator approval, revocation and redacted audit continuity.
- Added `docs/BANK_EVIDENCE_PRODUCTION_TRUST_HANDOFF.md` and updated evidence lifecycle, operator runbook, production trust policy and security docs.
- Local Compose run stayed non-mutating because `dev_token` mode represents one operator and cannot prove second-operator approval without weakening RBAC.
- Added tests for the handoff plan, full fake dual-operator flow, redaction guards, default non-mutating behavior, explicit mutating call order and Sprint 4W queue/script wiring.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, handoff plan/default runs and `git diff --check`.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust approval in local Compose, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T13:35:00+03:00 - Sprint 4X Signed Operator Token Local Rehearsal and Production Trust Handoff Execution

- Created tasks 233 through 240 and updated the task queue to Sprint 4X.
- Added `scripts/operator-token-helper.mjs` and `npm run operator:tokens` for local signed requester/approver/revoker token generation.
- Added `npm run rehearsal:evidence:signed` for a signed-token local API handoff rehearsal.
- The signed-token rehearsal executes request, same-actor approval block, second-operator approval, revocation and audit continuity against in-process local evidence.
- The final evidence state is `production_trust_revoked`.
- Added tests for token helper behavior, masked output, unsafe input rejection, signed-token API auth, dual-control, read-only denial and audit redaction.
- Updated production trust handoff, operator runbook, production trust policy and security/privacy docs.
- Validation passed: android doctor, typecheck, lint, tests, build, compose config, Compose ps, API health, signed-token rehearsal, Android assembleDebug after exporting `ANDROID_HOME`, Android JVM tests and `git diff --check`.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production deployment, persistent production trust, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T13:39:27+03:00 - Sprint 4Y Signed-token Compose Handoff Rehearsal and Production Trust Operational Playbook

- Created tasks 241 through 248 and updated the task queue to Sprint 4Y.
- Added `infra/docker-compose.signed-admin.override.yml` for local-only signed-token Compose rehearsal.
- Added `scripts/evidence-production-trust-compose-signed-rehearsal.mjs` and `npm run rehearsal:evidence:compose-signed`.
- Added guarded plan and execution behavior requiring signed requester/approver tokens, `SWIMPAY_SIGNED_COMPOSE_HANDOFF=true` and `SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF=true`.
- Added `docs/BANK_EVIDENCE_SIGNED_COMPOSE_HANDOFF_PLAYBOOK.md` and updated the production trust handoff, operator runbook, production trust policy and security/privacy docs.
- Added tests for signed Compose plan output, missing guard behavior, fake signed Compose handoff delegation and Sprint 4Y queue/script wiring.
- Deterministic validation passed: targeted tests, signed Compose plan, signed Compose override config, android doctor, typecheck, lint, full npm test suite, build and `git diff --check`.
- Docker Compose service status and API health failed after Docker Desktop/WSL daemon errors during the signed-token Compose startup attempt.
- Persisted live signed Compose handoff execution is blocked until Docker Desktop/WSL is healthy again.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production deployment, unreverted production trust, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T13:53:18+03:00 - Sprint 4Y Docker Retry and Signed Compose Handoff Execution

- User restarted Docker Desktop/WSL and requested a retry.
- Verified Docker daemon, Docker info, Compose version and running containers.
- Verified base Compose service status and `http://localhost:8080/api-health` returned HTTP 200.
- Switched local Compose API/Web to signed-token mode with `infra/docker-compose.signed-admin.override.yml` and no image rebuild.
- Verified API/Web had `ADMIN_AUTH_MODE=signed_token`, local HMAC secret set and dev-token env values blank.
- Generated local signed requester and approver tokens from `scripts/operator-token-helper.mjs`.
- Verified evidence `878ddd87-2e69-40b1-9cc7-da15d95a6b0b` was `pending_operator_review`.
- Approved it review-only with signed admin token; result stayed `trusted=false` and `auto_confirm_enabled=false`.
- Ran `npm run rehearsal:evidence:compose-signed`; result passed with `mode=signed_compose_dual_operator_drill`.
- Verified final evidence state is `production_trust_revoked`, `trusted=false`, `production_trusted_app_metadata=false` and `auto_confirm_enabled=false`.
- Verified audit contains review-only approval, production trust request, production trust approval and production trust revocation with masked cert hash.
- Restored base Compose `dev_token` mode for local development.
- Final base Compose service status and API health passed.

## 2026-05-03T14:07:42+03:00 - Sprint 4Z Production Trust Handoff Readiness and Operator Packaging

- Ran Sprint 4Z as a multi-agent operation: one explorer reviewed docs/runbook gaps, another reviewed script/test gaps, and the main agent integrated changes.
- Created tasks 249 through 256 and updated the task queue to Sprint 4Z.
- Added `scripts/evidence-production-trust-readiness.mjs` and `npm run handoff:evidence-readiness`.
- Added `docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md` as the operator-facing readiness package.
- Updated operator runbook, signed Compose handoff playbook, production trust policy and security/privacy docs.
- Added `tests/evidence-production-trust-readiness.test.ts` and updated agent framework tests.
- Verified the readiness gate is non-mutating, filesystem-only by default and does not call admin APIs, Docker or mutate evidence.
- Targeted TDD cycle passed: readiness test failed before the script existed, then passed after implementation.
- `npm run handoff:evidence-readiness` passed.
- Full validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps, API health and readiness gate.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production deployment, production trust mutation, auto-confirmation, raw phone or raw notification text was used.

## 2026-05-03T14:14:30+03:00 - Sprint 5A Production Operator Identity and Secret Lifecycle Hardening

- Created tasks 257 through 264 and updated the task queue to Sprint 5A.
- Added `docs/OPERATOR_IDENTITY_SECRET_LIFECYCLE.md`.
- Added `scripts/operator-identity-readiness.mjs` and `npm run operator:identity-readiness`.
- Documented production operator controls: onboarding, issuance, rotation, revocation, secure storage, break-glass, audit review and requester/approver separation.
- Documented forbidden production admin auth states including `ADMIN_AUTH_MODE=dev_token` and dev admin token env values.
- Updated production trust readiness, production trust policy and security/privacy docs.
- Added `tests/operator-identity-readiness.test.ts` and updated agent framework tests.
- Targeted TDD cycle passed: identity readiness test failed before the script existed, then passed after implementation.
- `npm run operator:identity-readiness` passed.
- Expanded the readiness gate to scan selected Sprint 5A reports, task files and agent status files in addition to policy/security docs.
- Full validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps, API health, operator identity readiness, Android assembleDebug with explicit SDK env, Android JVM tests with explicit SDK env and `git diff --check`.
- Android Gradle initially failed in the shell because `ANDROID_HOME` was not exported; rerunning with `ANDROID_HOME` and `ANDROID_SDK_ROOT` set to `C:\Users\Lenovo\AppData\Local\Android\Sdk` passed.
- No production secrets were generated, no production deployment was performed, no real notification was processed, no production trust mutation occurred and auto-confirmation remains disabled.

## 2026-05-03T14:36:00+03:00 - Sprint 5B Production Admin Auth Mode and Secret Injection Preflight

- Created tasks 265 through 272 and updated the task queue to Sprint 5B.
- Added `.env.production.example` with production admin-auth shape and blank secret values.
- Added `infra/docker-compose.production-admin-auth.override.yml` requiring `ADMIN_TOKEN_HMAC_SECRET` from external environment or secret storage.
- Added `docs/PRODUCTION_ADMIN_AUTH_PREFLIGHT.md`.
- Added `scripts/production-admin-auth-preflight.mjs` and `npm run production:admin-auth-preflight`.
- Documented that production must not use `ADMIN_AUTH_MODE=dev_token` or development admin token variables.
- Kept `scripts/operator-token-helper.mjs` local rehearsal tooling only.
- Added `tests/production-admin-auth-preflight.test.ts` and updated agent framework tests.
- Targeted TDD cycle passed: production preflight test failed before the script existed, then passed after implementation.
- Full validation passed: production admin-auth preflight, android doctor, typecheck, lint, tests, build, Compose config, Compose ps, API health, production admin-auth override config with dummy external secret, Android assembleDebug with explicit SDK env, Android JVM tests with explicit SDK env and `git diff --check`.
- No production secrets were generated, no production deployment was performed, no real notification was processed, no production trust mutation occurred and auto-confirmation remains disabled.

## 2026-05-03T15:05:00+03:00 - Sprint 6A Five-bank MVP Validation Matrix and Private Beta Readiness

- Strategic correction accepted: paused the production/admin hardening chain after Sprint 5B.
- Created tasks 273 through 281 and updated the task queue to Sprint 6A.
- Created `.swimpay-agent/PHASE_6_FIVE_BANK_MVP_PLAN.md`.
- Created `docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md` and `packages/bank-templates/v1-bank-mvp-matrix.json`.
- Created `docs/FIVE_BANK_NOTIFICATION_SHADOW_POLICY.md`, `docs/BETA_MERCHANT_ONBOARDING_FLOW.md` and `docs/PRIVATE_BETA_READINESS.md`.
- Prefilled Sberbank with operator-selected package `ru.sberbankmobile`; the other four V1 banks remain `package_input_needed`.
- Added `tests/five-bank-mvp-readiness.test.ts` and five-bank review-only runtime coverage in `apps/signal-worker/src/runtime.test.ts`.
- Verified that synthetic redacted untrusted/review-only signals for all five bank ids route to review, emit safe notification-signal disclosure and do not auto-confirm.
- Full validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps and API health.
- Android Gradle validation was not run because Sprint 6A did not touch Android platform code.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust request/approval, raw phone, raw notification text or auto-confirmation was used.

## 2026-05-03T15:11:00+03:00 - Sprint 6B Five-bank Package Evidence Collection Wave

- Created tasks 282 through 288 and updated the task queue to Sprint 6B.
- Recorded the user's limited ADB package discovery authorization in `.swimpay-agent/LIMITED_BANK_PACKAGE_DISCOVERY_AUTHORIZATION.md`.
- Used authorized real device `R5CWA0FEPZW` and ran filtered `pm list packages` queries only for `sber`, `tinkoff`, `tbank`, `vtb`, `alfa`, `gazprom` and `gazprombank`.
- Created `.swimpay-agent/BANK_PACKAGE_CANDIDATES.md` with only matching candidate package names.
- Found obvious candidates for all five V1 banks: `ru.sberbankmobile`, `com.idamob.tinkoff.android`, `ru.vtb24.mobilebanking.android`, `ru.alfabank.mobile.android` and `ru.gazprombank.android.mobilebank.app`.
- Collected exact PackageManager metadata only for selected packages.
- Submitted new evidence rows for Tinkoff / T-Bank, VTB, Alfa-Bank and Gazprombank to `/v1/bank-evidence`; each started `pending_operator_review` with `trusted=false` and `auto_confirm_enabled=false`.
- Approved the four new evidence rows only as `approved_for_review_only`; no production trust was requested or approved.
- Updated `docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md` and `packages/bank-templates/v1-bank-mvp-matrix.json`.
- Added `tests/five-bank-package-evidence-wave.test.ts` and updated the agent framework test to Sprint 6B queue order.
- No real bank notification, customer data, app internals inspection, app opening, SMS, scraping, Accessibility path, full installed-app report, production trust or auto-confirmation was used.

## 2026-05-03T15:30:00+03:00 - Sprint 6C Five-bank Review-only Receiver Selection and Synthetic Shadow Runtime Rehearsal

- Created tasks 289 through 295 and updated the task queue to Sprint 6C.
- Created `packages/bank-templates/five-bank-synthetic-shadow-fixtures.json` with redacted synthetic fixtures for all five V1 banks.
- Updated the five-bank MVP matrix to mark every bank `review_only_ready`, synthetic shadow runtime `passed`, real notification shadow `not_started` and auto-confirm `disabled`.
- Added `tests/five-bank-shadow-rehearsal.test.ts`.
- Expanded `apps/signal-worker/src/runtime.test.ts` so the runtime processes every five-bank synthetic shadow fixture through review or rejection without official confirmation claims.
- Verified synthetic incoming-like and amount-only signals do not auto-confirm; negative categories never auto-confirm.
- Webhook disclosure remains `official_bank_confirmation=false` and `confirmation_type=notification_signal`.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust request/approval, raw phone, raw notification text or auto-confirmation was used.

## 2026-05-03T15:45:00+03:00 - Sprint 6D Private Beta Review Queue and Webhook Rehearsal

- Created tasks 296 through 302 and updated the task queue to Sprint 6D.
- Created `packages/bank-templates/private-beta-merchant-order-fixtures.json` with one synthetic merchant/order fixture and five review-only bank signal scenarios.
- Added `docs/PRIVATE_BETA_OPERATOR_RUNBOOK.md` and updated private beta readiness.
- Added `tests/private-beta-review-webhook-rehearsal.test.ts`.
- Rehearsed order/payment-session fixture routing into review queue for all five V1 banks.
- Rehearsed manual review webhook fulfillment with `decision=manual_confirmed`, `official_bank_confirmation=false` and `confirmation_type=notification_signal`.
- Verified default rejection scope remains signal-level and support trace excludes raw phone, raw notification text, raw title/body, API keys and webhook secrets.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust request/approval, raw phone, raw notification text or auto-confirmation was used.

## 2026-05-03T16:05:00+03:00 - Sprint 6E Real-notification Shadow Readiness Gate

- Created tasks 324 through 331 and updated the task queue to Sprint 6E.
- Added contract models for safe shadow flags, consent gate, redaction preflight and non-mutating shadow prediction.
- Updated the five-bank MVP matrix with readiness gate fields while keeping real notification shadow `not_started`.
- Created `docs/REAL_NOTIFICATION_SHADOW_DRY_RUN.md`.
- Updated private beta go/no-go criteria for real-notification shadow readiness.
- Added `tests/real-notification-shadow-readiness.test.ts`.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, production trust request/approval, raw phone, raw notification text or auto-confirmation was used.

## 2026-05-03T17:16:00+03:00 - Sprint 7A PSP-like Checkout Bank Selection Flow

- Created tasks 340 through 349 and updated the task queue to Sprint 7A.
- Added checkout contracts for receiver-bank options, payer-bank launchers, checkout states and buyer-safe statuses.
- Added five V1 receiver banks as review-only detection options with `auto_confirm_enabled=false`.
- Added payer launchers as UX-only options with manual/copy fallback and no payment-proof semantics.
- Added additive migration `006_checkout_bank_selection.sql` for checkout selections and buyer action timestamps on `payment_sessions`.
- Added checkout APIs for receiver-bank selection, payer-launcher selection, payment instructions, buyer claimed paid and buyer-safe status polling.
- Updated hosted checkout to a mobile-first multi-step Pay with SwimPay flow with safe wording: `SwimPay recherchera le signal de paiement côté marchand.`
- Runtime now emits `payment.signal_detected` before `payment.needs_review` for matched review-only signals; both retain `official_bank_confirmation=false` and `confirmation_type=notification_signal`.
- Created `docs/SWIMPAY_CHECKOUT_BANK_SELECTION_FLOW.md` and updated developer plugin/private beta docs.
- Added contract, API, web, runtime, webhook and synthetic PSP-like checkout E2E tests.
- Full validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps and API health.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, SBP, official bank confirmation claim, raw phone, raw notification text or real-bank auto-confirmation was used.

## 2026-05-03T18:27:43+03:00 - Sprint 7B Bank-first Hybrid Receiving Routes

- Created tasks 350 through 358 and updated the task queue to Sprint 7B.
- Added `MerchantReceivingRoute` contracts for `phone_transfer` and `card_transfer`.
- Added additive migration `007_hybrid_receiving_routes.sql` plus merchant route create/list/update APIs.
- Added checkout route reveal, receiving-route selection, explicit copy-details and buyer sender phone hint APIs.
- Stored buyer sender phone hints as HMAC/masked values only; raw phone is not persisted by default.
- Added a two-word uppercase payment reference generator with three-word collision fallback.
- Updated hosted checkout to bank-first flow: bank names/logos first, then buyer-safe route reveal, then payment instructions.
- Added route-aware matching/risk reason codes. Card routes remain review-first in beta; phone sender hints improve reasoning but do not enable default auto-confirm.
- Added safe route context to webhook payloads: `receiver_route_code`, `rail_type`, `payment_reference` and `receiver_bank_id`.
- Extended webhook and worker PII guards to reject raw card, phone, receiver identifier and notification text fields.
- Added/updated contract, API, web, runtime, webhook and synthetic E2E tests.
- Full validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps and API health.
- Android Gradle validation was not run because Sprint 7B did not touch Android platform code.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, SBP, official bank confirmation claim, raw notification text or real-bank auto-confirmation was used.

## 2026-05-03T19:06:22+03:00 - Sprint 7C Checkout Destination Copy Hardening and Route Admin

- Created tasks 374 through 380 and updated the task queue to Sprint 7C.
- Hardened `GET /v1/checkout/:session_id/receiving-route/copy-details` so it works only for an active, non-expired checkout session with a selected enabled merchant-owned route.
- Added copy-details no-store/no-cache headers, `reveal_expires_at`, `masked_identifier` and explicit `destination_value` response shape.
- Added lightweight copy-details rate limiting by session id, selected route id and coarse client fingerprint; excessive reveals return `429 copy_details_rate_limited` with `Retry-After`.
- Added redacted `checkout.destination_copied` audit events with masked identifiers only.
- Added no-store/no-cache headers to the hosted checkout copy-details proxy.
- Added minimal merchant route admin UI at `/admin/merchant-receiving-routes` for list/create/disable/recommend actions.
- Added browser-oriented hosted checkout QA coverage and merchant route admin web tests.
- Extended security log redaction for raw destination keys such as `receiver_identifier_copy_value`, `destination_value`, `receiver_identifier` and `card_number`.
- Updated hybrid receiving routes, checkout flow, developer plugin and private beta readiness docs.
- Full validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps and API health.
- Android Gradle validation was not run because Sprint 7C did not touch Android platform code.
- No real bank notification, customer data, installed-app enumeration, SMS, scraping, SBP, official bank confirmation claim, raw notification text, webhook raw destination or real-bank auto-confirmation was used.

## 2026-05-03T21:39:35+03:00 - Sprint 7E Android Merchant API Wiring and Visual QA

- Created tasks 394 through 403 and updated the task queue to Sprint 7E.
- Added `AuthenticatedMerchantSession` for Android merchant auth/session state.
- Wired receiving methods to live backend APIs: `GET /v1/merchant/receiving-routes`, `POST /v1/merchant/receiving-routes` and `PATCH /v1/merchant/receiving-routes/:route_id`.
- Wired review queue to `GET /v1/reviews`.
- Wired review actions to `POST /v1/reviews/:id/confirm` and `POST /v1/reviews/:id/reject`.
- Kept signal rejection signal-scoped by default; order rejection is explicit.
- Kept Android out of developer webhook delivery; backend remains responsible after review actions.
- Kept dashboard, connected site and configuration test as explicit typed mock repositories because dedicated mobile/backend endpoints are missing.
- Updated `.swimpay-agent/ANDROID_FRONTEND_API_GAPS.md`, `docs/ANDROID_FRONTEND_API_CONTRACTS.md` and `docs/ANDROID_MERCHANT_APP_SCREENS.md`.
- Added `AndroidMerchantApiWiringTest.kt` and updated Android runnable app static tests.
- Validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps after Docker restart, API health after Docker restart, Android assembleDebug and Android JVM tests.
- ADB command execution worked through the local SDK platform-tools.
- Installed and launched the debug APK on Samsung SM-S916B `R5CWA0FEPZW`.
- UI-tree viewport scans covered onboarding, Notification Access gate, bank selection, configuration test, dashboard, receiving methods, review queue/detail, connected site and Receiver health/settings.
- No real bank notification, customer data, installed-app enumeration, SMS, Accessibility scraping, official bank confirmation claim, raw phone/card display, raw notification text or auto-confirmation was added.
## 2026-05-05T01:12:00+03:00 - Android Onboarding Notification Access Fix

- Confirmed with a red Android JVM test that premium onboarding persistence did not exist yet.
- Added `PremiumOnboardingCompletionStore`, `SharedPreferencesPremiumOnboardingStateStore` and `PremiumOnboardingNavigation`.
- Wired `MainActivity` to real `NotificationAccessStatusReader` state and refreshed it on `onResume`.
- Updated premium onboarding so disabled Notification Listener Access opens Android settings instead of advancing.
- Persisted onboarding completion so future launches start at the dashboard/main app shell after onboarding is finished.
- Removed unsafe `Policy Engine`, `AI (EXPERT)`, `ALGORITHME DE CONFIANCE` and payment automation wording from onboarding.
- Android JVM tests and APK build passed.
- Root validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps and API health.
- ADB currently lists no connected devices, so APK install/launch was not possible in this pass.
- No backend/API/contracts/workers/database/payment logic, real notification capture, SMS, Accessibility scraping, raw notification storage or auto-confirmation behavior was changed.

## 2026-05-05T04:20:00+03:00 - Sprint 7J Android Frontend Source-of-truth Cleanup

- Created tasks 413 through 416 and updated the task queue to Sprint 7J.
- Audited references to `ui/screens`, `AndroidMerchantScreenRenderer`, `AndroidMerchantViewComponents` and `AndroidMerchantVisualDesign`.
- Confirmed active Android merchant UI path remains `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
- Created `.swimpay-agent/ANDROID_FRONTEND_LEGACY_REFERENCE_AUDIT.md`.
- Deleted confirmed-dead legacy visual Kotlin files under `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/screens`.
- Deleted legacy mock visual files `AndroidMerchantScreenRenderer.kt`, `AndroidMerchantViewComponents.kt` and `AndroidMerchantVisualDesign.kt`.
- Preserved `MainActivity.kt`, `PremiumMerchantApp.kt`, `PremiumMerchantRuntime.kt`, `AndroidMerchantApiWiring.kt`, `AndroidMerchantUiModels.kt`, `NotificationAccessStatusReader.kt`, `ReceiverOnboardingReadiness.kt` and `AndroidManifest.xml`.
- Replaced old visual architecture assertions with premium source-of-truth tests.
- Verified with red/green evidence: the replacement test failed before purge and passed after purge.
- Validation passed: android doctor, typecheck, lint, tests, build, Compose config, Android JVM tests and Android debug APK build.
- Installed and launched the debug APK on Samsung `SM_S916B` / `R5CWA0FEPZW`; UIAutomator dump showed the premium shell and bottom tabs.
- No backend/API/contracts/workers/database/payment/review logic, real notification capture, SMS, Accessibility scraping, raw PII exposure or auto-confirmation behavior was changed.

## 2026-05-05T05:05:00+03:00 - Sprint 7K Android Premium Navigation and State Foundation

- Created tasks 417 through 422 and updated the task queue to Sprint 7K.
- Used multi-agent read-only audits for route/tab, state and sub-screen navigation gaps.
- Added typed `PremiumRoute`, `PremiumMainTab` and `PremiumNavigation`.
- Updated `PremiumMerchantApp` to route through typed destinations instead of raw route strings and raw tab integers.
- Updated `PremiumAppShell` and `PremiumBottomNav` to use typed `PremiumMainTab`.
- Added reusable `PremiumScreenState` and `PremiumStatePanel`.
- Added typed placeholder destinations for receiving methods, banks, connected site, receiver health, configuration test and order detail.
- Added `PremiumNavigationStateTest.kt` and updated onboarding, visual architecture and agent-framework tests.
- Final validation passed: android doctor, typecheck, lint, tests, build, Compose config, Compose ps, API health, Android JVM tests and Android debug APK build.
- Installed and launched the debug APK on the connected Samsung device; UIAutomator showed the premium shell and typed bottom navigation.
- No backend/API/contracts/workers/database/payment/review logic, real notification capture, SMS, Accessibility scraping, raw PII exposure or auto-confirmation behavior was changed.

## 2026-05-05T00:00:00+03:00 - Sprint 7M Android Premium Sub-screen States

- Created tasks 429 through 434 and updated the task queue to Sprint 7M.
- Continued in multi-agent mode with read-only audits for receiving methods/banks, Receiver health/settings and Android copy guardrails.
- Added typed premium receiving-method UI rows with route id, masked subtitle, helper, badge, status, enabled/recommended flags and allowed actions.
- Added safe mutation states for receiving-method create, disable and mark-recommended flows; raw card/phone input is not retained in visible state after save.
- Added dedicated premium bank-management states for the five V1 banks using only merchant-safe labels: `Activée`, `À configurer` and `En pause`.
- Added dedicated premium Receiver-health state screen with Notification Access state, selected bank count, outbox/sync rows and a settings action.
- Wired premium settings rows to typed sub-screen navigation helpers.
- Removed merchant-facing `SBP` copy from premium receiving-method UI and added tests to keep it out of visible merchant copy.
- Removed a stale mojibake marker from `MainActivity`.
- Targeted Android JVM tests passed for premium navigation, runtime state contracts, visual architecture and merchant copy guardrails.
- Created `.swimpay-agent/ANDROID_PREMIUM_SUBSCREEN_STATES_REPORT.md`.
- Root validation passed: `npm run android:doctor`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and Compose config.
- Android validation passed: full debug JVM tests and debug APK build.
- Real-device ADB install/launch passed on Samsung `SM_S916B` / `R5CWA0FEPZW`; UIAutomator confirmed the premium menu and `Banques` sub-screen.
- Fresh Docker live checks remain blocked because `//./pipe/dockerDesktopLinuxEngine` is unavailable from this shell, so `compose ps` and `/api-health` could not be freshly verified.
- Backend APIs, contracts, workers, database, payment/review logic, real notification capture, SMS, Accessibility scraping, raw PII exposure and auto-confirmation were not changed.

## 2026-05-05T16:20:00+03:00 - Android Onboarding Full Implementation

- Scoped work to Android onboarding only under `ui/premium`.
- Audited the active onboarding path and documented it in `.swimpay-agent/ANDROID_ONBOARDING_FLOW_INVENTORY.md`.
- Implemented the operator correction to merge compatible-bank search and bank selection into one onboarding step.
- Updated the typed onboarding sequence to six screens: Welcome, Notification Access, Compatible Bank Detection + Bank Selection, Receiving Method, Site or Application Connection and Configuration Test.
- Removed the extra landing-first route for incomplete onboarding; incomplete onboarding now opens directly at the approved Welcome step.
- Added a soft bank search status card and selectable detected-bank rows.
- Preserved exact-package Bank Target Lock behavior only for supported V1 bank packages.
- Kept Notification Access as a real Android Notification Listener settings gate.
- Kept site/application connection skippable and configuration test adaptive.
- Kept configuration test non-confirming; Android still does not emit developer webhooks or confirm payments.
- Updated Android JVM/static tests for the merged onboarding step and initial onboarding route.

## 2026-05-05T06:30:00+03:00 - Sprint 7L Android Premium Screen State Rollout

- Created tasks 423 through 428 and updated the task queue to Sprint 7L.
- Used multi-agent read-only audits for dashboard/orders, review/detail and menu sub-screen state gaps.
- Added typed state rollout across `PremiumMerchantRuntime`, `PremiumMerchantApp`, dashboard, orders, settings, receiving methods, connected site, configuration, review queue and payment detail screens.
- Dashboard empty/error/action-required states no longer show preview recent payments.
- Review queue empty/error/action-required states no longer show preview review rows.
- Missing payment detail now renders a safe error state instead of fake payment detail content.
- Orders no longer use the static demo order list; the screen renders a typed empty state until a live order contract is defined.
- Connected site, configuration test and receiving methods now render typed content or state panels.
- Added/updated Android tests proving preview rows are not used for non-success states and review actions remain backend-owned.
- Initial targeted Android test run hit local JVM native-memory exhaustion; rerun with in-process Kotlin compilation passed.
- Full Android JVM tests passed.
- Real-device ADB install/launch passed on Samsung `SM_S916B` / `R5CWA0FEPZW`.
- UIAutomator initially confirmed installed-APK mojibake (`Donn?es indisponibles`).
- Rebuilt and reinstalled the APK with corrected UTF-8 premium UI strings.
- UIAutomator and screenshot verification now show `Données indisponibles` and `RÉESSAYER` correctly.
- Fresh root validation passed for android doctor, typecheck, lint, tests, build and Compose config.
- Fresh Docker live validation is blocked because Docker Desktop's Linux engine pipe is currently unavailable from this shell; `compose ps` and `/api-health` could not be verified in this final pass.
- No backend/API/contracts/workers/database/payment/review logic, real notification capture, SMS, Accessibility scraping, raw PII exposure or auto-confirmation behavior was changed.
## 2026-05-05T00:00:00+03:00 - Sprint 7K Android Premium Merchant Operating Model

- Created tasks 413 through 424 and updated the task queue to the Android premium operating model order.
- Kept the active Android merchant visual path as `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
- Added `BankTargetLock` with exact supported bank target packages only.
- Added debug/operator-scoped Android manifest package visibility for the five V1 banks without `QUERY_ALL_PACKAGES`.
- Added internal bank target states and merchant-safe labels: `Détectée`, `Non détectée`, `Activée`, `À configurer`.
- Updated premium bank screens to present compatible bank detection without package/cert details.
- Updated premium bottom navigation labels to `Accueil`, `Revue`, `Ventes`, `MENU`.
- Added typed premium routes for `Mode de confirmation` and `Sécurité`.
- Updated dashboard language to `Paiements suivis`, `SwimPay Intelligence`, `À confirmer`, `Confirmés`, `Rejetés`, `Banques actives` and `Historique récent`.
- Updated review screen copy to `Paiements à confirmer` with separate confirm/signal-reject/order-reject actions.
- Updated Ventes to show sales traceability metrics and timeframe filters without adding backend APIs.
- Reorganized Menu into Paiements, Business, Application and Aide sections.
- Added display-only `Mode de confirmation` screen with `Manuel`, `Assisté` and `IA` wording.
- Added display-only `Sécurité` screen for passcode/password/PIN/biometric/session settings.
- Added Android tests for Bank Target Lock exact probing, no broad enumeration, manifest guardrails, premium navigation, IA copy and Android decision boundaries.
- Targeted and full Android JVM tests passed after setting local SDK env variables.
- Debug APK build passed.
- ADB was available, but no connected authorized device was listed, so install/launch smoke was not run in this pass.
- Backend APIs, contracts, workers, database, payment/review logic, real notification capture, SMS, Accessibility scraping, raw PII exposure and auto-confirmation were not changed.
# 2026-05-05T00:00:00+03:00 - Android Data Hydration Pass

- Created tasks 425 through 431 and updated the task queue.
- Audited Android premium hydration paths and documented findings in `.swimpay-agent/ANDROID_DATA_HYDRATION_AUDIT.md`.
- Confirmed the main dead-state sources were dashboard/backend failure, generic `PremiumScreenState.error()` copy and webhook/business state being treated as required.
- Added local/system dashboard cards for SwimPay Intelligence, phone connection, Notification Access, last activity, active banks and receiving methods.
- Changed dashboard backend failure to a live content fallback with `Connexion en attente`.
- Changed no-payment copy to `Aucun paiement détecté pour le moment` and `Lancez un test`.
- Changed review empty state to `Aucun paiement à confirmer`.
- Changed sales empty state to `Vos ventes apparaîtront ici après validation des paiements.`
- Made connected-site/webhook missing state optional with merchant-friendly setup copy.
- Removed generic visible `indisponible` copy from active premium UI source.
- Added Android hydration tests and updated premium runtime contract tests.
- No backend APIs, contracts, payment/review logic, notification processing, real bank capture, SMS, Accessibility scraping, raw PII exposure or auto-confirmation behavior was changed.
# 2026-05-06T11:30:00+03:00 - Sprint 8B Payment-Intent-Bound SwimPay Intelligence

- Created tasks 450 through 459 and updated the task queue to Sprint 8B.
- Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_GAP_AUDIT.md`.
- Created `.swimpay-agent/SPRINT_8B_PAYMENT_INTENT_BOUND_REPORT.md`.
- Preserved Sprint 8A deterministic/non-LLM/static-profile Intelligence foundation.
- Added buyer recognition hint contracts for first name, last name, phone HMAC/masked and source-card encrypted/HMAC/masked/last4.
- Added card credential guardrails rejecting CVV, expiry, PIN, SMS code and bank password fields.
- Added bounded payment-intent reconciliation amount builder where the buyer-visible expected amount equals the matching amount.
- Added Payment Intent Gate relations and deterministic evaluation.
- Added matching-core tests for expected, ambiguous, unrelated, negative, unknown, late and collision cases.
- Added `continue-to-bank` checkout/API flow to arm the receiver through existing `receiver_armed` state.
- Updated hosted checkout instructions with recognition-hint copy and primary `Continuer vers ma banque` action.
- Updated signal runtime so unmatched/no-active-intent activity does not create merchant payment review or payment webhook.
- Added intent-bound learning metadata helpers.
- Targeted tests and typecheck passed before full final validation.
- No real bank notifications were processed.
- No LLM, SMS, Accessibility scraping, broad package enumeration, raw notification storage or auto-confirmation was added.

## 2026-05-06T13:20:00+03:00 - Sprint 8C Durable Intelligence Feedback Persistence Closeout

- Created `.swimpay-agent/SPRINT_8C_INTELLIGENCE_PERSISTENCE_AUDIT.md`.
- Created `.swimpay-agent/SPRINT_8C_INTELLIGENCE_PERSISTENCE_REPORT.md`.
- Added durable PostgreSQL persistence for Intelligence feedback and unknown-shape monitoring.
- Added the API `IntelligenceRepository` seam with PostgreSQL persistence and local/test fallback.
- Added read-only operator Intelligence API endpoints.
- Added the web operator Intelligence monitoring surface.
- Extended Intelligence feedback contracts with intent-bound learning metadata and raw-card/credential guardrails.
- Added unknown-shape monitoring contract helpers.
- Added/updated contract, API and web tests for durable persistence, read-only monitoring, safe flags and safe rendering.
- Updated agent tracking for current task, next action and blockers.
- Documented durable passive Intelligence feedback and unknown-shape monitoring boundaries.
- Documented read-only operator Intelligence monitoring boundaries.
- Preserved explicit safety flags: `official_bank_confirmation=false`, `mutates_runtime_rules=false`, `promotes_profile=false` and `auto_confirm_allowed=false`.
- Confirmed feedback and unknown-shape observations do not create payment reviews, emit payment webhooks, mutate classifier rules, promote bank profiles or auto-confirm orders.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Compose ps, `/api-health`, live feedback persistence endpoint and read-only admin Intelligence endpoints.
- The existing local Postgres volume predated migration `008`, so `008_intelligence_feedback.sql` was applied manually through `psql` as an additive local-volume migration.
- ADB detected Samsung `SM_S916B` / `R5CWA0FEPZW`; Android source was not changed in this sprint.
- No real bank notifications were processed.
- No LLM, SMS, Accessibility scraping, bank app scraping, raw notification text/PII storage, runtime rule mutation or auto-confirmation was added.
# 2026-05-06T00:00:00+03:00 - Sprint 9B SDK Web Production Readiness

- Created tasks 476 through 485 and updated the active task queue.
- Created `.swimpay-agent/SDK_WEB_PACKAGE_INVENTORY.md`.
- Added `packages/swimpay-node` as the `@swimpay/node` SDK package.
- Added the `SwimPay` client with server-side `secretKey` and optional `apiBaseUrl`.
- Added `swimpay.orders.create` with positive minor-unit amount validation, uppercase currency validation, idempotency header support and unsafe-field rejection.
- Added typed SDK errors with sanitized safe details.
- Added raw-body webhook verification using SwimPay's HMAC-SHA256 `timestamp.rawPayload` signature method.
- Added public V1 webhook parser for `payment.confirmed`, `payment.rejected` and `payment.expired` only.
- Added SDK guardrails rejecting public `payment.signal_detected` and `payment.needs_review` fulfillment parsing.
- Added `docs/SDK_WEB_QUICKSTART.md`.
- Added `examples/web-node-basic`.
- Added product truth tests for SDK-facing docs/examples.
- No backend payment runtime, Android notification processing, contracts, workers, real notification capture, LLM logic, SMS/Accessibility access, broad enumeration or auto-confirmation behavior was changed.
- Docker live validation passed after Docker Desktop was restarted and Compose services were started: Postgres, Valkey, NATS, API, web and proxy are healthy, and `/api-health` reports database, NATS and Valkey `ok`.

# 2026-05-06T00:00:00+03:00 - Sprint 9C Android Merchant SDK Production Helper

- Created tasks 486 through 493 and updated the active task queue.
- Created `.swimpay-agent/SDK_ANDROID_PACKAGE_INVENTORY.md`.
- Added `packages/swimpay-android` as source-only `@swimpay/android`.
- Added Kotlin helper `com.swimpay.sdk.SwimPayCheckout`.
- Added checkout URL validation, Custom Tabs launch path and `ACTION_VIEW` browser fallback.
- Added return/deep-link parsing with typed non-confirming statuses.
- Added safe Android SDK models and errors.
- Added `docs/SDK_ANDROID_QUICKSTART.md`.
- Added `examples/android-merchant-basic`.
- Added `tests/sdk-android-product-truth.test.ts`.
- Guardrails prove the merchant Android helper has no Receiver imports, NotificationListener usage, SMS, Accessibility, `QUERY_ALL_PACKAGES`, broad app enumeration, bank package probing, secret key usage, webhook handling or local payment fulfillment.
- Validation passed: targeted SDK Android guardrail test, android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Docker live checks initially were blocked by local Docker Desktop pipe availability.
- After Docker was restarted, `docker version`, `docker compose version`, Compose `up -d`, Compose `ps` and `/api-health` passed.
- Compose shows Postgres, Valkey, NATS, API, web, signal worker, job worker and proxy healthy.
- `/api-health` returned `200 OK` with database, NATS and Valkey `ok`.
- The SwimPay Receiver app and payment runtime were not modified.

# 2026-05-07T02:45:00+03:00 - Sprint 9G Developer Wizard Auth Hardening

- Continued in multi-agent mode with three read-only audits:
  - web merchant session/auth boundary;
  - API developer integration auth pattern;
  - guardrail and QA coverage.
- Created Sprint 9G task files 519 through 525.
- Created `.swimpay-agent/DEVELOPER_WIZARD_AUTH_INVENTORY.md`.
- Added `resolveMerchantServerBearerToken` to centralize server-side merchant bearer resolution.
- Kept local `test_<merchant_id>` fallback only for non-production.
- Refused explicit local `test_*` bearer tokens in production.
- Disabled Developer Integration Wizard credential/webhook/test/retry actions in unavailable/auth-required state.
- Added backend production guard on `/v1/merchant/integration*` routes so local `Bearer test_*` cannot mutate developer lifecycle state in production.
- Fixed receiving-method admin create/update clients to send Authorization and Content-Type.
- Added targeted tests for production no-dev-bearer behavior, unavailable wizard actions, receiving-method write headers and API production rejection.
- Created `.swimpay-agent/DEVELOPER_WIZARD_AUTH_HARDENING_REPORT.md`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite and TypeScript build.
- Compose config validation passed.
- Live Docker validation passed after Docker restart: sequential Compose build/up completed for API, web, job worker and proxy; Compose services are healthy; `/api-health` returns database, NATS and Valkey `ok`; `/merchant/developer-integration` returns HTTP 200 through the proxy.

# 2026-05-06T19:55:00+03:00 - Sprint 9D Developer Integration Wizard Production Readiness

- Created tasks 494 through 501 and updated the active task queue.
- Created `.swimpay-agent/DEVELOPER_WIZARD_INVENTORY.md`.
- Added `/merchant/developer-integration` in the web merchant app.
- Added Web/Android-only integration selection.
- Added masked credentials and webhook configuration states.
- Added safe Web snippets based on `@swimpay/node`: install, server-side order creation, checkout redirect, webhook verification and idempotency.
- Added safe Android snippets based on `@swimpay/android`: checkout opening, return parsing and backend status refresh.
- Added safe public V1 webhook delivery history for `payment.confirmed`, `payment.rejected` and `payment.expired`.
- Added `apps/web/src/developer-wizard.test.ts` for wizard rendering and product truth guardrails.
- Created `.swimpay-agent/DEVELOPER_INTEGRATION_WIZARD_REPORT.md`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Live Docker validation is blocked by local Docker Desktop/containerd state: Docker CLI responds, but Compose build fails with BuildKit I/O errors on `metadata_v2.db`, and `up --no-build` / `ps` timed out.
- After the user restarted Docker again, Docker CLI and Compose still responded, but Compose build again failed with BuildKit/containerd EIO writes in `metadata_v2.db` and overlayfs build outputs.
- No backend payment runtime, Android Receiver notification processing, contracts, workers, database, real notification capture, LLM logic, SMS, Accessibility scraping, broad app enumeration or auto-confirmation behavior was changed.

# 2026-05-06T23:30:00+03:00 - Sprint 9D Docker Recovery And Live Validation

- Audited Docker containers, images and volumes before cleanup.
- Preserved all SwimPay containers/images and volumes:
  - `infra-swimpay-*`;
  - `swimpay-*`;
  - `infra_postgres_data`;
  - `infra_valkey_data`;
  - `infra_nats_data`;
  - `infra_caddy_data`;
  - `infra_caddy_config`.
- Did not remove ambiguous `backend_pgdata`.
- BuildKit cache prune reported `0B`, and `docker system df -v` now reports normally.
- Diagnosed remaining Docker instability as parallel BuildKit pressure on the local 4 GB Docker Desktop engine.
- Rebuilt SwimPay images sequentially with `COMPOSE_PARALLEL_LIMIT=1`.
- Started Compose services with `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build`.
- Verified Compose services healthy: Postgres, Valkey, NATS, API, web, signal worker, job worker and proxy.
- Verified `http://localhost:8080/api-health` returns database, NATS and Valkey `ok`.

# 2026-05-06T23:58:00+03:00 - Sprint 9E Developer Integration Backend Lifecycle

- Created tasks 502 through 511 and updated the active task queue.
- Created `.swimpay-agent/DEVELOPER_BACKEND_LIFECYCLE_INVENTORY.md`.
- Added `merchant_integrations` migration for merchant-scoped developer integration lifecycle state.
- Added `apps/api/src/developer-integration.ts`.
- Added endpoints under `/v1/merchant/integration` for read model, key creation/rotation, webhook secret rotation, webhook URL save/update, test webhook, delivery history and retry.
- Added show-once lifecycle behavior for secret key and webhook secret.
- Added encrypted webhook secret material for backend-owned signing while keeping normal reads masked.
- Added merchant-scoped delivery history limited to `payment.confirmed`, `payment.rejected` and `payment.expired`.
- Added backend-owned test webhook/retry behavior that does not trigger fulfillment.
- Added `apps/api/src/developer-integration.test.ts` guardrails for secret masking, URL validation, delivery history sanitization, public event scope and product truth.
- Created `.swimpay-agent/DEVELOPER_BACKEND_LIFECYCLE_REPORT.md`.
- Sprint 9D live Docker validation is now passing.
# 2026-05-07T01:45:00+03:00 - Sprint 9F Developer Integration Wizard Live UX Wiring

- Created Sprint 9F task files 512 through 518.
- Added `.swimpay-agent/DEVELOPER_WIZARD_LIVE_INVENTORY.md`.
- Added a server-side `MerchantIntegrationClient` seam to `apps/web/src/index.ts`.
- Wired `/merchant/developer-integration` to live Sprint 9E lifecycle endpoints with a safe unavailable fallback.
- Added web form actions for key generation/rotation, webhook secret rotation, webhook URL save, backend-owned webhook test and delivery retry.
- Updated the wizard renderer to display live Merchant ID, public key, masked secrets, webhook URL/status, public V1 events and delivery history.
- Kept one-time raw secrets visible only in immediate create/rotate action responses.
- Updated `apps/web/src/developer-wizard.test.ts` for live data, fallback, action routes and snippet/delivery guardrails.
- Cleaned `docs/DEVELOPER_PLUGIN_INTEGRATION.md` so internal signal/review concepts are not presented as public fulfillment webhooks.
- Extended `tests/product-truth-docs.test.ts` to guard that doc.
- Created `.swimpay-agent/DEVELOPER_WIZARD_LIVE_UX_REPORT.md`.

# 2026-05-07T09:12:00+03:00 - Sprint 9H Receiver / Intelligence Production Hardening

- Created tasks 525 through 534 and updated the active task queue.
- Created `.swimpay-agent/RECEIVER_INTELLIGENCE_PROD_INVENTORY.md`.
- Hardened `/v1/receiver-devices/register` and `/v1/receiver-devices/heartbeat` so production rejects local `Bearer test_*` merchant bearer fallback.
- Added receiver operational states: `inactive`, `needs_reconnect`, `notification_access_missing`, `bank_targets_missing` and `force_review_local`.
- Added heartbeat warning `bank_targets_missing` and required action `configure_bank_targets`.
- Hardened signal upload eligibility to reject action-required or disabled receiver states.
- Added production signal observed timestamp tolerance rejection before ingestion.
- Extended Payment Intent Gate tests with five-bank synthetic/redacted fixture coverage.
- Added `tests/receiver-intelligence-prod-guardrails.test.ts`.
- Created `docs/INTELLIGENCE_RETENTION_POLICY.md`.
- Updated `docs/11_SECURITY_AND_PRIVACY.md` and `docs/ANDROID_RECEIVER_CONTRACT.md`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, Android JVM tests and Android debug APK build.
- Device QA passed on `R5CWA0FEPZW`: APK install, app launch and UIAutomator dump.
- Docker live validation initially hit a local Docker Desktop pipe outage, then passed after Docker restart with sequential Compose build/up, healthy services and `/api-health` reporting database, NATS and Valkey `ok`.

# 2026-05-07T13:25:00+03:00 - Sprint 9K Production-mode Staging / VPS Validation

- Created Sprint 9K task files 546 through 555 and updated the active task queue.
- Created `.swimpay-agent/PROD_MODE_STAGING_INVENTORY.md`.
- Added production-mode tests for BFF session/CSRF, stored API key order creation and Receiver register/heartbeat through BFF active merchant context.
- Updated `/v1/orders` validation to reject `auto_confirm` and `autoConfirm`.
- Updated `/v1/receiver-devices/register` and `/v1/receiver-devices/heartbeat` to use BFF active merchant context with CSRF in production mode while preserving local dev bearer behavior outside production.
- Added safe production/staging env placeholders to `.env.example` and `.env.production.example`.
- Created `docs/PRODUCTION_ENVIRONMENT.md`.
- Added explicit opt-in synthetic staging seed script `scripts/seed-staging-auth-bff.mjs`.
- Created `.swimpay-agent/VPS_STAGING_READINESS_AUDIT.md`.
- Created `.swimpay-agent/PROD_MODE_STAGING_VALIDATION_REPORT.md`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, sequential Compose build/up, healthy services and `/api-health` with database, NATS and Valkey `ok`.

# 2026-05-07T15:10:00+03:00 - Sprint CR-2 Runtime Product Truth Enforcement

- Continued from the full code review with multi-agent discipline: runtime, webhook taxonomy and stale E2E fixtures were audited independently before integration.
- Created CR-2 tasks 578 through 582 and marked them completed.
- Created `.swimpay-agent/CR2_RUNTIME_PRODUCT_TRUTH_INVENTORY.md`.
- Updated `apps/signal-worker/src/runtime.ts` so high-confidence `auto_confirmed` matching results are routed to manual review with `manual_confirmation_required_v1`.
- Removed active runtime-created public `payment.signal_detected`, `payment.needs_review` and reject webhooks from the signal processor.
- Updated `apps/job-worker/src/webhooks.ts` so public webhook events are restricted to `payment.confirmed`, `payment.rejected` and `payment.expired`.
- Updated runtime, job-worker, durable E2E, private-beta, checkout-flow and five-bank guardrail tests to enforce final V1 public webhook semantics.
- Updated five-bank synthetic shadow fixtures to express that no public webhook is expected during review-only shadow processing.
- Created `.swimpay-agent/CR2_RUNTIME_PRODUCT_TRUTH_REPORT.md`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Docker live smoke could not run because Docker Desktop's `desktop-linux` pipe was unavailable; `/api-health` was not reachable.

# 2026-05-07T15:35:00+03:00 - CR-3 Product Truth Contradiction Neutralization

- Neutralized remaining active V1 contradictions after CR-2.
- Removed active `auto_confirmed` from matching decisions, contracts, payment-session mapping, checkout mapping, reviews, event constants and observability metrics.
- Removed active signal-worker auto-confirm and direct public signal/review webhook request methods.
- Updated active docs including `AGENTS.md`, service spec, event catalog, database schema, matching docs, state machine docs and private-beta docs.
- Added `tests/product-truth-runtime-neutralization.test.ts`.
- Updated E2E/runtime/private-beta/foundation tests to assert manual review instead of auto-confirmation.
- Rebuilt `@swimpay/matching-core` dist output.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build and Compose config.
- Docker live smoke remained blocked by unavailable Docker Desktop Linux engine pipe; `/api-health` was unreachable.

# 2026-05-08T21:53:31+03:00 - REAL-CAPTURE-2 Staging Synthetic Upload Proof Rerun

- Confirmed `main` is clean and aligned with `origin/main` at `d45ba7f`.
- Confirmed staging `/api-health` is reachable in production mode with database, NATS and Valkey `ok`.
- Confirmed Samsung ADB target is reachable.
- Reran `com.swimpay.receiver.STAGING_PROOF` against the installed staging APK.
- Proof passed: `staging_proof_upload success=true acked=1 failed_retrying=0 status=201 code=none purged=0`.
- Recorded remaining blocker for SDK/webhook rehearsal: staging API key, webhook secret and external app public URL must be configured outside chat.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-08T21:14:08+03:00 - REAL-CAPTURE-2 Public Checkout Session Fix

- Found the staging/prod blocker preventing honest SDK checkout rehearsal: public buyer checkout routes still required a development merchant bearer.
- Added a red/green regression in `apps/api/src/payment-sessions.test.ts` proving buyer checkout progression works from the public payment session id without Authorization.
- Added `OrderRepository.getCheckoutSessionById(paymentSessionId)` and wired public checkout routes to derive merchant scope from the durable payment session.
- Removed dev Authorization header injection from the web checkout client.
- Preserved V1 truth: no auto-confirmation, `J'ai paye` does not confirm, `payment.confirmed` remains manual-confirmation-only, public webhooks remain final-only.
- Validation passed: android doctor, typecheck, lint, targeted checkout/API/web/worker tests, full Vitest suite, TypeScript build and Compose config.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-08T22:00:00+03:00 - Developer Integration Wizard staging flow

- Verified backend Developer Integration lifecycle: API key show-once, webhook secret show-once, webhook URL save, safe test webhook, delivery history and retry.
- Added a wizard export block for external merchant app staging values: `SWIMPAY_STAGING_API_BASE_URL`, `SWIMPAY_STAGING_SECRET_KEY`, `SWIMPAY_STAGING_WEBHOOK_SECRET`, `SWIMPAY_WEBHOOK_URL`, `EXTERNAL_APP_BASE_URL` and `SWIMPAY_PUBLIC_WEBHOOK_EVENTS`.
- Kept raw keys/secrets show-once only; normal reads render masked values.
- Preserved safe Web and Android snippets: secrets stay server-side, Android opens `checkout_url` only and never handles webhooks or fulfillment.
- Added regression coverage in `apps/web/src/developer-wizard.test.ts`.
- Targeted validation passed for the web wizard, backend developer integration and TypeScript typecheck.
- No real bank notification was processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-08T11:45:00+03:00 - INTEL-TRUTH SwimPay Intelligence Source-of-Truth Audit

- Created tasks 612 through 622 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_OF_TRUTH.md` as the central source of truth.
- Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_BOUNDARIES.md`.
- Created per-surface audits for Android Receiver, backend signal ingestion, runtime/payment intent, learning/monitoring, webhook taxonomy, SDK/integration and admin/operator surfaces.
- Added `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_TRUTH_GUARDRAILS.md` and `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_TRUTH_REPORT.md`.
- Added `tests/swimpay-intelligence-source-truth.test.ts`.
- Added a backend regression proving legacy receiver signal payloads with nested raw notification fields are rejected.
- Fixed `apps/api/src/signals.ts` so legacy receiver signal validation rejects raw notification, raw phone/card and credential keys before normalization.
- Confirmed active runtime remains manual-confirmation-only and public webhooks remain final-event-only.
- Identified must-fix items before real notification capture: non-debug Android upload transport, synthetic/debug hash vocabulary, and active admin/template auto-confirm vocabulary.
- No real bank notification was processed, no public production deploy was started, no auto-confirmation was enabled, and no public webhook semantics changed.

# 2026-05-08T13:05:00+03:00 - Staging-prod Android upload hardening

- Created tasks 623 through 627 and completed the active task queue.
- Added non-debug Android upload transport from encrypted redacted outbox payloads to `/v1/receiver/signals`.
- Added safe Android upload guards for raw notification fields, raw phone/card/card-number/PAN fields and `raw_text_present=true`.
- Wired `SignalUploadWorker` to use the real non-debug flusher while preserving debug-only smoke behavior.
- Allowed Android mobile sessions to register and heartbeat receiver devices without dev bearer or web CSRF, while web BFF session writes remain CSRF-protected.
- Wired Android onboarding completion to receiver registration, heartbeat, persisted receiver device state and supported-bank runtime config.
- Neutralized active admin/operator `auto_confirm*` vocabulary to manual-review readiness language.
- Hardened main Compose defaults toward staging/prod-safe auth and kept local dev opt-in explicit in `.env.example`.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-09T02:03:00+03:00 - Android Dashboard Metrics Wiring

- Created tasks 698 through 705 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Added merchant metrics summary and timeseries repository/contracts over persisted orders, review queue rows and webhook deliveries.
- Added `GET /v1/merchant/metrics/summary` and `GET /v1/merchant/metrics/timeseries` with authenticated merchant scope.
- Embedded safe metrics into Android dashboard summary for mobile consumption.
- Replaced Android Accueil fake card values with real metrics: confirmed amount, pending reviews, confirmed, rejected, expired, failed and confirmation rate.
- Replaced the decorative chart with compact chart data from backend timeseries.
- Added safe score and timeline fields to Android payment detail.
- Added/updated backend and Android guardrail tests for real metrics wiring and no fake dashboard values.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- No real bank notification was processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

# 2026-05-08T13:51:40+03:00 - REAL-CAPTURE-1 staging APK/device gate

- Created tasks 628 through 634 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Added Android `staging` build type using debug signing for installability and `isDebuggable=false` for non-debug runtime validation.
- Added Android guardrail coverage for the staging build type and Gradle metaspace.
- Increased Android Gradle metaspace to let `lintVitalAnalyzeStaging` complete.
- Built `app-staging.apk` against `https://staging.swimpay.pro` with the configured Google server client ID.
- Installed and launched the staging APK on the operator Samsung device over ADB Wi-Fi.
- Verified `https://staging.swimpay.pro/api-health` returns database, NATS and Valkey `ok`.
- Verified a clean app relaunch produced no SwimPay crash entries.
- Observed existing app state opens directly to a merchant dashboard; login/create-account/onboarding was not replayed because app data was preserved.
- Observed Android dashboard still shows banks to configure and receiving methods to add; Menu shows connected-site/webhook configuration action required.
- Created `.swimpay-agent/REAL_CAPTURE_1_REPORT.md`.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-08T14:06:07+03:00 - REAL-CAPTURE-2 Intelligence test ladder prepared

- Fixed Android staging/non-debug supported-bank detection by declaring exact V1 supported-bank package visibility in the main Receiver manifest.
- Rebuilt, reinstalled and relaunched the staging APK on the operator device; UIAutomator confirmed 5 detected supported bank apps.
- Kept package visibility exact and narrow: no `QUERY_ALL_PACKAGES`, no broad installed-app enumeration, no SMS, no Accessibility and no scraping.
- Updated Android package-visibility policy and guardrail tests to require exact main-manifest queries while keeping debug manifest free of duplicate query declarations.
- Created tasks 635 through 644 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Created `.swimpay-agent/REAL_CAPTURE_2_INTELLIGENCE_TEST_PLAN.md` with sequential tool tests, combined synthetic E2E, metrics and a final real-notification capture gate.
- Validation passed: Android staging unit tests with explicit `ANDROID_HOME`, targeted Android runnable-app Vitest guardrails, prior full root validation and staging APK install/device proof.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-08T17:10:00+03:00 - Receiving Methods Business Primitive

- Implemented product-facing `/v1/merchant/receiving-methods` API over existing durable receiving-route storage.
- Added additive migration `011_receiving_route_hmac_last4.sql` for destination HMAC/last4 and dedupe.
- Added backend validation rejecting invalid card/phone values and credential fields such as CVV, expiry, PIN, SMS code and passwords.
- Android onboarding and `Menu > Moyens de reception` now submit/list/disable/default receiving methods through the product API.
- Android raw draft input is cleared only after successful backend persistence.
- Web merchant receiving-method surface now writes to the product API and exposes real bank/type/value/label fields.
- Checkout remains route/method-selection based and still blocks instructions until an active method is selected.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- No real bank notification was processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-08T17:45:00+03:00 - REAL-CAPTURE-2 Intelligence Tool Inventory

- Created `.swimpay-agent/REAL_CAPTURE_2_INTELLIGENCE_TOOL_INVENTORY.md`.
- Marked task 635 completed with findings.
- Updated the source-truth inventory: Android non-debug upload is implemented and no longer a no-op.
- Confirmed code-level readiness for exact bank package gate, redaction, protected outbox, non-debug upload flusher, receiver registration/heartbeat APIs, backend signed signal ingestion, anti-replay, Payment Intent Gate, manual review and final-only webhooks.
- Recorded required device/staging proof gates before real notification capture: bank detection metrics, Notification Listener Access, receiver registration/heartbeat, synthetic redacted upload, active payment intent, SDK/webhook rehearsal and combined synthetic E2E.
- Recorded a security-contract gap: current receiver signing uses an app-generated HMAC verification key registered as `public_key`; production-grade asymmetric Android Keystore public-key registration remains required unless explicitly accepted for controlled staging only.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook semantics changed.

# 2026-05-08T22:39:00+03:00 - Android Developer Integration Wizard bridge

- Allowed Android mobile merchant sessions to use backend-owned `/v1/merchant/integration*` contracts through explicit integration permissions.
- Preserved web CSRF protection for BFF-session writes while allowing mobile bearer session calls.
- Added Android `MerchantDeveloperIntegrationApiRepository` for integration read, API key create/rotate, webhook secret rotate, webhook URL update and backend-owned test webhook.
- Reworked the Android Menu surface from `Site ou application` to `Integration developpeur` with show-once values, masked normal reads, webhook URL form, test action and staging export block.
- Added Android runtime action wiring so the APK calls SwimPay backend, not SDK logic, to generate credentials.
- Added backend regression coverage for Android mobile session access to the Developer Integration Wizard.
- Added Android repository/runtime tests proving show-once values are action-only and normal reads remain masked.
- Validation passed: android doctor, typecheck, lint, full Vitest suite, TypeScript build, Compose config, full Android JVM tests and Android debug APK build.
- No real bank notification was processed, no auto-confirmation was enabled, no SDK generated credentials and no public webhook semantics changed.

# 2026-05-09T15:55:00+03:00 - Buyer Checkout 4-Step Flow

- Created tasks 710 through 720 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Added Expected Payment Profile persistence to payment sessions with protected card/phone/name matching hints.
- Added deterministic buyer identity normalization for Latin/Cyrillic variants without LLM or external translation.
- Reworked hosted Step 1 to collect buyer name, sender method, sender bank and method-specific card/phone input.
- Added Luhn validation for buyer sender PAN and case-insensitive rejection of CVV/CVC/security/expiry/PIN/SMS/password fields.
- Reworked Step 2 so method-matched receiving routes are used and instructions are recorded server-side before receiver arming.
- Added exact payable amount, generated reference, masked receiver destination and copy actions to the checkout instructions.
- Added V1 payer bank launcher registry with exact bank package metadata and safe web fallback behavior.
- Enforced Step 3 ordering: `continue-to-bank` requires expected profile, route, launcher and instructions shown, then arms receiver only.
- Enforced Step 4 ordering: `J'ai payé` requires receiver armed and remains buyer claim only.
- Wired Expected Payment Profile fields into signal runtime candidates for Payment Intent Gate context.
- Validation passed: android doctor, typecheck, lint, targeted checkout tests, full Vitest suite, TypeScript build and Docker Compose config.
- No real bank notification was processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.
# 2026-05-09T16:03:12+03:00 - Buyer checkout deployment closeout

- Created `.swimpay-agent/BUYER_CHECKOUT_DEPLOYMENT_AND_NEXT_STEP.md`.
# 2026-05-09T23:10:00+03:00 - External P0 delta hardening

- Completed multi-agent delta audit for external P0 recommendations.
- Preserved product decision: no PAN Kill Switch; PAN remains Step 1 checkout-only and sensitive.
- Strengthened PAN/credential redaction and rejection across:
  - `@swimpay/security`;
  - `@swimpay/observability`;
  - receiver signal contracts/API;
  - public webhook worker;
  - `@swimpay/node` order and webhook surfaces.
- Added receiver signal evidence envelope persistence and package/cert/hash metadata columns.
- Added deterministic matching confidence vector and collision pressure.
- Added migration `016_p0_delta_hardening.sql` for evidence, amount leases, worker idempotency ledger and bank route certification.
- Added deterministic replay/privacy/webhook/matching npm scripts.
- Targeted validation passed for security, observability, SDK, webhook worker, receiver contracts, matching gate and receiver API signal tests.
- Typecheck passed.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

---

- Documented the VPS migration command for `014_expected_payment_profile.sql`.
- Documented a fallback manual SQL creation path if the migration file is not present on the VPS.
- Recorded the next logical staging rehearsal: SDK order -> hosted checkout -> manual merchant confirmation -> final-only webhook.
- Preserved the real-notification capture gate.

---

# 2026-05-09T17:11:04+03:00 - Buyer Checkout addendum: sweep, fallback and bank variants

- Added tasks 721 through 724 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Added Android Active Intent Notification Sweep gated by active payment intent, receiver armed and Expected Payment Profile presence.
- Added redacted recent notification buffer with safe metadata only.
- Added no-notification manual fallback after 120 seconds from `receiver_armed`.
- Added job-worker polling for due fallback sessions behind `NO_NOTIFICATION_FALLBACK_WORKER_ENABLED`.
- Added fallback review semantics for `manual_bank_check` confirmation type while keeping `official_bank_confirmation=false`.
- Added concrete SBP and card incoming parser fixture variants.
- Added Ozon Bank through the bank profile/registry path as review-only with package validation pending.
- Validation passed: targeted API/review/job-worker/parser/registry tests and Android Active Intent Notification Sweep JVM test.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

---

# 2026-05-09T17:25:00+03:00 - Buyer Checkout addendum validation closeout

- Completed Ozon Bank corpus requirements by adding `fixtures/redacted_samples.jsonl` and a `review_only` YAML template under `packages/bank-templates/banks/ozon_bank`.
- Aligned Ozon display name to `Ozon Банк` in profile, parser registry seed, migration and tests.
- Full validation passed:
  - `npm run android:doctor`;
  - `npm run typecheck`;
  - `npm run lint`;
  - `npm test` - 76 files, 573 tests passed;
  - `npm run build`;
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`;
  - Android full `:app:testDebugUnitTest`;
  - Android `:app:assembleDebug`.
- Real bank notification capture remains blocked until staging redeploy, migration `015`, synthetic SDK/checkout/manual-review/final-webhook rehearsal and explicit operator capture-start command.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

---

# 2026-05-09T18:05:00+03:00 - Developer Link Verification todo added

- Added a planned sprint for concrete Developer Integration improvements.
- Created tasks 725 through 730 for:
  - current integration inventory;
  - real webhook liaison proof;
  - API key/webhook secret revocation lifecycle;
  - Android liaison UI;
  - guardrail tests;
  - closeout.
- Created `.swimpay-agent/DEVELOPER_LINK_VERIFICATION_TODO.md`.
- Updated `.swimpay-agent/TASK_QUEUE.md` and `.swimpay-agent/NEXT_ACTION.md`.
- This was planning/documentation only; no backend, Android runtime, payment or webhook behavior was changed.

---

# 2026-05-09T19:10:00+03:00 - Checkout UX Apple-like guided refactor

- Created tasks 731 through 737 and updated `.swimpay-agent/TASK_QUEUE.md`.
- Refactored hosted buyer checkout into a mobile-first guided flow:
  - intro;
  - buyer information and method;
  - payment instructions and bank open action;
  - waiting timeline.
- Preserved the Expected Payment Profile, receiver arming, buyer paid claim and manual-confirmation-only semantics.
- Added method-specific field visibility so card only shows card input and phone/SBP only shows phone input.
- Added prominent copy actions for exact amount, reference, destination and payment detail summary.
- Added safe waiting timeline copy: signal detected remains pending merchant validation, not confirmation.
- Updated checkout form POST behavior so browser form submissions redirect back into the checkout flow.
- Targeted validation passed: `npx vitest run apps/web/src/checkout.test.ts apps/web/src/copy-guardrails.test.ts`.
- Full validation passed:
  - `npm run android:doctor`;
  - `npm run typecheck`;
  - `npm run lint`;
  - `npm test` - 76 files, 573 tests passed;
  - `npm run build`;
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`.
- No real bank notification was captured or processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

---
# 2026-05-10T02:00:00+03:00 - APK Deeplink Discovery Pipeline

- Built a static APKTool discovery pipeline under `tools/apk-discovery`.
- Added CLI scripts for single APK discovery, all-APK discovery and observed-registry generation.
- Parsed AndroidManifest package metadata, browsable VIEW intent filters, schemes, hosts, paths and exported activities.
- Added candidate deeplink detection without claiming runtime support or certification.
- Added META-INF certificate SHA-256 observation and Markdown/JSON report generation.
- Generated local reports for Sberbank, T-Bank, VTB, Alfa-Bank, Gazprombank and Ozon Bank from `C:\Users\Lenovo\Downloads\apkanalyser`.
- Generated `bank-launcher-registry.observed.json` with six experimental entries and `runtimeVerified=false`.
- Added tests for parser, candidate detection, version fallback, report generation and certificate extraction.
- Validation passed: `npm run typecheck`, `npm run lint`, `npm test` (78 files, 607 tests), `npm run build`, and Compose config.
- No real bank notification was captured or processed, no payment semantics changed, no bank action automation was added.

---

# 2026-05-10T03:30:00+03:00 - APK Deeplink Discovery Sandbox Externalized

- Moved the APK deeplink discovery tool outside the SwimPay repo to `D:\Dev\ExternalTools\swimpay-apk-discovery`.
- Removed root npm scripts, TypeScript project reference, ESLint sandbox ignores, in-repo APK discovery tests and `tools/apk-discovery/**`.
- Kept only documentation and agent reports in the repo to record the external sandbox path and safety boundary.
- Confirmed the tool is not used by the API, web checkout, Android Receiver, workers, SDKs or runtime build.
- APKTool experiments, decoded APK files and generated launcher observations must remain in the external sandbox.
- No app runtime, payment semantics, Android Receiver behavior, webhook behavior or real bank notification handling changed.

---

# 2026-05-10T08:35:00+03:00 - Checkout Method Availability Hotfix

- Audited the real SWIMVPN+ checkout issue where SBP remained visible although the merchant had no active SBP/phone receiving route.
- Added backend availability fields to payment session/status responses:
  - `available_payment_methods`;
  - `available_routes`;
  - `unavailable_reason`.
- Kept backend as source of truth by rejecting forced Expected Payment Profile submission when no compatible active receiving route exists.
- Kept receiver arming blocked when the selected receiving route is inactive or incompatible.
- Updated hosted checkout so unavailable methods are hidden before Step 1.
- Updated no-route checkout to show `Paiement indisponible` before collecting buyer information.
- Replaced the dead-end method fallback with actionable options:
  - `Payer par carte`;
  - `Payer par SBP`;
  - `Actualiser les methodes`;
  - `Retour au marchand`.
- Verified targeted tests:
  - `npm test -- --run apps/api/src/payment-sessions.test.ts`;
  - `npm test -- --run apps/web/src/checkout.test.ts`.
- Full validation passed:
  - `npm run android:doctor`;
  - `npm run typecheck`;
  - `npm run lint`;
  - `npm test` - 77 files, 608 tests passed;
  - `npm run build`;
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`.
- No Android Receiver runtime, payment confirmation, webhook semantics, real notification capture, SMS, Accessibility, scraping, `QUERY_ALL_PACKAGES` or broad enumeration changed.

---

# 2026-05-10T09:50:00+03:00 - Payment Compatibility Pair Refactor

- Audited checkout/backend confusion risk between buyer sender bank, merchant receiver bank, receiving route and payer bank launcher.
- Added shared `PaymentCompatibilityPair`, fallback action and unavailable-reason contracts.
- Updated checkout status responses with `available_compatibility_pairs` and `fallback_actions`.
- Refactored Expected Payment Profile creation so:
  - `receiver_bank_id` comes from the selected merchant receiving route;
  - `receiving_route_id` is persisted immediately;
  - `sender_bank_id` stays buyer-side;
  - `payer_bank_launcher_id` follows the buyer sender bank.
- Preserved PAN Sensitive Boundary and added early card plausibility/Luhn validation before route availability checks.
- Updated hosted checkout error handling so structured backend `409` method errors render actionable fallback instead of generic API failure.
- Verified targeted tests:
  - `npm test -- --run apps/api/src/payment-sessions.test.ts`;
  - `npm test -- --run apps/api/src/orders.test.ts`;
  - `npm test -- --run apps/web/src/checkout.test.ts`.
- Full validation passed:
  - `npm run android:doctor`;
  - `npm run typecheck`;
  - `npm run lint`;
  - `npm test` - 77 files, 611 tests passed;
  - `npm run build`;
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`;
  - `npm run test:replay`;
  - `npm run test:matching`;
  - `npm run test:privacy`;
  - `npm run test:webhooks`.
- Android source was not touched, so Gradle was not run.
- No real bank notifications were processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

---

# 2026-05-10T10:25:00+03:00 - Route Readiness, Lock And Soft Disable

- Added additive migration `017_receiving_route_readiness_lock.sql`.
- Added receiving route lifecycle states: `active`, `pending_disable`, `disabled`, `revoked`, `deleted`.
- Added payment session route lock fields: `route_locked_at`, `route_lock_expires_at` and `amount_lease_id`.
- Step 2 now locks the selected receiving route and exact amount lease id for the session.
- Normal disable now becomes `pending_disable` when active locked sessions exist.
- Revocation is explicit, requires a reason and blocks even already locked sessions.
- `pending_disable` routes are hidden from new sessions but remain valid for existing locked sessions.
- Confirmation, rejection and expiration now release route locks alongside amount leases.
- Added tests for locked route disable, pre-lock disable fallback and post-lock revoke fallback.
- Full validation passed:
  - `npm run android:doctor`;
  - `npm run typecheck`;
  - `npm run lint`;
  - `npm test` - 77 files, 614 tests passed;
  - `npm run build`;
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config`;
  - `npm run test:replay`;
  - `npm run test:matching`;
  - `npm run test:privacy`;
  - `npm run test:webhooks`.
- Android source was not touched, so Gradle was not run.
- No real bank notifications were processed, no auto-confirmation was enabled and no public webhook/payment confirmation semantics changed.

---
