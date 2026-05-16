# SwimPay Ready-To-Sell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current validated SwimPay staging base into a private-beta sellable package without adding new features or changing V1 payment semantics.

**Architecture:** Keep the current compact V1 architecture: Android captures/redacts/signs, backend decides, merchant confirms manually, public webhooks are final-only. The work is release readiness, device smoke, distribution, and pilot packaging.

**Tech Stack:** Android Gradle/Compose, Fastify API, Docker Compose/Dokploy, PostgreSQL/Valkey/NATS, landing app, GitHub Actions, Vitest/JVM tests.

---

## Files And Responsibilities

- `.swimpay-agent/SWIMPAY_READY_TO_SELL_AUDIT.md`: source checklist and readiness status.
- `.swimpay-agent/BLOCKERS.md`: only true beta blockers after smoke testing.
- `.swimpay-agent/NEXT_ACTION.md`: one next action at a time.
- `.swimpay-agent/TASK_QUEUE.md`: beta-readiness queue.
- `docs/ANDROID_RELEASE_AND_PRODUCTION_CONFIG.md`: release variable contract.
- `docs/PRODUCTION_ENVIRONMENT.md`: VPS/Dokploy/domain contract.
- `apps/android-receiver/android/app/build.gradle.kts`: release/staging build validation, no product logic changes unless a build gate is wrong.
- `apps/landing`: APK download CTA and public landing distribution path.

---

### Task 1: GitHub CI Green Gate

**Files:**
- Inspect: `.github/workflows/ci.yml`
- Inspect: `apps/android-receiver/src/android-runnable-app.test.ts`
- Inspect: Android JVM test reports if CI fails

- [ ] **Step 1: Push the current CI alignment patch**

Run:

```bash
git status --short
git add .github/workflows/ci.yml apps/android-receiver/src/android-runnable-app.test.ts apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumOnboardingFullFlowTest.kt apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumLocalizedCopy.kt
git commit -m "ci: align release readiness validation"
git push
```

Expected: GitHub Actions starts a new run.

- [ ] **Step 2: Verify checks**

Expected checks:

```text
Root npm validation
Docker Compose config
Android receiver validation
```

If one fails, download logs and fix only the root cause.

---

### Task 2: Clean Staging APK Device Smoke

**Files:**
- Runtime APK output: `apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk`
- Report: `.swimpay-agent/READY_TO_SELL_DEVICE_SMOKE.md`

- [ ] **Step 1: Build staging APK**

Run:

```bash
npm run android:assemble:staging
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 2: Install on connected device**

Run:

```bash
adb devices
adb install -r apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk
adb shell monkey -p com.swimpay.receiver 1
```

Expected: app opens without crash.

- [ ] **Step 3: Run account smoke manually**

Manual checks:

```text
Create account -> onboarding opens.
Complete onboarding with Configurer plus tard.
Force-stop app.
Relaunch -> session restores.
Sign out.
Relaunch -> account entry appears.
Se connecter restores account.
Google link/recovery works only after explicit link.
```

- [ ] **Step 4: Record result**

Create `.swimpay-agent/READY_TO_SELL_DEVICE_SMOKE.md` with:

```markdown
# Ready-To-Sell Device Smoke

generated_at: 2026-05-17T00:00:00+03:00

## Device

- model:
- connection:
- APK:

## Result

- create account:
- onboarding:
- session restore:
- signout:
- reconnect:
- Google link/recovery:

## Blockers

