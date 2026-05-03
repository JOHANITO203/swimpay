# Local Development

## Install Dependencies

```bash
npm install
```

## Run Services Locally

```bash
npm run dev:api
npm run dev:signal-worker
npm run dev:job-worker
npm run dev:web
```

Default health endpoints:

- API: `http://localhost:3000/health`
- Signal worker: `http://localhost:3010/health`
- Job worker: `http://localhost:3011/health`
- Web: `http://localhost:3001/health`

## Local Order API Foundation

The task 003 foundation uses a temporary local bearer format until hashed API key validation is implemented:

```text
Authorization: Bearer test_mch_01
```

Example:

```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "Authorization: Bearer test_mch_01" \
  -H "Content-Type: application/json" \
  -d '{"external_id":"order_888","amount":{"value":"137.00","currency":"RUB"},"buyer":{"bank_phone":"+79991234567"},"expires_in_seconds":900}'
```

Read checkout session status:

```bash
curl http://localhost:3000/v1/payment-sessions/ps_01 \
  -H "Authorization: Bearer test_mch_01"
```

Register a receiver device:

```bash
curl -X POST http://localhost:3000/v1/receiver-devices/register \
  -H "Authorization: Bearer test_mch_01" \
  -H "Content-Type: application/json" \
  -d '{"device_name":"Merchant Phone","public_key":"base64_public_key","app_version":"1.0.0","android_version":"15","selected_banks":["sber_ru"]}'
```

Send receiver heartbeat:

```bash
curl -X POST http://localhost:3000/v1/receiver-devices/heartbeat \
  -H "Authorization: Bearer test_mch_01" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"dev_01","notification_access":true,"listener_connected":true,"allowed_banks":["sber_ru"],"queue_length":0,"last_signal_at":null,"app_version":"1.0.1","status":"healthy"}'
```

Ingest a signed receiver signal:

```bash
curl -X POST http://localhost:3000/v1/receiver/signals \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_local_01","device_id":"dev_01","merchant_id":"mch_01","bank_profile_id":"bank_synthetic_v1","package_name":"test.bank.synthetic","package_cert_sha256":"synthetic_cert_sha256_v1","notification_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","local_counter":1,"observed_at":"2026-05-02T08:00:00.000Z","payload":{"title_redacted":"Transfer <AMOUNT> <CURRENCY>","body_redacted":"Transfer from <PHONE>. <REFERENCE>","amount_minor":13700,"currency":"RUB","sender_phone_hmac":"hmac_phone","sender_phone_masked":"+7 *** *** **33","reference_hmac":"hmac_ref","reference_code_masked":"SWP-A***","direction_label":"incoming_customer_transfer"},"signature":"hex_hmac_signature_for_foundation"}'
```

The foundation signature verifier is deterministic for local development and tests. Real Android keypair verification is intentionally not complete yet.

List open review items:

```bash
curl http://localhost:3000/v1/reviews \
  -H "Authorization: Bearer test_mch_01"
```

Confirm a review item manually:

```bash
curl -X POST http://localhost:3000/v1/reviews/rev_01/confirm \
  -H "Authorization: Bearer test_mch_01" \
  -H "Content-Type: application/json" \
  -d '{"reason":"masked sender and reference match the order","feedback_label":"true_payment"}'
```

Reject a review item manually:

```bash
curl -X POST http://localhost:3000/v1/reviews/rev_01/reject \
  -H "Authorization: Bearer test_mch_01" \
  -H "Content-Type: application/json" \
  -d '{"reason":"masked fields do not match the order","feedback_label":"false_positive"}'
```

Review responses expose masked phone/reference fields only. They do not expose raw phone numbers or raw notification text.

## Hosted Checkout Foundation

Start the web service:

```bash
npm run dev:web
```

Open a checkout page:

```text
http://localhost:3001/checkout/ps_01
```

The web service reads checkout session state from the API through `API_BASE_URL` and the temporary local merchant id `CHECKOUT_MERCHANT_ID`.

```bash
API_BASE_URL=http://localhost:3000 CHECKOUT_MERCHANT_ID=mch_01 npm run dev:web
```

The checkout page includes:

