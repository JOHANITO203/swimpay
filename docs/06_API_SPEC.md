# 06 — API Specification

All public APIs use JSON.

Base path:

```text
/v1
```

## Authentication

Merchant API endpoints require an API key.

Recommended header:

```text
Authorization: Bearer sk_live_or_test_...
```

API keys are stored hashed.

## Common response fields

Errors must use:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## POST `/v1/orders`

Creates an order and a payment session.

The merchant backend must call this endpoint. Buyer-facing web or Android clients must not contain the merchant secret key.

### Request

```json
{
  "external_id": "order_888",
  "amount": {
    "value": "1390.00",
    "currency": "RUB"
  },
  "product": {
    "id": "premium_pack",
    "name": "Premium Pack",
    "risk_level": "low"
  },
  "expires_in_seconds": 900,
  "metadata": {
    "source": "merchant_checkout"
  }
}
```

#### `display_price` (optional)

A formatted price string that the merchant's storefront already displays to the
buyer, e.g. `"€9.99"`, `"1 000 FCFA"`, `"$10.99"`, `"999 ₽"`. When present,
SwimPay parses the currency and amount from the string and resolves the order
currency automatically.

Rules:

- `amount` takes precedence when both `amount` and `display_price` are provided.
- At least one of `amount` or `display_price` is required (error: `"Order requires either amount or display_price."`).
- Native currencies (RUB, USD, XOF) pass through as-is. Any other recognised
  currency (EUR, GBP, XAF, JPY, CAD, AUD, CHF, CNY, TRY, AED, KZT, UAH, NGN,
  GHS) is converted to USD at the current ECB rate (frankfurter.dev, cached 1 h,
  stale tolerated ≤ 24 h).
- Bare `$` is interpreted as USD. Prefixed dollar variants (CA$, A$) are
  rejected. Bare numbers with no currency symbol are rejected.
- Conflicting currency signals within the same string are rejected.
- Decimal separator is per-currency: `,` for RUB / EUR / TRY / UAH / KZT;
  `.` otherwise. A lone canonical-decimal separator with a 3-digit tail is
  invalid (e.g. `$10.999`); the other separator is treated as a grouping
  separator.

Accepted `display_price` examples:

```
"999 ₽"          → RUB 99900 minor (native, no conversion)
"1 000 FCFA"     → XOF 1000 minor (native, zero-decimal currency, no conversion)
"€9.99"          → EUR 999 minor → converted to USD at live ECB rate
```

#### Accepted order currencies

`amount.currency` must be one of: `RUB`, `XOF`, `XAF`, `USD`.

`XAF` is accepted as an explicit `amount.currency`. A `display_price` string
detected as XAF is treated as a non-native currency and converted to USD (native
currencies for display_price detection are RUB, USD, and XOF only).

#### Currency symmetry gate

The symmetry gate applies to the **resolved** currency (after any FX conversion).
If the merchant has no active receiving route for the resolved currency, the order
is refused with `409 merchant_currency_route_required`. For example, a
`display_price` of `"€9.99"` resolves to USD; if the merchant has no active USD
receiving route, the order is rejected.

#### Order creation error codes

