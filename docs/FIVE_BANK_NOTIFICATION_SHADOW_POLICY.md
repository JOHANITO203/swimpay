# Five-bank Notification Shadow Policy

This policy defines the first approved shape for future real bank notification testing. It is not approval to process real bank notifications yet.

SwimPay detects merchant-side notification signals. SwimPay is not a bank, PSP or official bank confirmation system. Any real bank notification testing must remain not official bank confirmation.

## Required Mode

All selected V1 banks start in review-only shadow mode:

- Sberbank
- Tinkoff / T-Bank
- VTB
- Alfa-Bank
- Gazprombank

Auto-confirm is disabled for real banks.

## Entry Requirements Before Any Real Notification Shadow Run

- explicit merchant/operator consent;
- Notification Listener Access enabled and understood by the merchant;
- selected bank profile present;
- package/cert evidence at least `approved_for_review_only`;
- backend health verified;
- outbox offline/online behavior verified;
- review queue available;
- webhook delivery available for review/test events;
- privacy checks passing.

## Privacy Requirements

- Redaction before storage or upload.
- No raw notification text storage by default.
- No raw phone storage.
- No customer data unless unavoidable for a deliberate review-only pilot.
- Masked/HMAC values only for matching and review.
- Safe logs only.

## Runtime Requirements

- Incoming-like real bank signals route to review/shadow.
- Ambiguous signals route to review.
- Cashback, refund, outgoing, promo and failed categories never auto-confirm.
- Amount-only signals never auto-confirm.
- Webhook payloads, if emitted, must include `confirmation_type=notification_signal` and `official_bank_confirmation=false`.

## Fixture Policy

False positives, ambiguous cases and negative categories should become redacted fixtures after operator review. Fixtures must use placeholders such as `<AMOUNT>`, `<CURRENCY>`, `<PHONE>`, `<PERSON>`, `<REFERENCE>` and `<CARD_MASK>`.

