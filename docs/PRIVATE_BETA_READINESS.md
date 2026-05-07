# Private Beta Readiness

Private beta can start only when the go criteria below are met and no no-go condition is active.

SwimPay is a Payment Signal Engine and not official bank confirmation. Real bank runtime starts review-only, with auto-confirm disabled.

Merchant-facing wording for beta:

- SwimPay recognizes merchant-side notification signals.
- SwimPay does not provide official bank confirmation.
- Review is required in beta.

## Go Criteria

- backend healthy;
- Android Receiver installable;
- Notification Access gate works;
- at least one bank is `approved_for_review_only`;
- package/cert evidence workflow works;
- review queue works;
- webhook delivery works;
- outbox offline/online works;
- no raw PII exposure;
- admin RBAC works;
- no automatic confirmation on real banks;
- backup/restore documented;
- merchant permission wording is understandable.

## No-go Criteria

- listener unstable;
- outbox losing signals;
- backend health unstable;
- raw notification storage;
- raw phone storage;
- weak admin auth;
- webhook failures;
- merchant cannot understand Notification Listener Access wording;
- package/cert evidence unclear;
- any flow implies official bank confirmation;
- any real bank flow bypasses merchant manual confirmation.

## Current Readiness Snapshot

All five V1 banks have package evidence for review-only MVP validation. Sprint 6C rehearsed synthetic shadow runtime for every bank, and Sprint 6D rehearsed private beta order, review and webhook behavior with synthetic merchant/order fixtures. Sprint 6E prepares the real-notification shadow readiness gate only.

Private beta still requires an explicit go/no-go review before any real bank notification shadow run. Review is required in beta.

## Sprint 7A Checkout Readiness

The buyer-facing checkout can now show a PSP-like flow without changing SwimPay's
Payment Signal Engine architecture:

- buyer selects the merchant receiver bank;
- buyer selects a payer-bank launcher or manual transfer fallback;
- buyer sees amount/reference copy actions;
- buyer may click `I paid`, which does not confirm payment;
- review-only bank signals create merchant review items only when an active payment intent matches;
- `payment.confirmed` is emitted only after merchant manual confirmation.

Buyer-facing copy must say:

```text
SwimPay recherchera le signal de paiement côté marchand.
```

The checkout must not claim official bank confirmation, guaranteed payment, PSP
confirmation, SMS access, SBP, or bank app scraping.

## Sprint 7B Hybrid Receiving Route Readiness

Private beta checkout now requires an explicit merchant receiving route:

- buyer sees receiver banks first, without card or phone details;
- route details are revealed only after bank selection;
- supported V1 route rails are `phone_transfer` and `card_transfer`;
- card routes are review-first by default in beta;
- phone routes may collect an optional buyer sender phone hint, stored only as
  HMAC and masked output;
- human-readable references are used for checkout UX and matching review;
- webhook route context is safe and excludes raw identifiers.

No-go criteria added for Sprint 7B:

- bank selection step shows raw card or phone;
- webhook/audit/log includes raw card or raw phone;
- payer launcher choice affects matching or confirmation;
- route policy bypasses merchant manual confirmation for real bank notifications.

## Sprint 7C Copy and Admin Readiness

Sprint 7C hardens the beta checkout destination reveal and adds a minimal merchant route admin surface:

- copy-details works only for the selected route on an active checkout session;
- expired, rejected and inactive sessions cannot reveal full destinations;
- reveal responses include `reveal_expires_at` and no-store/no-cache headers;
- copy-details is rate-limited by session, route and coarse client fingerprint;
- `checkout.destination_copied` audit events include masked identifiers only;
- hosted checkout browser QA covers mobile/desktop layout, route reveal, copy, payer fallback, buyer-claimed-paid, needs-review and expired states;
- merchant route admin lists only masked identifiers after save;
- card routes are still beta review-first.

No-go criteria added for Sprint 7C:

- copy endpoint reveals an unselected or disabled route;
- copy endpoint works for expired/rejected sessions;
- raw card or phone appears in audit, log, webhook, HTML or status responses;
- merchant admin displays raw identifiers after save;
- buyer-facing copy implies official bank confirmation or guaranteed payment.

## Sprint 6D Rehearsal Criteria

- synthetic merchant/order fixture exists;
- checkout/status path is represented;
- synthetic bank signals route to review queue;
- merchant/operator confirm produces manual review semantics;
- default reject scope is signal-level;
- signed webhook delivery works with `official_bank_confirmation=false` and `confirmation_type=notification_signal`;
- support trace is possible without raw phone or raw notification text.

## Sprint 6E Real-notification Shadow Gate

Safe beta defaults:

- `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=false`
- `SWIMPAY_REQUIRE_REAL_NOTIFICATION_CONSENT=true`
- `SWIMPAY_REAL_BANK_AUTO_CONFIRM=false`
- `SWIMPAY_SHADOW_AUTO_CONFIRM_PREDICTION=true`
- `SWIMPAY_RAW_NOTIFICATION_STORAGE=false`

Go criteria before the next authorized shadow sprint:

- 5 banks package evidence review-only;
- synthetic shadow runtime passed;
- private beta review/webhook rehearsal passed;
- real notification shadow gate ready;
- auto-confirm off;
- raw storage off;
- webhook signature works;
- support/audit trace works;
- Notification Listener Access onboarding is understood by the merchant.

No-go criteria:

- raw notification leak;
- raw phone leak;
- auto-confirm real bank enabled;
- webhook confirmed without manual review;
- Notification Access onboarding broken;
- receiver outbox unstable;
- backend health unstable;
- merchant-facing wording implies official bank confirmation.

Real notification shadow remains `not_started`. A future sprint must record explicit operator and merchant consent before enabling `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=true`.
