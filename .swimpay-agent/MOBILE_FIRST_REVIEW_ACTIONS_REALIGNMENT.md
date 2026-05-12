# Mobile-First Review Actions Realignment

generated_at: 2026-05-12T19:05:00+03:00

## Product Decision

SwimPay Merchant is mobile-first for review operations. Android Merchant is the priority surface for:

- receiving reviews;
- viewing payments to verify;
- confirming received;
- rejecting a signal;
- rejecting an order;
- handling no-notification/manual-bank-check fallbacks.

The merchant web dashboard remains secondary/frozen. Hosted buyer checkout and SDK/developer web surfaces remain active and were not changed.

## Root Cause

Generic review action endpoints supported Android mobile sessions, but `resolveMerchantContext` read a BFF dashboard cookie before checking the Android mobile bearer token.

When an Android request carried both:

- `Authorization: Bearer spm_...`; and
- a stale/ambient dashboard cookie without CSRF;

it was rejected by the dashboard CSRF branch before the Android mobile identity could be resolved. This allowed web/BFF state to block Android review actions.

## Fix

Updated merchant context resolution so routes that explicitly allow Android mobile sessions prioritize a real Android mobile bearer token (`spm_...`) before BFF dashboard cookie/CSRF handling.

This keeps dashboard CSRF intact for dashboard sessions, while making Android review actions independent from dashboard web cookies.

Follow-up hardening:

- If an `Authorization` header contains an Android mobile bearer marker (`spm_...`) on an Android-enabled merchant route, the bearer must resolve to a valid Android mobile session.
- Invalid `spm_...` credentials fail closed and never fall back silently to a dashboard cookie, even when that dashboard cookie and CSRF token are valid.
- BFF-only routes reject Android mobile bearer credentials instead of treating them as dashboard traffic.
- Receiver configuration paths using Android mobile credentials also fail closed when an invalid `spm_...` marker is present.

## Guardrails Preserved

- Android still does not confirm locally.
- Backend still owns review decisions.
- Dashboard/BFF session mutations still require CSRF.
- No hosted buyer checkout or SDK web surface was changed.
- No auto-confirmation was added.
- No public webhook semantics changed.
- No raw notification, PAN, phone or secret exposure was added.

## Tests

Added regression coverage proving an Android mobile review action succeeds with a valid `spm_...` bearer even when a dashboard cookie is present and no CSRF header is sent.

Additional regression coverage now proves:

- valid Android bearer + stale dashboard cookie => Android identity wins;
- invalid Android bearer + valid dashboard cookie/CSRF => request is rejected;
- dashboard cookie + valid CSRF + no Android bearer => dashboard action works;
- dashboard cookie without CSRF => dashboard action is rejected;
- BFF-only route + Android bearer => rejected;
- Android merchant A cannot act on merchant B review;
- Android confirm/reject actions preserve manual-confirmation-only semantics and `official_bank_confirmation=false`.

Targeted verification passed:

```bash
npm test -- apps/api/src/android-merchant.test.ts -t "lets Android mobile review actions bypass dashboard CSRF"
npm test -- apps/api/src/android-merchant.test.ts apps/api/src/reviews.test.ts
npm test -- apps/api/src/android-merchant.test.ts -t "manual confirmation|manual bank check|signal and order rejection|invalid Android bearer|BFF-only|stale dashboard|dashboard CSRF|merchant boundaries"
```
