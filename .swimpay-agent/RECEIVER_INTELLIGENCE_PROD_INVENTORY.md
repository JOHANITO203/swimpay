# Receiver / Intelligence Production Inventory

Sprint: 9H - SwimPay Receiver / Intelligence Production Hardening

Date: 2026-05-07

## Scope Audited

- Android Receiver app: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver`
- Premium Android UI/runtime source: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium`
- TypeScript receiver package: `apps/android-receiver/src/index.ts`
- API receiver device routes: `POST /v1/receiver-devices/register`, `POST /v1/receiver-devices/heartbeat`
- API receiver signal route: `POST /v1/receiver/signals`
- Signal worker runtime: `apps/signal-worker/src/runtime.ts`
- Contracts: `packages/contracts/src/index.ts`
- Payment Intent Gate: `packages/matching-core/src/index.ts`
- Intelligence feedback/unknown shapes: `apps/api/src/intelligence.ts`, `packages/database/migrations/008_intelligence_feedback.sql`
- Receiver/device/signal storage: `packages/database/migrations/001_initial_schema.sql`
- Existing safety tests across API, contracts, matching core, Android receiver and static guardrail suites.

## Inventory Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Android NotificationListener boundary | partially ready | Uses `NotificationListenerService`, no SMS/Accessibility permission discovered. Real capture remains consent-gated. |
| Bank Target Lock / package probing | partially ready | Android tests cover exact supported package probing and no broad enumeration. Needs production guardrails retained. |
| Android Privacy Firewall | partially ready | Android-side redaction and outbox tests exist. Sprint 9H should preserve redacted-only uploads and add backend stale/raw checks. |
| Android encrypted outbox | partially ready | Encrypted outbox and retry tests exist. Production replay safety still depends on backend event/hash/counter checks. |
| Receiver device registration | partially ready | Device registration stores merchant-scoped public key and redacted audit event. Production route still accepts local test bearer unless hardened. |
| Receiver key lifecycle | partially ready | Public key registration exists and private key is device-side by design. Full safe rotation/revocation lifecycle is documented only partially. |
| Receiver heartbeat | partially ready | Heartbeat updates status and warnings for notification/listener/queue/battery. Missing bank-target and richer operational states. |
| Receiver signal signature | partially ready | HMAC canonical signature verification and constant-time comparison exist. Asymmetric production rotation remains future path. |
| Signal anti-replay | partially ready | Duplicate `event_id`, duplicate `notification_hash` and monotonic `local_counter` are enforced. Stale/future observed timestamp tolerance is missing. |
| Signal redacted payload contract | partially ready | V1 contract rejects raw notification fields and `raw_text_present=true`. Legacy signal shape remains a compatibility path that should stay constrained. |
| Receiver device upload eligibility | partially ready | Suspended/revoked/disabled are rejected. New inactive/reconnect/access/bank-target operational states need explicit rejection. |
| Payment Intent Gate | production-ready for V1 core | Tests already cover no active intent, wrong bank, negative categories, unknown/background, late payment, collision and manual-review-only strong match. |
| Signal worker runtime | partially ready | Runtime uses backend-owned decisions/reviews/webhooks. Sprint 9H should add fixture coverage and preserve no-background-review behavior. |
| Intelligence feedback persistence | production-ready for V1 passive monitoring | Durable feedback persists read-only/passive metadata and does not mutate runtime rules. |
| Unknown shape monitoring | production-ready for V1 passive monitoring | Durable unknown-shape monitoring is read-only and non-promoting. |
| Receiver health states | partially ready | UI/backend expose useful states, but backend heartbeat lacks full production state vocabulary. |
| Retention policy | missing | No dedicated Intelligence retention policy doc/hooks found. |
| Public webhook semantics | production-ready for V1 | Product-truth guardrails protect public confirmed/rejected/expired semantics and `official_bank_confirmation=false`. |
| Stale/contradictory docs | partially ready | Some historical docs mention future auto-confirm policy or old terms in tests/docs. Existing guardrails mostly constrain public/runtime impact. |

## Production Gaps To Harden In Sprint 9H

1. Receiver registration and heartbeat must reject local/dev bearer shortcuts in production.
2. Heartbeat needs a richer operational state model, especially `bank_targets_missing`, `notification_access_missing`, `needs_reconnect`, `inactive`, `revoked` and `force_review_local`.
3. Signal upload should reject stale/future observed timestamps within an explicit tolerance.
4. Upload eligibility should explicitly reject inactive/reconnect/access/bank-target/revoked states.
5. Five-bank synthetic/redacted fixture coverage should bind classifier/gate behavior to payment-intent truth.
6. Intelligence retention policy needs explicit non-destructive hooks and redacted-only export boundaries.
7. Receiver/Intelligence guardrails should scan the production Android Receiver path and backend signal path for forbidden capabilities and wording.

## Areas Preserved

- No real notification processing is required or performed by this audit.
- Android remains capture/filter/redact/sign/upload only.
- Backend remains the decision owner.
- Payment confirmation and webhook semantics stay unchanged.
- Feedback and unknown shapes remain passive, read-only monitoring inputs.

