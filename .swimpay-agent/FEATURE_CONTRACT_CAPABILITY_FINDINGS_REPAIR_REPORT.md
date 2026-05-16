# Feature / Contract / Capability Findings Repair Report

generated_at: 2026-05-17T00:27:00+03:00

## Scope

Repaired the current review findings without adding new product features and without changing payment confirmation semantics.

## Findings Repaired

1. Production runtime secrets no longer fall back to local development values in `infra/docker-compose.yml`.
   - Follow-up review fix: `POSTGRES_PASSWORD` is also mandatory now.
2. Production checkout template now points to `https://swimpay.pro/checkout`.
3. Android connected-site status now uses the existing merchant integration repository when available.
   - Follow-up review fix: delivery IDs, HTTP status and safe error details are hidden from the default merchant response and are returned only under explicit developer details.
4. Android release builds now enable R8 minification and resource shrinking.
5. ProGuard rules keep Android worker, Credential Manager and Google ID token runtime classes.
6. Mojibake guardrail offenders in Android tests and the new plan file were removed.
   - Follow-up review fix: the mojibake guardrail now detects common single-level UTF-8 mojibake, not only double-encoded markers.
7. Android release/production config and the current Google web BFF seam are documented.

## Product Truth

- Android Google remains optional recovery/linking only.
- Android does not confirm orders locally.
- Android does not send fulfillment webhooks directly.
- Connected-site status uses repository state and never exposes webhook secrets.

## Validation

- `npm exec -- vitest run tests/production-runtime-secret-guardrails.test.ts`
- `npm exec -- vitest run tests/mojibake-surface.test.ts`
- `npm exec -- vitest run apps/api/src/android-merchant.test.ts --testNamePattern "connected-site"`
- `npm run typecheck -- --pretty false`
- `npm exec -- vitest run tests/production-runtime-secret-guardrails.test.ts tests/mojibake-surface.test.ts apps/api/src/android-merchant.test.ts --testNamePattern "connected-site|Google|known Android merchant device"`
- `.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidProductionReleaseConfigTest --tests com.swimpay.receiver.PremiumMerchantSettingsStateTest --tests com.swimpay.receiver.PremiumSettingsSubscreenContractTest --no-daemon --stacktrace --max-workers=1`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config --quiet`
- `npm run android:assemble:staging`
- Follow-up review validation:
  - `npm exec -- vitest run tests/production-runtime-secret-guardrails.test.ts tests/mojibake-surface.test.ts`
  - `npm exec -- vitest run apps/api/src/android-merchant.test.ts --testNamePattern "connected-site"`
  - `npm run typecheck -- --pretty false`
  - `docker compose --env-file .env.example -f infra/docker-compose.yml config --quiet`
  - `.\apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidProductionReleaseConfigTest --no-daemon --stacktrace --max-workers=1`
  - `npm run android:assemble:staging`

## Remaining Notes

- A signed release APK still requires the release keystore variables to be present in the build environment.
- The web BFF Google redirect/callback remains an explicit 501 seam and is documented as separate from Android Google ID-token recovery.
