# Recent implementations to code-quality audit report

generated_at: 2026-05-09T11:40:00+03:00

Scope: Android merchant sub-screens, merchant analytics/metrics wiring, Developer Integration Wizard Android flow, Google/account-linking fixes, receiving-method actions, Android icon/safe-area fixes, and the current multi-agent code-quality audit.

This report is a consolidation report. It does not introduce runtime behavior.

## Executive summary

The recent implementation wave moved the Android merchant app from a mostly visual/settings shell toward a more operational merchant surface:

- settings sub-screens are now real routes, not inert menu rows;
- support and confirmation settings have backend contracts;
- language, appearance and app-lock preferences are persisted locally;
- Google is positioned for account recovery/linking, not onboarding identity;
- dashboard cards and compact chart now consume real merchant metrics;
- payment details expose safer score/timeline fields;
- Developer Integration Wizard is available from Android and can generate backend-owned API/webhook credentials;
- receiving methods now have user-facing actions for default/disable/delete/edit flows;
- Android icon assets and developer screen safe-area issues were corrected.

Validation is strong at the local level: root TypeScript, lint, tests, build, compose config, Android unit tests and staging APK build pass when the Android SDK path is injected.

However, the multi-agent audit found several production-hardening blockers before real bank notification capture or staging-prod exposure:

- the signal-worker durable runtime does not yet use the stricter Payment Intent Gate as the final authority;
- some API routes still accept `Bearer test_*` unless every caller opts out;
- prod secrets can fall back to local defaults;
- Android device proof is still not a real Keystore-backed challenge signature;
- Android redaction is not strong enough for real notification text;
- webhook deliveries can remain stuck in `delivering` after worker crash;
- CI is not versioned in the repository.

## Timeline and commit range

Relevant recent commits observed on `main`:

| Commit | Area | Summary |
| --- | --- | --- |
| `c92bdfa` | Android settings + metrics | Implemented Android sub-screens, support/settings backend contracts, theme/language/app lock, bank icons, merchant metrics endpoints and dashboard/review wiring. |
| `575f1c8` | Android UI | Fixed developer integration screen safe-area handling. |
| `cd831b4` | Android Developer Wizard | Added Android Developer Integration Wizard using backend-owned integration contracts. |
| `5fedb0a` | Web Developer Wizard | Completed staging export block on web wizard. |
| `4169bed` | Google/icon | Diagnosed Google recovery and updated Android icon assets. |
| `b67ab2d` | Icon asset | Added Play Store icon asset. |
| `0e3227e` | Icon fix | Switched launcher icon to full-color WebP. |
| `334b285` | Google backend | Hardened Android Google token verification. |
| `9907a40` | Receiving methods | Wired receiving-method actions and soft delete migration. |
| `e2103f1` | Developer Wizard API | Fixed Android developer integration action request bodies. |
| `a5272ec` | Developer export UX | Added copy action to developer integration UI. |
| `bf11d30` | Developer export security | Protected full developer export copy behind device security/app unlock. |

## Implemented surfaces

### 1. Android merchant sub-screens

Source report: `.swimpay-agent/ANDROID_SUBSCREENS_IMPLEMENTATION_REPORT.md`

Implemented screens:

- Centre d'aide;
- Contacter le support;
- Securite;
- Langue;
- Apparence;
- Mode de confirmation.

Key changes:

- Menu rows now navigate to typed sub-screens.
- Help Center is static V1-safe content with search.
- Support form uses a backend ticket endpoint and safe context.
- Security screen was simplified to app lock plus Google account linking.
- Language supports FR/EN/RU from a local persisted preference.
- Appearance supports system/light/dark through premium theme tokens.
- Confirmation mode keeps V1 manual review as active truth and shows IA confirmation as inactive/future direction.
- Five bank icons were added for Sberbank, T-Bank, VTB, Alfa-Bank and Gazprombank.

Backend/API:

- `POST /v1/android-merchant/support-tickets`
- `GET /v1/android-merchant/confirmation-settings`
- `PUT /v1/android-merchant/confirmation-settings`
- migration `012_android_merchant_support_tickets.sql`

Product consequences:

- The Android merchant app now has production-shaped settings surfaces.
- Support is no longer just UI; it persists tickets.
- App lock protects the UI using device-level security.
- Google stays outside onboarding and is used for recovery/linking.

Known quality debt:

- Several older hardcoded Compose strings remain outside full localization.
- App lock currently protects visual access, but audit found network side effects can still run while the UI is locked.
- Google linked state is still partly local UI state and should be refreshed from backend truth.

### 2. Merchant analytics and dashboard metrics

Source report: `.swimpay-agent/MERCHANT_METRICS_WIRING_REPORT.md`

Implemented endpoints:

- `GET /v1/merchant/metrics/summary?range=7d|30d|today`
- `GET /v1/merchant/metrics/timeseries?range=30d&bucket=day`

Android dashboard changes:

