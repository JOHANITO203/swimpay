import { describe, expect, it } from 'vitest';

import {
  createFastifyLoggerOptions,
  FASTIFY_REDACTION_PATHS,
  hashApiKey,
  hashWebhookSecret,
  hmacSha256,
  maskPhone,
  normalizeRussianPhone,
  redactLogValue,
  verifyApiKey,
  verifyWebhookSecret
} from './index.js';

describe('security helpers', () => {
  it('hashes API keys without storing the raw key and verifies them safely', () => {
    const rawApiKey = 'sk_live_should_not_be_stored';
    const storedHash = hashApiKey(rawApiKey, 'test_salt');

    expect(storedHash).toMatch(/^api_key_sha256:[a-f0-9]{64}$/);
    expect(storedHash).not.toContain(rawApiKey);
    expect(verifyApiKey(rawApiKey, storedHash, 'test_salt')).toBe(true);
    expect(verifyApiKey('wrong_key', storedHash, 'test_salt')).toBe(false);
  });

  it('hashes webhook secrets without storing the raw secret and verifies them safely', () => {
    const rawSecret = 'whsec_should_not_be_stored';
    const storedHash = hashWebhookSecret(rawSecret, 'test_salt');

    expect(storedHash).toMatch(/^webhook_secret_sha256:[a-f0-9]{64}$/);
    expect(storedHash).not.toContain(rawSecret);
    expect(verifyWebhookSecret(rawSecret, storedHash, 'test_salt')).toBe(true);
    expect(verifyWebhookSecret('wrong_secret', storedHash, 'test_salt')).toBe(false);
  });

  it('normalizes, masks and HMACs phone values for safe storage/display', () => {
    const normalized = normalizeRussianPhone('8 (999) 123-45-67');

    expect(normalized).toBe('+79991234567');
    expect(maskPhone(normalized!)).toBe('+7 *** *** **67');
    expect(hmacSha256(normalized!, 'phone_secret')).toMatch(/^hmac_sha256:[a-f0-9]{64}$/);
  });

  it('redacts sensitive log fields recursively', () => {
    const redacted = redactLogValue({
      authorization: 'Bearer secret',
      nested: {
        signature: 'receiver_signature',
        raw_notification_text: 'raw bank text',
        safe: 'visible'
      }
    });

    expect(redacted).toEqual({
      authorization: '[REDACTED]',
      nested: {
        signature: '[REDACTED]',
        raw_notification_text: '[REDACTED]',
        safe: 'visible'
      }
    });
  });

  it('defines Fastify logger redaction paths for sensitive request fields', () => {
    const options = createFastifyLoggerOptions();

    expect(FASTIFY_REDACTION_PATHS).toContain('req.headers.authorization');
    expect(FASTIFY_REDACTION_PATHS).toContain('req.body.signature');
    expect(FASTIFY_REDACTION_PATHS).toContain('req.body.payload.raw_notification_text');
    expect(options.redact.censor).toBe('[REDACTED]');
  });
});
