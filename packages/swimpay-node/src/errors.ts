export interface SwimPayErrorOptions {
  code: string;
  message: string;
  statusCode?: number | undefined;
  requestId?: string | undefined;
  details?: Record<string, unknown> | undefined;
}

export class SwimPayError extends Error {
  readonly code: string;
  readonly statusCode?: number | undefined;
  readonly requestId?: string | undefined;
  readonly details?: Record<string, unknown> | undefined;

  constructor(options: SwimPayErrorOptions) {
    super(options.message);
    this.name = new.target.name;
    this.code = options.code;
    if (options.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
    if (options.requestId !== undefined) {
      this.requestId = options.requestId;
    }
    if (options.details !== undefined) {
      this.details = sanitizeErrorDetails(options.details);
    }
  }
}

export class SwimPayApiError extends SwimPayError {}

export class SwimPayValidationError extends SwimPayError {
  constructor(message: string, details?: Record<string, unknown> | undefined) {
    super({ code: 'validation_error', message, details });
  }
}

export class SwimPayWebhookSignatureError extends SwimPayError {
  constructor(message = 'Webhook signature verification failed.') {
    super({ code: 'webhook_signature_error', message });
  }
}

export class SwimPayWebhookTimestampError extends SwimPayError {
  constructor(message = 'Webhook timestamp is invalid or stale.') {
    super({ code: 'webhook_timestamp_error', message });
  }
}

export class SwimPayNetworkError extends SwimPayError {
  constructor(message = 'SwimPay API network request failed.') {
    super({ code: 'network_error', message });
  }
}

export class SwimPayTimeoutError extends SwimPayError {
  constructor(message = 'SwimPay API request timed out.') {
    super({ code: 'timeout_error', message });
  }
}

export function sanitizeErrorDetails(value: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (isSensitiveErrorKey(key)) {
      continue;
    }
    output[key] = sanitizeNestedValue(nested);
  }
  return output;
}

function sanitizeNestedValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNestedValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveErrorKey(key)) {
      continue;
    }
    output[key] = sanitizeNestedValue(nested);
  }
  return output;
}

function isSensitiveErrorKey(key: string): boolean {
  return /authorization|api[_-]?key|secret|token|password|signature|raw|notification|phone|card|cvv|cvc|expir/iu.test(key);
}
