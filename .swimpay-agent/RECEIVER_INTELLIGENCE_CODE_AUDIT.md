# Receiver / Intelligence Code Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

Receiver/Intelligence has strong deterministic and privacy guardrails, but real supported-bank NotificationListener runtime is not wired yet. The current runnable Android listener is synthetic/debug-only for accepted uploads.

## Strengths

- Android manifest has NotificationListener service and no SMS/Accessibility/QUERY_ALL_PACKAGES permission.
- Bank Target Lock probes exact supported packages only:
  `Sberbank`, `T-Bank`, `VTB`, `Alfa-Bank`, `Gazprombank`.
- Outbox code rejects raw notification markers, raw title/body and secret-like content.
- Static bank profile agent always sets `autoConfirmAllowed=false`.
- Receiver signal upload validates redacted contracts, receiver eligibility, signature, duplicate event IDs and notification hashes.
- Production observed timestamp tolerance exists at `apps/api/src/server.ts:1452`.

## Blocking issue

| Severity | File | Evidence | Risk |
| --- | --- | --- | --- |
| Critical | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt:17-19` | Runtime comments state only debug synthetic source is supported; function returns `debugEnabled && packageName == appPackageName`. | Real supported bank notifications will be ignored. |
| Critical | `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt:31-32` | Accepted notification result is not enqueued unless `BuildConfig.DEBUG`. | Non-debug Receiver cannot upload real signals. |

## High-risk issues

- Receiver private-key lifecycle is partially documented/tested but should be live-validated on a production-mode staging backend.
- Server verifies receiver signals using the registered public key field as verification material; asymmetric production key semantics require a focused review before live trust.
- Real supported bank package verification is still review-only/policy heavy; no real production trust ceremony has been executed.

## Safe findings

- No SMS permissions found.
- No Accessibility service found.
- No `QUERY_ALL_PACKAGES` found.
- No broad `getInstalledPackages` / `getInstalledApplications` path found in active receiver logic.
- No raw notification title/body upload is allowed by receiver contract guardrails.

## Recommendation

Before real receiver testing:

1. Wire `ReceiverBoundaries` to selected/enabled Bank Target Lock package IDs.
2. Keep exact package allowlist; do not add broad enumeration.
3. Ensure non-debug builds enqueue only redacted payloads from activated supported banks.
4. Validate with synthetic bank-package fixtures first, then require explicit operator consent before any real bank notification capture.

