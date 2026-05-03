# Sprint 4U Report - Operator Evidence Review UI/API Rehearsal and Production Trust Guard Validation

status: PASS
generated_at: 2026-05-03T12:47:04+03:00

## Scope

Sprint 4U added a lightweight operator rehearsal CLI for the bank package/certificate evidence lifecycle and validated production trust guardrails against local/dev data.

No real bank notifications were processed. No installed-app enumeration was added. No production trust was approved. Auto-confirmation remains disabled.

## Tasks Created

1. `210_operator_evidence_rehearsal_cli`
2. `211_evidence_dashboard_live_api_rehearsal`
3. `212_evidence_audit_visibility_rehearsal`
4. `213_production_trust_dry_run_guard_validation`
5. `214_evidence_rehearsal_docs`
6. `215_sprint_4u_validation`
7. `216_sprint_4u_closeout_review`

## Tasks Completed

All Sprint 4U tasks are completed.

## Operator Rehearsal CLI

Added `scripts/evidence-lifecycle-rehearsal.mjs` and `npm run rehearsal:evidence`.

The CLI supports:

- `--plan` for a non-destructive operator plan;
- local dashboard/audit rehearsal against `http://localhost:8080`;
- optional production trust dry-run guard validation with explicit `SWIMPAY_EVIDENCE_ID`.

## Dashboard Rehearsal

The CLI fetches `/v1/admin/bank-evidence/review-dashboard` and validates:

- masked certificate hashes only;
- no raw phone values;
- no raw notification text;
- no raw title/body;
- no secrets;
- `trusted: false`;
- `production_trust_requested: false`;
- `auto_confirm_enabled: false`.

## Audit Visibility Rehearsal

The CLI fetches `/v1/admin/audit-events?object_type=bank_package_evidence` and validates redaction. UUIDs and timestamps are not treated as phone values.

## Production Trust Guard Validation

The optional local dry run requested production trust for explicit local evidence `f4069615-028b-4329-a136-115495bd058c`, then attempted same-actor approval.

Result:

- rehearsal passed;
- same-actor approval was blocked by dual-control;
- `trusted` stayed `false`;
- `auto_confirm_enabled` stayed `false`;
- no production trust approval occurred.

## Tests Added

Added tests for:

- rehearsal plan shape;
- safe dashboard/audit inspection;
- rejection of full cert hashes, raw phone values and raw notification text;
- UUID/timestamp false-positive prevention;
- injected-fetch API rehearsal path;
- Sprint 4U task queue and npm script wiring.

## Commands Run

- `npm test -- tests/evidence-lifecycle-rehearsal.test.ts` - RED first, then PASS, 5 tests
- `npm test -- tests/agent-framework.test.ts` - RED first, then PASS
- `npm test -- tests/agent-framework.test.ts tests/evidence-lifecycle-rehearsal.test.ts` - PASS, 8 tests
- `npm run rehearsal:evidence -- --plan` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy
- `GET http://localhost:8080/api-health` - PASS, HTTP 200
- `npm run rehearsal:evidence` - PASS
- `SWIMPAY_EVIDENCE_ID=f4069615-028b-4329-a136-115495bd058c npm run rehearsal:evidence` - PASS

## Blockers

No critical blockers.

## Next Recommended Sprint

Sprint 4V - Evidence operator UI surface and production trust audit drill.

