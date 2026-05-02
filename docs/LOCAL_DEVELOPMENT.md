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
  -d '{"event_id":"evt_local_01","device_id":"dev_01","merchant_id":"mch_01","bank_profile_id":"sber_ru","package_name":"ru.sberbankmobile","package_cert_sha256":"pending_cert_sha256","notification_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","local_counter":1,"observed_at":"2026-05-02T08:00:00.000Z","payload":{"title_redacted":"Transfer <AMOUNT> <CURRENCY>","body_redacted":"Transfer from <PHONE>. <REFERENCE>","amount_minor":13700,"currency":"RUB","sender_phone_hmac":"hmac_phone","sender_phone_masked":"+7 *** *** **33","reference_hmac":"hmac_ref","reference_code_masked":"SWP-A***","direction_label":"incoming_customer_transfer"},"signature":"hex_hmac_signature_for_foundation"}'
```

The foundation signature verifier is deterministic for local development and tests. Real Android keypair verification is intentionally not complete yet.

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

## Matching Core Foundation

Run matching-core guardrail tests:

```bash
npm test -- packages/matching-core/src/index.test.ts
```

The matching core is a pure deterministic package. It checks candidate sessions, exact amount/currency, phone/reference identity, time windows, collision risk, duplicate signal flags, order reuse flags, trust inputs, and unsafe directions. It is not yet wired into workers or persistent state transitions.

## Run Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Start Docker Compose

```bash
docker compose --env-file .env.example -f infra/docker-compose.yml up --build
```

PostgreSQL, Valkey, and NATS are on the private Compose network and are not published to public host ports. API and web publish local ports for development and should later sit behind Caddy or Nginx.

## Current Limitations

- This is a foundation layer only.
- No signal ingestion, matching, review, webhook, or bank parser behavior exists yet.
- Signal ingestion stores received signed signals, but does not parse, match, score, review, or confirm payments.
- Bank parser output is currently a package-level foundation and is not yet wired into the signal worker pipeline.
- Matching core output is currently package-level only and is not yet writing `signal_matches`, creating reviews, or changing order/session state.
- Raw notifications are not stored by default.
- API keys are represented only by hashed storage fields.
- Phone fields are represented as HMAC/masked fields, not raw phone fields.
- Android Receiver has a testable core only; platform permission flows and a real Android notification listener are still future work.
