# Android Runtime Wiring Closeout

generated_at: 2026-05-14T00:00:00+03:00

## Completed

- Audited active Android Merchant premium runtime screens.
- Removed staging/debug forced design fixtures from dashboard, reviews, review detail, receiving methods, integrations and receiver health.
- Reused existing repositories and endpoints; no backend/API/database/payment/webhook/receiver/SDK/state-machine code changed.
- Replaced fake runtime fallbacks with honest unavailable/empty copy where data is absent.
- Added static runtime wiring guardrails.

## Validation

- Passed: `./gradlew.bat :app:compileDebugKotlin --no-daemon --stacktrace --max-workers=1`.
- Passed: `./gradlew.bat :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidRuntimeWiringGuardrailTest --tests com.swimpay.receiver.AndroidDataHydrationTest --no-daemon --stacktrace --max-workers=1`.
- Passed: `npm run android:assemble:staging`.

## Staging APK

- Built using the repository staging script required by `AGENTS.md`.
- Next device test should install the staging APK and verify it talks to `https://staging.swimpay.pro`.

## Remaining Blockers

- Integrations list is still backed by a single connected-site/detail model, not a true multi-site list.
- Security settings has no real remote sessions repository, so it cannot show device/IP/session history.


## Validation Note

- Full `:app:testDebugUnitTest` was also attempted after targeted validation.
- Result: failed with 11 existing broad visual/navigation guardrail failures outside the runtime-wiring guardrail set; targeted wiring and hydration tests passed after correcting the dashboard chart currency label back to `₽`.
- The full-test failure is tracked as residual visual/static-test drift, not as a backend/runtime wiring failure in this pass.
