# Sprint 8A - Deterministic Bank Notification Agent + Passive Learning Collector

Status: implemented, code validation passed; live Docker backend validation blocked by local Docker Desktop pipe.

## Summary

Sprint 8A added a deterministic, non-LLM, privacy-first SwimPay Intelligence V1 foundation.

The implementation keeps runtime behavior static and versioned. It does not enable auto-confirmation, does not mutate classifier rules from feedback, does not store raw notification text by default and does not process real bank notifications.

## Tasks

- 439 Android Bank Notification Agent V1 model: completed.
- 440 Direction-aware shape hasher: completed.
- 441 Static bank profile distribution: completed.
- 442 Deterministic parser/classifier: completed.
- 443 Redacted signal upload contract: completed.
- 444 Passive feedback collector: completed.
- 445 Unknown shape monitoring read-only: completed.
- 446 Local drift guard minimal: completed.
- 447 Five-bank regression fixtures: completed.
- 448 Learning safety guardrails: completed.
- 449 Sprint closeout: completed.

## Android Agent Model

Added `BankNotificationAgentV1.kt` with:

- `BankNotificationAgent`
- `BankTargetLockState`
- `NotificationFilterDecision`
- `PrivacyFirewallResult`
- `ShapeHashResult`
- `BankProfileVersion`
- `NotificationClassification`
- `PassiveFeedbackEvent`
- `LocalDriftState`

The agent filters only enabled supported bank packages, redacts locally, hashes shapes and creates a minimal redacted upload payload. It never confirms payments and never sends developer webhooks.

## Direction-aware Shape Hasher

The shape hasher canonicalizes notification text into semantic tokens such as:

- `INCOMING`
- `OUTGOING`
- `CASHBACK`
- `REFUND`
- `FAILED`
- `PROMO`
- `BALANCE`
- `SYSTEM`
- `AMOUNT`
- `CURRENCY`
- `PHONE_HINT`
- `REFERENCE_HINT`

Incoming and outgoing shapes do not collide. Personal data is removed from canonical shapes.

## Static Bank Profiles

Added static V1 profiles for:

- Sberbank / `sber_ru` / `ru.sberbankmobile`
- T-Bank / `tbank_ru` / `com.idamob.tinkoff.android`
- VTB / `vtb_ru` / `ru.vtb24.mobilebanking.android`
- Alfa-Bank / `alfa_ru` / `ru.alfabank.mobile.android`
- Gazprombank / `gazprombank_ru` / `ru.gazprombank.android.mobilebank.app`

Profiles are versioned as `intelligence-v1`, include extraction/keyword/negative-gate metadata and explicitly keep `auto_confirm_enabled=false`.

Backend endpoint added:

- `GET /v1/intelligence/bank-profiles`

## Parser / Classifier

The Android classifier is deterministic and uses regex, keyword dictionaries and negative gates.

Outputs include:

- classification
- confidence
- suggested action
- `autoConfirmAllowed=false`
- reason codes
- reason labels

Suggested actions are limited to:

- `ask_human_feedback`
- `ignore`
- `needs_review`

## Redacted Signal Upload Contract

The Android receiver signal contract was extended additively with safe Intelligence V1 fields:

- `shape_hash`
- `profile_version`
- `classification`
- `confidence`
- `reason_codes`
- `auto_confirm_allowed=false`

The contract rejects raw notification text and rejects `auto_confirm_allowed=true`.

## Passive Feedback Collector

Added passive feedback validation and API ingestion:

- `POST /v1/intelligence/feedback`

Feedback supports:

- `correct`
- `corrected`
- `ignored`

Feedback is stored as pending review metadata and does not mutate runtime rules or promote profiles.

## Unknown Shape Monitoring

Added read-only unknown shape monitoring:

- `GET /v1/intelligence/unknown-shapes`

Unknown shape records include shape hash, bank profile, package, profile version, seen count and read-only review status. No raw text is stored.

## Local Drift Guard

Android tracks a local unknown-rate window per bank. If unknown classifications exceed the threshold, the local mode becomes more cautious (`force_review_local`). It does not disable banks and does not mutate profiles.

## Five-bank Fixtures

Synthetic/redacted fixtures cover all five V1 banks across:

- incoming customer transfer
- incoming card transfer
- incoming SBP-like transfer
- cashback
- refund
- outgoing payment
- outgoing transfer
- failed transfer
- promo
- balance update
- system notice
- unknown

## Safety Guardrails

Tests verify:

- no LLM / external AI calls in the Android agent;
- no SMS permission;
- no Accessibility service;
- no `QUERY_ALL_PACKAGES`;
- no broad installed-app enumeration;
- no raw notification text in upload/feedback contracts;
- no auto-confirm from Intelligence V1;
- feedback does not mutate runtime rules;
- Android does not send developer webhooks directly.

## Blockers

No critical Sprint 8A product blocker introduced.

Live real-notification capture remains out of scope for this sprint and must stay gated by explicit operator consent.

Fresh Docker live checks are blocked in this shell:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` failed because `//./pipe/dockerDesktopLinuxEngine` is unavailable.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` failed because the local proxy/API is unreachable while Docker is unavailable.

Code validation, Android JVM validation, debug APK build and real-device install/launch passed.

## Validation

Passed:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- Android targeted `BankNotificationAgentV1Test`
- Android `:app:testDebugUnitTest`
- Android `:app:assembleDebug`
- ADB device detection through local SDK adb
- ADB install on `R5CWA0FEPZW`
- ADB launch of `com.swimpay.receiver/.MainActivity`
- UIAutomator dump confirmed the premium app opened on Accueil

Blocked:

- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health`

## Next Recommendation

Sprint 8B should focus on controlled local/device QA for the deterministic agent with synthetic notifications and a supervised feedback review dashboard, still without real notification capture unless consent is explicitly recorded.
