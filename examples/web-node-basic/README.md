# SwimPay Web Node Basic Example

Minimal backend example for SwimPay V1.

It shows:

- server-side SwimPay order creation;
- returning a `checkoutUrl`;
- webhook verification from the raw request body;
- handling `payment.confirmed`, `payment.rejected` and `payment.expired`.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Create checkout:

```bash
curl -X POST http://localhost:3020/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"externalOrderId":"ORDER_1048","amountMinor":139000,"currency":"RUB"}'
```

Public V1 webhook handling is post-review or terminal only. Release goods only from a verified `payment.confirmed` event.

SwimPay is not a PSP or official bank confirmation system.
