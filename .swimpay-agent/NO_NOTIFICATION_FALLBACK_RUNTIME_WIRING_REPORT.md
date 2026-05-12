# No-Notification Fallback Runtime Wiring Report

Date: 2026-05-12

## Implemented

### Docker / env runtime

Added fallback worker environment variables to Docker Compose shared runtime env:

```txt
NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true
NO_NOTIFICATION_FALLBACK_MIN_SECONDS=120
NO_NOTIFICATION_FALLBACK_POLL_INTERVAL_MS=30000
NO_NOTIFICATION_FALLBACK_BATCH_SIZE=25
```

Updated `.env.example` with the same values.

These values are not secrets and should be copied to the VPS environment.

### Shared contract

Added shared fallback review types in `packages/contracts/src/index.ts`:

- `FallbackReviewReason`;
- `FallbackReviewReasons`;
- `ManualBankCheckReview`.

Contract preserves:

- `review_type="manual_bank_check"`;
- `status="needs_review"`;
- `payment_confirmed=false`;
- `webhook_sent=false`;
- `official_bank_confirmation=false`.

### Runtime behavior confirmed by tests

Existing fallback runtime behavior remains:

- scans only when enabled;
- due threshold defaults to 120 seconds;
- uses `receiver_armed_at`;
- creates manual review only;
- does not emit public webhook;
- does not confirm payment.

## VPS action

Set these on Dokploy/VPS for the job worker runtime:

```bash
NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true
NO_NOTIFICATION_FALLBACK_MIN_SECONDS=120
NO_NOTIFICATION_FALLBACK_POLL_INTERVAL_MS=30000
NO_NOTIFICATION_FALLBACK_BATCH_SIZE=25
```

Then redeploy/restart `swimpay-job-worker` and verify `/health` shows:

```json
{
  "no_notification_fallback": {
    "status": "configured",
    "polling_enabled": true
  }
}
```

## Not changed

- No payment confirmation semantics changed.
- No webhook semantics changed.
- No real bank notification processing added.
- No SMS, Accessibility, scraping, or raw notification storage added.

