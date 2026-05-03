# Sprint 4T Report - Evidence Lifecycle UI/API Rehearsal and Admin Audit Visibility

status: PASS
generated_at: 2026-05-03T12:35:24+03:00

## Scope

Sprint 4T rehearsed the operator evidence lifecycle API surface and admin audit visibility for bank package/certificate evidence.

No real bank notifications were processed. No installed-app enumeration was added. No production trust was requested or approved. Auto-confirmation remains disabled.

## Tasks Created

1. `203_evidence_review_dashboard_api`
2. `204_evidence_audit_trace_filters`
3. `205_evidence_lifecycle_rehearsal_runbook`
4. `206_evidence_review_action_safety_copy`
5. `207_evidence_lifecycle_ui_api_tests`
6. `208_sprint_4t_validation_rehearsal`
7. `209_sprint_4t_closeout_review`

## Tasks Completed

All Sprint 4T tasks are completed.

## Evidence Review Dashboard API

Added `GET /v1/admin/bank-evidence/review-dashboard`.

The endpoint requires `view_bank_templates` and returns:

- `total_count`
- `counts_by_status`
- `review_queue`
- `recent_evidence`
- `next_actions`
- explicit safety flags

Certificate hashes remain masked. Responses keep `trusted: false`, `production_trust_requested: false` and `auto_confirm_enabled: false`.

## Admin Audit Visibility

Extended `GET /v1/admin/audit-events` with evidence-friendly filters:

- `object_id`
- `actor_id`
- `created_after`
- `created_before`

Existing `event_type`, `object_type` and `limit` filters remain supported. Postgres and in-memory repositories use the same semantics.

## Runbook And Safety Copy

Created `docs/BANK_EVIDENCE_LIFECYCLE_REHEARSAL.md` and updated the operator runbook with dashboard and audit trace examples.

The documentation reiterates that review-only evidence is not production trust, does not enable auto-confirmation and does not represent official bank confirmation.

## Tests Added

Added tests for:

- safe evidence review dashboard summary;
- dashboard status counts and next actions;
- masked certificate/no raw PII in dashboard responses;
- evidence audit filtering by object id, actor id and created date;
- Sprint 4T task queue ordering.

## Commands Run

- `npm test -- apps/api/src/bank-evidence.test.ts apps/api/src/admin.test.ts` - PASS, 33 tests
- `npm test -- tests/agent-framework.test.ts` - PASS, 4 tests
- `npm run android:doctor` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 35 files, 272 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy
- `GET http://localhost:8080/api-health` - PASS, HTTP 200

Android Gradle validation was not run because Sprint 4T did not touch Android code.

## Blockers

No critical blockers.

## Next Recommended Sprint

Sprint 4U - Operator evidence review UI rehearsal and production trust dry-run guard validation.

