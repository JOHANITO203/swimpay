import { SwimPayValidationError } from './errors.js';
import type { SwimPayCheckout, SwimPayOrderCreateInput, SwimPayOrderCreateOptions } from './types.js';

interface RequestClient {
  requestJson(path: string, options: RequestJsonOptions): Promise<unknown>;
}

interface RequestJsonOptions {
  method: 'POST';
  body: Record<string, unknown>;
  idempotencyKey?: string | undefined;
  requestTimeoutMs?: number | undefined;
}

const FORBIDDEN_ORDER_FIELD_KEYS = new Set([
  'autoconfirm',
  'cvv',
  'cvc',
  'expiry',
  'expiration',
  'expirationdate',
  'pin',
  'smscode',
  'pan',
  'cardpan',
  'fullcard',
  'cardnumber',
  'sourcecard',
  'sourcecardnumber',
  'buyersourcecard',
  'buyersourcecardnumber'
]);

export class OrdersClient {
  constructor(private readonly client: RequestClient) {}

  async create(input: SwimPayOrderCreateInput & Record<string, unknown>, options: SwimPayOrderCreateOptions = {}): Promise<SwimPayCheckout> {
    validateOrderInput(input);
    const response = await this.client.requestJson('/v1/orders', {
      method: 'POST',
      body: buildOrderPayload(input),
      idempotencyKey: options.idempotencyKey,
      requestTimeoutMs: options.requestTimeoutMs
    });

    return parseCheckoutResponse(response);
  }
}

function validateOrderInput(input: SwimPayOrderCreateInput & Record<string, unknown>): void {
  if (!isNonEmptyString(input.externalOrderId)) {
    throw new SwimPayValidationError('externalOrderId is required.');
  }

  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new SwimPayValidationError('amountMinor must be a positive integer.');
  }

  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new SwimPayValidationError('currency must be a supported uppercase three-letter code.');
  }

  const forbiddenField = findForbiddenField(input);
  if (forbiddenField) {
    throw new SwimPayValidationError(`Unsupported or unsafe field is not allowed: ${forbiddenField}.`);
  }

  if (input.metadata !== undefined) {
    const metadataSize = Buffer.byteLength(JSON.stringify(input.metadata), 'utf8');
    if (metadataSize > 4096) {
      throw new SwimPayValidationError('metadata is too large.', { maxBytes: 4096 });
    }
  }
}

function buildOrderPayload(input: SwimPayOrderCreateInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    external_id: input.externalOrderId,
    amount: {
      value: formatMinorAmount(input.amountMinor),
      currency: input.currency
    }
  };

  if (input.description !== undefined) {
    payload.description = input.description;
  }
  if (input.returnUrl !== undefined) {
    payload.return_url = input.returnUrl;
  }
  if (input.customer !== undefined) {
    payload.customer = stripUndefined({
      first_name: input.customer.firstName,
      last_name: input.customer.lastName,
      phone: input.customer.phone
    });
  }
  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }
  if (input.webhookUrl !== undefined) {
    payload.webhook_url = input.webhookUrl;
  }

  return payload;
}

function parseCheckoutResponse(response: unknown): SwimPayCheckout {
  if (!response || typeof response !== 'object') {
    throw new SwimPayValidationError('SwimPay order response was malformed.');
  }
  const body = response as Record<string, unknown>;
  const orderId = stringFrom(body.order_id) ?? stringFrom(body.orderId);
  const paymentSessionId = stringFrom(body.payment_session_id) ?? stringFrom(body.paymentSessionId);
  const checkoutUrl = stringFrom(body.checkout_url) ?? stringFrom(body.checkoutUrl);
  const status = stringFrom(body.status);
  const expiresAt = stringFrom(body.expires_at) ?? stringFrom(body.expiresAt);

  if (!orderId || !paymentSessionId || !checkoutUrl || !status) {
    throw new SwimPayValidationError('SwimPay order response is missing required checkout fields.');
  }

  return stripUndefined({
    orderId,
    paymentSessionId,
    checkoutUrl,
    status,
    expiresAt
  }) as SwimPayCheckout;
}

function findForbiddenField(value: unknown, path: string[] = []): string | undefined {
  if (Array.isArray(value)) {
    for (const [index, nested] of value.entries()) {
      const found = findForbiddenField(nested, [...path, String(index)]);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_ORDER_FIELD_KEYS.has(normalizeFieldKey(key))) {
      return [...path, key].join('.');
    }
    const found = findForbiddenField(nested, [...path, key]);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function formatMinorAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function normalizeFieldKey(key: string): string {
  return key.replace(/[^a-z0-9]/giu, '').toLowerCase();
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined)) as Partial<T>;
}
