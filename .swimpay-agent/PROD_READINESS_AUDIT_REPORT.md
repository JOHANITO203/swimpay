# Production Readiness Audit Report

generated_at: 2026-05-06

## Executive Summary

Sprint audit-only result: SwimPay is architecturally aligned with the final direction in the core payment-intent-bound Intelligence areas, but SDK and production launch surfaces are not ready yet.

No product behavior, backend API, payment logic, Android notification processing or tests were intentionally changed in this audit.

## 1. SDK Web

Status: partially ready.

The API, checkout and webhook primitives exist. A packaged production SDK does not. The biggest gaps are production merchant auth, exported webhook verifier helpers, typed errors, idempotency helper ergonomics and a clean server-side quickstart.

Report: `.swimpay-agent/SDK_WEB_AUDIT.md`

## 2. SDK Android

Status: missing as an SDK.

The Android Receiver app exists, but this is not the merchant Android SDK. V1 still needs a small Android integration guide/helper that opens `checkout_url`, handles return/deep-link flow, and clearly states the secret key never belongs in the APK.

Report: `.swimpay-agent/SDK_ANDROID_AUDIT.md`

## 3. Developer Integration Wizard

Status: prototype.

Connected-site and admin surfaces exist, but a production Web/Android-only wizard with key creation, webhook secret lifecycle, snippets, test webhook and delivery history is missing.

Report: `.swimpay-agent/DEVELOPER_INTEGRATION_WIZARD_AUDIT.md`

## 4. Receiver / Intelligence

Status: partially ready.

The Sprint 8A/8B work is preserved and valuable: deterministic agent, Bank Target Lock, privacy firewall, shape hashing, static profiles, parser/classifier, Payment Intent Gate, passive feedback and unknown shape monitoring exist. Remaining readiness gaps are production receiver keying, real multi-bank shadow validation, retention policy and stale auto-confirm docs/tests.

Report: `.swimpay-agent/RECEIVER_INTELLIGENCE_PROD_AUDIT.md`

## 5. Secondary Hydration

Status: mixed.

Android premium surfaces are healthier and use local/system state well. Web merchant surfaces remain prototype/static in places. Ventes still needs a live summary contract later.

Report: `.swimpay-agent/SECONDARY_SURFACES_HYDRATION_AUDIT.md`

## 6. Product Truth Contradictions

Status: important cleanup required before SDK docs.

Primary contradictions are stale docs/tests around:

- auto-confirmation as V1 behavior;
- `payment.signal_detected` / `payment.needs_review` public webhooks;
- `auto_confirm: true` order examples;
- old receiver arming semantics;
- future auto-confirm metrics/templates not clearly labeled future-only.

Report: `.swimpay-agent/PRODUCT_TRUTH_CONTRADICTION_AUDIT.md`

## 7. VPS Readiness

Status: partially ready.

Compose is compact and plausible for a 4 GB VPS, with memory limits, healthchecks and log rotation. Production env, HTTPS, backups, restore drill, monitoring, retention and migration runbook need hardening.

Report: `.swimpay-agent/VPS_PRODUCTION_READINESS_AUDIT.md`

## Recommended Implementation Order

1. Product truth cleanup sprint: docs/tests/event taxonomy, public vs internal webhook split, no auto-confirm V1.
2. SDK Web production sprint: Node helper, webhook verifier, examples, idempotency, production auth boundary.
3. SDK Android integration sprint: checkout URL opener, return/deep-link docs, no-secret-in-APK guardrails.
4. Developer wizard sprint: Web/Android-only wizard, key/secret lifecycle and snippets.
5. Receiver production hardening sprint: device key lifecycle, raw-data kill switch verification, outbox/security checks.
6. VPS operations sprint: env, HTTPS, backup/restore, migration, monitoring and retention.

## Blockers

- No packaged Web SDK.
- No merchant Android SDK/helper.
- Production merchant auth still appears local/dev in key API routes.
- Public webhook taxonomy conflicts with final manual-confirm-only direction.
- Production VPS lacks backup/restore/HTTPS/env hardening.

## Validation Results

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- Android `:app:testDebugUnitTest` after setting `ANDROID_HOME` and `ANDROID_SDK_ROOT` to the local SDK path.
- Android `:app:assembleDebug` after setting `ANDROID_HOME` and `ANDROID_SDK_ROOT` to the local SDK path.
- Device install, launch and UIAutomator dump through ADB transport id `2`.

Blocked / not live:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` returned no running services.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` failed with connection refused because the Compose stack was not running.

Notes:

- A first Gradle attempt from the repository root failed because the root is not a Gradle build; the command was rerun from `apps/android-receiver/android`.
- A second Gradle attempt failed until `ANDROID_HOME` and `ANDROID_SDK_ROOT` were set to `C:\Users\Lenovo\AppData\Local\Android\Sdk`.
