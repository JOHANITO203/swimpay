# CR-3 Product Truth Contradiction Neutralization

generated_at: 2026-05-07T15:35:00+03:00

## Verdict

Active V1 product-truth contradictions found after CR-2 were neutralized in runtime, contracts, public webhook/event constants, checkout status mapping, review queries, active merchant/operator docs, and guardrail tests.

SwimPay V1 now routes strong notification matches to manual merchant review. `Matching 100 %` remains review copy only. Android/receiver signal processing does not confirm orders, and the signal runtime no longer requests public signal/review webhooks.

## Runtime neutralization

- Removed `auto_confirmed` from active matching decisions.
- Removed `auto_confirmed` from public contract status lists.
- Removed active signal-worker auto-confirm and direct webhook request repository methods.
- Removed active runtime webhook event construction for signal/review paths.
- Updated review queries to treat only `manual_confirmed` as confirmed.
- Updated checkout state mapping so success only follows `manual_confirmed` or `fulfilled`.
- Removed `DECISION_AUTO_CONFIRMED` and `signals_auto_confirmed_total` from public constants/metrics.

## Documentation neutralization

Updated active docs and operator-facing files so they no longer present public review/signal webhook events or auto-confirm as V1 runtime behavior:

- `AGENTS.md`
- `docs/04_SERVICES_SPEC.md`
- `docs/05_DATABASE_SCHEMA.md`
- `docs/07_EVENT_CATALOG.md`
- `docs/10_MATCHING_AND_SCORING.md`
- `docs/19_BANK_PROFILES_V1.md`
- `docs/24_ORDER_AND_SESSION_STATE_MACHINES.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `docs/PRIVATE_BETA_OPERATOR_RUNBOOK.md`
- `docs/PRIVATE_BETA_READINESS.md`
- `docs/REAL_NOTIFICATION_SHADOW_DRY_RUN.md`
- `docs/RUNTIME_OBSERVABILITY.md`

## Tests and guardrails

Added `tests/product-truth-runtime-neutralization.test.ts` to enforce:

- no active runtime `autoConfirm(` execution path;
- no active `auto_confirmed` runtime/contract state;
- no public `payment.signal_detected` or `payment.needs_review` fulfillment webhook docs in active surfaces;
- no `official_bank_confirmation = true` claim.

Updated runtime, E2E, checkout, foundation and private-beta tests to expect manual review, not auto-confirmation.

## Remaining inert legacy naming

Some internal historical/configuration names such as `auto_confirm_enabled=false`, bank-template candidate flags and negative reason codes remain as disabled guardrails or schema compatibility fields. They are not active V1 confirmation behavior and validation proves they do not create confirmation or public fulfillment webhooks.

Recommended follow-up if a zero-string cleanup is desired: a dedicated schema/template vocabulary migration to rename inert `auto_confirm*` fields to `manual_review_policy*` or `confirmation_disabled_v1*`, with migration/backward-compatibility planning.

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` (70 files, 491 tests)
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

Blocked:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`

Reason: Docker Desktop Linux engine pipe was unavailable in this shell: `//./pipe/dockerDesktopLinuxEngine`. API health was unreachable because the local Compose stack was not reachable.

## Next recommendation

Run CR-4: inert legacy vocabulary/schema cleanup only if the team wants to remove all remaining `auto_confirm*` strings from schema, fixtures and template internals. Otherwise proceed to Android Receiver real-runtime staging smoke, still without real bank notifications until explicit consent.
