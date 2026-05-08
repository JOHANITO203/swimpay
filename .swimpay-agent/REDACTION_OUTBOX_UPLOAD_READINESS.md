# Redaction / Outbox / Upload Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: partial, blocked by installed APK staging upload proof.

The Android code redacts before outbox persistence and the upload flusher rejects unsafe payloads. Backend rejects raw signal uploads. The missing proof is a synthetic redacted upload from the installed staging APK to staging HTTPS.

## Evidence

- `ReceiverNotificationPipeline.kt`
- `ReceiverRuntimeOutboxController.kt`
- `AndroidEncryptedOutboxStore.kt`
- `SignalUploadFlusher.kt`
- `SignalUploadWorker.kt`
- `apps/api/src/signals.ts`
- `ReceiverNotificationPipelineTest.kt`
- `AndroidEncryptedOutboxStoreTest.kt`
- `OutboxStorageHardeningTest.kt`
- `SignalUploadFlusherTest.kt`
- `apps/api/src/signals.test.ts`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| Raw notification text temporary only | ready in code | Snapshot is redacted before outbox. |
| Redacted payload only enters outbox | ready | Outbox rejects raw markers and secret-like keys. |
| Upload rejects raw_text_present=true | ready | Flusher and backend tests reject it. |
| event_id present | ready | Runtime controller builds it. |
| notification_hash present | ready | Runtime controller/pipeline builds it. |
| semantic_hash present | ready | Payload includes semantic hash where available. |
| local_counter present | ready | Device state increments before enqueue. |
| payload_hash present | ready | Canonical signing fields include payload hash. |
| signature present | ready | Runtime outbox signs payload. |
| HTTPS staging path | partial | Staging build config targets HTTPS, but installed APK upload proof is pending. |

## Missing Proof

Run synthetic redacted outbox upload from the installed APK against `https://staging.swimpay.pro/v1/receiver/signals` and record HTTP status, latency and backend acceptance.

