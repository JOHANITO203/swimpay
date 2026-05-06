import { afterEach, describe, expect, it } from 'vitest';
import { buildApiServer } from './server.js';
import type {
  IntelligenceFeedbackRecord,
  IntelligenceRepository,
  UnknownShapeRecord
} from './intelligence.js';

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

  it('stores feedback through a durable repository seam and increments unknown shape counts', async () => {
    const repository = new FakeIntelligenceRepository();
    server = buildApiServer({
      environment: 'test',
      intelligenceRepository: repository,
      adminAuth: {
        mode: 'dev_token',
        environment: 'test',
        devToken: 'local-admin-token',
        devOperatorId: 'ops_intelligence',
        devRole: 'read_only'
      }
    });

    for (const timestamp of ['2026-05-06T00:00:00.000Z', '2026-05-06T00:01:00.000Z']) {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/intelligence/feedback',
        headers: { authorization: 'Bearer test_merchant_01' },
        payload: {
          shape_hash: 'shape_v1:durable_unknown',
          bank_profile_id: 'sber_ru',
          package_name: 'ru.sberbankmobile',
          profile_version: 'intelligence-v1',
          classification_guess: 'unknown',
          human_label: 'incoming_customer_transfer',
          feedback: 'corrected',
          timestamp,
          learning_metadata: {
            learning_context: 'background_observation',
            intent_relation: 'unknown_activity',
            active_payment_intent_present: false,
            collision_detected: false,
            payment_window_status: 'none',
            review_created: false,
            profile_version: 'intelligence-v1',
            shape_hash: 'shape_v1:durable_unknown'
          }
        }
      });
      expect(response.statusCode).toBe(202);
    }

    const unknownShapes = await server.inject({
      method: 'GET',
      url: '/v1/intelligence/unknown-shapes',
      headers: { authorization: 'Bearer test_merchant_01' }
    });

    expect(repository.feedback).toHaveLength(2);
    expect(unknownShapes.json().unknown_shapes[0]).toMatchObject({
      shape_hash: 'shape_v1:durable_unknown',
      seen_count: 2,
      first_seen_at: '2026-05-06T00:00:00.000Z',
      last_seen_at: '2026-05-06T00:01:00.000Z',
      read_only: true,
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false,
      creates_payment_review: false
    });
  });

  it('exposes admin intelligence monitoring as read-only and auth-protected', async () => {
    const repository = new FakeIntelligenceRepository();
    server = buildApiServer({
      environment: 'test',
      intelligenceRepository: repository,
      adminAuth: {
        mode: 'dev_token',
        environment: 'test',
        devToken: 'local-admin-token',
        devOperatorId: 'ops_intelligence',
        devRole: 'read_only'
      }
    });
    await repository.storeFeedback({
      feedback_id: 'fb_admin_01',
      merchant_id: 'merchant_01',
      shape_hash: 'shape_v1:admin_unknown',
      bank_profile_id: 'sber_ru',
      package_name: 'ru.sberbankmobile',
      profile_version: 'intelligence-v1',
      classification_guess: 'unknown',
      human_label: 'incoming_customer_transfer',
      feedback: 'corrected',
      timestamp: '2026-05-06T00:00:00.000Z',
      review_status: 'pending',
      learning_metadata: {
        learning_context: 'intent_bound_feedback',
        intent_relation: 'ambiguous_activity',
        active_payment_intent_present: true,
        collision_detected: false,
        payment_window_status: 'active',
        review_created: true,
        profile_version: 'intelligence-v1',
        shape_hash: 'shape_v1:admin_unknown',
        mutates_runtime_rules: false,
        promotes_profile: false
      },
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false
    });

    const unauthorized = await server.inject({ method: 'GET', url: '/v1/admin/intelligence/feedback' });
    const feedback = await server.inject({
      method: 'GET',
      url: '/v1/admin/intelligence/feedback',
      headers: { authorization: 'Bearer local-admin-token' }
    });
    const unknown = await server.inject({
      method: 'GET',
      url: '/v1/admin/intelligence/unknown-shapes',
      headers: { authorization: 'Bearer local-admin-token' }
    });
    const serialized = JSON.stringify({ feedback: feedback.json(), unknown: unknown.json() });

    expect(unauthorized.statusCode).toBe(401);
    expect(feedback.statusCode).toBe(200);
    expect(unknown.statusCode).toBe(200);
    expect(feedback.json().read_only).toBe(true);
    expect(feedback.json().mutates_runtime_rules).toBe(false);
    expect(feedback.json().promotes_profile).toBe(false);
    expect(feedback.json().official_bank_confirmation).toBe(false);
    expect(serialized).not.toContain('raw_notification');
    expect(serialized).not.toContain('raw_body');
    expect(serialized).not.toContain('2202123412344821');
    expect(serialized).not.toContain('cvv');
  });
});

class FakeIntelligenceRepository implements IntelligenceRepository {
  public readonly feedback: IntelligenceFeedbackRecord[] = [];
  public readonly unknownShapes = new Map<string, UnknownShapeRecord>();

  public async storeFeedback(input: IntelligenceFeedbackRecord): Promise<IntelligenceFeedbackRecord> {
    this.feedback.unshift(input);
    if (input.classification_guess === 'unknown') {
      const key = `${input.merchant_id}:${input.shape_hash}:${input.bank_profile_id}:${input.package_name}`;
      const existing = this.unknownShapes.get(key);
      this.unknownShapes.set(key, {
        shape_hash: input.shape_hash,
        bank_profile_id: input.bank_profile_id,
        package_name: input.package_name,
        profile_version: input.profile_version,
        classification_guess: 'unknown',
        seen_count: (existing?.seen_count ?? 0) + 1,
        first_seen_at: existing?.first_seen_at ?? input.timestamp,
        last_seen_at: input.timestamp,
        review_status: 'pending',
        learning_context: 'background_observation',
        read_only: true,
        mutates_runtime_rules: false,
        promotes_profile: false,
        official_bank_confirmation: false,
        creates_payment_review: false
      });
    }
    return input;
  }

  public async listFeedback(): Promise<IntelligenceFeedbackRecord[]> {
    return this.feedback;
  }

  public async listUnknownShapes(merchantId?: string): Promise<UnknownShapeRecord[]> {
    return Array.from(this.unknownShapes.entries())
      .filter(([key]) => !merchantId || key.startsWith(`${merchantId}:`))
      .map(([, record]) => record);
  }
}
