import { createHmac } from 'node:crypto';

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
