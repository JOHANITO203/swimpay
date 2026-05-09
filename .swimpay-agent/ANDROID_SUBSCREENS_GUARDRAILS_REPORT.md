# Android sub-screens guardrails report

generated_at: 2026-05-09T00:08:00+03:00

## Tests added or updated

- `PremiumNavigationStateTest`
- `PremiumMerchantSettingsStateTest`
- `PremiumSettingsSubscreenContractTest`
- `AndroidMerchantApiWiringTest`
- `PremiumMerchantRuntimeContractTest`
- `AndroidMerchantVisualArchitectureTest`
- `apps/api/src/android-merchant-support.test.ts`

## Guardrails

- New typed routes exist for Help, Support, Language and Appearance.
- Login page contains a discreet language switch.
- Settings persistence covers language, theme mode and app lock timeout.
- Android UI does not expose raw API key/webhook secret show-once values.
- Android does not contain active "Activer la confirmation IA" copy.
- Confirmation IA remains future-only and excluded from V1.
- Manifest still forbids SMS, Accessibility and `QUERY_ALL_PACKAGES`.
- Backend rejects support payloads containing raw data or secrets.
- Backend confirmation settings cannot enable auto-confirmation.

## Validation commands

- `npm run android:doctor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 75 files, 535 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- Android JVM tests passed.
- `assembleDebug` passed.
- `assembleStaging` passed.
- Staging APK install/launch/UIAutomator smoke passed on `SM_S916B`.