- checkout summary;
- buyer identity fields;
- payment instructions;
- timer;
- copy buttons;
- open-bank placeholder;
- `J'ai paye` button;
- status polling.

`J'ai paye` does not confirm payment. It only records a local buyer claim response and keeps the UI waiting for the backend payment signal state.

## Android Receiver Core Foundation

The Android Receiver foundation is currently a TypeScript core package for deterministic tests and later Android integration:

```bash
npm test -- apps/android-receiver/src/android-receiver-core.test.ts
npm run typecheck --workspace @swimpay/android-receiver
```

It covers local allowlist filtering, notification snapshot extraction, privacy redaction, encrypted outbox persistence, signed upload envelope construction, and heartbeat payload creation. It is not yet a platform Android app and does not implement final payment decisions.

## Bank Parser Foundation

Run the deterministic parser tests:

```bash
npm test -- packages/bank-templates/src/parser.test.ts
```

The parser extracts RUB amounts, Russian phone candidates, SwimPay reference codes, direction labels, negative gates, and signal quality. It does not match signals to orders or make payment decisions.

Parser task 020 adds normalized RU text matching, masked-phone weak-signal detection, and an `allowAutoConfirmCandidate` parser hint. This hint is not a payment decision; backend matching and trust gates still decide.

## Bank Template Package Assets

Run the bank-template setup test:

```bash
npm test -- tests/bank-template-package.test.ts
```

The package includes imported YAML/JSONL assets from the downloaded bank-template pack:

- `packages/bank-templates/banks/`
- `packages/bank-templates/fixtures/`
- `packages/bank-templates/policies/`
- `packages/bank-templates/schemas/`
- `packages/bank-templates/shared/`

These files are trackable by git and are not trusted runtime decisions by themselves.

Run the bank profile registry tests:

```bash
npm test -- packages/bank-templates/src/registry.test.ts
```

The registry loads V1 bank profile YAML files and exposes conservative runtime behavior. Unknown bank profiles return review-only behavior, and `TO_VERIFY` package/certificate metadata cannot pass the trusted bank app gate.

## Matching Core Foundation

Run matching-core guardrail tests:

```bash
npm test -- packages/matching-core/src/index.test.ts
```

The matching core is a pure deterministic package. It checks candidate sessions, exact amount/currency, phone/reference identity, time windows, collision risk, duplicate signal flags, order reuse flags, trust inputs, and unsafe directions. It is not yet wired into workers or persistent state transitions.

## Webhook Worker Foundation

Run webhook worker tests:

```bash
npm test -- apps/job-worker/src/webhooks.test.ts
```

The webhook foundation covers:

- public event payload creation with `confirmation_type: notification_signal`;
- `official_bank_confirmation: false`;
- HMAC signatures and SwimPay webhook headers;
- retry scheduling;
- duplicate endpoint/event prevention;
- manual replay with the original event id and a new delivery id.

The worker is not yet connected to NATS JetStream or a Postgres-backed polling loop.

## Run Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Security-focused tests include:

```bash
npm test -- packages/security/src/index.test.ts apps/job-worker/src/webhooks.test.ts apps/api/src/signals.test.ts
```

They verify API key hashing, webhook secret hashing, phone HMAC/masking, sensitive log redaction, webhook signatures, and receiver signal signature rejection.

End-to-end foundation tests include:

```bash
npm test -- tests/e2e-payment-signal-flow.test.ts
```

They verify the in-process payment signal flow across matching-core and webhook worker primitives: safe incoming signal confirmation, signed webhook delivery, review routing for missing identity and collisions, and rejection for cashback, outgoing, and duplicate signals.

Durable worker E2E tests include:

```bash
npm test -- --run tests/durable-worker-e2e.test.ts
```

They verify the in-process Phase 2 runtime path across API order/session creation, receiver signal ingestion, `signal.received` processing, review creation, review rejection semantics, webhook delivery, retry/dead handling and worker consumer wrappers. The suite uses mocked repositories and HTTP clients only; it does not call external services or live NATS.

NATS JetStream consumer foundation tests include:

```bash
npm test -- packages/events/src/jetstream.test.ts
npm test -- apps/signal-worker/src/consumers.test.ts apps/job-worker/src/consumers.test.ts
```

Local NATS runtime settings:

