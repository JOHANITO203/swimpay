# @swimpay/node

Minimal server-side Node SDK for SwimPay V1.

Use this package from a merchant backend to:

- create a SwimPay order and payment session;
- receive a `checkoutUrl`;
- verify SwimPay webhook signatures from the raw request body;
- parse typed public webhook events.

## Install

```bash
npm install @swimpay/node
```

## Create an order

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

console.log(checkout.checkoutUrl);
```

## Verify a webhook

```ts
const event = swimpay.webhooks.verify(rawBody, headers, process.env.SWIMPAY_WEBHOOK_SECRET!);

switch (event.type) {
  case "payment.confirmed":
    break;
  case "payment.rejected":
    break;
  case "payment.expired":
    break;
}
```

Public V1 events are post-review or terminal outcomes only. `payment.confirmed` fires only after merchant manual confirmation.

SwimPay is not a bank, PSP or official bank confirmation system.

Every public payment webhook is parsed with `officialBankConfirmation: false`.

## Browser redirect snippet

Browser code should only redirect to a checkout URL created by your server.

```ts
export function redirectToCheckout(checkoutUrl: string): void {
  window.location.assign(checkoutUrl);
}
```

Order creation belongs on the merchant backend.
