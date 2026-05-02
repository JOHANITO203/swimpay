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
```

Sprint 3D adds Gradle Android project files under `apps/android-receiver/android`, but no Gradle wrapper JAR is checked in. In the current environment Java and Android SDK are present, while Gradle is not available in PATH. Android assemble/debug builds should be run only after generating a wrapper from a trusted local Gradle installation.

Static Android runnable app checks:

```bash
npm test -- --run apps/android-receiver/src/android-runnable-app.test.ts
```

Manual emulator smoke instructions are in `docs/ANDROID_EMULATOR_SMOKE_TEST.md`.

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

## Start Docker Compose

```bash
docker compose --env-file .env.example -f infra/docker-compose.yml up --build
```

The local proxy is available at:

```text
http://localhost:8080
```

`/v1/*` and `/api/*` are routed to `swimpay-api`; checkout and web routes are routed to `swimpay-web`.

Only the Caddy proxy publishes a host port. PostgreSQL, Valkey, NATS, API, web, and workers stay on the private Compose network. For a real single-server install, set `HTTP_PORT=80` in the server environment and configure TLS/reverse-proxy policy before exposing merchants.

Before starting the full local runtime, run the lightweight smoke guard:

```bash
npm run smoke:runtime
```

This verifies the Compose config shape, private Postgres/Valkey/NATS exposure, runtime healthcheck definitions and Docker log rotation settings. See `docs/LIVE_DOCKER_RUNTIME_SMOKE.md`.

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