- none / list exact issue
```

---

### Task 3: Receiving Methods Smoke

**Files:**
- Android screen: `PremiumReceivingMethodsStateScreen`
- Backend endpoints: existing receiving-method repository/API
- Report: `.swimpay-agent/READY_TO_SELL_RECEIVING_METHODS_SMOKE.md`

- [ ] **Step 1: Add/edit/delete on device**

Manual checks:

```text
Add card.
Add phone/SBP-labeled destination.
Edit/replace card.
Edit/replace phone.
Disable method.
Delete method.
Pull to refresh/reopen screen and verify backend state persists.
```

- [ ] **Step 2: Confirm no raw display**

Expected:

```text
Saved destination is masked.
Raw full card/phone is not displayed after save.
```

- [ ] **Step 3: Record blocker only if action is visibly wired but backend state does not change**

Do not create new receiving-method features.

---

### Task 4: Checkout To Review To Webhook Rehearsal

**Files:**
- SDK docs: `docs/SDK_DEVELOPER_INTEGRATION_GUIDE.md`
- API tests: `apps/api/src/*`
- Webhook worker tests: `apps/job-worker/src/*`
- Report: `.swimpay-agent/READY_TO_SELL_CHECKOUT_WEBHOOK_SMOKE.md`

- [ ] **Step 1: Prepare merchant test integration**

Required values outside git:

```text
SWIMPAY_API_BASE_URL=https://www.swimpay.pro
SWIMPAY_SECRET_KEY=sk_...
SWIMPAY_WEBHOOK_SECRET=whsec_...
SWIMPAY_WEBHOOK_URL=https://your-test-backend.example/webhooks/swimpay
```

- [ ] **Step 2: Create order**

Use the existing SDK/API order creation flow.

Expected:

```text
checkout_url is returned.
checkout_url uses the intended public checkout host.
```

- [ ] **Step 3: Complete buyer flow**

Expected:

```text
Checkout shows exact instructions.
J'ai payé does not confirm.
Review appears for merchant after signal/fallback.
```

- [ ] **Step 4: Manual confirm and webhook proof**

Expected webhook body includes:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

Do not accept a fulfillment path that triggers before manual confirmation.

---

### Task 5: Signed Release APK

**Files:**
- `docs/ANDROID_RELEASE_AND_PRODUCTION_CONFIG.md`
- `apps/android-receiver/android/app/build.gradle.kts`
- APK output: `apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk`

- [ ] **Step 1: Load release variables outside git**

Required:

```powershell
$env:SWIMPAY_ANDROID_PRODUCTION_BACKEND_BASE_URL="https://staging.swimpay.pro"
$env:SWIMPAY_ANDROID_PRODUCTION_GOOGLE_SERVER_CLIENT_ID="<validated-google-client-id>"
$env:SWIMPAY_ANDROID_RELEASE_STORE_FILE="<absolute-path-to-jks>"
$env:SWIMPAY_ANDROID_RELEASE_STORE_PASSWORD="<secret>"
$env:SWIMPAY_ANDROID_RELEASE_KEY_ALIAS="<alias>"
$env:SWIMPAY_ANDROID_RELEASE_KEY_PASSWORD="<secret>"
```

- [ ] **Step 2: Build release**

Run:

```bash
npm run android:assemble:release
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Install release once**

Run:

```bash
adb install -r apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.swimpay.receiver 1
```

Expected: app opens and points to HTTPS backend.

---

### Task 6: Landing Download Handoff

**Files:**
- `apps/landing`
- public/download artifact location configured in deployment
- Report: `.swimpay-agent/READY_TO_SELL_LANDING_DOWNLOAD_SMOKE.md`

- [ ] **Step 1: Place intended APK at the landing download target**

Use the signed release APK when available. If still in controlled private beta, clearly label a staging APK as staging/private-beta.

- [ ] **Step 2: Test public landing**

Open:

```text
https://www.swimpay.pro
```

Expected:

```text
Landing loads.
Download CTA downloads the intended APK.
FR/EN/RU have no mojibake.
```

---

### Task 7: First Pilot Package

**Files:**
- Create: `.swimpay-agent/PILOT_MERCHANT_PACKAGE.md`

- [ ] **Step 1: Write pilot terms**

Use:

```markdown
# SwimPay Private Beta Pilot

## Promise

SwimPay helps you track received payments, review payments that need confirmation, and update your site/app after manual validation.

## Boundaries

- Manual confirmation only.
- No official bank confirmation claim.
- One Android merchant device.
- One site/app integration.
- No customer secret data in chat.

## First Success

The merchant creates one order, opens checkout, receives a review, manually confirms, and sees their backend receive the final signed webhook.
```

- [ ] **Step 2: Recruit 3 merchants**

Use the pilot only after Tasks 1-6 are green.

---

## Self-Review

- Spec coverage: app account, onboarding, receiving methods, checkout, review, webhook, landing, release, VPS and CI are covered.
- Product truth: no auto-confirmation, no official bank confirmation, no SBP integration claim.
- No placeholders: every task has explicit commands or manual expected outcomes.
- Not added: multi-site integrations, remote sessions, auto-confirmation, PSP/wallet behavior.
