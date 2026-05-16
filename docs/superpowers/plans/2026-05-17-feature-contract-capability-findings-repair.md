# Feature Contract Capability Findings Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the review findings across production configuration, Android/backend text integrity, Android connected-site wiring, Android release hardening, and Google web BFF clarity without changing payment semantics.

**Architecture:** Keep SwimPay V1 boundaries intact: Android captures and signs, backend decides, reviews remain manual, public webhooks always disclose `notification_signal` and `official_bank_confirmation=false`. Fixes are intentionally narrow: config validation in infra/tests, text encoding cleanup, Android-facing integration response sourced from existing integration repository, release build hardening, and documentation/report updates.

**Tech Stack:** TypeScript/Fastify/PostgreSQL contracts and API, Docker Compose, Kotlin/Jetpack Compose Android, Gradle/R8, Vitest and Android JVM tests.

---

## File Structure

- `infra/docker-compose.yml`: remove unsafe production defaults for secrets and public URLs; keep local defaults only where safe.
- `.env.example`: document explicit production/staging variables without real secrets.
- `tests/production-config-guardrails.test.ts`: static guardrails for Compose production env defaults.
- `apps/api/src/server.ts`: wire Android connected-site endpoint to existing `MerchantIntegrationRepository`; keep safe fallback if repository is unavailable.
- `apps/api/src/android-merchant.test.ts`: regression tests for connected-site using real integration state and device recovery.
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`: fix mojibake strings and keep Android labels merchant-safe.
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMojibakeGuardrailTest.kt`: fail on replacement/mojibake patterns in active Android premium/runtime source.
- `apps/android-receiver/android/app/build.gradle.kts`: enable release minification/resource shrinking and ProGuard files.
- `apps/android-receiver/android/app/proguard-rules.pro`: Compose/Google/Credential/WorkManager keep rules, no logic weakening.
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidProductionReleaseConfigTest.kt`: assert release is non-debuggable, minified, and remote backend guarded.
- `docs/ANDROID_RELEASE_AND_PRODUCTION_CONFIG.md`: document release/prod variables and Google web BFF state.
- `.swimpay-agent/FEATURE_CONTRACT_CAPABILITY_FINDINGS_REPAIR_REPORT.md`: closeout report.

---

### Task 1: Production Config Guardrails

**Files:**
- Modify: `infra/docker-compose.yml`
- Modify: `.env.example`
- Create: `tests/production-config-guardrails.test.ts`

- [ ] **Step 1: Write static tests for unsafe production defaults**

Add a Vitest file that reads `infra/docker-compose.yml` and asserts that production-sensitive env values do not fall back to local defaults for `DATABASE_URL`, `CHECKOUT_BASE_URL`, `PHONE_HMAC_SECRET`, and `WEBHOOK_SECRET_ENCRYPTION_KEY`.

Run: `npm exec -- vitest run tests/production-config-guardrails.test.ts`
Expected before implementation: FAIL because Compose has local defaults.

- [ ] **Step 2: Update Compose env defaults**

Use required-variable syntax for production-sensitive values:

```yaml
DATABASE_URL: ${DATABASE_URL:?set DATABASE_URL from external secret storage}
CHECKOUT_BASE_URL: ${CHECKOUT_BASE_URL:?set CHECKOUT_BASE_URL to the public checkout URL}
PHONE_HMAC_SECRET: ${PHONE_HMAC_SECRET:?set PHONE_HMAC_SECRET from external secret storage}
WEBHOOK_SECRET_ENCRYPTION_KEY: ${WEBHOOK_SECRET_ENCRYPTION_KEY:?set WEBHOOK_SECRET_ENCRYPTION_KEY from external secret storage}
```

Keep `GOOGLE_*` optional because Android local device recovery works without Google, while Google token recovery reports safe service-unavailable when unconfigured.

- [ ] **Step 3: Run production config tests**

Run: `npm exec -- vitest run tests/production-config-guardrails.test.ts`
Expected: PASS.

---

### Task 2: Mojibake Cleanup and Guardrail

**Files:**
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- Modify: `apps/api/src/server.ts`
- Create: `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMojibakeGuardrailTest.kt`

- [ ] **Step 1: Add Android mojibake guardrail**

Create a JVM/static test that scans active Android premium/runtime Kotlin sources for replacement characters and common mojibake byte-sequence markers by code point, then fails with the file path.

Run: `./gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMojibakeGuardrailTest --console=plain`
Expected before cleanup: FAIL.

- [ ] **Step 2: Replace runtime mojibake strings**

Correct only visible UI strings and safe messages. Examples:

```kotlin
"Paiements à vérifier"
"À vérifier"
"Vérification banque requise"
"Montant à vérifier"
"Signal à vérifier"
"Commande confirmée"
"Signal rejeté"
"Commande rejetée"
"Déjà traité"
"Intégration indisponible"
"Test webhook envoyé"
```

Do not rewrite business states or payment semantics.

- [ ] **Step 3: Run mojibake test**

Run Android targeted test again. Expected: PASS.

---

### Task 3: Android Connected-Site Uses Existing Integration Repository

**Files:**
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/android-merchant.test.ts`

