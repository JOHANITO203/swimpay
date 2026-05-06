import { describe, expect, it } from 'vitest';
import { buildWebServer } from './index.js';

describe('operator intelligence review web surface', () => {
  it('renders feedback and unknown shapes as read-only without raw PII or mutation controls', async () => {
    const server = buildWebServer({
      environment: 'test',
      adminIntelligenceClient: new FakeAdminIntelligenceClient()
    });

    const response = await server.inject({
      method: 'GET',
      url: '/admin/intelligence-review'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Observations SwimPay');
    expect(response.body).toContain('Formes inconnues');
    expect(response.body).toContain('Lecture seule');
    expect(response.body).toContain('Ne modifie pas les règles');
    expect(response.body).toContain('Ne promeut aucun profil');
    expect(response.body).toContain('intent_bound_feedback');
    expect(response.body).toContain('background_observation');
    expect(response.body).toContain('shape_v1:intent_safe');
    expect(response.body).not.toContain('raw notification');
    expect(response.body).not.toContain('raw_body');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('2202123412344821');
    expect(response.body).not.toContain('api_secret');
    expect(response.body).not.toContain('confirmation bancaire officielle');
    expect(response.body).not.toContain('bank_confirmed');
    expect(response.body).not.toContain('<form');
    expect(response.body).not.toContain('Promouvoir');
    expect(response.body).not.toContain('Approuver');
  });

  it('renders a safe unavailable state when intelligence APIs cannot be reached', async () => {
    const server = buildWebServer({
      environment: 'test',
      adminIntelligenceClient: {
        async getFeedback() {
          throw new Error('api_secret_123 raw notification');
        },
        async getUnknownShapes() {
          throw new Error('not reached');
        }
      }
    });

    const response = await server.inject({
      method: 'GET',
      url: '/admin/intelligence-review'
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).toContain('Observations indisponibles');
    expect(response.body).not.toContain('api_secret_123');
    expect(response.body).not.toContain('raw notification');
  });
});

class FakeAdminIntelligenceClient {
  public async getFeedback() {
    return {
      feedback: [
        {
          feedback_id: 'fb_01',
          merchant_id: 'merchant_01',
          shape_hash: 'shape_v1:intent_safe',
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
            shape_hash: 'shape_v1:intent_safe'
          },
          mutates_runtime_rules: false,
          promotes_profile: false,
          official_bank_confirmation: false,
          raw_body: 'raw notification',
          phone: '+79991234567'
        }
      ],
      read_only: true,
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false
    };
  }

  public async getUnknownShapes() {
    return {
      unknown_shapes: [
        {
          shape_hash: 'shape_v1:background_safe',
          bank_profile_id: 'tbank_ru',
          package_name: 'com.idamob.tinkoff.android',
          profile_version: 'intelligence-v1',
          classification_guess: 'unknown',
          seen_count: 3,
          first_seen_at: '2026-05-06T00:00:00.000Z',
          last_seen_at: '2026-05-06T00:03:00.000Z',
          review_status: 'pending',
          learning_context: 'background_observation',
          read_only: true,
          mutates_runtime_rules: false,
          promotes_profile: false,
          official_bank_confirmation: false,
          creates_payment_review: false
        }
      ],
      read_only: true,
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false
    };
  }
}