| Code | HTTP | Meaning |
|---|---|---|
| `currency_detection_ambiguous` | 400 | `display_price` currency could not be determined: bare number, unrecognised code, prefixed dollar (`CA$`, `A$`), or conflicting currency signals |
| `invalid_request` | 400 | `display_price` currency was detected but the amount string is syntactically invalid for it (e.g. a 3-digit tail after the currency's canonical decimal separator: `$10.999`, or decimals on a zero-decimal currency: `10.5 FCFA`) |
| `fx_rate_unavailable` | 409 | FX conversion required but the live rate could not be retrieved within the staleness window (≤ 24 h), or FX is unconfigured |

### Response

```json
{
  "order_id": "ord_01",
  "payment_session_id": "ps_01",
  "status": "payment_session_created",
  "checkout_url": "https://pay.swimpay.app/checkout/ps_01",
  "display_price": {
    "value": "1390.00",
    "currency": "RUB"
  },
  "expected_payment_amount": {
    "value": "1390.35",
    "currency": "RUB"
  },
  "reconciliation_delta": {
    "value": "0.35",
    "currency": "RUB"
  },
  "reference": "TANGO ALFA",
  "expires_at": "2026-05-01T21:15:00Z"
}
```

### Behavior

- Generate payment session.
- Generate human-readable payment reference.
- Compute a bounded reconciliation amount when policy enables it.
- Return the exact expected amount the buyer must send.
- Emit `order.created` and `payment_session.created`.
- Do not arm the Receiver yet.
- Do not confirm payment.
- Do not enable auto-confirmation in V1.

Buyer recognition hints are collected in hosted checkout before payment instructions. Recognition hints are for matching only and must not include CVV, expiration date, PIN, SMS code or bank password.

Safe derived fields may include:

- buyer phone HMAC and masked value;
- buyer source card encrypted value, HMAC, masked value and last4.

Raw buyer source card and raw phone values must not be logged, rendered in merchant UI or sent in webhooks.

## Hosted checkout flow

The hosted checkout page steps the buyer through a sequence of states. The
current state is returned by every checkout mutation response and by `GET
/v1/checkout/:id/status`.

Typical state sequence:

```
buyer_identity
  ↓  (when merchant has ≥ 2 receivable currencies and no currency is locked)
currency_selection
  ↓
receiver_bank_selection  (or receiving_route_selection when rails bypass bank step)
  ↓
receiving_route_selection
  ↓
payer_bank_launcher_selection  (USD wallet routes only)
  ↓
payment_instructions
  ↓
awaiting_payment
```

### `currency_selection` state

The `currency_selection` step is inserted **between** `buyer_identity` and
`receiver_bank_selection` when all of the following are true:

- The merchant has 2 or more active receivable currencies
  (`payableCurrencyCount >= 2`).
- The buyer has not yet made a currency selection (`currency_selected_at` is
  null).
- No receiving route and no receiver bank have been locked for the session.

The step is **skipped automatically** when the merchant has only one receivable
currency. Existing single-currency integrations are unaffected.

Re-selection is permitted (via `POST /v1/checkout/:id/currency`) until a
receiving route is locked. Once a route is locked the `currency_selection` step
is no longer offered and the currency cannot be changed.

The live quote is locked until the session expires (`valid_until`). No
background re-quoting occurs between the buyer's selection and payment
instructions; the rate shown is the rate used.

## POST `/v1/checkout/{payment_session_id}/continue-to-bank`

Arms the merchant Receiver after the buyer chooses to continue to their bank.

This is the required bank launcher step. Opening a bank app does not prove payment.

### Response

```json
{
  "payment_session_id": "ps_01",
  "status": "receiver_armed",
  "receiver_armed": true,
  "bank_launch_attempted": true,
  "fallback_copy": "Copiez les details et ouvrez votre banque manuellement."
}
```

### Behavior

- Transition the payment session/order to `receiver_armed` when allowed.
- Write an audit event.
- Do not confirm payment.
- Do not send developer webhooks.

## POST `/v1/checkout/{payment_session_id}/claimed-paid`

Records that the buyer clicked `J'ai paye`.

### Response

```json
{
  "payment_session_id": "ps_01",
  "status": "buyer_claimed_paid",
  "buyer_claimed_paid": true,
  "safe_status": "searching_signal"
}
```

### Behavior

- `J'ai paye` is not payment proof.
- It never confirms an order.
- It never sends developer webhooks.
- SwimPay still waits for a merchant-side bank notification signal and merchant manual confirmation.

## GET `/v1/orders/{order_id}`

Returns order status.

```json
{
  "order_id": "ord_01",
  "external_id": "order_888",
  "status": "awaiting_payment",
  "payment_session_id": "ps_01",
  "amount": {
    "value": "137.00",
    "currency": "RUB"
  },
  "expires_at": "2026-05-01T21:15:00Z",
  "latest_event": "payment_session.receiver_armed"
}
```

## GET `/v1/checkout/:id/payable-currencies`

Returns the list of currencies the buyer can pay in for this checkout session,
each with a live quote from the session's base currency. No authentication
required (buyer-facing endpoint, same auth model as other `/v1/checkout/` paths).

### Response

```json
{
  "currencies": [
    {
      "currency": "RUB",
      "amount_minor": 99900,
      "formatted": "999 ₽",
      "is_current": true
    },
    {
      "currency": "USD",
      "amount_minor": 1099,
      "formatted": "$10.99",
      "is_current": false,
      "quote": {
        "rate": "0.011045",
        "source": "cbr",
        "base_currency": "RUB",
        "base_amount_minor": 99900
      }
    },
    {
      "currency": "XOF",
      "amount_minor": 6560,
      "formatted": "6560 FCFA",
      "is_current": false,
      "quote": {
        "rate": "0.65596",
        "source": "ecb+uemoa_peg",
        "base_currency": "RUB",
        "base_amount_minor": 99900
      }
    }
  ]
}
```

### Behavior

- Quotes are computed from the session's **base currency** (`base_currency` /
  `base_amount_minor` when set; otherwise the session's current `currency` /
  `expected_amount_minor`). This ensures re-selection always quotes from the
  original session amount, never from a previously selected currency.