```text
NATS_URL=nats://nats:4222
NATS_STREAM_NAME=SWIMPAY_EVENTS
NATS_DURABLE_PREFIX=swimpay
NATS_CONNECT_TIMEOUT_MS=2000
```

Run workers locally:

```bash
npm run dev:signal-worker
npm run dev:job-worker
```

Task 025 workers register durable consumer skeletons and expose the registration state on `/health`. Task 026 wires the job worker's webhook consumer to the Postgres-backed delivery loop. Parser/matching/review runtime integration remains intentionally left for task 027.

Webhook delivery loop tests include:

```bash
npm test -- apps/job-worker/src/webhooks.test.ts apps/job-worker/src/webhook-runtime.test.ts
```

Local webhook worker settings:

```text
WEBHOOK_WORKER_ENABLED=false
WEBHOOK_POLL_INTERVAL_MS=30000
WEBHOOK_WORKER_BATCH_SIZE=10
WEBHOOK_MAX_ATTEMPTS=7
WEBHOOK_REQUEST_TIMEOUT_MS=5000
WEBHOOK_RETRY_BASE_DELAY_MS=60000
WEBHOOK_RETRY_MAX_DELAY_MS=86400000
```

Set `WEBHOOK_WORKER_ENABLED=true` only when you want the job worker fallback polling loop to claim and deliver due rows from PostgreSQL. The NATS `webhook.delivery_requested` consumer can process due deliveries by `delivery_id` or `event_id`; PostgreSQL remains the source of truth.

Admin console foundation tests include:

```bash
npm test -- apps/api/src/admin.test.ts
```

Admin API endpoints require operator auth/RBAC. For local development, configure a dev token:

```text
ADMIN_AUTH_MODE=dev_token
DEV_ADMIN_TOKEN=change_me_local_admin_token
DEV_ADMIN_OPERATOR_ID=dev_operator
DEV_ADMIN_ROLE=admin
```

Requests use:

```text
Authorization: Bearer change_me_local_admin_token
```

Example operational reads:

```bash
curl http://localhost:3000/v1/admin/bank-profiles \
  -H "Authorization: Bearer change_me_local_admin_token"

curl http://localhost:3000/v1/admin/templates \
  -H "Authorization: Bearer change_me_local_admin_token"

curl http://localhost:3000/v1/admin/audit-events?object_type=bank_template \
  -H "Authorization: Bearer change_me_local_admin_token"
```

Example audited template degradation:

```bash
curl -X POST http://localhost:3000/v1/admin/templates/<template_id>/degrade \
  -H "Authorization: Bearer change_me_local_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason":"operator observed drift in redacted template sample"}'
```

Other bank-template admin actions:

```bash
curl -X POST http://localhost:3000/v1/admin/templates/<template_id>/promote \
  -H "Authorization: Bearer change_me_local_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"target_status":"shadow_testing","reason":"review evidence threshold met"}'

curl -X POST http://localhost:3000/v1/admin/templates/<template_id>/review-only \
  -H "Authorization: Bearer change_me_local_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason":"manual review required after drift"}'

curl -X POST http://localhost:3000/v1/admin/templates/<template_id>/disable \
  -H "Authorization: Bearer change_me_local_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason":"critical drift incident"}'

curl -X POST http://localhost:3000/v1/admin/templates/<template_id>/false-positive \
  -H "Authorization: Bearer change_me_local_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason":"merchant reported false positive"}'
```

Production must not use `dev_token` mode or `Bearer admin_<operator_id>` placeholders. See `docs/ADMIN_AUTH_AND_RBAC.md` for role and permission details.

Promoting to `trusted_low_amount` or `trusted` is blocked unless evidence thresholds are met and the related bank app package/certificate metadata has verified values. `TO_VERIFY` metadata cannot pass the trust gate.

The admin foundation returns canonical/redacted template fields and operational metadata only. It does not expose raw phone numbers or raw notification text.

## Runtime Observability

API health:

```bash
curl http://localhost:3000/health
```

Admin metrics and status require operator auth:

```bash
curl http://localhost:3000/v1/admin/metrics \
  -H "Authorization: Bearer change_me_local_admin_token"

curl http://localhost:3000/v1/admin/runtime-status \
  -H "Authorization: Bearer change_me_local_admin_token"
```

