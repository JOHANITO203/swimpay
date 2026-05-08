# SwimPay Intelligence Source Of Truth

Date: 2026-05-08

This document is the central source of truth for SwimPay Intelligence. It overrides stale product direction in historical notes and reports.

## 1. Definition

SwimPay Intelligence is the deterministic Payment Signal Engine inside SwimPay.

It converts authorized merchant-side Android bank notification signals into operational payment evidence for backend review flows.

SwimPay Intelligence is payment-intent-bound and manual-confirmation-only in V1.

It is not:
- a bank;
- a PSP;
- official bank confirmation;
- an SBP integration;
- a payment initiator;
- a wallet;
- SMS reading;
- bank app scraping;
- an LLM payment decision system.

## SBP Language Exception

Russian users understand phone-number bank transfers through the SBP habit and vocabulary. SwimPay may use SBP wording in merchant/buyer-facing copy for the `phone_transfer` receiving method so users recognize the expected payment action.

This is a language exception only. It does not create SBP integration behavior, payment initiation, bank APIs, SMS reading, official bank confirmation, PSP behavior or auto-confirmation.

Allowed meaning:
- `phone_transfer` can be described as a phone-number transfer via SBP in UI copy.
- SBP wording helps the user understand which familiar bank transfer flow to use.
- Runtime signals remain notification-based and review-only in V1.

Forbidden meaning:
- SwimPay must not claim to be connected to SBP.
- SwimPay must not call SBP APIs.
- SwimPay must not initiate or guarantee a transfer.
- SwimPay must not emit official bank confirmation.

## 2. Product Truth

- No active payment intent = no merchant payment review.
- `Continuer vers ma banque` arms the receiver; it does not confirm payment.
- `J'ai paye` never confirms payment.
- Merchant manual confirmation is mandatory in V1.
- `Matching 100 %` is review copy only.
- `payment.confirmed` fires only after merchant manual confirmation.
- `confirmation_type=notification_signal`.
- `official_bank_confirmation=false`.
- No auto-confirmation in V1.

## 3. Tool Map

The enforceable tool map is maintained in `.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_BOUNDARIES.md`.

Summary:
- Android tools capture, filter, redact, sign and buffer.
- API tools register devices, receive heartbeats, validate signed uploads and reject unsafe data.
- Worker tools parse, classify, gate by active payment intent and request manual review/rejection.
- Web/admin tools present redacted read models and merchant manual actions.
- SDK tools integrate orders and verified final public webhooks.

## 4. Android Responsibilities

Android Receiver:
- listens only to explicitly enabled supported bank targets;
- ignores unsupported package notifications before redaction/outbox/upload;
- treats raw notification title/body/bigText/textLines as temporary memory inputs only;
- redacts before outbox persistence;
- stores redacted payloads, hashes, counters and signatures only;
- emits heartbeat and safe health state;
- signs redacted envelopes for backend ingestion.

Android Receiver does not confirm orders.
Android Receiver does not send developer webhooks.
Android Receiver does not store or upload raw notification title/body/text.

Forbidden on Android:
- No SMS.
- No Accessibility.
- No bank app scraping.
- No QUERY_ALL_PACKAGES.
- No broad installed-app enumeration.
- No merchant secret key in Android SDK/app.

## 5. Backend Responsibilities

Backend:
- binds receiver devices to merchants;
- stores receiver public keys, never private keys;
- validates signed signal uploads;
- enforces anti-replay with `event_id`, `notification_hash` and monotonic `local_counter`;
- rejects stale/future production timestamps;
- rejects raw notification fields, raw phone/card fields and bank credentials;
- stores only redacted/safe signal metadata;
- runs Payment Intent Gate before review creation;
- owns manual review, manual rejection and manual confirmation.

Backend cannot auto-confirm V1 payments from signals.

## 6. SDK Responsibilities

`@swimpay/node`:
- creates orders server-side;
- never exposes secret keys to browsers;
- verifies webhooks with raw body;
- accepts only final public V1 events.

`@swimpay/android`:
- opens checkout URLs;
- parses return URLs;
- never contains secret keys;
- never handles webhooks;
- never confirms payment.

## 7. Operator / Admin Responsibilities

