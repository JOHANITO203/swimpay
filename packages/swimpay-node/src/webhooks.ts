import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  SwimPayValidationError,
  SwimPayWebhookSignatureError,
  SwimPayWebhookTimestampError
} from './errors.js';
import type {
  SwimPayPublicWebhookDecision,
  SwimPayPublicWebhookEvent,
  SwimPayPublicWebhookEventType,
  SwimPayWebhookHeaders
} from './types.js';

const PUBLIC_EVENT_TYPES = new Set<SwimPayPublicWebhookEventType>([
  'payment.confirmed',
  'payment.rejected',
  'payment.expired'
]);

const PUBLIC_DECISIONS = new Set<SwimPayPublicWebhookDecision>(['manual_confirmed', 'manual_rejected', 'expired']);

const DEFAULT_TOLERANCE_SECONDS = 300;

export class WebhooksClient {
  verify(rawBody: Buffer | Uint8Array | string, headers: SwimPayWebhookHeaders, webhookSecret: string): SwimPayPublicWebhookEvent {
    if (!webhookSecret) {
      throw new SwimPayWebhookSignatureError('Webhook secret is required.');
    }

    const eventId = getHeader(headers, 'SwimPay-Event-Id');
    const timestamp = getHeader(headers, 'SwimPay-Timestamp');
    const signature = getHeader(headers, 'SwimPay-Signature');

    if (!eventId || !timestamp || !signature) {
      throw new SwimPayWebhookSignatureError('Webhook signature headers are required.');
    }

    assertFreshTimestamp(timestamp);

    const payload = rawBodyToString(rawBody);
    const expectedSignature = signWebhookPayload({
      secret: webhookSecret,
      timestamp,
      payload
    });

    if (!timingSafeStringEqual(expectedSignature, signature)) {
      throw new SwimPayWebhookSignatureError();
    }

    const parsed = parseJsonPayload(payload);
    const event = parsePublicWebhookEvent(parsed);
    if (event.id !== eventId) {
      throw new SwimPayWebhookSignatureError('Webhook event id header does not match payload.');
    }
    return event;
  }
}

export function signWebhookPayload(params: { secret: string; timestamp: string; payload: string }): string {
  return `sha256=${createHmac('sha256', params.secret).update(`${params.timestamp}.${params.payload}`).digest('hex')}`;
}

export function parsePublicWebhookEvent(payload: unknown): SwimPayPublicWebhookEvent {
  if (!payload || typeof payload !== 'object') {
    throw new SwimPayValidationError('Webhook payload must be a JSON object.');
  }

  const body = payload as Record<string, unknown>;
  const id = stringFrom(body.id);
  const type = stringFrom(body.type);
  const createdAt = stringFrom(body.created_at) ?? stringFrom(body.createdAt);
  const data = body.data;

  if (!id || !type || !createdAt || !data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SwimPayValidationError('Webhook payload is missing required fields.');
  }

  if (!PUBLIC_EVENT_TYPES.has(type as SwimPayPublicWebhookEventType)) {
    throw new SwimPayValidationError(`Unsupported public webhook event type: ${type}.`);
  }

  const eventData = data as Record<string, unknown>;
  assertNoRawPiiFields(eventData);
  const officialBankConfirmation = booleanFrom(eventData.official_bank_confirmation) ?? booleanFrom(eventData.officialBankConfirmation);
  if (officialBankConfirmation !== false) {
    throw new SwimPayValidationError('officialBankConfirmation must be false.');
  }

  const orderId = stringFrom(eventData.order_id) ?? stringFrom(eventData.orderId);
  const paymentSessionId = stringFrom(eventData.payment_session_id) ?? stringFrom(eventData.paymentSessionId);
  const amountMinor = amountMinorFrom(eventData);
  const currency = currencyFrom(eventData);
  const confirmationType = stringFrom(eventData.confirmation_type) ?? stringFrom(eventData.confirmationType);
  const decision = stringFrom(eventData.decision);

  if (!orderId || !paymentSessionId || amountMinor === undefined || !currency) {
    throw new SwimPayValidationError('Webhook event data is missing required payment fields.');
  }

  if (confirmationType !== undefined && confirmationType !== 'notification_signal') {
    throw new SwimPayValidationError('Unsupported confirmation type.');
  }

  if (decision !== undefined && !PUBLIC_DECISIONS.has(decision as SwimPayPublicWebhookDecision)) {
    throw new SwimPayValidationError('Unsupported public webhook decision.');
  }

  return stripUndefined({
    id,
    type: type as SwimPayPublicWebhookEventType,
    createdAt,
    data: stripUndefined({
      externalOrderId: stringFrom(eventData.external_id) ?? stringFrom(eventData.externalOrderId),
      orderId,
      paymentSessionId,
      amountMinor,
      currency,
      confirmationType,
      officialBankConfirmation: false,
      decision: decision as SwimPayPublicWebhookDecision | undefined
    })
  }) as SwimPayPublicWebhookEvent;
}

