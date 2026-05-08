# Android Receiver Source Truth Audit

Date: 2026-05-08

## Result

Android Receiver is mostly aligned with SwimPay Intelligence V1 boundaries, but real notification capture must remain blocked until the non-debug upload path and synthetic hash vocabulary are corrected.

## Aligned Files

- `ReceiverBoundaries.kt`: non-debug notifications pass only through `BankTargetLock.isNotificationAllowed`.
- `BankTargetLock.kt`: exact supported package allowlist; no `QUERY_ALL_PACKAGES`; no broad installed-app enumeration.
- `SwimPayNotificationListenerService.kt`: unsupported packages are ignored before snapshot extraction/redaction/outbox.
- `ReceiverNotificationPipeline.kt`: accepted snapshots flow through redaction and safe envelope creation.
- `AndroidEncryptedOutboxStore.kt`: persists redacted payloads only and rejects unsafe payload markers.
- `SignalUploadWorker.kt`: non-debug path refuses unsafe emission rather than inventing transport.
- Android manifest/source: no SMS permission, no Accessibility service, no bank app scraping.

## Contradictions / Must Fix

1. `SignalUploadWorker` non-debug upload transport is still fail-safe/no-op. It protects privacy, but it means real staging capture cannot prove backend signed signal ingestion yet.
2. `NotificationCoalescer` hash input uses synthetic/debug label vocabulary. That is safe for privacy but misleading for real runtime evidence and must be renamed before real capture evidence is trusted.

## Guardrail Gaps

- Existing tests protect no SMS, no Accessibility, no `QUERY_ALL_PACKAGES`, no broad enumeration, no Android confirmation and no Android developer webhooks.
- New central guardrail also asserts these boundaries.

## Real Notification Rule

No real bank notification should be captured until:
- staging backend is healthy;
- receiver is registered;
- non-debug upload transport sends only redacted signed envelopes;
- hash vocabulary no longer marks real runtime evidence as synthetic;
- operator gives final capture-start approval.