- Main blue card renamed from `Paiement suivi` to `Paiements confirmes`.
- Main value is real confirmed amount in RUB from `confirmed_amount_minor`.
- Shortcut cards now map to real counts:
  - `A confirmer` -> `pending_review_count`
  - `Confirmes` -> `confirmed_payment_count`
  - `Rejetes` -> `rejected_payment_count`
  - `Expires` -> `expired_payment_count`
  - `Echecs` -> `failed_count`
  - `Taux` -> `confirmation_rate`
- Compact chart consumes backend timeseries instead of fake data.

Review/payment detail changes:

- expected amount;
- detected amount when available;
- score/matching confidence;
- reason labels;
- short timeline labels.

Product consequences:

- The Android dashboard now communicates real merchant activity instead of decorative numbers.
- The UI remains compact and premium; there was no dashboard redesign.
- Metrics do not create payment decisions, reviews or webhooks.

Known quality debt:

- The audit found `confirmation_rate` semantics should be clarified because it can mix manual confirmations, reviews and webhook failures depending on the data path.
- Metrics need stronger DB indexes before high-volume use.

### 3. Developer Integration Wizard on Android

Source report: `.swimpay-agent/DEVELOPER_INTEGRATION_WIZARD_STAGING_FLOW_REPORT.md`

Implemented capabilities:

- Android can load merchant integration state.
- Android can create an API key.
- Android can rotate an API key.
- Android can rotate a webhook secret.
- Android can save webhook URL.
- Android can trigger a backend-owned test webhook.
- Android can display staging export values for an external app.

Credential model:

- API key and webhook secret are generated by SwimPay backend.
- SDKs consume generated values; SDKs do not generate credentials.
- Raw secret values remain show-once on create/rotate.
- Normal reads return masked values.
- Android/browser snippets do not contain secret keys or webhook secrets.

Recent UX/security improvements:

- The developer screen was adjusted for safe-area/status-bar overlap.
- A copy action was added for developer export data.
- Full export copy now goes through device security/app unlock.

Product consequences:

- A merchant can prepare values to send to a developer for SDK/webhook integration.
- Test webhook remains test-only and cannot fulfill an order.
- Public webhook events remain final-only:
  - `payment.confirmed`
  - `payment.rejected`
  - `payment.expired`

Known quality debt:

- Audit found show-once secrets can remain in Android runtime memory longer than ideal.
- Recommended follow-up: clear raw show-once export after copy, after navigation, or after a short timeout.
- Webhook URL validation needs SSRF hardening before public staging-prod exposure.

### 4. Receiving-method actions

Implemented after user report that buttons were inert.

Changes:

- Buttons now look and behave like actions instead of passive labels.
- Actions wired:
  - modify/edit;
  - disable;
  - set default;
  - delete/soft delete.
- Backend supports soft delete through migration `013_receiving_route_soft_delete.sql`.
- Android sends proper JSON request bodies for action endpoints.

Product consequences:

- Merchant can manage card/phone receiving routes after onboarding.
- Receiving methods become durable settings, not onboarding-only UI.

Known quality debt:

- Audit found default/recommended receiving route updates are not fully protected by DB-level uniqueness/transactional guarantees.
- UI error handling can still be improved: failed mutations may reload state without preserving the draft/error clearly.

### 5. Google recovery and account linking

Implemented/fixed areas:

- Android uses Google Credential Manager to obtain an ID token.
- Backend validates Android Google tokens against configured server client ID.
- Recovery flow and account-linking flow are separated at API level:
  - `googleExchange` for recovery/login;
  - `googleLink` for linking an existing merchant account.

Product consequences:

- Google is now aligned with the product decision: account recovery/linking, not mandatory onboarding identity.

Known quality debt:

- Backend/device identity proof is still too weak because Android device proof is not a Keystore-backed signed challenge.
- Google linked UI state should be read from backend rather than local preference only.

### 6. Android icon and visual polish

Changes:

- Full-color WebP Android icon assets were added/replaced.
- Play Store icon asset was recorded.
- Developer integration screen safe-area issue was fixed.
- Dashboard copy cleanup removed decorative or misleading values such as `Montant/Taux` from the confirmed payments card.

Product consequences:

- Android app identity is closer to the intended three-wave SwimPay visual.
- Developer screen no longer overlaps status/battery/network zones.

Known quality debt:

- Android generated/build artefact tracking needs cleanup if any build report remains under version control.

## Safety boundaries preserved

Across this implementation wave:

- No real bank notification was processed.
- Android still does not confirm payments.
- No auto-confirmation was enabled.
- No `payment.confirmed` semantics were changed.
- No public webhook internal events were added.
- No SMS reading, Accessibility scraping, bank scraping, `QUERY_ALL_PACKAGES` or broad package enumeration was introduced.
- No Android/browser snippet contains private API key or webhook secret.
- Public event disclosure remains:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## Code-quality audit result

The multi-agent audit covered:

- Android app quality;
- backend/API/contracts/migrations;
- Intelligence runtime, webhooks and SDKs;
- tests, docs, CI and deploy hygiene.

### Critical/High findings

1. Signal runtime does not use the stricter Payment Intent Gate.
   - Current durable runtime calls `evaluateSignalMatch` in `apps/signal-worker/src/runtime.ts`.
   - The stricter gate exists in `packages/matching-core/src/index.ts`.
   - Consequence: wrong-bank/wrong-route scenarios may create reviews if amount/currency/window match.

2. Bank app trust context is too broad.
   - Runtime considers a bank profile verified if any signature is verified for that profile.
   - It does not prove the current signal package/cert pair is trusted.

3. API still accepts `Bearer test_*` in some direct routes.
   - `parseMerchantId` defaults to allowing test bearer unless disabled.
   - Some callers still do not pass `allowTestBearer: false` for production paths.

4. Runtime secrets can fall back to dev defaults.
   - `PHONE_HMAC_SECRET` and webhook secret encryption key have local fallbacks.
   - In production, this should fail startup.

5. Android device proof is not cryptographic enough.
   - Current provider stores an install public key in SharedPreferences and hashes key/challenge.
   - Expected hardening: Android Keystore private key + backend challenge + server-side verification.

6. Android notification redaction is not ready for real notification text.
   - It masks amount/phone/reference but not enough person/card variants.
   - Some hashes are based on pre-redaction notification text.

7. Webhook delivery crash recovery gap.
   - `delivering` rows can become stuck if the worker crashes before marking delivered/failed.

8. No versioned CI workflow.
   - Root gates exist and pass locally, but no `.github/workflows` exists to enforce them.

### Medium findings

- `server.ts`, `AndroidMerchantApiWiring.kt`, `PremiumDashboardScreens.kt` and `PremiumMerchantRuntime.kt` are very large and need modular extraction.
- Many tests are static/source-grep or in-memory; useful, but not enough as production proof.
- Migrations are initdb-oriented and need a real runner/version table for existing VPS volumes.
- Public README/CONTRIBUTING still contain legacy auto-confirmation wording.
- Docker build hygiene needs `.dockerignore` and production runners without devDependencies/tests in `dist`.
- Android Gradle gates are not wired into root npm scripts/CI.

## Validation status

Latest local validation performed during code-quality audit:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 75 files, 541 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- `npm run android:doctor` passed.

Android Gradle:

- First run failed because the shell did not expose `ANDROID_HOME` and no `local.properties` existed.
- After injecting `ANDROID_HOME=C:\Users\Lenovo\AppData\Local\Android\Sdk`:
  - `:app:testDebugUnitTest` passed.
  - `:app:assembleStaging` passed.

Git state at audit time:

- `main` was aligned with `origin/main`.
- Working tree was clean before this report was created.

## Operational consequences

The app is better for merchant-facing staging use, but real bank notification capture should remain gated.

Ready for controlled UI/API staging:

- settings screens walkthrough;
- receiving-method management;
- dashboard metric display;
- Developer Integration Wizard generation/copy UX;
- SDK/webhook synthetic rehearsal;
- hosted checkout/manual review/final webhook rehearsal.

Not ready for real notification capture until blockers are fixed:

- Payment Intent Gate is authoritative in runtime;
- wrong-bank/wrong-route tests pass on durable runtime path;
- exact bank package/cert trust is enforced;
- Android device proof is Keystore-backed;
- redaction is strengthened for real text;
- webhook `delivering` recovery is implemented;
- production secrets fail-fast;
- test bearer routes are removed from prod;
- CI enforces root and Android gates.

## Recommended next sprint

Sprint name suggestion:

`sprint HARDEN-REAL-1: production signal and credential hardening`

Priority order:

1. Runtime gate hardening
   - replace or wrap `evaluateSignalMatch` with `evaluatePaymentIntentGate`;
   - add wrong-bank/wrong-route tests on the durable runtime path;
   - enforce package/cert trust for current signal.

2. API production auth hardening
   - default `parseMerchantId` to no test bearer;
   - explicitly allow test bearer only in dev/test routes;
   - enforce API key scopes consistently.

3. Secret and webhook hardening
   - fail-fast on missing prod secrets;
   - harden webhook URL validation against SSRF;
   - recover stale `delivering` webhook rows.

4. Android receiver hardening
   - replace device proof with Android Keystore challenge signing;
   - strengthen redaction and add tests with person/card/reference variants;
   - clear show-once developer secrets after copy/navigation/timeout.

5. CI and deploy hygiene
   - add GitHub Actions for Node + Android + compose config;
   - add migration runner/version table;
   - add `.dockerignore`;
   - exclude tests/devDependencies from production runners.

## Final status

Recent implementation wave: successful for UI/API functionality and local validation.

Quality posture: good engineering momentum, but not yet production-safe for real notification capture.

Decision recommendation: continue with hardening before any real bank notification test.