Local requests may include `X-Correlation-Id`; otherwise the API returns a generated `X-Correlation-Id` header.

Metrics are in-process JSON counters and gauges. They are useful during local development and guarded single-server operation, but they reset on process restart. See `docs/RUNTIME_OBSERVABILITY.md`.

## Android Receiver Contract

The backend-facing Android Receiver contract is documented in:

```text
docs/ANDROID_RECEIVER_CONTRACT.md
docs/08_ANDROID_RECEIVER_SPEC.md
```

Local receiver endpoints:

```bash
curl -X POST http://localhost:3000/v1/receiver-devices/register \
  -H "Authorization: Bearer test_mch_local" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name":"Local receiver",
    "app_version":"0.1.0",
    "android_version":"14",
    "public_key":"local_receiver_verification_key",
    "device_install_id":"install_local",
    "supported_capabilities":["notification_access","signed_signal_upload","local_redaction"]
  }'

curl -X POST http://localhost:3000/v1/receiver-devices/heartbeat \
  -H "Authorization: Bearer test_mch_local" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"dev_local",
    "app_version":"0.1.0",
    "android_version":"14",
    "notification_access_enabled":true,
    "listener_connected":true,
    "allowed_bank_profile_ids":["sber_ru"],
    "queue_length":0,
    "timestamp":"2026-05-02T00:00:00.000Z",
    "signature":"local_signature"
  }'
```

`POST /v1/receiver/signals` requires a canonical signed redacted payload. Raw phone fields and raw notification text are rejected by default. `TO_VERIFY` package/cert metadata remains untrusted and accepted uploads still wait for backend decision processing.

Receiver signal upload responses with `accepted: true` mean the redacted signal was accepted for backend processing only. They do not confirm a payment and do not claim official bank confirmation. See `docs/BACKEND_RECEIVER_SIGNAL_LIVE_FLOW.md`.

Run the Android Receiver MVP core tests:

```bash
npm test -- --run apps/android-receiver/src
```

The Android Receiver module is Kotlin-source-ready under `apps/android-receiver/android`, but this repo does not currently include Gradle or Android build tooling. See `docs/ANDROID_RECEIVER_MVP_FOUNDATION.md`.

Sprint 3C receiver lifecycle tests cover local registration, signed heartbeat, signed signal upload, encrypted outbox retry and health warnings:

```bash
npm test -- --run apps/android-receiver/src/android-receiver-lifecycle.test.ts
```

Print the local receiver smoke plan:

```bash
npm run smoke:receiver
```

The smoke plan uses synthetic redacted data and does not require a real Android device. See `docs/ANDROID_RECEIVER_LIFECYCLE.md` and `docs/ANDROID_GRADLE_READINESS_PLAN.md`.

Check Android build tooling:

```bash
npm run android:doctor
npm run android:emulator-doctor
```

Sprint 4B generated a trusted Gradle wrapper. Java and the Android SDK are present, while global Gradle is still not available in PATH. Use the wrapper for local Android builds.

Do not manually invent or paste `gradle-wrapper.jar`. Read `docs/GRADLE_WRAPPER_POLICY.md` first.

Expected command:

```bash
cd apps/android-receiver/android
./gradlew :app:assembleDebug
```

Windows PowerShell:

```powershell
cd apps/android-receiver/android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:testDebugUnitTest
```

The Android JVM unit test plan is documented in `docs/ANDROID_JVM_UNIT_TEST_PLAN.md`.

Static Android runnable app checks:

```bash
npm test -- --run apps/android-receiver/src/android-runnable-app.test.ts
```

Manual emulator smoke instructions are in `docs/ANDROID_EMULATOR_SMOKE_TEST.md`.

Sprint 4C emulator doctor currently reports `adb` available from the SDK, no Android Emulator command, no AVDs, and no running devices. APK install and emulator UI smoke validation are therefore blocked until the Android Emulator package and an AVD are installed.

## Bank App Verification Workflow

Observed bank app package/cert metadata can be reviewed through the admin API:

```bash
curl http://localhost:3000/v1/admin/bank-app-signatures \
  -H "Authorization: Bearer change_me_local_admin_token"
```

