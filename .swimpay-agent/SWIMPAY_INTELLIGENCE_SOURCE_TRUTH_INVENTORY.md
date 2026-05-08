# SwimPay Intelligence Source Truth Inventory

Date: 2026-05-08

This inventory audits SwimPay Intelligence against the current V1 product truth. It is audit-first: it does not authorize real notification capture or public production deployment.

## Classification Key

- aligned: active code/docs/tests match V1 truth.
- partially aligned: safe behavior exists, but a real staging gap remains.
- stale vocabulary only: old terms remain in compatibility fields, tests, reports or historical docs without active runtime authority.
- contradictory: active code/docs/UI vocabulary can mislead operators or developers.
- dangerous before real testing: must be fixed before operator-owned real bank notification capture.
- future-only: possible later direction, not V1 runtime behavior.
- unknown: not proven in this pass.

## Inventory

| Area | Files / packages | Classification | Evidence |
| --- | --- | --- | --- |
| Android Notification Listener | `SwimPayNotificationListenerService.kt`, `ReceiverBoundaries.kt` | aligned | Gated before snapshot extraction; no SMS/Accessibility/broad enumeration. |
| Bank Target Lock | `BankTargetLock.kt` | aligned | Exact supported package set only; uses direct package probes, no `QUERY_ALL_PACKAGES`. |
| Redaction pipeline | `ReceiverNotificationPipeline.kt` | aligned | Raw snapshot fields are temporary inputs; outbox payload is redacted and `raw_text_present=false`. |
| Android outbox | `AndroidEncryptedOutboxStore.kt` | aligned | Rejects raw phone/card/notification/secrets before persistence. |
| Android non-debug upload | `SignalUploadWorker.kt`, `SignalUploadFlusher.kt` | implemented, needs staging device proof | Non-debug worker now flushes due redacted outbox records to `/v1/receiver/signals`; installed APK staging proof is still required. |
| Receiver signing model | `ReceiverRuntimeOutboxController.kt`, `AndroidReceiverDeviceApiRepository`, `apps/api/src/signals.ts` | partially aligned / security-contract gap | Current path signs with an app-generated HMAC key registered in the backend `public_key` field. Production-grade asymmetric public-key registration remains required. |
| Android runtime hashes | `ReceiverNotificationPipeline.kt` | contradictory before real testing | Hash prefix uses synthetic/debug label vocabulary even for real runtime snapshots. |
| Receiver registration / heartbeat | `apps/api/src/receiver-devices.ts` | aligned | Merchant-bound devices, safe public key registration, operational states. |
| Signal upload API | `apps/api/src/signals.ts` | aligned after guardrail fix | Signed upload, anti-replay, duplicate hash checks, local counter monotonicity, timestamp tolerance, raw legacy payload rejection. |
| Signal runtime | `apps/signal-worker/src/runtime.ts` | aligned | Runtime emits review/reject decisions only; no auto-confirmation. |
| Matching core | `packages/matching-core/src/index.ts` | aligned | Strong matches return manual review; `manual_confirmation_required_v1`. |
| Payment Intent Gate | `packages/matching-core/src/index.ts`, runtime tests | aligned | No active intent produces no merchant review. |
| Passive feedback | `apps/api/src/intelligence.ts` | aligned | `mutates_runtime_rules=false`, `promotes_profile=false`, no review/webhook authority. |
| Unknown shapes | `apps/api/src/intelligence.ts` | aligned | Monitoring only; no profile promotion or runtime mutation. |
| Retention policy | `docs/INTELLIGENCE_RETENTION_POLICY.md` | aligned | Redacted-only, non-destructive hooks, no raw text storage. |
| Public webhook worker | `apps/job-worker/src/webhooks.ts` | aligned | Public event set restricted to final V1 events. |
| Event constants | `packages/events/src/index.ts` | aligned with internal/public split | Internal events remain internal; public disclosure says notification signal and official false. |
| Node SDK | `packages/swimpay-node` | aligned | Server-side order creation, raw body webhook verification, public final events only. |
| Android SDK | `packages/swimpay-android` | aligned | Checkout helper only; no secrets, webhooks or payment confirmation. |
| Developer Integration Wizard | `apps/web/src`, docs | aligned | Snippets are server-side for secrets and fulfill only after verified `payment.confirmed`. |
| Admin bank templates | `apps/api/src/admin.ts`, `packages/bank-templates` | contradictory / stale vocabulary | Active response/audit vocabulary still exposes `auto_confirm_allowed_by_template` and `autoConfirmStatus`; runtime does not use it for confirmation. |
| Historical reports | `.swimpay-agent/*` | stale vocabulary only | Earlier sprint reports mention old direction and should not override this source truth. |

## Must Fix Before Real Bank Notification Tests

1. Prove the installed staging APK can register, heartbeat and upload a synthetic
   redacted signed signal to `/v1/receiver/signals`.
2. Decide whether the current HMAC receiver signing model is explicitly
   acceptable for a controlled staging capture, or replace it first with true
   Android Keystore asymmetric signing.
3. Replace synthetic/debug hash label vocabulary in real Android runtime hashes.
4. Keep inert `auto_confirm*` compatibility vocabulary quarantined; active
   admin/operator response vocabulary has been neutralized.

## Fixed In This Sprint

- Legacy receiver signal payloads now reject nested raw notification, phone, card and credential fields before normalization.
- Non-debug Android upload transport now flushes redacted outbox records to the
  backend signal upload endpoint instead of no-oping.
