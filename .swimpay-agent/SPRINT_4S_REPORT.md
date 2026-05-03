# Sprint 4S Report - Operator Review UX and Evidence Lifecycle Hardening

status: PASS
generated_at: 2026-05-03T12:20:25+03:00

## Scope

Sprint 4S hardened the backend/admin bank evidence review workflow before any real bank notification testing.

No real bank notifications were processed. No installed-app enumeration was added. No production trust was requested or approved. Auto-confirmation remains disabled.

## Tasks Created

1. `196_evidence_operator_review_dashboard_model`
2. `197_evidence_duplicate_and_latest_status_model`
3. `198_evidence_deprecation_and_cleanup_policy`
4. `199_evidence_review_action_reasons`
5. `200_evidence_admin_filtering_and_search`
6. `201_evidence_lifecycle_tests`
7. `202_sprint_4s_closeout_review`

## Tasks Completed

All Sprint 4S tasks are completed.

## Operator Review Dashboard Model

Admin evidence DTOs now include `submitted_at`, `production_trust_status`, masked certificate hash, review metadata and explicit safety flags. Full certificate hashes, raw phone and notification text are not exposed.

## Duplicate And Latest Evidence Behavior

Exact duplicate evidence is idempotent and returns the existing evidence with `duplicate: true` and `duplicate_of`. Duplicate submissions do not create another evidence row or audit event.

A changed certificate for the same package creates a new `pending_operator_review` evidence row requiring operator review.

## Deprecation And Cleanup Behavior

Added `POST /v1/admin/bank-evidence/:id/deprecate`.

Deprecation is non-destructive. It marks evidence `deprecated`, stores reviewed metadata, writes `bank_evidence.deprecated`, and keeps `trusted: false` and `auto_confirm_enabled: false`. Deprecated evidence cannot request production trust.

## Review Reason Behavior

Review actions now accept explicit `reason_code` plus optional redacted `notes`.

Allowed reason codes: `package_verified_for_review_only`, `cert_matches_operator_expectation`, `package_not_expected`, `cert_changed`, `stale_evidence`, `duplicate_evidence`, `insufficient_evidence`, `synthetic_test_only`, `other`.

Invalid reason codes are rejected. Legacy `reason` remains accepted as redacted `other` for local compatibility.

## Filtering And Search Behavior

`GET /v1/admin/bank-evidence` now supports `status`, `bank_profile_id`, `package_name`, `source`, `submitted_after`, `submitted_before` and `limit`.

Filters are exact metadata filters only. They do not enumerate installed apps and do not expose raw PII.

## Tests Added

Added or updated tests for idempotent duplicates, changed certificate rows, dashboard DTO fields, coded review reasons, invalid reason rejection, deprecate action/audit, deprecated production-trust blocking, admin filtering and Sprint 4S queue ordering.

## Commands Run

- `npm run android:doctor` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test -- apps/api/src/bank-evidence.test.ts` - RED first, then PASS with 16 tests
- `npm test` - PASS, 35 files, 270 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy
- `GET http://localhost:8080/api-health` - PASS, HTTP 200

Android Gradle validation was not run because Sprint 4S did not touch Android code.

## Blockers

No critical blockers.

## Next Recommended Sprint

Sprint 4T - Evidence lifecycle UI/API rehearsal and admin audit visibility.