Verification is an explicit RBAC-protected operator action:

```bash
curl -X POST http://localhost:3000/v1/admin/bank-app-signatures/<signature-id>/verify \
  -H "Authorization: Bearer change_me_local_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason":"operator reviewed PackageManager metadata"}'
```

Rows with `TO_VERIFY` package/cert metadata cannot be verified. See `docs/BANK_APP_VERIFICATION_WORKFLOW.md`.

## Bank Package Evidence Dry Run

Sprint 4L adds a safe preparation path for Android PackageManager evidence.

Read:

```text
docs/BANK_PACKAGE_EVIDENCE_DRY_RUN.md
```

The Android boundary collects evidence only for an explicit package name. It does not enumerate apps for hidden collection and does not trust the result automatically.

Evidence outcomes:

- `TO_VERIFY`: review-only, untrusted.
- concrete PackageManager package/cert: `pending_verification`, operator review required.
- `synthetic_debug_only`: debug-only, not production trust evidence.

Do not use real bank notifications during this dry run. Successful evidence capture does not mean the bank app is trusted and does not mean any payment was confirmed.

Submit synthetic/debug evidence for operator review:

```bash
curl -X POST http://localhost:3000/v1/bank-evidence \
  -H "Authorization: Bearer test_mch_local" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"dev_local",
    "bank_profile_id":"sberbank_ru",
    "package_name":"synthetic_debug_only.com.swimpay.syntheticbank",
    "cert_sha256":"synthetic_debug_only.cert_sha256",
    "app_version":"0.1.0-debug",
    "install_source":"debug_explicit_package_selection",
    "source":"android_packagemanager"
  }'
```

Review evidence as an operator:

```bash
curl http://localhost:3000/v1/admin/bank-evidence \
  -H "Authorization: Bearer change_me_local_admin_token"

curl -X POST http://localhost:3000/v1/admin/bank-evidence/<evidence-id>/approve-review-only \
  -H "Authorization: Bearer change_me_local_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"reason":"operator reviewed PackageManager evidence"}'
```

Approval means review-only approval, not production trust and not payment confirmation. See `docs/BANK_EVIDENCE_OPERATOR_REVIEW.md`.

## Start Docker Compose

```bash
docker compose --env-file .env.example -f infra/docker-compose.yml up --build
```

The local proxy is available at:

```text
http://localhost:8080
```

`/v1/*` and `/api/*` are routed to `swimpay-api`; checkout and web routes are routed to `swimpay-web`.

API health through Docker Compose is available through the proxy:

```bash
npm run backend:doctor
curl http://localhost:8080/api-health
```

`http://localhost:3000/health` is expected to fail in Compose mode because `swimpay-api` listens on private container port `3000` and is not host-published.

## Android Real Device Debug Smoke

Sprint 4F wires the debug-only Android Receiver smoke buttons to real device-side HTTP calls.

Use the local Compose proxy and adb reverse:

```powershell
docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080
```

The debug app uses:

```text
http://127.0.0.1:8080
```

This URL is local to the Android device through adb reverse. It is not a production URL.

Debug-only actions:

- Register receiver
- Send heartbeat
- Upload synthetic signal
- Queue synthetic outbox signal
- Flush outbox

All debug smoke actions use synthetic redacted data only. They do not use real bank notifications, raw phone numbers or raw notification text. The UI wording must remain `backend decision pending`, `notification signal` and `not official bank confirmation`.

Debug cleartext HTTP is scoped to the debug source set and localhost only. Release network security must not be weakened.

Sprint 4G persists debug receiver state and redacted outbox payloads:

- `device_id`, device status and safe timestamps are stored after registration;
- heartbeat, synthetic upload and outbox flush reuse the stored device id;
- outbox entries are deduped by `event_id` and `notification_hash`;
- failed uploads enter `failed_retrying` with a bounded retry delay;
- the app status screen refreshes `/api-health` through adb reverse.

The current persistent outbox uses a protected storage boundary suitable for local MVP smoke validation. It is not production-grade encryption and must be replaced by Android Keystore/Encrypted storage before real merchant data is used.

