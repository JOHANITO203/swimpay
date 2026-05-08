# SwimPay Intelligence Source Truth Report

Date: 2026-05-08

## 1. Source Truth Summary

Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_OF_TRUTH.md` as the central enforceable truth for SwimPay Intelligence.

Core truth:
- SwimPay Intelligence is a deterministic Payment Signal Engine.
- It is payment-intent-bound.
- V1 is manual-confirmation-only.
- Public webhooks are final-only.
- Android captures/redacts/signs/uploads only; backend decides; merchant confirms.
- Raw notification data must never be stored or uploaded.

## 2. Tools And Boundaries

Created `.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_BOUNDARIES.md`.

No Android, SDK, feedback, unknown-shape or admin monitoring tool can confirm payment, emit fulfillment webhooks or mutate runtime rules.

## 3. Android Audit Result

Aligned:
- exact supported bank package gate;
- unsupported packages ignored before redaction/outbox;
- redaction before outbox;
- encrypted redacted outbox;
- no SMS/Accessibility/QUERY_ALL_PACKAGES/broad enumeration;
- no Android confirmation;
- no Android developer webhook.

Must-fix:
- non-debug upload transport is currently fail-safe/no-op;
- real runtime hash vocabulary still uses synthetic/debug label.

## 4. Backend Signal Audit Result

Aligned after guardrail fix:
- merchant-bound receiver identity;
- public-key verification;
- signed uploads;
- duplicate `event_id` and `notification_hash` rejection;
- monotonic `local_counter`;
- stale/future production timestamp rejection;
- receiver status eligibility;
- redacted/safe persistence only.

Fixed:
- legacy receiver signal payloads now reject nested raw notification, phone, card and credential fields before normalization.

## 5. Runtime / Payment Intent Audit Result

Aligned:
- no active intent means no review;
- background activity means no review;
- receiver armed and buyer claimed paid do not confirm;
- strong match means manual review only;
- `Matching 100 %` is copy only;
- no active auto-confirm path;
- `payment.confirmed` only after merchant manual confirmation.

## 6. Learning / Monitoring Audit Result

Aligned:
- feedback is supervised/read-only input;
- unknown-shapes are monitoring only;
- no runtime mutation;
- no automatic profile promotion;
- redacted-only retention policy exists.

## 7. Webhook Taxonomy Audit Result

Aligned:
- public fulfillment events: `payment.confirmed`, `payment.rejected`, `payment.expired`;
- internal events remain internal;
- public payloads disclose `confirmation_type=notification_signal` and `official_bank_confirmation=false`;
- SDK parser accepts final public events only.

## 8. SDK / Integration Audit Result

Aligned:
- Node SDK is server-side for order creation and webhook verification.
- Android SDK only opens checkout and parses returns.
- Developer snippets keep secrets server-side and fulfill only after verified `payment.confirmed`.

## 9. Admin / Operator Audit Result

Mostly aligned:
- operator Intelligence evidence is redacted/safe/read-only.
- secrets remain masked/show-once.

Contradiction:
- active admin/template vocabulary still exposes `auto_confirm_allowed_by_template` / `autoConfirmStatus` style terms. Runtime is safe, but operator vocabulary is misleading.

## 10. Contradictions Found

1. Non-debug Android signal upload transport is not wired to staging backend yet.
2. Android real runtime hash vocabulary still uses synthetic/debug label.
3. Admin/template `auto_confirm*` vocabulary remains active in operator/admin API surfaces.
4. Historical reports and stale docs contain older auto-confirm direction; they are superseded by the central source truth.

## 11. Guardrails Added

- `tests/swimpay-intelligence-source-truth.test.ts`.
- New legacy raw payload regression in `apps/api/src/signals.test.ts`.
- Backend fix in `apps/api/src/signals.ts`.

## 12. Must Fix Before Real Notification Tests

1. Wire safe non-debug Android staging upload transport.
2. Rename real Android runtime hash vocabulary away from synthetic/debug labels.
3. Rename/quarantine admin/template auto-confirm vocabulary.
4. Re-run staging signal upload smoke with redacted synthetic envelope before any real capture.

## 13. Can Wait

- Historical `.swimpay-agent` report vocabulary cleanup.
- Full zero-string cleanup of inert schema/template compatibility fields, as long as active operator surfaces are corrected first.
- Future supervised Intelligence learning design.

## 14. Commands Run

- `npx vitest run apps/api/src/signals.test.ts` - failed red test before fix, then passed after fix.
- `npx vitest run tests/swimpay-intelligence-source-truth.test.ts` - failed red test before source-truth docs existed.
- `npx vitest run tests/receiver-intelligence-prod-guardrails.test.ts tests/swimpay-intelligence-source-truth.test.ts apps/api/src/signals.test.ts` - passed after the guardrail fix.
- `npm run android:doctor` - passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm test` - passed, 74 files / 515 tests.
- `npm run build` - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` - passed.
- `git diff --check` - passed; Git reported a line-ending normalization warning for `.swimpay-agent/TASK_QUEUE.md`.

Not run:
- Docker image build/up was not run locally; operator preference is to build on VPS/Dokploy.
- Android Gradle tests/APK build were not run because Android source was not changed in this audit sprint.

## 15. Next Sprint Recommendation

Sprint INTEL-FIX-1: Real-runtime contradiction cleanup before real notification capture.

Scope:
- implement safe non-debug Android staging signal upload transport;
- replace synthetic/debug hash vocabulary in real runtime path;
- rename/quarantine active admin/template auto-confirm vocabulary;
- keep public webhook semantics and manual confirmation unchanged.