Operator/admin surfaces:
- show redacted or safe Intelligence evidence;
- allow supervised review and manual confirmation/rejection;
- expose feedback and unknown-shape monitoring as read-only inputs;
- never expose raw notification title/body/text, raw phone/card, API keys, webhook secrets or bank credentials.

Admin surfaces must not imply automatic V1 confirmation. Existing `auto_confirm*` admin/template vocabulary is legacy debt and must be renamed or quarantined before real notification tests.

## 8. Data Classification

Raw data:
- notification title/body/bigText/textLines;
- raw phone/card;
- bank credentials;
- secrets.

Raw data may exist only as temporary Android memory input long enough to redact. It must never be stored, uploaded, logged or shown.

Allowed data classes:
- redacted text with placeholders;
- masked phone/card/reference values;
- HMAC values;
- package id for exact supported targets;
- notification hash, semantic hash, payload hash;
- local counter;
- safe metrics and reason codes.

No raw notification title/body/text may cross the Android redaction boundary.

## 9. Event Taxonomy

Public V1 fulfillment events:
- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

Public events must include `confirmation_type=notification_signal` and `official_bank_confirmation=false`.

Internal-only events:
- `signal.received`
- `signal.parsed`
- `match.scored`
- `review.created`
- `review.confirmed`
- `review.rejected`
- `payment.signal_detected`
- `payment.needs_review`
- `receiver_armed`
- `buyer_claimed_paid`

Internal events must not be delivered as public merchant fulfillment webhooks.

## 10. Review And Confirmation Rules

- No active payment intent means no review.
- Unknown shape alone means no review.
- Feedback alone means no review.
- Receiver armed means no confirmation.
- Buyer claimed paid means no confirmation.
- Strong match means manual review only.
- Negative categories are rejected/ignored.
- Collision or ambiguity means caution/manual review.
- `payment.confirmed` is final and requires merchant manual confirmation.

## 11. Learning / Monitoring Rules

Feedback does not mutate runtime rules.
Unknown-shapes do not mutate runtime rules.
Feedback does not promote bank profiles.
Unknown-shapes do not promote bank profiles.

Learning and unknown-shape data are supervised monitoring inputs only in V1.

## 12. Forbidden Behaviors

- No auto-confirmation in V1.
- No LLM in payment decisions.
- No SMS.
- No Accessibility.
- No bank scraping.
- No QUERY_ALL_PACKAGES.
- No broad installed-app enumeration.
- No public internal fulfillment webhooks.
- No official bank confirmation claims.
- No raw notification storage or upload.
- No raw phone/card/PII in logs, UI, SDK examples or webhooks.

## 13. Real Notification Testing Rules

Real notification testing is allowed only in controlled staging after explicit operator approval and only for operator-owned data.

Before capture:
- staging backend must be healthy over HTTPS;
- receiver must be registered;
- heartbeat must reach staging;
- selected bank target must be explicitly enabled;
- non-debug upload transport must send redacted signed envelopes only;
- active payment intent must exist for review-flow tests.

Stop immediately if raw notification text crosses any boundary.

## 14. Known Legacy Vocabulary

Legacy or compatibility vocabulary remains in some schema/template/profile/history areas:
- `auto_confirm_status`
- `autoConfirmStatus`
- `auto_confirm_allowed_by_template`
- `auto_confirm_candidate`
- `trusted_low_amount`

These names do not authorize V1 auto-confirmation. They must be renamed or quarantined before operator-facing real notification tests.

## 15. Must-Fix Contradictions

1. Receiver signing still uses an app-generated HMAC verification key sent to
   the backend as `public_key`. Production-grade receiver identity must move to
   true Android Keystore asymmetric signing where only the public key is
   registered and the private key never leaves the device.
2. Android runtime hash prefix still uses synthetic/debug vocabulary for real
   runtime evidence and should be renamed for audit clarity.
3. Inert legacy `auto_confirm*` schema/template/fixture vocabulary remains as
   compatibility debt. Active admin/operator response vocabulary has been
   neutralized, but a zero-string cleanup is recommended before external audit
   optics.

## 16. Future-Only Items

Future supervised Intelligence improvements may be built later, but they must not alter V1 runtime behavior automatically.

Future work must preserve:
- payment-intent-bound review creation;
- merchant manual confirmation;
- final-only public webhooks;
- official_bank_confirmation=false;
- redacted-only evidence boundaries.
