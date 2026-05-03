# Sprint 4O Report - Bank Evidence Production Trust Policy

generated_at: 2026-05-03T10:55:00+03:00

status: PASS

## Tasks Created

- `tasks/169_bank_evidence_production_trust_policy.md`
- `tasks/170_bank_evidence_trust_state_machine.md`
- `tasks/171_admin_production_trust_permission_model.md`
- `tasks/172_trust_transition_audit_and_dual_control.md`
- `tasks/173_trust_policy_tests.md`
- `tasks/174_bank_trust_policy_docs.md`
- `tasks/175_sprint_4o_closeout_review.md`

## Tasks Completed

- Added production trust policy model and transition guards.
- Added evidence statuses `production_trust_requested`, `production_trust_approved` and `production_trust_revoked`.
- Added additive migration `005_bank_evidence_production_trust_policy.sql`.
- Added explicit RBAC permissions and admin endpoints.
- Added dual-control guard so requester cannot approve the same trust request.
- Added redacted production trust audit events.
- Added tests and policy documentation.

## Production Trust Policy Behavior

Production trust requires:

- concrete `package_name`;
- concrete `cert_sha256`;
- source `android_packagemanager`;
- evidence already approved as `approved_for_review_only`;
- production trust request;
- second-actor approval.

Blocked:

- `TO_VERIFY`;
- `synthetic_debug_only`;
- rejected/deprecated/pending evidence;
- non-PackageManager evidence.

Production trust means verified app metadata only. It does not confirm payment and does not enable auto-confirmation.

## Trust State Machine

Allowed path:

```text
pending_operator_review
-> approved_for_review_only
-> production_trust_requested
-> production_trust_approved
```

Revocation:

```text
production_trust_approved -> production_trust_revoked
```

Direct `pending_operator_review -> production_trust_approved` is blocked.

## RBAC / Permission Behavior

Added permissions:

- `request_bank_evidence_production_trust`
- `approve_bank_evidence_production_trust`
- `revoke_bank_evidence_production_trust`

Owner/admin roles have these permissions. Normal operator, support and read-only roles cannot approve production trust.

## Dual-control Decision

Dual-control is implemented.

The actor who requests production trust cannot approve the same evidence. Approval must come from a different owner/admin actor.

## Audit Behavior

Added audit events:

- `bank_evidence.production_trust_requested`
- `bank_evidence.production_trust_approved`
- `bank_evidence.production_trust_revoked`

Audit payloads include masked certificate hash and redacted reason. They keep `trusted: false` and `auto_confirm_enabled: false`.

## Tests

Added tests for:

- safe production trust request from review-only evidence;
- blocked `TO_VERIFY`;
- blocked `synthetic_debug_only`;
- blocked rejected/pending evidence;
- direct pending-to-approved blocking;
- dual-control;
- RBAC denial for non-admin roles;
- approval and revocation;
- audit events;
- no raw PII exposure;
- docs/task queue guardrails.

## Commands Run

- `npm run android:doctor` - PASS.
- `npm run typecheck` - PASS.
- `npm run lint` - PASS.
- `npm test -- apps/api/src/bank-evidence.test.ts` - PASS after implementation. Initial red run failed with missing production trust endpoints as expected.
- `npm test -- apps/api/src/bank-evidence.test.ts tests/agent-framework.test.ts apps/android-receiver/src/android-runnable-app.test.ts` - PASS.
- `npm test` - PASS, 35 test files and 264 tests.
- `npm run build` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` - PASS, services healthy.
- Applied `packages/database/migrations/005_bank_evidence_production_trust_policy.sql` to local Postgres - PASS.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api proxy` - PASS.
- `GET http://localhost:8080/api-health` - PASS with database, NATS and Valkey reported `ok`.

Android Gradle commands were not run in Sprint 4O because Android runtime code was not changed.

## Safety

- No real bank evidence collected.
- No real bank notification processed.
- No real customer data used.
- No installed-app enumeration.
- No SMS reading.
- No bank app scraping.
- No Android payment confirmation.
- No Android auto-confirmation.
- No raw phone stored/uploaded.
- No raw notification text stored/uploaded.
- No official bank confirmation claim.
- No auto-confirmation enabled.

## Blockers

No critical blockers.

Non-critical limitation: future production rollout still needs a human operating procedure for real-world evidence collection and identity/account controls beyond local dev-token auth.

## Next Recommended Sprint

Sprint 4P - Real bank evidence collection dry-run planning.

Recommended focus:

1. Define operator-controlled package-name selection for one real bank app without installed-app enumeration.
2. Keep real bank notifications out of scope.
3. Exercise evidence collection only after explicit user/operator consent.
4. Keep production trust and auto-confirmation disabled until full operational approval.
