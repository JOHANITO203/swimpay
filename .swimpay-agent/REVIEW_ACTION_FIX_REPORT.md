# Review Action Fix Report

Date: 2026-05-12

## Root Cause

`CONFIRMER REÇU` returned `Action indisponible` because Android posted to `POST /v1/reviews/:id/confirm`, but that route accepted only dashboard/BFF merchant sessions with CSRF or dev bearer context.

Android mobile sessions could read the review queue and reject reviews, but could not confirm reviews:

- `GET /v1/reviews`: Android mobile accepted.
- `POST /v1/reviews/:id/reject`: Android mobile accepted.
- `POST /v1/reviews/:id/confirm`: Android mobile rejected.

The repo also had a test explicitly asserting this old behavior.

## Backend Fix

- Added `payments.review.confirm` to Android Merchant mobile permissions.
- Updated `POST /v1/reviews/:id/confirm` to allow Android mobile context while preserving CSRF for dashboard/BFF sessions.
- Kept confirmation backend-owned only.
- Kept `official_bank_confirmation=false`.
- Kept final public event emission after backend merchant action only.

## Android Fix

- Added `confirmReceived` action wiring.
- `CONFIRMER REÇU` now posts to `/v1/reviews/:id/confirm` with:
  - `actor_id=android_merchant`;
  - safe reason text;
  - `feedback_label=true_payment`.
- Existing reject actions remain:
  - `REJETER LE SIGNAL` -> `scope=signal`;
  - `Rejeter la commande` -> `scope=order`.
- If backend closes the review before detail refresh returns, Android shows a resolved state instead of falling into a broken `Action indisponible`.

## Safety

- Android still does not confirm locally.
- Android still does not emit merchant webhooks.
- Android only asks backend to record the merchant decision.
- No raw notification, PAN, phone or secret is exposed.
- No auto-confirmation was added.

