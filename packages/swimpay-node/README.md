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

```html
<style>
.swimpay-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 56px;
  border: 0;
  border-radius: 18px;
  padding: 0 24px;
  color: white;
  background: linear-gradient(135deg, #0097A7, #00698B);
  font: 800 16px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  cursor: pointer;
  box-shadow: 0 14px 32px rgba(0, 151, 167, 0.26);
  white-space: nowrap;
}
.swimpay-button-icon {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: center / contain no-repeat url("./assets/swimpay-sdk-button-icon-96.png");
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.18));
}
.swimpay-button:disabled {
  cursor: progress;
  opacity: 0.72;
}
</style>
<button id="swimpay-button" class="swimpay-button" type="button">
  <span class="swimpay-button-icon" aria-hidden="true"></span>
  <span>Payer avec SwimPay</span>
</button>
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

```ts
export function redirectToCheckout(checkoutUrl: string): void {
  window.location.assign(checkoutUrl);
}
```

Order creation belongs on the merchant backend.
