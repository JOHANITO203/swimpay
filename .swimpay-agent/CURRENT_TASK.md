# Current Task

task id: 031_android_receiver_contract_validation
source task file: tasks/031_android_receiver_contract_validation.md
status: completed
scope:
Define and validate backend-facing Android Receiver contracts, DTOs, validation rules, docs and tests.

files allowed:
- tasks/031_android_receiver_contract_validation.md
- .swimpay-agent task queue and reports
- packages/contracts Android Receiver DTOs and validators
- apps/api receiver device and signal endpoint validation
- apps/android-receiver contract-aligned types/tests
- packages/observability metrics names if needed
- docs related to Android Receiver contracts and local development

forbidden work:
- Do not build the full Android app.
- Do not implement Android NotificationListenerService logic.
- Do not implement Android Receiver app logic.
- Do not implement production deployment.
- Do not implement real bank package/cert verification.
- Do not invent real bank package names or certificate fingerprints.
- Do not implement SBP or PSP behavior.
- Do not claim official bank confirmation.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not weaken auto-confirm gates.
- Do not weaken admin RBAC.
- Do not add unrelated parser, matching, review, webhook or UI features.

acceptance criteria:
- Android Receiver registration, heartbeat, signal upload, notification snapshot, coalescing and signature contracts are typed and validated.
- Existing receiver endpoints are strengthened without implementing full Android app logic.
- Raw phone and raw notification text fields are rejected by default.
- Missing signatures, invalid amount/currency and timestamp/counter issues are rejected safely.
- TO_VERIFY package/cert metadata remains untrusted.
- Tests cover accepted and rejected receiver payloads, privacy, anti-replay and endpoint responses.
- Documentation describes the Android/backend boundary.

commands to run:
- npm run typecheck
- npm run lint
- npm test
- npm run build
- docker compose --env-file .env.example -f infra/docker-compose.yml config

started_at: 2026-05-02T17:35:00+03:00
completed_at: 2026-05-02T17:48:21+03:00
result: completed. Android Receiver backend contracts, validators, endpoint hardening, docs and tests were added. Validation passed.

## Source requirements

See tasks/031_android_receiver_contract_validation.md.
