# SwimPay Web SDK Quickstart

This guide shows the minimal production-safe Web/Node integration for SwimPay V1.

SwimPay is a Payment Signal Engine. It is not a bank, PSP or official bank confirmation system.

V1 public webhooks are post-review or terminal outcomes only:

- `payment.confirmed`
- `payment.rejected`
- `payment.expired`

`payment.confirmed` fires only after merchant manual confirmation.

## Environment

```bash
SWIMPAY_SECRET_KEY=sk_test_replace_me
SWIMPAY_WEBHOOK_SECRET=whsec_replace_me
SWIMPAY_API_BASE_URL=http://localhost:8080
```

Keep the server secret in your backend environment.

Do not place merchant secrets in mobile apps.

Do not place merchant secrets in frontend code.

## Install

```bash
npm install @swimpay/node
```

## Server-side order creation

```ts
import { SwimPay } from "@swimpay/node";

const swimpay = new SwimPay({
  secretKey: process.env.SWIMPAY_SECRET_KEY!,
  apiBaseUrl: process.env.SWIMPAY_API_BASE_URL
});

const checkout = await swimpay.orders.create(
  {
    externalOrderId: "ORDER_1048",
    amountMinor: 139000,
    currency: "RUB",
    description: "VPN subscription",
    returnUrl: "https://merchant.example/orders/1048",
    customer: {
      firstName: "Ivan",
      lastName: "Ivanov",
      phone: "+79991234567"
    },
    metadata: {
      product: "vpn_monthly"
    }
  },
  {
    idempotencyKey: "ORDER_1048"
  }
);

return checkout.checkoutUrl;
```

Use one idempotency key per order creation attempt. The simplest key is your `externalOrderId`.

## Redirect the buyer

Browser code should only receive a `checkoutUrl` from your server.

### Buyer-facing button

```html
<style>
.swimpay-button {
  min-height: 56px;
  border: 0;
  border-radius: 18px;
  padding: 0 24px;
  color: white;
  background: linear-gradient(135deg, #0097A7, #00698B);
  font: 800 16px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  cursor: pointer;
  box-shadow: 0 14px 32px rgba(0, 151, 167, 0.26);
}
.swimpay-button:disabled {
  cursor: progress;
  opacity: 0.72;
}
</style>
<button id="swimpay-button" class="swimpay-button" type="button">Payer avec SwimPay</button>
```

```ts
const button = document.getElementById("swimpay-button") as HTMLButtonElement;
button.addEventListener("click", async () => {
  button.disabled = true;
  try {
    const orderId = getCurrentOrderId();
    const response = await fetch(`/api/orders/${orderId}/swimpay-checkout`, {
      method: "POST"
    });
    const checkout = await response.json() as { checkoutUrl: string };
    window.location.assign(checkout.checkoutUrl);
  } finally {
    button.disabled = false;
  }
});
```

The button calls your merchant backend. The backend creates the SwimPay order and returns only `checkoutUrl`.

```ts
export function redirectToCheckout(checkoutUrl: string): void {
  window.location.assign(checkoutUrl);
}
```

Order creation must stay server-side.

## Webhook route with raw body

Express example:

```ts
import express from "express";
import { SwimPay } from "@swimpay/node";

const app = express();
const swimpay = new SwimPay({
  secretKey: process.env.SWIMPAY_SECRET_KEY!,
  apiBaseUrl: process.env.SWIMPAY_API_BASE_URL
});

app.post("/webhooks/swimpay", express.raw({ type: "application/json" }), (req, res) => {
  const event = swimpay.webhooks.verify(
    req.body,
    req.headers,
    process.env.SWIMPAY_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case "payment.confirmed":
      // Release the merchant order here.
      break;
    case "payment.rejected":
      // Mark the merchant order rejected.
      break;
    case "payment.expired":
      // Mark the merchant order expired.
      break;
  }

  res.sendStatus(200);
});
```

Use `express.raw({ type: "application/json" })` for the webhook route. Signature verification requires the exact raw request body.

## Public event shape

```ts
type SwimPayPublicWebhookEvent =
  | { type: "payment.confirmed"; data: PaymentData }
  | { type: "payment.rejected"; data: PaymentData }
  | { type: "payment.expired"; data: PaymentData };
```

Public event data includes:

- `orderId`
- `externalOrderId`
- `paymentSessionId`
- `amountMinor`
- `currency`
- `confirmationType`
- `officialBankConfirmation`
- `decision`

`officialBankConfirmation` is always `false`.

## Security notes

- Verify every webhook signature.
- Use the raw request body for verification.
- Use `SwimPay-Event-Id` as your webhook idempotency key.
- Use `Idempotency-Key` when creating orders.
- Fulfill only from verified `payment.confirmed`.
- `payment.confirmed` is a merchant-reviewed operational outcome.
- Do not fulfill from internal detected or review states.
- Do not collect card security codes or card validity dates for SwimPay matching.
- Do not put merchant secrets in public clients.
- Do not send raw phone, raw card or raw notification text in metadata.