- [ ] **Step 1: Add API regression test**

Add a test that creates/uses an Android mobile session, configures merchant integration through existing repository behavior, then calls `/v1/android-merchant/connected-site` and expects the response to reflect integration state instead of static config.

Run: `npm exec -- vitest run apps/api/src/android-merchant.test.ts -t connected-site`
Expected before implementation: FAIL or show static state.

- [ ] **Step 2: Implement repository-backed connected-site response**

In the endpoint, if `merchantIntegrationRepository` exists, call `getIntegration(merchantId, now)` and map:

- active webhook URL -> `status: active`, `webhook_url_display` populated;
- missing/problem webhook -> `status: problem`, no fake success;
- keep developer details only when `developer_mode=true`;
- preserve `official_bank_confirmation: false`.

- [ ] **Step 3: Run Android merchant API tests**

Run: `npm exec -- vitest run apps/api/src/android-merchant.test.ts`
Expected: PASS.

---

### Task 4: Android Release Hardening

**Files:**
- Modify: `apps/android-receiver/android/app/build.gradle.kts`
- Create/Modify: `apps/android-receiver/android/app/proguard-rules.pro`
- Modify: `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidProductionReleaseConfigTest.kt`

- [ ] **Step 1: Add static test for release minification**

Assert `isMinifyEnabled = true`, `isShrinkResources = true`, `proguardFiles(...)`, and no debug signing in release.

Run: `./gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidProductionReleaseConfigTest --console=plain`
Expected before implementation: FAIL.

- [ ] **Step 2: Enable release hardening**

Set release build type:

```kotlin
isMinifyEnabled = true
isShrinkResources = true
proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
```

Create minimal keep rules for Compose metadata, Google credential models if required, and WorkManager worker constructors.

- [ ] **Step 3: Assemble release**

Run: `npm run android:assemble:release`
Expected: PASS with signed release config.

---

### Task 5: Google Web BFF State and Docs

**Files:**
- Modify: `docs/ANDROID_RELEASE_AND_PRODUCTION_CONFIG.md`
- Create/Modify: `.swimpay-agent/FEATURE_CONTRACT_CAPABILITY_FINDINGS_REPAIR_REPORT.md`

- [ ] **Step 1: Document current Google capabilities**

State clearly:

- Android Google ID-token exchange/linking exists;
- same-device local recovery exists through `device-recover`;
- web BFF `/auth/google/start` and callback remain explicit 501 seams;
- no Google access tokens are stored by Android.

- [ ] **Step 2: Document deployment commands**

Include:

```bash
docker compose -f infra/docker-compose.yml config
npm run android:assemble:release
npm run typecheck -- --pretty false
npm test -- --runInBand
```

Adapt Windows command syntax where relevant.

---

### Task 6: Final Validation

**Files:**
- No code files unless validation exposes a regression.

- [ ] **Step 1: Run targeted backend tests**

Run:

```bash
npm exec -- vitest run tests/production-config-guardrails.test.ts apps/api/src/android-merchant.test.ts packages/contracts/src/android-merchant-auth.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run Android targeted tests**

Run:

```powershell
.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMojibakeGuardrailTest --tests com.swimpay.receiver.AndroidProductionReleaseConfigTest --tests com.swimpay.receiver.AndroidMerchantApiWiringTest --console=plain
```

Expected: PASS.

- [ ] **Step 3: Run global typecheck**

Run: `npm run typecheck -- --pretty false`
Expected: PASS.

- [ ] **Step 4: Build APK**

Run: `npm run android:assemble:release`
Expected: PASS.

---

## Self-Review

- Spec coverage: all review findings are mapped to tasks: production config, mojibake, connected-site repository wiring, release hardening, Google web BFF clarity, validation.
- Product truth: no task changes payment state machine semantics, receiver runtime decisions, raw notification handling, or webhook confirmation claims.
- No placeholders: each task has explicit files, commands and expected outcomes.
