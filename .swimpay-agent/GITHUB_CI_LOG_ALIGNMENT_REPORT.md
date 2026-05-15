# GitHub CI Log Alignment Report

generated_at: 2026-05-16T00:40:00+03:00

## Source

- Input logs: `c:\Users\Lenovo\Downloads\logs_69244866122.zip`
- Extracted locally to: `D:\TEMP\swimpay_ci_logs_69244866122`

## Jobs inspected

### Docker Compose config

- Status in provided logs: passed.
- Finding: no repository change required for this job.

### Root npm validation

- Failing step: `npm test`.
- Failing test: `tests/five-bank-mvp-readiness.test.ts`.
- Root cause: false-positive forbidden marker match. The readiness test searched for `5C`; `.swimpay-agent/TASK_QUEUE.md` contained an Android device serial with that substring.
- Fix: removed the raw device serial from `.swimpay-agent/TASK_QUEUE.md` and replaced it with `connected staging device`.

### Android receiver validation

- Failing command in logs: `./gradlew testStagingUnitTest assembleStaging`.
- Failing tests reported:
  - `AndroidDataHydrationTest.dashboardWithNoPaymentsUsesLivelyEmptyCopyInsteadOfDeadState`
  - `AndroidDataHydrationTest.dashboardStaysAliveFromLocalSystemStateWhenBackendIsOffline`
  - `AndroidMerchantVisualArchitectureTest.androidLauncherUsesSwimPayAppIconResources`
  - `PremiumSettingsSubscreenContractTest.launcherIconUsesExistingThreeWaveMark`
- Current local result: staging unit tests and staging assembly pass.
- Note: the current tree already contains the aligned Android visual/static guardrails from the Roborazzi freeze pass.

## Additional lint alignment

- Local `npm run lint` initially failed because ESLint scanned cloned third-party skill sources under `.external-skills/ui-ux-pro-max-skill`.
- `.external-skills/` is already Git-ignored and is not SwimPay source code.
- Fix: added `.external-skills/**` to `eslint.config.js` ignores.

## Validation run

- `apps\android-receiver\android\gradlew.bat -p apps/android-receiver/android :app:testStagingUnitTest :app:assembleStaging --no-daemon --stacktrace --max-workers=1` - passed.
- `npm test` - passed, 78 files / 710 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed after excluding `.external-skills/**`.
- `npm run build` - passed.
- `git diff --check` - passed.

## Remaining CI risk

- No remaining failure reproduced locally from the provided logs.
- The only CRLF warning is on `.swimpay-agent/TASK_QUEUE.md`; `git diff --check` is clean.