- The current session currency is always present in the list with `is_current:
  true` and no `quote` block.
- Currencies for which an FX rate cannot be obtained are **silently omitted**
  from the list. The endpoint never returns a 5xx because a rate source is
  unavailable.
- FX sources: ECB via frankfurter.dev (`source: "ecb"`), Central Bank of Russia
  daily XML (`source: "cbr"`), fixed UEMOA peg 655.957 XOF/EUR (`source:
  "uemoa_peg"`). Multi-leg paths join source labels with `+` (e.g.
  `"ecb+uemoa_peg"`, `"cbr+ecb"`). Rates are composed without intermediate
  rounding; a single final round is applied to the target minor amount.

### Errors

| Code | HTTP | Meaning |
|---|---|---|
| `not_found` | 404 | Payment session does not exist or is expired |

---

## POST `/v1/checkout/:id/currency`

Re-quotes the session in the selected currency. Must be called before a
receiving route is locked. Identity selection (posting the current currency) is
allowed and marks the currency selection step complete without changing amounts.

### Request

```json
{
  "currency": "USD"
}
```

### Response

Same shape as other checkout mutation responses: the refreshed checkout state
including the new `checkout_state`.

### Behavior

- Validates the requested currency is in the merchant's receivable set; rejects
  unknown currencies with `currency_not_payable`.
- Quotes from the session base currency to the selected currency (same FX
  sources as the listing endpoint). On FX failure, returns `fx_rate_unavailable`
  rather than silently proceeding.
- Calls the `requotePaymentSessionCurrency` repository method inside a
  transaction: the previous amount lease is released, the session currency and
  amounts are updated, and `currency_selected_at` is set.
- `base_currency` and `base_amount_minor` are frozen at the first selection
  (`COALESCE`-semantics: never overwritten on re-selection). Subsequent
  re-selections always quote from the original base.
- The quote is locked until the session expires (`valid_until`). No implicit
  re-quoting occurs; re-selection requires an explicit POST.
- Re-selection is allowed as long as `selected_receiving_route_id` is null.
  Once a route is locked the session cannot be re-quoted.

### Errors

| Code | HTTP | Meaning |
|---|---|---|
| `currency_not_payable` | 400 | The requested currency is not in the merchant's receivable set |
| `fx_rate_unavailable` | 409 | A rate could not be obtained for the requested currency |
| `route_already_locked` | 409 | A receiving route has already been selected; the currency can no longer be changed |
| `checkout_step_out_of_order` | 409 | Session is in a terminal or non-requotable state |
| `not_found` | 404 | Payment session does not exist |

---

## GET `/v1/payment-sessions/{id}`

Returns payment session state.

```json
{
  "payment_session_id": "ps_01",
  "order_id": "ord_01",
  "status": "awaiting_payment",
  "amount": {
    "value": "137.00",
    "currency": "RUB"
  },
  "reference": "SWP-A8K2",
  "receiver_status": "armed",
  "expires_at": "2026-05-01T21:15:00Z"
}
```