function assertFreshTimestamp(timestamp: string): void {
  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) {
    throw new SwimPayWebhookTimestampError('Webhook timestamp is malformed.');
  }

  const ageMs = Math.abs(Date.now() - timestampMs);
  if (ageMs > DEFAULT_TOLERANCE_SECONDS * 1000) {
    throw new SwimPayWebhookTimestampError();
  }
}

function parseJsonPayload(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    throw new SwimPayValidationError('Webhook payload is malformed JSON.');
  }
}

function rawBodyToString(rawBody: Buffer | Uint8Array | string): string {
  if (typeof rawBody === 'string') {
    return rawBody;
  }
  return Buffer.from(rawBody).toString('utf8');
}

function getHeader(headers: SwimPayWebhookHeaders, name: string): string | undefined {
  if ('get' in headers && typeof headers.get === 'function') {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
  }

  const record = headers as Record<string, string | string[] | number | undefined>;
  const direct = record[name] ?? record[name.toLowerCase()];
  if (Array.isArray(direct)) {
    return direct[0];
  }
  if (typeof direct === 'number') {
    return String(direct);
  }
  if (typeof direct === 'string') {
    return direct;
  }

  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === lowerName) {
      return Array.isArray(value) ? value[0] : value === undefined ? undefined : String(value);
    }
  }
  return undefined;
}

function timingSafeStringEqual(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function amountMinorFrom(data: Record<string, unknown>): number | undefined {
  if (Number.isInteger(data.amount_minor)) {
    return data.amount_minor as number;
  }
  if (Number.isInteger(data.amountMinor)) {
    return data.amountMinor as number;
  }

  const amount = data.amount;
  if (!amount || typeof amount !== 'object' || Array.isArray(amount)) {
    return undefined;
  }

  const value = stringFrom((amount as Record<string, unknown>).value);
  if (!value || !/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
    return undefined;
  }
  const [whole = '0', decimals = ''] = value.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
}

function currencyFrom(data: Record<string, unknown>): string | undefined {
  const direct = stringFrom(data.currency);
  if (direct) {
    return direct;
  }
  const amount = data.amount;
  if (!amount || typeof amount !== 'object' || Array.isArray(amount)) {
    return undefined;
  }
  return stringFrom((amount as Record<string, unknown>).currency);
}

function assertNoRawPiiFields(value: Record<string, unknown>, path: string[] = []): void {
  for (const [key, nested] of Object.entries(value)) {
    const fullPath = [...path, key].join('.');
    if (/raw|notification[_-]?text|title|body|phone|card|source[_-]?card|cvv|cvc|expir/iu.test(key)) {
      throw new SwimPayValidationError(`Public webhook event contains unsafe field: ${fullPath}.`);
    }
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      assertNoRawPiiFields(nested as Record<string, unknown>, [...path, key]);
    }
  }
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function booleanFrom(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined)) as Partial<T>;
}
