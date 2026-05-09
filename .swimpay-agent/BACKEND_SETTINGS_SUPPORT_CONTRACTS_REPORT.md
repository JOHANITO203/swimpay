# Backend settings and support contracts report

generated_at: 2026-05-09T00:08:00+03:00

## Contracts added

- `POST /v1/android-merchant/support-tickets`
- `GET /v1/android-merchant/confirmation-settings`
- `PUT /v1/android-merchant/confirmation-settings`

## Persistence

- Added `packages/database/migrations/012_android_merchant_support_tickets.sql`.
- Added `PgAndroidMerchantSupportTicketRepository`.
- Support tickets store sanitized message, subject, category and allowlisted safe context only.

## Auth and tenant boundary

- Support ticket creation requires an Android mobile session.
- `merchant_id` and `user_id` come from the session, not the client body.
- Confirmation settings require an Android merchant context.

## Safety

- Raw notification fields, raw card/phone-like values, API keys, webhook secrets, PIN, CVV and SMS codes are rejected.
- Auto-confirmation settings are rejected.
- Public-bank confirmation claims remain false.