Sprint 4H updates the active Android debug outbox path to use an Android Keystore-backed protected adapter and migrates any previous local debug outbox entries into it. The JVM tests still use fakes so they can run without Android platform storage. WorkManager retry is unique, network-constrained and bounded; release builds do not expose debug smoke buttons or the debug broadcast receiver.

Sprint 4I adds synthetic listener smoke:

```powershell
adb -s R5CWA0FEPZW shell pm grant com.swimpay.receiver android.permission.POST_NOTIFICATIONS
adb -s R5CWA0FEPZW shell am broadcast -a com.swimpay.receiver.DEBUG_SMOKE --es action post_synthetic_notification
adb -s R5CWA0FEPZW shell am broadcast -a com.swimpay.receiver.DEBUG_SMOKE --es action process_synthetic_notification_e2e
```

The synthetic source is debug-only and marked `synthetic_debug_only`. It uses redacted examples, never real bank notifications, and never performs Android-side payment confirmation.

## Receiver Onboarding Gate

Phase 4J makes Notification Listener Access a blocking onboarding condition.

Android has two separate states:

- App notifications permission: lets SwimPay Receiver show its own notifications.
- Notification Listener Access: lets SwimPay Receiver observe Android notifications and apply the local allowlist.

App notifications ON with Notification Listener Access OFF is not ready.

Manual phone path:

```text
Settings -> Notifications -> Device and app notifications / Notification access -> SwimPay Receiver
```

The app action opens:

```text
android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
```

If a reinstall or `pm clear` removes the listener grant, the app reports `regrant_required_after_reinstall`.

Required onboarding wording:

```text
Android donne une permission large d'accès aux notifications. SwimPay applique ensuite une allowlist locale : seules les notifications des banques que vous choisissez sont analysées. Les autres notifications sont ignorées localement.
```

Only the Caddy proxy publishes a host port. PostgreSQL, Valkey, NATS, API, web, and workers stay on the private Compose network. For a real single-server install, set `HTTP_PORT=80` in the server environment and configure TLS/reverse-proxy policy before exposing merchants.

Before starting the full local runtime, run the lightweight smoke guard:

```bash
npm run smoke:runtime
```

This verifies the Compose config shape, private Postgres/Valkey/NATS exposure, runtime healthcheck definitions and Docker log rotation settings. See `docs/LIVE_DOCKER_RUNTIME_SMOKE.md`.

## Production Admin Auth Preflight

Sprint 5B adds a non-mutating production admin-auth preflight:

```bash
npm run production:admin-auth-preflight
```

Local `.env.example` may use `ADMIN_AUTH_MODE=dev_token`. Production must not. Use `.env.production.example` as the committed no-secret shape and inject `ADMIN_TOKEN_HMAC_SECRET` from the host environment or secret storage with `infra/docker-compose.production-admin-auth.override.yml`.

## Current Limitations

- This is a foundation layer only.
- Signal ingestion stores received signed signals and publishes `signal.received`.
- The signal worker now processes `signal.received` through deterministic parser, matching, review/reject/auto-confirm decision, audit, and webhook-request foundations.
- Bank parser output and matching-core output are wired into the signal worker for task 027 runtime decisions.
- Review queue APIs and repository methods exist, and live signal decisions can create review items.
- Hosted checkout reads backend session state, but API-side buyer identity submission and persistent buyer-claimed-paid transitions are not implemented yet.
- Webhook delivery core is wired to a tested Postgres-backed delivery loop and the NATS `webhook.delivery_requested` trigger. The signal runtime requests `payment.confirmed`, `payment.needs_review`, or `payment.rejected` delivery records when endpoints are configured.
- Admin console is API-only. It exposes RBAC-protected operator read views, audited bank-template actions, and a guarded bank app metadata verification workflow, but does not implement a browser UI, automated real-world package/cert trust policy, unsafe bulk actions, or a full operator identity provider.
- Runtime observability is lightweight and in-process. It exposes safe health, metrics and runtime-status JSON only; it does not include a heavy monitoring/log aggregation stack.
- Raw notifications are not stored by default.
- API keys are represented only by hashed storage fields.
- Phone fields are represented as HMAC/masked fields, not raw phone fields.
- Android Receiver has a testable core only; platform permission flows and a real Android notification listener are still future work.
