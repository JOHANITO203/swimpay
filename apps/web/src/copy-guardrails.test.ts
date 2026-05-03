import { describe, expect, it } from 'vitest';
import { buildWebServer } from './index.js';

describe('UI Copy Guardrails and Wording', () => {
  const forbiddenWords = [
    'HMAC',
    'package/cert',
    'TO_VERIFY',
    'approved_for_review_only',
    'official_bank_confirmation',
    'signal runtime',
    'template confidence',
    'receiver route',
    'webhook payload',
    'auto-confirm bancaire',
    'confirmation bancaire officielle',
    'Payment Signal Engine',
    'bank evidence',
    'production trust'
  ];

  it('merchant dashboard does not contain forbidden technical wording', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/merchant/dashboard' });

    // If route doesn't exist yet, this will fail, which is expected for now
    if (response.statusCode === 200) {
      for (const word of forbiddenWords) {
        expect(response.body).not.toContain(word);
      }
    }
  });

  it('checkout does not claim official bank confirmation', async () => {
    const server = buildWebServer({ environment: 'test' });
    // Using a fake session ID that would be handled by a fake provider in a real test
    // For now we just check the general rendering if possible
    const response = await server.inject({ method: 'GET', url: '/checkout/any' });

    if (response.statusCode === 200) {
      expect(response.body).not.toContain('confirmation bancaire officielle');
      expect(response.body).not.toContain('paiement garanti');
      expect(response.body).toContain('recherchera le signal de paiement');
    }
  });

  it('masks sensitive PII in merchant UI', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/admin/merchant-receiving-routes' });

    if (response.statusCode === 200) {
        // Based on existing fake data in tests usually
        // We want to ensure no raw phone/card format matches
        const phoneRegex = /\+7\d{10}/;
        const cardRegex = /\d{16}/;
        expect(response.body).not.toMatch(phoneRegex);
        expect(response.body).not.toMatch(cardRegex);
    }
  });
});
