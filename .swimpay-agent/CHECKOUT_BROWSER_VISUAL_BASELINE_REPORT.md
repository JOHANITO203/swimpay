# Checkout Browser Visual Baseline Report

generated_at: 2026-05-12T22:05:00+03:00

## Result

Hosted buyer checkout now has browser-rendered visual baselines generated with local Chrome headless through the Chrome DevTools Protocol.

No Playwright/Puppeteer dependency was added.

## Commands Added

```powershell
npm run checkout:screenshot:record
npm run checkout:screenshot:verify
```

## Baselines Created

Stored in:

- `apps/web/visual-baselines/checkout`

PNG baselines:

- `checkout_intro_mobile.png`
- `checkout_buyer_info_mobile.png`
- `checkout_instructions_mobile.png`
- `checkout_waiting_mobile.png`
- `checkout_instructions_desktop.png`

HTML fixtures:

- `apps/web/visual-baselines/checkout/html/*.html`

## Visual Coverage

- Intro
- Buyer information
- Payment instructions
- Waiting/payment tracking state
- Desktop payment instructions sanity baseline

## Screenshot Verification

The verify command renders fresh screenshots into `.tmp/checkout-visual-baselines`, compares SHA-256 hashes against the versioned PNG baselines, then deletes the temporary screenshots.

Animations/transitions are frozen in generated fixtures to keep baselines deterministic.

Executed:

```powershell
npm run checkout:screenshot:record
npm run checkout:screenshot:verify
```

Both passed.

## Checkout Fix Found During Baseline Creation

The first browser capture exposed horizontal clipping risk in the checkout card layout.

Fix added:

- scoped `box-sizing: border-box` for `.buyer-checkout` and descendants.

This is visual/layout only. It does not touch payment runtime, webhooks, confirmation semantics or notification handling.

## Android Staging Build Rule

Added root scripts:

```powershell
npm run android:assemble:staging
npm run android:assemble:debug-vps
```

`android:assemble:staging` is the default operator/device build for VPS tests.

`android:assemble:debug-vps` builds a debug variant pointed at `https://staging.swimpay.pro` using Gradle property `swimpayBackendBaseUrl`.

Also documented in `AGENTS.md`.

Validation:

```powershell
npm run android:assemble:staging
npm run android:assemble:debug-vps
```

Both passed.

The generated staging APK remains the preferred device-test artifact:

- `apps/android-receiver/android/app/build/outputs/apk/staging/app-staging.apk`

The debug-VPS APK is available when a true debug build must point at staging:

- `apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`

## Guardrails

- No payment runtime change.
- No webhook semantic change.
- No real notification processing.
- No auto-confirmation.
- No new logo asset.
- Checkout brand/color alignment from previous visual sprint is preserved.

## Remaining Gaps

- Browser baselines are Chrome-local; CI should later standardize browser version.
- No interactive browser golden flow yet, only deterministic rendered states.
- Icon polish remains intentionally deferred.

## Additional Validation

Passed:

```powershell
npm test -- tests/checkout-brand-visual-contract.test.ts apps/web/src/checkout.test.ts
npm run typecheck
npm run lint
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
```
