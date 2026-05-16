import {
  SwimPayApiError,
  SwimPayNetworkError,
  SwimPayTimeoutError,
  SwimPayValidationError,
  sanitizeErrorDetails
} from './errors.js';
import { OrdersClient } from './orders.js';
import { parsePublicWebhookEvent, WebhooksClient } from './webhooks.js';
import type { SwimPayClientOptions } from './types.js';

const DEFAULT_API_BASE_URL = 'https://www.swimpay.pro';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export class SwimPay {
  readonly orders: OrdersClient;
  readonly webhooks: WebhooksClient;
  private readonly secretKey: string;
  private readonly apiBaseUrl: string;
  private readonly defaultRequestTimeoutMs: number;

  static parseWebhookEvent = parsePublicWebhookEvent;

  constructor(options: SwimPayClientOptions) {
    if (!options.secretKey || options.secretKey.trim().length === 0) {
      throw new SwimPayValidationError('secretKey is required.');
    }

    this.secretKey = options.secretKey;
    this.apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? DEFAULT_API_BASE_URL);
    this.defaultRequestTimeoutMs = options.defaultRequestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.orders = new OrdersClient(this);
    this.webhooks = new WebhooksClient();
  }

  async requestJson(path: string, options: {
    method: 'POST';
    body: Record<string, unknown>;
    idempotencyKey?: string | undefined;
    requestTimeoutMs?: number | undefined;
  }): Promise<unknown> {
    const controller = new AbortController();
    const timeoutMs = options.requestTimeoutMs ?? this.defaultRequestTimeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        method: options.method,
        headers: stripUndefined({
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': options.idempotencyKey
        }) as HeadersInit,
        body: JSON.stringify(options.body),
        signal: controller.signal
      });

      const body = await parseResponseBody(response);
      if (!response.ok) {
        throw buildApiError(response, body);
      }
      return body;
    } catch (error) {
      if (error instanceof SwimPayApiError) {
        throw error;
      }
      if (isAbortError(error) || controller.signal.aborted) {
        throw new SwimPayTimeoutError();
      }
      if (error instanceof SwimPayValidationError) {
        throw error;
      }
      throw new SwimPayNetworkError();
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new SwimPayValidationError('SwimPay API response was not valid JSON.');
  }
}

function buildApiError(response: Response, body: unknown): SwimPayApiError {
  const errorBody = body && typeof body === 'object' ? (body as Record<string, unknown>).error : undefined;
  const errorObject = errorBody && typeof errorBody === 'object' ? (errorBody as Record<string, unknown>) : undefined;
  const code = typeof errorObject?.code === 'string' ? errorObject.code : 'api_error';
  const message = typeof errorObject?.message === 'string' ? errorObject.message : `SwimPay API request failed with HTTP ${response.status}.`;
  const details =
    errorObject?.details && typeof errorObject.details === 'object' && !Array.isArray(errorObject.details)
      ? sanitizeErrorDetails(errorObject.details as Record<string, unknown>)
      : undefined;
  const requestId = response.headers.get('x-request-id') ?? response.headers.get('x-swimpay-request-id') ?? undefined;

  const errorOptions = stripUndefined({
    code,
    message,
    statusCode: response.status,
    requestId,
    details
  }) as {
    code: string;
    message: string;
    statusCode?: number | undefined;
    requestId?: string | undefined;
    details?: Record<string, unknown> | undefined;
  };

  return new SwimPayApiError(errorOptions);
}

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '');
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined)) as Partial<T>;
}
