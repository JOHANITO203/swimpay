# Sprint 4V Report - Evidence Operator UI Surface and Production Trust Audit Drill

status: PASS
generated_at: 2026-05-03T12:59:29+03:00

## Scope

Sprint 4V added a minimal read-only operator UI surface for evidence review and production trust audit drill visibility.

No real bank notifications were processed. No installed-app enumeration was added. No production trust was requested or approved by the UI. Auto-confirmation remains disabled.

## Tasks Created

1. `217_evidence_operator_web_surface`
2. `218_evidence_web_dashboard_data_model`
3. `219_production_trust_audit_drill_surface`
4. `220_evidence_operator_ui_safety_copy`
5. `221_evidence_operator_ui_tests`
6. `222_live_operator_ui_rehearsal`
7. `223_sprint_4v_validation`
8. `224_sprint_4v_closeout_review`

## Tasks Completed

All Sprint 4V tasks are completed.

## Operator UI Surface

Added `GET /admin/evidence-review` to `swimpay-web`.

The page renders:

- evidence status counts;
- pending review queue;
- recent evidence rows;
- redacted evidence audit traces;
- production trust audit drill rows;
- explicit `trusted=false` and `auto_confirm_enabled=false` safety state.

The page has a safe unavailable state if the admin API cannot be reached.

## Production Trust Audit Drill

The UI displays production trust request audit traces, but it is read-only. It does not request, approve or revoke production trust.

Production trust remains API/admin protected and requires dual-control. Review-only evidence remains separate from production trust.

## Redaction and Safety

The web renderer defensively avoids rendering:

- full certificate hashes;
- raw phone numbers;
- raw notification text;
- raw title/body;
- admin tokens;
- secrets, API keys or private keys.

Forbidden official bank confirmation wording was not added.

## Tests Added

Added `apps/web/src/evidence-admin.test.ts` covering:

- redacted dashboard rendering;
- redacted audit trace rendering;
- safe unavailable state;
- no full certificate hash;
- no raw phone;
- no raw notification text;
- no official bank confirmation wording;
- no `auto_confirm_enabled=true`.

Updated `tests/agent-framework.test.ts` for Sprint 4V task queue ordering.

## Commands Run

- `npm test -- apps/web/src/evidence-admin.test.ts` - RED first, then PASS, 2 tests
- `npm test -- tests/agent-framework.test.ts` - RED first, then PASS
- `npm test -- tests/agent-framework.test.ts apps/web/src/evidence-admin.test.ts` - PASS, 6 tests
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 37 files and 279 tests
- `npm run build` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS
- `npm run android:doctor` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-web proxy` - PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy
- `GET http://localhost:8080/api-health` - PASS, HTTP 200
- `GET http://localhost:8080/admin/evidence-review` - PASS, HTTP 200
- Web page safety spot checks for full cert hash, raw phone, raw notification text and `auto_confirm_enabled=true` - PASS
- `npm run rehearsal:evidence` - PASS

## Blockers

No critical blockers.

Known non-critical limitations remain:

- the UI is read-only and does not implement operator actions;
- production trust dual-operator approval is still exercised through API/CLI rehearsal, not through web forms;
- real bank notifications remain out of scope.

## Next Recommended Sprint

Sprint 4W - Evidence production trust dual-operator rehearsal and operator handoff.
