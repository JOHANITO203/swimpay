# Sprint 3A Report - Receiver Readiness & Live Runtime Smoke

completed_at: 2026-05-02T18:32:00+03:00

## Tasks Created

- `032_device_signature_verification_hardening`
- `033_live_docker_runtime_smoke_tests`
- `034_backend_receiver_signal_live_flow`
- `035_bank_app_verification_workflow`
- `036_phase_2_closeout_review`

## Tasks Completed

- `032_device_signature_verification_hardening`
- `033_live_docker_runtime_smoke_tests`
- `034_backend_receiver_signal_live_flow`
- `035_bank_app_verification_workflow`
- `036_phase_2_closeout_review`

## Signature Verification Behavior

- Receiver signals use the typed `hmac_sha256_canonical_v1` canonical payload verifier foundation.
- Missing and invalid signatures are rejected.
- Unknown, suspended, revoked and disabled receiver devices are rejected.
- Local counter replay/regression remains rejected.
- Production-grade asymmetric verification remains a future hardening item; no production bypass was added.

## Live Smoke Test Coverage

- `npm run smoke:runtime` validates Docker Compose config from `.env.example`.
- Confirms `postgres`, `valkey` and `nats` do not publish host ports.
- Confirms `swimpay_private` is internal.
- Confirms API, signal worker, job worker and web services define healthchecks.
- Confirms Docker log rotation remains configured.

## Backend Receiver Signal Flow

- Synthetic receiver upload stores a redacted signal and emits `signal.received`.
- API `accepted: true` means `backend_decision_pending`.
- `TO_VERIFY` package/cert metadata routes to review and cannot auto-confirm.
- No raw phone, raw notification text or official bank confirmation field is exposed.

## Bank App Verification Workflow

- Admins can list observed bank app metadata through `GET /v1/admin/bank-app-signatures`.
- Admins with `promote_bank_templates` can verify non-`TO_VERIFY` observed metadata through `POST /v1/admin/bank-app-signatures/:id/verify`.
- Verification writes `admin.bank_app_signature.verified`.
- `TO_VERIFY` values cannot become trusted automatically.
- Certificate hashes are masked in admin responses.

## Tests Added Or Strengthened

- Receiver signature algorithm and disabled/unknown device tests.
- Live runtime smoke config tests.
- Durable receiver signal flow response semantics test.
- Admin bank app signature list/verify/TO_VERIFY/permission tests.

## Validation

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

## Blockers

No current critical blockers.

## Next Recommended Sprint

Start Android MVP implementation planning and local test harness work:

- Android app shell.
- Device registration and heartbeat.
- Notification access status UX.
- Local redaction/coalescing.
- Synthetic signed signal upload to local backend.
