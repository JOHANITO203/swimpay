import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SENSITIVE_STORAGE_RULES = {
  apiKeysStoredAs: 'hash',
  phoneMatchingStoredAs: 'hmac',
  phoneDisplayStoredAs: 'masked',
  rawNotificationStoredByDefault: false
} as const;

export function normalizeRussianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return null;
}

export function maskPhone(normalizedPhone: string): string {
  const lastTwo = normalizedPhone.slice(-2);
  return `+7 *** *** **${lastTwo}`;
}

export function hmacSha256(value: string, secret: string): string {
  return `hmac_sha256:${createHmac('sha256', secret).update(value).digest('hex')}`;
}

export function hashApiKey(apiKey: string, salt = 'swimpay_api_key_v1'): string {
  return hashSecret(apiKey, salt, 'api_key_sha256');
}

export function verifyApiKey(apiKey: string, storedHash: string, salt = 'swimpay_api_key_v1'): boolean {
  return timingSafeStringEqual(hashApiKey(apiKey, salt), storedHash);
}

export function hashWebhookSecret(secret: string, salt = 'swimpay_webhook_secret_v1'): string {
  return hashSecret(secret, salt, 'webhook_secret_sha256');
}

export function verifyWebhookSecret(secret: string, storedHash: string, salt = 'swimpay_webhook_secret_v1'): boolean {
  return timingSafeStringEqual(hashWebhookSecret(secret, salt), storedHash);
}

export const FASTIFY_REDACTION_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["swimpay-signature"]',
  'req.body.signature',
  'req.body.api_key',
  'req.body.apiKey',
  'req.body.secret',
  'req.body.webhook_secret',
  'req.body.raw_notification_text',
  'req.body.payload.raw_notification_text',
  'req.body.payload.raw_text',
  'req.body.payload.title',
  'req.body.payload.body',
  'req.body.payload.big_text',
  'res.headers["set-cookie"]'
] as const;

export function createFastifyLoggerOptions() {
  return {
    redact: {
      paths: [...FASTIFY_REDACTION_PATHS],
      censor: '[REDACTED]'
    }
  };
}

export function redactLogValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = isSensitiveLogKey(key) ? '[REDACTED]' : redactLogValue(nestedValue);
  }

  return output as T;
}

function hashSecret(value: string, salt: string, prefix: string): string {
  const digest = createHash('sha256').update(`${salt}:${value}`, 'utf8').digest('hex');
  return `${prefix}:${digest}`;
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isSensitiveLogKey(key: string): boolean {
  return /authorization|cookie|api[_-]?key|secret|signature|raw[_-]?(notification|text)|phone_raw|raw_phone/iu.test(key);
}
