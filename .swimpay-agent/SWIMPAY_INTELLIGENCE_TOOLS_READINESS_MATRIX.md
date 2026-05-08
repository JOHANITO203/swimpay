# SwimPay Intelligence Tools Readiness Matrix

Date: 2026-05-08

Scope: pre-real-bank-notification readiness matrix after receiving methods implementation.

No real bank notification was processed. Real notification testing remains gated.

## Matrix

| Tool | Classification | Root cause if partial/blocked | File/module | Required fix or proof | Blocks real notification test |
| --- | --- | --- | --- | --- | --- |
| Bank Target Lock | ready | Device metric pending, but code/test boundary ready. | `BankTargetLock.kt`, `AndroidManifest.xml` | Record ADB detected-bank metric before capture. | No, but metric is a required preflight. |
| Notification Listener | partial | Android OS listener access not yet proven on device. | `SwimPayNotificationListenerService.kt`, `NotificationAccessStatusReader.kt` | Enable/prove listener access and heartbeat state. | Yes. |
| Supported Package Gate | ready | None. | `ReceiverBoundaries.kt` | Synthetic unsupported-package proof before live capture. | No. |
| Snapshot Extraction | partial | Real non-debug listener event not proven; no real notification allowed yet. | `AndroidNotificationSnapshotExtractor.kt` | Synthetic/device listener path proof only. | Yes for live capture. |
| Redaction Pipeline | ready | None in code/tests. | `ReceiverNotificationPipeline.kt` | Inspect synthetic payload from installed APK. | No, but proof is required. |
| Protected Outbox | ready | None in code/tests. | `AndroidEncryptedOutboxStore.kt` | Prove installed APK stores only redacted payload. | No, but proof is required. |
| Signed Upload Flusher | partial | Installed APK HTTPS staging upload not proven. | `SignalUploadFlusher.kt`, `SignalUploadWorker.kt` | Synthetic redacted outbox upload to staging. | Yes. |
| Receiver Runtime Config | partial | Installed APK staging config state not proven. | `ReceiverRuntimeConfigStore.kt`, `AndroidMerchantApiWiring.kt` | ADB/app proof of base URL, merchant id, device id, enabled bank target. | Yes. |
| Receiver Registration | partial | Installed APK registration to staging not proven. | `receiver-devices.ts`, `AndroidMerchantApiWiring.kt` | Register current APK against staging. | Yes. |
| Receiver Heartbeat | partial | Installed APK heartbeat to staging not proven. | `receiver-devices.ts`, `AndroidMerchantApiWiring.kt` | Heartbeat with active/listener/bank target state. | Yes. |
| Receiver Signing | partial | HMAC verification key is stored as `public_key`; asymmetric Keystore model not complete. | `signals.ts`, `AndroidKeystorePayloadSigner.kt`, `ReceiverRuntimeOutboxController.kt` | Production fix: asymmetric Keystore public key. Staging: explicit acceptance if not fixed. | Blocks production-ready claim; can block real test unless accepted. |
| Backend Signal Ingestion | ready | Staging upload proof pending only. | `signals.ts` | Synthetic upload from installed APK. | No, but proof is required. |
| Anti-Replay | ready | Staging replay proof pending only. | `signals.ts`, Postgres unique constraints. | Replay synthetic signal on staging. | No. |
| Parser | ready | Real shape samples pending. | `bank-templates/src/parser.ts` | Real shape validation after approved capture. | No for pre-capture; yes for production confidence. |
| Shape Hasher / Semantic Hash | partial | Real cross-bank shape collision proof pending. | Android pipeline / signal payload fields. | Add explicit real-shape collision metrics after approved capture. | No for first controlled capture. |
| Classifier | ready | Real shape samples pending. | `bank-templates`, `runtime.ts` | Real shape validation after approved capture. | No for first controlled capture. |
| Payment Intent Gate | ready | Staging E2E proof pending. | `matching-core`, `runtime.ts` | Synthetic active-intent proof. | Yes before real payment scenario. |
| Review Queue | ready | Staging UI/API proof pending. | `runtime.ts`, `reviews.ts` | Prove review row appears only with active intent. | Yes before webhook test. |
| Manual Confirmation | ready | Staging action proof pending. | `reviews.ts` | Confirm staged review manually. | Yes before final webhook proof. |
| Public Webhook Worker | ready | External staging delivery pending. | `webhooks.ts` | Deliver verified `payment.confirmed` after manual confirmation. | Yes before E2E success claim. |
| Node SDK | ready | Live staging external app proof pending. | `packages/swimpay-node` | Create staging order and verify webhook. | Yes before SDK E2E claim. |
| Android SDK | ready | Merchant-app integration proof pending. | `packages/swimpay-android` | Optional merchant APK smoke. | No for Receiver capture. |
| Receiving Methods | ready | Live checkout route proof pending. | `orders.ts`, `server.ts`, `payment-sessions.test.ts` | Prove at least one active staging route is selected by checkout. | Yes before payment scenario. |
| Feedback Logger | ready | Real feedback data pending. | `intelligence.ts` | Use after capture only; no runtime mutation. | No. |
| Unknown Shape Monitor | ready | Real unknown shape pending. | `intelligence.ts` | Observe after capture only; no runtime mutation. | No. |
| Operator/Admin Surfaces | partial | Legacy/inert `auto_confirm*` vocabulary remains in admin/schema/history. | `admin.ts`, docs/schema/template vocabulary | Zero-string cleanup before external audit optics. | No for controlled test; yes before public-facing audit. |

