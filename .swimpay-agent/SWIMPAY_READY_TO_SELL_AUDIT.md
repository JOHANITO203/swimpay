# SwimPay Ready-To-Sell Audit

generated_at: 2026-05-17T00:00:00+03:00

## Goal

Turn the current working SwimPay staging base into a sellable private beta without adding new product concepts.

The commercial promise must stay simple:

> SwimPay helps a merchant track received payments, review payments that need confirmation, and notify their site/app after manual validation.

SwimPay remains a Payment Signal Engine. It is not a bank, PSP, wallet, SBP integration, payment initiator or official bank confirmation system.

## Readiness Scale

- `ready`: good enough for a controlled private beta.
- `fragile`: works locally/staging, but needs one operator check before beta.
- `blocking`: must be fixed or verified before asking a real merchant to use it.
- `not_beta_scope`: useful later, not needed to sell the first pilot.

## Executive Status

| Area | Status | Reason |
| --- | --- | --- |
| Core product truth | ready | V1 manual confirmation boundary is documented and guarded. |
| Android staging app | fragile | Staging APK builds and has been device-tested, but final signout/reconnect and full merchant smoke need one clean pass. |
| Account creation | fragile | Lightweight create-account flow exists; observed device issue around reconnect/create-account needs final regression smoke. |
| Google recovery/linking | fragile | Backend env/DNS issue was fixed on VPS; Android exchange/linking still needs one device proof after latest build. |
| Onboarding | fragile | Flow exists and is localized; needs one fresh first-install pass after the latest visual/logo fixes. |
| Receiving methods | fragile | Add/edit/delete/replace is wired; delete/replace must be confirmed once on staging device with real API responses. |
| Review/manual confirmation | ready_with_staging_gate | Manual confirmation is allowed and backend-owned; confirm/reject actions need one staging E2E after deploy. |
| Hosted checkout | fragile | Contract exists; production URL is documented, but real public checkout route must be tested from landing/domain. |
| SDK/developer integration | fragile | Guide exists and values are defined; show-once key/secret rehearsal must be performed with a test merchant backend. |
| Webhooks | fragile | Signed final webhooks exist; a final webhook E2E from checkout to merchant backend remains a beta gate. |
| Landing/download | fragile | Landing service exists under `www.swimpay.pro`; APK download path must point to the intended signed/staging build and be manually tested. |
| Production release APK | blocking | Release build requires keystore env values before `npm run android:assemble:release` can produce a distributable signed APK. |
| Production backend | fragile | Dokploy/Docker env shape is defined; confirm all secrets and `CHECKOUT_BASE_URL=https://www.swimpay.pro/checkout` in Dokploy. |
| CI | ready_after_push | Local CI-equivalent validation passed after the CI alignment patch; GitHub must rerun after push. |
| Security/privacy | fragile | Guardrails exist; rotate any exposed staging/test tokens before inviting external merchants. |
| Visual polish | not_beta_scope | Current app can enter beta if flows work. Further polish should not delay merchant validation unless it blocks comprehension. |

## Private Beta Acceptance Checklist

### 1. App Install And Account

- [ ] Install the latest staging-connected APK on a clean Android device.
- [ ] Launch app and verify no crash before splash/onboarding.
- [ ] Create account without Google.
- [ ] Complete onboarding through `Configurer plus tard`.
- [ ] Force-stop app.
- [ ] Relaunch and verify local session restores.
- [ ] Sign out once.
- [ ] Relaunch and verify account entry appears.
- [ ] Use `Se connecter` to restore a known account.
- [ ] Link Google from `Réglages > Sécurité`.
- [ ] Force-stop and relaunch, then verify Google recovery works only for the linked account.

Blocking if any of these fail: login/reconnect/signout/session restore.

### 2. Receiving Methods

- [ ] Add card receiving method.
- [ ] Add phone/SBP-labeled receiving method.
- [ ] Verify saved destinations are masked, not raw.
- [ ] Edit/replace a card destination.
- [ ] Edit/replace a phone destination.
- [ ] Delete a method and verify it disappears after refresh.
- [ ] Disable a method and verify checkout readiness changes honestly.

Blocking if add/edit/delete is visible but does not change backend state.

### 3. Checkout And Review

- [ ] Create a test order through SDK/API.
- [ ] Open the generated hosted checkout URL.
- [ ] Select receiver bank/method and show exact instructions.
- [ ] Tap `J'ai payé` and verify it does not confirm payment.
- [ ] Produce synthetic or approved staging signal/fallback review.
- [ ] Open Android `Revue`.
- [ ] Confirm received payment manually.
- [ ] Reject signal on a separate review.
- [ ] Reject order on a separate review if the route exists.

