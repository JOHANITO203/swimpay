# Sprint 9H - Receiver / Intelligence Production Hardening Report

Date: 2026-05-07

## 1. Inventory Result

Created `.swimpay-agent/RECEIVER_INTELLIGENCE_PROD_INVENTORY.md`.

Findings:

- Receiver/Intelligence architecture is aligned with the final product truth.
- Payment Intent Gate is already strong for V1 core behavior.
- Feedback and unknown-shape monitoring are durable, passive and read-only.
- Gaps found and addressed in this sprint:
  - production receiver routes accepted local `test_*` bearer seams;
  - heartbeat lacked bank-target and richer operational states;
  - production signal upload lacked clock tolerance rejection;
  - upload eligibility did not explicitly list newer action-required states;
  - retention policy hooks were missing.

## 2. Receiver Key Lifecycle Hardening

- Preserved the current receiver public-key registration model.
- Registration response still never exposes receiver public key or private material.
- Production registration now requires an authenticated merchant context and rejects local `Bearer test_*` fallback.
- Full asymmetric rotation remains a documented future hardening path; no unsafe rotation shortcut was added.

## 3. Receiver Registration / Session Hardening

- Hardened receiver registration and heartbeat auth boundary in production.
- Added/used production-safe operational states:
  - `inactive`
  - `needs_reconnect`
  - `notification_access_missing`
  - `bank_targets_missing`
  - `force_review_local`
- Heartbeat now derives `notification_access_missing`, `needs_reconnect`, `bank_targets_missing` and `force_review_local`.
- Added `bank_targets_missing` warning and `configure_bank_targets` required action.

## 4. Signal Upload / Outbox Hardening

- Signal upload eligibility now only allows:
  - `pending`
  - `active`
  - `degraded`
  - `force_review_local`
- Explicitly rejects inactive/reconnect/access-missing/bank-target-missing/revoked/suspended/disabled receiver states.
- Production signal upload now rejects stale/future `observed_at` values outside a 15-minute server clock tolerance before ingestion.
- Existing duplicate `event_id`, duplicate `notification_hash`, monotonic `local_counter`, signature validation and redacted-only upload protections were preserved.

## 5. Payment-Intent Runtime Safety

- Existing Payment Intent Gate behavior was preserved:
  - no active payment intent creates no merchant payment review;
  - negative categories create no review;
  - unknown/background-only activity creates no review;
  - `Matching 100 %` remains manual-review-only;
  - auto-confirm remains disabled for this path.
- Added five-bank intent-bound fixture validation across Sberbank, T-Bank, VTB, Alfa-Bank and Gazprombank.

## 6. Five-Bank Fixture Validation

Added matrix coverage for all five V1 banks:

- strong active-intent match;
- no active intent;
- negative outgoing activity;
- amount-only cautious review;
- display amount mismatch vs reconciliation amount;
- late payment candidate.

Synthetic/redacted fixtures only. No real notification text or customer data.

## 7. Receiver Health States

- Backend heartbeat now supports action-oriented states instead of generic degraded-only behavior.
- Added contract warning `bank_targets_missing`.
- Updated docs to list production operational states and required actions.
- Health responses remain merchant-safe and do not expose HMACs, package/cert internals, raw notification text, webhook secrets, raw phone or raw card.

## 8. Retention Policy Hooks

Created `docs/INTELLIGENCE_RETENTION_POLICY.md`.

Policy covers:

- feedback retention window;
- unknown-shape retention window;
- redacted-only export boundary;
- non-destructive cleanup hook;
- operator metrics;
- no raw notification/PII retention;
- no runtime rule mutation;
- no profile promotion from feedback or unknown shapes.

## 9. Guardrails

Added `tests/receiver-intelligence-prod-guardrails.test.ts` covering:

- no SMS permission;
- no Accessibility service;
- no `QUERY_ALL_PACKAGES`;
- no broad installed-app enumeration;
- Android Receiver remains NotificationListener-based;
- no raw notification storage/upload flags;
- no official bank confirmation claim;
- no runtime rule mutation or profile promotion;
- Android does not confirm orders or send developer webhooks.

## 10. Commands Run

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

Docker live validation passed after Docker restart:

- `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env.example -f infra/docker-compose.yml build swimpay-api swimpay-web swimpay-signal-worker swimpay-job-worker proxy`
  - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --no-build`
  - passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
  - passed; API, web, signal worker, job worker, Postgres, NATS and Valkey are healthy; proxy is running.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`
  - passed; database, NATS and Valkey report `ok`.

## 11. Device QA

Passed on connected device:

- local SDK ADB detected `R5CWA0FEPZW` / Samsung `SM-S916B`;
- APK installed with `adb install -r`;
- app launched with `am start -n com.swimpay.receiver/.MainActivity`;
- UIAutomator dump succeeded and showed the premium merchant shell with `Accueil`, `Revue`, `Ventes`, `Menu`.

## 12. Blockers

Critical code blocker: none found.

Environment blocker: none current after Docker restart. Local Docker remains sensitive to parallel BuildKit pressure, so sequential Compose builds remain the recommended local validation path.

## 13. Next Sprint Recommendation

Sprint 9I should run a live backend receiver hardening smoke:

- receiver registration production-auth behavior in live API;
- signed signal upload stale timestamp rejection in live API;
- Android receiver heartbeat state display against backend.
