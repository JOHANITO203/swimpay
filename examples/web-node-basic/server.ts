import express from 'express';
import { SwimPay } from '@swimpay/node';

const app = express();
const swimpay = new SwimPay({
  secretKey: requireEnv('SWIMPAY_SECRET_KEY'),
  apiBaseUrl: process.env.SWIMPAY_API_BASE_URL
});

app.post('/webhooks/swimpay', express.raw({ type: 'application/json' }), (req, res) => {
  const event = swimpay.webhooks.verify(req.body, req.headers, requireEnv('SWIMPAY_WEBHOOK_SECRET'));

  switch (event.type) {
    case 'payment.confirmed':
      // Release the merchant order here after verified manual-confirmed webhook.
      break;
    case 'payment.rejected':
      // Mark the merchant order rejected.
      break;
    case 'payment.expired':
      // Mark the merchant order expired.
      break;
  }

  res.sendStatus(200);
});

app.use(express.json());

app.post('/create-checkout', async (req, res, next) => {
  try {
    const body = req.body as {
      externalOrderId?: string;
      amountMinor?: number;
      currency?: string;
    };
    const externalOrderId = body.externalOrderId ?? `order_${Date.now()}`;
    const checkout = await swimpay.orders.create(
      {
        externalOrderId,
        amountMinor: body.amountMinor ?? 139000,
        currency: body.currency ?? 'RUB',
        description: 'Demo order',
        returnUrl: 'https://merchant.example/orders/demo',
        metadata: {
          source: 'web_node_basic'
        }
      },
      {
        idempotencyKey: externalOrderId
      }
    );

    res.json({
      checkoutUrl: checkout.checkoutUrl,
      orderId: checkout.orderId,
      paymentSessionId: checkout.paymentSessionId
    });
  } catch (error) {
    next(error);
  }
});

const port = Number(process.env.PORT ?? 3020);
app.listen(port, () => {
  console.log(`SwimPay example listening on http://localhost:${port}`);
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