Blocking if any Android action confirms locally or bypasses backend review actions.

### 4. Webhook And Merchant Backend

- [ ] Configure merchant webhook URL and secret.
- [ ] Run backend-owned webhook test.
- [ ] Confirm a review and verify `payment.confirmed` is delivered.
- [ ] Verify event includes `confirmation_type=notification_signal`.
- [ ] Verify event includes `official_bank_confirmation=false`.
- [ ] Verify failed delivery retries and appears in integration health.

Blocking if merchant fulfillment can be triggered before manual confirmation.

### 5. Landing And Download

- [ ] Visit `https://www.swimpay.pro`.
- [ ] Verify FR/EN/RU landing copy has no mojibake.
- [ ] Tap download CTA on mobile.
- [ ] Verify APK link downloads the intended current build.
- [ ] Verify install instructions are understandable for Android APK distribution.

Blocking if CTA is broken or downloads an old APK.

### 6. Release/Production

- [ ] Load release keystore values outside git:
  - `SWIMPAY_ANDROID_RELEASE_STORE_FILE`
  - `SWIMPAY_ANDROID_RELEASE_STORE_PASSWORD`
  - `SWIMPAY_ANDROID_RELEASE_KEY_ALIAS`
  - `SWIMPAY_ANDROID_RELEASE_KEY_PASSWORD`
- [ ] Set Android production backend/client values:
  - `SWIMPAY_ANDROID_PRODUCTION_BACKEND_BASE_URL`
  - `SWIMPAY_ANDROID_PRODUCTION_GOOGLE_SERVER_CLIENT_ID`
- [ ] Run `npm run android:assemble:release`.
- [ ] Install the signed APK on device.
- [ ] Verify release build points to the intended HTTPS backend.
- [ ] Upload/copy the signed APK to the landing download location.

Blocking until signed release APK exists and installs.

### 7. VPS/Dokploy

- [ ] Confirm Dokploy env has:
  - `DATABASE_URL`
  - `CHECKOUT_BASE_URL=https://www.swimpay.pro/checkout`
  - `PHONE_HMAC_SECRET`
  - `WEBHOOK_SECRET_ENCRYPTION_KEY`
  - `ADMIN_TOKEN_HMAC_SECRET`
  - `POSTGRES_PASSWORD`
- [ ] Confirm Google DNS from API container:
  - `node -e "require('dns').resolve4('oauth2.googleapis.com',(e,a)=>console.log(e||a))"`
- [ ] Confirm health:
  - `https://www.swimpay.pro`
  - `https://staging.swimpay.pro`
  - API `/health` through configured host.
- [ ] Confirm only expected public ports are exposed.

Blocking if Google token verification or health fails.

### 8. CI And Regression

- [ ] Push current branch.
- [ ] Verify GitHub CI reruns green:
  - Root npm validation
  - Docker Compose config
  - Android receiver validation
- [ ] If CI fails, inspect logs and fix root cause only.
- [ ] Do not update Roborazzi goldens unless intentionally freezing visuals.

Blocking if CI red on root, Compose or Android staging.

## What Is Not Required For First Private Beta

- A separate production OAuth client if the currently validated client is intentionally reused.
- A multi-site Android integrations list.
- Remote session/device management in Settings.
- Auto-confirmation.
- Real broad bank-notification capture beyond controlled operator-owned staging tests.
- A perfect visual polish pass on every screen.
- A full admin/operator console beyond minimal operations needed for pilot support.

## Recommended Pilot Offer

Start with 5 to 10 merchants.

Message:

> Suivez les paiements reçus de votre business, vérifiez ceux qui demandent confirmation, et gardez votre site/app à jour après validation.

Beta rules:

- free or symbolic price during controlled beta;
- one Android merchant device per pilot;
- one business/site/app per pilot;
- manual confirmation only;
- no official bank confirmation claim;
- feedback call after first 3 payment reviews.

## Biggest Risks Before Selling

1. Login/reconnect/signout instability on real device.
2. Signed release APK not yet produced with real keystore.
3. Download CTA serving wrong/old APK.
4. Staging/prod domain split confusing the APK/backend/checkout routing.
5. Webhook E2E not rehearsed with a merchant backend after manual confirmation.
6. Old technical copy or design residue confusing non-technical merchants.

## Next 48-Hour Execution Order

1. Push CI alignment and get GitHub green.
2. Produce/install one clean staging APK.
3. Run account/session/signout/reconnect device smoke.
4. Run receiving-method add/edit/delete smoke.
5. Run checkout -> review -> manual confirm -> webhook smoke.
6. Build signed release APK once keystore vars are loaded.
7. Put the APK behind the landing CTA.
8. Recruit the first 3 pilot merchants.
