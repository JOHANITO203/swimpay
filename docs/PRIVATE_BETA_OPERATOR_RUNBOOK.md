# Private Beta Operator Runbook

This runbook covers private beta review-first operation with synthetic merchant/order fixtures and review-only bank signal paths.

SwimPay recognizes merchant-side notification signals.

SwimPay does not provide official bank confirmation.

Review is required in beta.

## Setup

1. Create or select a beta merchant in local/dev tooling.
2. Configure a webhook endpoint for `payment.needs_review`, `payment.confirmed` and `payment.rejected`.
3. Install SwimPay Receiver on the merchant Android device.
4. Enable Android Notification Listener Access.
5. Select one or more V1 bank profiles in review-only mode.
6. Register the Receiver device.
7. Run the synthetic signal test before any real notification shadow work.

## Synthetic Order Flow

1. Create a synthetic order with `RUB` amount and HMAC/masked buyer identity only.
2. Confirm the payment session and checkout status are visible.
3. Upload or process a synthetic redacted bank signal.
4. Verify the signal creates a review queue item.
5. Verify the order remains in review/pending state until merchant/operator review.

## Review Actions

### Confirm

Use confirm only after masked sender/reference and merchant context are reviewed. The result is a manual review outcome:

- `decision=manual_confirmed`
- `confirmation_type=notification_signal`
- `official_bank_confirmation=false`

This is still not official bank confirmation.

### Reject

Reject defaults to signal scope. The linked order remains pending unless the operator explicitly selects a broader documented scope.

## Webhook Verification

Verify signed webhook headers:

- `SwimPay-Event-Id`
- `SwimPay-Delivery-Id`
- `SwimPay-Timestamp`
- `SwimPay-Signature`

Webhook payloads must include `official_bank_confirmation=false` and `confirmation_type=notification_signal`.

## Support Trace

Operators may trace:

- order id;
- payment session id;
- signal id;
- review id;
- review action;
- webhook delivery id;
- audit event id.

Operators must not expose:

- raw phone;
- raw notification text;
- raw title/body;
- webhook secrets;
- API keys.

## Incident Steps

1. Check backend health.
2. Check Receiver Notification Listener Access.
3. Check Receiver outbox status.
4. Check review queue state.
5. Check webhook delivery status and retry state.
6. Escalate if raw PII appears, listener capture is unstable, or merchant wording is misunderstood.

## Merchant-facing Wording

Use:

- "SwimPay recognizes merchant-side notification signals."
- "SwimPay does not provide official bank confirmation."
- "Review is required in beta."

Do not use official confirmation, bank-confirmed, guaranteed-payment or PSP-confirmed wording.