## POST `/v1/receiver-devices/register`

Registers an Android Receiver device.

### Request

```json
{
  "device_name": "Merchant Phone",
  "public_key": "base64_public_key",
  "app_version": "1.0.0",
  "android_version": "15",
  "selected_banks": ["sber_ru", "tbank_ru"]
}
```

### Response

```json
{
  "device_id": "dev_01",
  "status": "pending",
  "trust_score": 0
}
```

## POST `/v1/receiver-devices/heartbeat`

Receiver heartbeat.

### Request

```json
{
  "device_id": "dev_01",
  "notification_access": true,
  "listener_connected": true,
  "allowed_banks": ["sber_ru", "tbank_ru"],
  "queue_length": 0,
  "last_signal_at": "2026-05-01T21:00:00Z",
  "app_version": "1.0.0",
  "status": "healthy"
}
```

## POST `/v1/receiver/signals`

Receives a signed payment signal from Android Receiver.

### Request

```json
{
  "event_id": "evt_local_01",
  "device_id": "dev_01",
  "merchant_id": "mch_01",
  "bank_profile_id": "sber_ru",
  "package_name": "TO_VERIFY_FROM_DEVICE",
  "package_cert_sha256": "TO_VERIFY_FROM_DEVICE",
  "channel_id": "bank_alerts",
  "notification_hash": "sha256_hash",
  "local_counter": 1821,
  "observed_at": "2026-05-01T21:01:12Z",
  "payload": {
    "title_redacted": "поступление <AMOUNT> <CURRENCY>",
    "body_redacted": "перевод от <PERSON> <PHONE>. <REFERENCE>",
    "amount_minor": 13700,
    "currency": "RUB",
    "sender_phone_hmac": "hmac_...",
    "sender_phone_masked": "+7 *** *** **67",
    "reference_hmac": "hmac_...",
    "reference_code_masked": "SWP-A***"
  },
  "signature": "base64_signature"
}
```

### Response

```json
{
  "signal_id": "sig_01",
  "status": "received"
}
```

### Behavior

- Verify device exists.
- Verify signature.
- Verify event id uniqueness.
- Verify notification hash uniqueness.
- Verify local counter is increasing.
- Store signal (including the optional `channel_id`).
- Channel-ID learning (migration 031): if `channel_id` is present, look it up in
  `bank_notification_channels` for the signal's `bank_profile_id`. A `confirmed`
  pair marks the stored signal `channel_recognized`; an unseen pair is recorded
  `pending` (incrementing `sample_count`) for operator confirmation. This never
  blocks ingestion and never auto-confirms a payment.
- Emit `signal.received`.

## GET `/v1/payment-signals`

Returns merchant visible payment signals with masked sensitive data.

## GET `/v1/reviews`

Returns open review items.

Response fields are merchant-visible and redacted. Phone/reference values are masked only.

```json
{
  "reviews": [
    {
      "review_id": "rev_01",
      "status": "open",
      "reason_code": "amount_collision",
      "order_id": "ord_01",
      "payment_session_id": "ps_01",
      "signal_id": "sig_01",
      "amount": {
        "value": "137.00",
        "currency": "RUB"
      },
      "bank_profile_id": "sber_ru",
      "direction_label": "incoming_customer_transfer",
      "signal_quality": 72,
      "score": 68,
      "positive_reasons": ["amount_exact"],
      "negative_reasons": ["amount_collision"],
      "sender_phone_masked": "+7 *** *** **67",
      "reference_code_masked": "SWP-A***",
      "recommended_action": "manual_review",
      "created_at": "2026-05-02T10:00:00Z"
    }
  ]
}
```

## POST `/v1/reviews/{id}/confirm`

Manual confirm.

### Behavior

- Requires merchant authorization.
- Creates review action.
- Updates order/session status.
- Creates audit event.
- Emits an internal review event with `confirmation_type = notification_signal` and `official_bank_confirmation = false`.
- Webhook delivery is handled by the webhook worker task.

Response:

```json
{
  "review_id": "rev_01",
  "status": "confirmed",
  "order_id": "ord_01",
  "payment_session_id": "ps_01",
  "order_status": "manual_confirmed",
  "payment_session_status": "manual_confirmed"
}
```

## POST `/v1/reviews/{id}/reject`

Manual reject with explicit scope. Default scope is `signal`.

Request:

```json
{
  "scope": "signal",
  "reason": "false_positive"
}
```

Allowed scopes:

- `signal`
- `payment_session`
- `order`

Behavior:

- `signal`: reject the review and linked signal only; order and payment session stay unchanged unless already terminal.
- `payment_session`: reject the review, linked signal and linked payment session; order stays unchanged.
- `order`: reject the review, linked signal, linked order and linked payment session.

Response:

```json
{
  "review_id": "rev_01",
  "status": "rejected",
  "order_id": "ord_01",
  "payment_session_id": "ps_01",
  "rejection_scope": "signal",
  "reason": "false_positive",
  "order_status": "awaiting_payment",
  "payment_session_status": "awaiting_payment"
}
```

Repeating the same rejection scope is idempotent. Escalating a resolved rejection to another scope returns `review_rejection_scope_conflict`.

## GET/POST `/v1/merchant/receiving-methods`

Manages the merchant's receiving routes for hosted checkout.

### Rail types

| `rail_type` | Description | Accepted `bank_profile_id` values |
|---|---|---|
| `phone_transfer` | Domestic phone/SBP transfer (RUB) | Russian bank profiles (e.g. `sber_ru`) |
| `card_transfer` | Card-to-card transfer (RUB) | Russian bank profiles |
| `mobile_money` | West Africa mobile money (XOF) | WA profiles (e.g. `wave_ci`, `orange_money_ci`, `mtn_momo_ci`) |
| `wallet_transfer` | International wallet (USD) | `wise_int`, `revolut_int`, `payoneer_int` |

### `wallet_transfer` routes

`wallet_transfer` routes target international wallet profiles only (`wise_int`,
`revolut_int`, `payoneer_int`). These profiles settle in USD.

Supported `receiver_identifier_type` values and formats:

| Type | Format | Example |
|---|---|---|
| `email` | Standard e-mail address | `jane@example.com` |
| `tag` | `@` prefix, 3–32 chars `[a-z0-9_]` | `@janedoe` |
| `phone` | E.164 international phone number | `+14155552671` |

Masked forms returned by the API (raw identifier is never exposed):

| Type | Masked example |
|---|---|
| `email` | `j•••@•••.com` |
| `tag` (≥ 4 chars) | `@w•••67` |
| `tag` (≤ 3 chars) | `@•••c` |
| `phone` | `+••• ••• ••67` |

USD checkout sessions display the merchant's active `wallet_transfer` routes as
payer launchers (Wise / Revolut / Payoneer).

## POST `/v1/webhook-endpoints`

Creates webhook endpoint.

```json
{
  "url": "https://merchant.example/webhooks/swimpay",
  "enabled_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
}
```

#### Supported event types

| Event type | Description | Default for new integrations |
|---|---|---|
| `payment.confirmed` | Emitted after merchant manual confirmation. Fulfillment-safe. | Yes |
| `payment.rejected` | Emitted on explicit order/payment rejection. Fulfillment-safe. | Yes |
| `payment.expired` | Emitted when the payment session expires without confirmation. Fulfillment-safe. | Yes |
| `payment.currency_mismatch` | Informational only. Fired when a captured signal's currency differs from all active sessions for the merchant but a cross-currency session matches by reference or minor-amount. No review is created; no fulfillment action. Existing endpoints must opt in. | Yes (new provisioning only) |

V1 public webhook endpoints are for post-review or terminal outcomes only. Internal signal/review states must not be used by merchant systems to release goods.

## GET `/v1/webhook-deliveries`

Returns delivery status.

## POST `/v1/webhook-deliveries/{id}/replay`

Replays a delivery.

## Idempotency

Endpoints that create resources should support idempotency key when appropriate.

Webhook consumers must use `SwimPay-Event-Id` as idempotency key.
