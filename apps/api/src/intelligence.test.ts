import { afterEach, describe, expect, it } from 'vitest';
import { buildApiServer } from './server.js';

describe('intelligence v1 endpoints', () => {
  let server: Awaited<ReturnType<typeof buildApiServer>> | undefined;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = undefined;
    }
  });

  it('returns static bank profiles without auto-confirm or raw rules', async () => {
    server = buildApiServer({ environment: 'test' });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/intelligence/bank-profiles'
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.profiles).toHaveLength(5);
    expect(body.profiles.every((profile: { auto_confirm_enabled: boolean }) => profile.auto_confirm_enabled === false)).toBe(true);
    expect(JSON.stringify(body)).not.toContain('raw_notification');
    expect(body.official_bank_confirmation).toBe(false);
  });

  it('stores passive feedback and exposes unknown shapes as read-only monitoring', async () => {
    server = buildApiServer({ environment: 'test' });

    const feedback = await server.inject({
      method: 'POST',
      url: '/v1/intelligence/feedback',
      headers: { authorization: 'Bearer test_merchant_01' },
      payload: {
        shape_hash: 'shape_v1:unknown_01',
        bank_profile_id: 'sber_ru',
        package_name: 'ru.sberbankmobile',
        profile_version: 'intelligence-v1',
        classification_guess: 'unknown',
        human_label: 'incoming_customer_transfer',
        feedback: 'corrected',
        timestamp: '2026-05-06T00:00:00.000Z'
      }
    });
    const unknownShapes = await server.inject({
      method: 'GET',
      url: '/v1/intelligence/unknown-shapes',
      headers: { authorization: 'Bearer test_merchant_01' }
    });
    const feedbackBody = feedback.json();
    const unknownBody = unknownShapes.json();

    expect(feedback.statusCode).toBe(202);
    expect(feedbackBody.review_status).toBe('pending');
    expect(feedbackBody.mutates_runtime_rules).toBe(false);
    expect(feedbackBody.promotes_profile).toBe(false);
    expect(unknownShapes.statusCode).toBe(200);
    expect(unknownBody.unknown_shapes[0]).toMatchObject({
      shape_hash: 'shape_v1:unknown_01',
      classification_guess: 'unknown',
      review_status: 'pending',
      read_only: true
    });
    expect(JSON.stringify(unknownBody)).not.toContain('raw');
  });
});
