import { describe, expect, it } from 'vitest';

import {
  hasOperatorPermission,
  OperatorPermissions,
  OperatorRoles,
  ROLE_PERMISSIONS,
  signOperatorToken,
  verifyOperatorAuthorization,
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
  it('defines operator roles and role permissions centrally', () => {
    expect(OperatorRoles).toEqual({
      OWNER: 'owner',
      ADMIN: 'admin',
      OPERATOR: 'operator',
      SUPPORT: 'support',
      READ_ONLY: 'read_only'
    });
    expect(ROLE_PERMISSIONS.owner).toContain(OperatorPermissions.PROMOTE_BANK_TEMPLATES);
    expect(ROLE_PERMISSIONS.read_only).toContain(OperatorPermissions.VIEW_BANK_TEMPLATES);
    expect(ROLE_PERMISSIONS.read_only).not.toContain(OperatorPermissions.DISABLE_BANK_TEMPLATES);
    expect(hasOperatorPermission('operator', OperatorPermissions.DEGRADE_BANK_TEMPLATES)).toBe(true);
    expect(hasOperatorPermission('operator', OperatorPermissions.PROMOTE_BANK_TEMPLATES)).toBe(false);
  });

  it('verifies configured dev operator tokens and rejects unconfigured dev auth', () => {
    const configured = verifyOperatorAuthorization('Bearer local-admin-token', {
      mode: 'dev_token',
      environment: 'development',
      devToken: 'local-admin-token',
      devOperatorId: 'ops_01',
      devRole: 'admin'
    });
    const unconfigured = verifyOperatorAuthorization('Bearer local-admin-token', {
      mode: 'dev_token',
      environment: 'development'
    });

    expect(configured).toMatchObject({
      kind: 'authenticated',
      operator: {
        operatorId: 'ops_01',
        role: 'admin'
      }
    });
    expect(unconfigured).toMatchObject({
      kind: 'rejected',
      reason: 'dev_admin_token_not_configured'
    });
  });

  it('rejects placeholder admin tokens in production and accepts signed production tokens', () => {
    const signedToken = signOperatorToken({
      operatorId: 'ops_prod',
      role: 'owner',
      secret: 'production_test_secret'
    });

    const placeholder = verifyOperatorAuthorization('Bearer admin_ops_01', {
      mode: 'signed_token',
      environment: 'production',
      tokenHmacSecret: 'production_test_secret'
    });
    const signed = verifyOperatorAuthorization(`Bearer ${signedToken}`, {
      mode: 'signed_token',
      environment: 'production',
      tokenHmacSecret: 'production_test_secret'
    });

    expect(placeholder).toMatchObject({
      kind: 'rejected',
      reason: 'placeholder_admin_token_rejected'
    });
    expect(signed).toMatchObject({
      kind: 'authenticated',
      operator: {
        operatorId: 'ops_prod',
        role: 'owner'
      }
    });
  });

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
      buyer_phone: '+79991234567',
      notification_text: 'raw notification',
      token: 'operator-token',
      nested: {
        signature: 'receiver_signature',
        raw_notification_text: 'raw bank text',
        raw_body: 'raw body',
        receiver_identifier_copy_value: '+79991234567',
        receiver_identifier_encrypted: 'encrypted_receiver_identifier',
        receiver_identifier: '2202201234567890',
        destination_value: '+79991234567',
        card_number: '2202201234567890',
        safe: 'visible'
      }
    });

    expect(redacted).toEqual({
      authorization: '[REDACTED]',
      buyer_phone: '[REDACTED]',
      notification_text: '[REDACTED]',
      token: '[REDACTED]',
      nested: {
        signature: '[REDACTED]',
        raw_notification_text: '[REDACTED]',
        raw_body: '[REDACTED]',
        receiver_identifier_copy_value: '[REDACTED]',
        receiver_identifier_encrypted: '[REDACTED]',
        receiver_identifier: '[REDACTED]',
        destination_value: '[REDACTED]',
        card_number: '[REDACTED]',
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
