# SDK Web Production Report

generated_at: 2026-05-06T00:00:00+03:00

Sprint: 9B - SDK Web Production Readiness

## Summary

Sprint 9B added a minimal production-safe server-side Node SDK for SwimPay V1.

Package:

```text
packages/swimpay-node
```

Public package name:

```text
@swimpay/node
```

## SDK Inventory Result

Inventory report:

```text
.swimpay-agent/SDK_WEB_PACKAGE_INVENTORY.md
```

Findings:

- Repo package convention is `packages/*`.
- Existing webhook signing method is HMAC-SHA256 over `timestamp.rawPayload`.
- Current API docs define server-side `POST /v1/orders`.
- No packaged merchant-facing SDK existed before Sprint 9B.

## Client API

Added:

```ts
import { SwimPay } from "@swimpay/node";

const swimpay = new SwimPay({
  secretKey: process.env.SWIMPAY_SECRET_KEY!,
  apiBaseUrl: process.env.SWIMPAY_API_BASE_URL
});
```

Properties:

- `swimpay.orders`
- `swimpay.webhooks`
- `SwimPay.parseWebhookEvent`

The client keeps merchant secrets server-side and does not depend on internal runtime/database models.

## Orders Create Helper

Added:

```ts
swimpay.orders.create(input, options)
```

Behavior:

- sends `POST /v1/orders`;
- sets `Authorization: Bearer <secretKey>`;
- sets `Idempotency-Key` when provided;
- validates `amountMinor` as a positive integer;
- validates currency as uppercase three-letter code;
- rejects unsafe fields such as `auto_confirm`, `autoConfirm`, card numbers, card security codes and card validity fields;
- returns typed `orderId`, `paymentSessionId`, `checkoutUrl`, `status` and optional `expiresAt`.

## Webhook Verifier

Added:

```ts
swimpay.webhooks.verify(rawBody, headers, webhookSecret)
```

Behavior:

- requires `SwimPay-Event-Id`;
- requires `SwimPay-Timestamp`;
- requires `SwimPay-Signature`;
- verifies HMAC-SHA256 signature over `timestamp.rawPayload`;
- uses constant-time comparison;
- rejects stale timestamps;
- parses raw-body JSON only after signature validation;
- returns typed public webhook events.

## Public Webhook Event Types

SDK public V1 events:

- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

The parser rejects non-public fulfillment event types such as:

- `payment.signal_detected`
- `payment.needs_review`

Public events normalize to camelCase fields and require `officialBankConfirmation: false`.

## Typed Errors and Idempotency

Added typed errors:

- `SwimPayError`
- `SwimPayApiError`
- `SwimPayValidationError`
- `SwimPayWebhookSignatureError`
- `SwimPayWebhookTimestampError`
- `SwimPayNetworkError`
- `SwimPayTimeoutError`

Errors expose safe fields only:

- `code`;
- `message`;
- optional `statusCode`;
- optional `requestId`;
- optional sanitized `details`.

Errors do not include merchant secrets, webhook secrets, raw payloads or Authorization headers.

## Web Helper / Snippet

Added browser-safe redirect snippet in docs and package README:

```ts
export function redirectToCheckout(checkoutUrl: string): void {
  window.location.assign(checkoutUrl);
}
```

No browser package was created in this sprint. The browser-safe surface is intentionally only redirect/open of an existing `checkoutUrl`.

## Docs and Examples

Added:

- `docs/SDK_WEB_QUICKSTART.md`
- `packages/swimpay-node/README.md`
- `examples/web-node-basic/package.json`
- `examples/web-node-basic/.env.example`
- `examples/web-node-basic/README.md`
- `examples/web-node-basic/server.ts`

Docs cover server-side order creation, redirecting the buyer to `checkoutUrl`, raw-body webhook verification, terminal/post-review event handling, idempotency, security notes and manual-confirm-only V1 semantics.

## Product Truth Guardrails

Added:

- `packages/swimpay-node/src/index.test.ts`
- `tests/sdk-web-product-truth.test.ts`

Guardrails verify safe order payloads, rejection of auto-confirmation fields, amount/currency validation, idempotency, secret-safe errors, webhook signature validation, public event type boundaries, `officialBankConfirmation=false`, and SDK-facing docs/examples safety.

## Validation Results

Completed during Sprint 9B:

- `npx vitest run packages/swimpay-node/src/index.test.ts tests/sdk-web-product-truth.test.ts` passed: 2 files, 25 tests.
- `npm run android:doctor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 62 files, 439 tests.
- `npm run build` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml config` passed.
- `docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api proxy` passed after Docker was restarted.
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps` passed with Postgres, Valkey, NATS, API, web and proxy healthy.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health` passed with database, NATS and Valkey `ok`.

## Remaining Gaps

- No separate browser SDK package was created; docs provide a safe redirect helper snippet.
- Android SDK remains intentionally out of scope for Sprint 9B.
- Developer Integration Wizard remains out of scope for Sprint 9B.
- Docker live validation passed after Docker Desktop was restarted and Compose services were started.

## Next Recommended Sprint

Sprint 9C - Android merchant SDK/helper and Developer Integration Wizard production readiness.
