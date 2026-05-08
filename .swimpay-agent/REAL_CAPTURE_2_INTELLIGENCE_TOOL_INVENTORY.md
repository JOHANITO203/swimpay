# REAL-CAPTURE-2 Intelligence Tool Inventory

Date: 2026-05-08

Scope: pre-real-notification inventory after staging APK build hardening, VPS
staging deploy, Android onboarding/receiving-method validation and staging
migrations.

No real bank notification was captured, read, dumped, uploaded or matched in
this inventory.

## Current Result

SwimPay Intelligence is closer to real staging capture than the older
INTEL-TRUTH inventory states. The former blocker "Android non-debug upload is
fail-safe/no-op" is now resolved in code: non-debug Android uses
`SignalUploadFlusher` and posts due redacted outbox records to
`/v1/receiver/signals`.

The remaining pre-capture work is now operational validation on the operator
device and one security-contract gap:

- prove receiver registration and heartbeat from the installed staging APK;
- prove synthetic redacted outbox upload reaches staging and is accepted;
- prove an active payment intent plus receiving method can reach manual review
  without any webhook before manual confirmation;
- decide whether the current receiver HMAC shared-key registration is acceptable
  for the controlled staging test, or replace it with true Android Keystore
  asymmetric public-key registration before real notification capture.

## Tool Matrix

| Tool | Owner | Current status | Evidence | Next proof before real notification |
| --- | --- | --- | --- | --- |
| Bank Target Lock | Android | Ready, device validation required | Exact V1 bank package queries only; no `QUERY_ALL_PACKAGES`; `BankTargetLock` probes only supported packages. | Record detected supported-bank count from the device without broad enumeration. |
| Notification Listener Access | Android/OS | Ready, operator state required | Service is declared with `BIND_NOTIFICATION_LISTENER_SERVICE`; runtime checks listener readiness via heartbeat state. | ADB/UI proof that Notification Listener Access is enabled for SwimPay. |
| Supported Package Gate | Android | Ready | `ReceiverBoundaries` allows only enabled bank packages in non-debug; unsupported packages return before snapshot/outbox/upload. | Activate one selected supported bank target and prove unsupported packages remain ignored using synthetic path only. |
| Snapshot Extraction | Android | Ready with strict boundary | Snapshot extraction happens only after package gate; raw fields are temporary memory inputs. | No raw title/body/bigText/textLines in outbox or upload payload during synthetic smoke. |
| Redaction Pipeline | Android | Ready | `ReceiverNotificationPipeline` emits redacted title/body, masked placeholders, hashes and `raw_text_present=false`. | Synthetic payload inspection with no raw phone/card/reference. |
| Encrypted Outbox | Android | Ready | `AndroidEncryptedOutboxStore` rejects raw phone, raw notification, raw title/body, raw card and secret-like keys before persistence. | Queue one synthetic redacted signal and verify only redacted signed payload persists. |
| Signed Upload Flusher | Android | Implemented, staging proof pending | Non-debug `SignalUploadWorker` uses `SignalUploadFlusher.forBaseUrl(...).flushDue()` to POST `/v1/receiver/signals`. | Run installed APK synthetic outbox flush against `https://staging.swimpay.pro` and record ack/retry latency. |
| Receiver Registration | API/Android | Implemented, device proof pending | Android mobile session calls `/v1/receiver-devices/register`; backend binds device to merchant. | Prove current installed APK has a staging mobile session and receiver device id. |
| Receiver Heartbeat | API/Android | Implemented, device proof pending | Android calls `/v1/receiver-devices/heartbeat`; backend derives `active`, `notification_access_missing`, `bank_targets_missing`, etc. | Prove heartbeat status from staging after notification access and bank target selection. |
| Receiver Signing | Android/API | Functional, source-truth gap | Backend verifies HMAC over canonical signal with stored `receiver_devices.public_key`; Android currently registers an app-generated `spk_` shared key as `public_key`. | For production: migrate to true asymmetric Keystore public key. For controlled staging: explicit acceptance or fix first. |
| Backend Signal Ingestion | API | Ready, synthetic proof pending | `/v1/receiver/signals` validates contract, raw-field rejection, signature, device eligibility, timestamp tolerance, duplicates, local counter and bank profile. | Send a signed synthetic redacted signal from APK and verify `signal.received` only. |
| Anti-Replay | API/Postgres | Ready | Unique `event_id`, unique `notification_hash`, monotonic `local_counter`; production timestamp tolerance. | Replay same synthetic signal and verify rejection/duplicate behavior. |
| Payment Intent Gate / Matching | signal-worker | Ready | Runtime creates `needs_review` or `rejected`; no active intent means no review; strong matches remain manual review. | Synthetic active-intent test with receiving method selected. |
| Manual Review Queue | API/web/Android UI | Ready for backend flow, UI proof pending | `review_queue` receives open manual review; Android review actions are backend-owned and non-confirming except explicit merchant action route. | Prove review appears only after active intent and signal match. |
| Manual Confirmation Path | API/web | Ready, E2E proof pending | `payment.confirmed` is final-event-only and tied to manual confirmation semantics. | Merchant manually confirms staged review and then only then webhook queues. |
| Public Webhook Worker | job-worker | Ready | Worker and SDK restrict public V1 events to `payment.confirmed`, `payment.rejected`, `payment.expired`; public payload includes notification-signal disclosure. | External staging app receives verified `payment.confirmed` after manual confirmation only. |
| Node SDK | package | Ready | Server-side order creation, raw-body webhook verification, unsafe auto-confirm inputs rejected. | External app creates order, receives checkout URL, verifies final webhook. |
| Android SDK Helper | package | Ready boundary | Opens checkout/return only; no secret key, no webhook, no confirmation. | Later merchant-app integration rehearsal; not required for Receiver capture itself. |
| Receiving Methods | API/Android/checkout | Ready after staging migration | `merchant_receiving_routes` stores masked/HMAC/encrypted receiving routes; Android onboarding now persists method after VPS migrations. | Verify at least one active method exists on staging and is attached to checkout/payment intent. |
| Feedback / Unknown Shapes | API/admin | Ready, monitoring only | Passive feedback and unknown-shape surfaces do not mutate runtime rules or promote bank profiles. | Observe only after synthetic/real signal; no runtime mutation. |
| Admin/Operator Vocabulary | API/admin | Active dangerous vocabulary resolved, inert debt remains | Active `auto_confirm_allowed_by_template` response is guarded by tests; inert fixtures/schema vocabulary remains. | Zero-string cleanup optional before external audit optics. |