## Ready Tools

- Bank Target Lock code boundary.
- Supported Package Gate.
- Redaction Pipeline.
- Protected Outbox.
- Backend Signal Ingestion.
- Anti-Replay.
- Parser synthetic coverage.
- Classifier synthetic coverage.
- Payment Intent Gate.
- Review Queue.
- Manual Confirmation API.
- Public Webhook Worker.
- Node SDK.
- Android SDK boundary.
- Receiving Methods.
- Feedback Logger.
- Unknown Shape Monitor.

## Partial Tools

- Notification Listener: device OS access proof pending.
- Snapshot Extraction: non-debug device path proof pending.
- Signed Upload Flusher: installed APK staging upload proof pending.
- Receiver Runtime Config: installed APK staging state proof pending.
- Receiver Registration/Heartbeat: installed APK staging proof pending.
- Receiver Signing: HMAC foundation, not final asymmetric identity.
- Shape Hasher/Semantic Hash: real collision metrics pending.
- Operator/Admin Surfaces: inert `auto_confirm*` vocabulary debt.

## Blocked Tools

No active tool is unsafe in code for controlled staging, but real notification testing is blocked until:
1. Notification Listener Access is enabled and proven.
2. Bank target detection metric is recorded.
3. Receiver registration and heartbeat pass on staging.
4. Synthetic redacted upload from installed APK passes.
5. Active payment intent plus receiving method proof passes.
6. External staging webhook rehearsal passes.
7. Operator gives final explicit capture-start approval.

## Missing Tests / Proofs

- ADB bank detection metric from installed staging APK.
- ADB Notification Listener Access and listener connection proof.
- Installed APK receiver registration and heartbeat against staging.
- Installed APK synthetic outbox flush over HTTPS to staging.
- Database-backed replay proof on staging.
- Full synthetic staging E2E: SDK order -> checkout route -> receiver armed -> synthetic signal -> manual review.
- External staging app final webhook verification.
- Asymmetric Android Keystore signing proof for production-ready identity.

## Real Notification Test Gate

Real notification testing may start only after all blocked proofs above are recorded and the operator explicitly approves the capture start for one operator-owned test context.

## Validation

- PASS: `git diff --check` (warning only: `TASK_QUEUE.md` CRLF normalization).
- PASS: `npm run android:doctor`.
- PASS: `npm run typecheck`.
- PASS: `npm run lint`.
- PASS: `npm test` (74 files, 524 tests).
- PASS: `npm run build`.
- PASS: `docker compose --env-file .env.example -f infra/docker-compose.yml config`.

Android source was not edited in this readiness sprint, so Android Gradle unit/APK validation was not required by the sprint rule.
