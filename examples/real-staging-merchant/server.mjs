import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { SwimPay, SwimPayApiError, WebhooksClient } from '../../packages/swimpay-node/dist/index.js';

const port = Number(process.env.PORT ?? 4105);
const apiBaseUrl = requiredEnv('SWIMPAY_STAGING_API_BASE_URL');
const secretKey = requiredEnv('SWIMPAY_STAGING_SECRET_KEY');
const webhookSecret = requiredEnv('SWIMPAY_STAGING_WEBHOOK_SECRET');
const externalAppBaseUrl = requiredEnv('EXTERNAL_APP_BASE_URL').replace(/\/+$/u, '');

const swimpay = new SwimPay({ apiBaseUrl, secretKey });
const webhooks = new WebhooksClient();
const orders = new Map();

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/create-order') {
      const body = await readJson(request);
      const externalOrderId = `staging_${randomUUID()}`;
      const checkout = await swimpay.orders.create({
        externalOrderId,
        amountMinor: safeAmountMinor(body.amountMinor),
        currency: 'RUB',
        description: 'SwimPay staging integration test',
        returnUrl: `${externalAppBaseUrl}/orders/${externalOrderId}/status`,
        webhookUrl: `${externalAppBaseUrl}/webhooks/swimpay`,
        metadata: {
          staging: true,
          operator_controlled: true
        }
      }, {
        idempotencyKey: externalOrderId
      });

      orders.set(externalOrderId, {
        externalOrderId,
        swimPayOrderId: checkout.orderId,
        paymentSessionId: checkout.paymentSessionId,
        checkoutUrl: checkout.checkoutUrl,
        status: 'checkout_created',
        fulfilled: false
      });

      return sendJson(response, 201, orders.get(externalOrderId));
    }

    const statusMatch = /^\/orders\/([^/]+)\/status$/u.exec(request.url ?? '');
    if (request.method === 'GET' && statusMatch) {
      const externalOrderId = decodeURIComponent(statusMatch[1]);
      const order = orders.get(externalOrderId);
      if (!order) {
        return sendJson(response, 404, { error: 'order_not_found' });
      }
      return sendJson(response, 200, order);
    }

    if (request.method === 'POST' && request.url === '/webhooks/swimpay') {
      const rawBody = await readRaw(request);
      const event = webhooks.verify(rawBody, request.headers, webhookSecret);
      if (event.type !== 'payment.confirmed') {
        return sendJson(response, 202, { accepted: true, fulfilled: false });
      }
      const externalOrderId = event.data.externalOrderId;
      const order = externalOrderId ? orders.get(externalOrderId) : undefined;
      if (!order) {
        return sendJson(response, 202, { accepted: true, fulfilled: false });
      }
      orders.set(externalOrderId, {
        ...order,
        status: 'fulfilled_after_manual_confirmation',
        fulfilled: true,
        webhookEventId: event.id,
        confirmationType: event.data.confirmationType,
        officialBankConfirmation: event.data.officialBankConfirmation
      });
      return sendJson(response, 200, { accepted: true, fulfilled: true });
    }

    return sendJson(response, 404, { error: 'not_found' });
  } catch (error) {
    const statusCode = error instanceof SwimPayApiError ? error.statusCode ?? 502 : 500;
    return sendJson(response, statusCode, { error: safeErrorPayload(error) });
  }
});

server.listen(port, () => {
  console.log(`SwimPay real staging merchant app listening on ${port}`);
});

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function safeAmountMinor(value) {
  return Number.isInteger(value) && value > 0 ? value : 100;
}

function readRaw(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('error', reject);
    request.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function readJson(request) {
  const raw = await readRaw(request);
  if (raw.length === 0) {
    return {};
  }
  return JSON.parse(raw.toString('utf8'));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function safeErrorPayload(error) {
  if (error instanceof SwimPayApiError) {
    return {
      code: error.code,
      message: safeErrorMessage(error),
      statusCode: error.statusCode,
      details: error.details,
      actionRequired: error.code === 'merchant_payment_setup_required'
    };
  }
  return {
    code: 'staging_app_error',
    message: safeErrorMessage(error)
  };
}

function safeErrorMessage(error) {
  if (!(error instanceof Error)) {
    return 'staging_app_error';
  }
  return error.message.replace(/sk_[A-Za-z0-9_=-]+|whsec_[A-Za-z0-9_=-]+/gu, '<SECRET>');
}