## Readiness By Stage

### Ready In Code

- Android exact supported-bank gate.
- Notification listener service boundary.
- Redaction before outbox.
- Encrypted/protected outbox boundary.
- Non-debug signed upload flusher.
- Receiver register/heartbeat endpoints.
- Backend signal validation and anti-replay.
- Payment-intent-bound runtime matching.
- Manual-review-only runtime decision.
- Final-only public webhook worker.
- Receiving methods schema/API/Android onboarding persistence.

### Needs Device/Staging Proof

- Bank detection metric on the currently installed staging APK.
- Notification Listener Access enabled state.
- Receiver registration and heartbeat against `https://staging.swimpay.pro`.
- Synthetic redacted outbox upload from the installed APK to staging.
- Payment intent + receiving method checkout rehearsal.
- Manual review creation and manual confirmation.
- External staging app webhook verification.

### Security Contract Gap

The source truth says the receiver private key must never leave the device and
the backend must store only a receiver public key. The current implemented path
uses an app-generated `spk_` signing key as an HMAC verification key and sends
it to the backend in the `public_key` field during receiver registration.

This is not an auto-confirmation risk and it does not leak raw notifications,
but it is not the final production-grade receiver identity model. It should be
fixed before calling the Receiver production-ready. For a controlled
operator-owned staging capture, this requires an explicit acceptance decision if
not fixed first.

### Still Gated

Real notification capture remains gated until:

1. bank detection metric is recorded;
2. receiver registration passes;
3. heartbeat passes;
4. Notification Listener Access is enabled;
5. selected supported bank target is active;
6. synthetic redacted upload reaches staging;
7. active payment intent and receiving method are verified;
8. SDK/webhook rehearsal passes;
9. operator gives final explicit capture-start approval.

## Metrics To Record Next

- App launch to bank-detection visible time.
- Supported banks detected count.
- Receiver registration latency.
- Heartbeat latency.
- Synthetic redaction duration.
- Outbox enqueue duration.
- Upload flush latency and HTTP status.
- Backend signal ingestion time.
- Signal-worker review creation time.
- Manual confirmation to webhook delivery time.

## Guardrails Preserved

- Android does not confirm orders.
- Android does not send developer webhooks.
- No raw notification text storage or upload.
- No raw phone/card/CVV/expiry/PIN/SMS code.
- No SMS, Accessibility, bank app scraping, `QUERY_ALL_PACKAGES` or broad
  installed-app enumeration.
- No public `payment.signal_detected` or `payment.needs_review` fulfillment
  webhook.
- `payment.confirmed` remains manual-confirmation-only.
- `official_bank_confirmation=false`.

## Status

Task 635 is complete as an inventory. The next task is 636: bank detection
device metrics, followed by 637 receiver auth/registration/heartbeat.
