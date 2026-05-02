import { describe, expect, it } from 'vitest';

import {
  canonicalizeLearningTemplate,
  createInitialTemplateLearningState,
  hashCanonicalTemplate,
  observeTemplateSignal,
  predictTemplateMutations,
  recommendTemplateLifecycleStatus
} from './index.js';

describe('bank template learning lifecycle', () => {
  it('turns a raw fake notification into a redacted canonical template and stable hash', () => {
    const canonical = canonicalizeLearningTemplate(
      'Поступление 137 ₽\nПеревод от Иван +7 999 123-45-67. Комментарий SWP-A8K2'
    );

    expect(canonical).toContain('<AMOUNT>');
    expect(canonical).toContain('<CURRENCY>');
    expect(canonical).toContain('<PHONE>');
    expect(canonical).toContain('<REFERENCE>');
    expect(canonical).not.toContain('+7 999 123-45-67');
    expect(hashCanonicalTemplate(canonical)).toBe(hashCanonicalTemplate(canonical));
  });

  it('starts new templates in learning status and increments seen count', () => {
    const first = observeTemplateSignal({
      bankProfileId: 'sberbank_ru',
      rawNotificationText: 'Поступление 137 ₽ Перевод от Иван +7 999 123-45-67',
      directionLabel: 'incoming_customer_transfer',
      parserConfidence: 0.9
    });
    const second = observeTemplateSignal({
      state: first,
      bankProfileId: 'sberbank_ru',
      rawNotificationText: 'Поступление 137 ₽ Перевод от Иван +7 999 123-45-67',
      directionLabel: 'incoming_customer_transfer',
      parserConfidence: 0.9
    });

    expect(first.status).toBe('learning');
    expect(first.stats.seenCount).toBe(1);
    expect(second.stats.seenCount).toBe(2);
    expect(second.status).toBe('learning');
  });

  it('degrades immediately after a false positive review outcome', () => {
    const state = createInitialTemplateLearningState({
      bankProfileId: 'sberbank_ru',
      canonicalTemplate: 'поступление <AMOUNT> <CURRENCY>',
      directionLabel: 'incoming_customer_transfer'
    });

    const updated = observeTemplateSignal({
      state,
      bankProfileId: 'sberbank_ru',
      rawNotificationText: 'Поступление 137 ₽',
      directionLabel: 'incoming_customer_transfer',
      parserConfidence: 0.92,
      reviewOutcome: 'false_positive'
    });

    expect(updated.status).toBe('review_only');
    expect(updated.stats.falsePositiveCount).toBe(1);
    expect(updated.reasonCodes).toContain('template_false_positive');
  });

  it('does not promote without human verification evidence', () => {
    const status = recommendTemplateLifecycleStatus({
      currentStatus: 'learning',
      stats: {
        seenCount: 50,
        humanVerifiedCount: 0,
        falsePositiveCount: 0,
        shadowPredictionsCount: 0,
        reviewerAgreementCount: 0,
        unknownCount: 0,
        parserConfidenceTotal: 45,
        driftCriticalCount: 0,
        driftRate7d: 0
      }
    });

    expect(status.status).toBe('learning');
    expect(status.reasonCodes).toContain('insufficient_human_verification');
  });

  it('can recommend trusted_low_amount only after shadow and reviewer evidence', () => {
    const status = recommendTemplateLifecycleStatus({
      currentStatus: 'shadow_testing',
      stats: {
        seenCount: 35,
        humanVerifiedCount: 20,
        falsePositiveCount: 0,
        shadowPredictionsCount: 32,
        reviewerAgreementCount: 31,
        unknownCount: 0,
        parserConfidenceTotal: 33,
        driftCriticalCount: 0,
        driftRate7d: 0
      }
    });

    expect(status.status).toBe('trusted_low_amount');
    expect(status.autoConfirmAllowedByTemplate).toBe(true);
  });

  it('predicts safe mutation candidates without trusting them automatically', () => {
    const mutations = predictTemplateMutations(
      'поступление <AMOUNT> <CURRENCY> перевод от <PERSON> <PHONE> коммент <REFERENCE>'
    );

    expect(mutations.length).toBeGreaterThanOrEqual(4);
    expect(mutations.every((mutation) => mutation.status === 'new')).toBe(true);
    expect(mutations.every((mutation) => mutation.allowAutoConfirmCandidate === false)).toBe(true);
  });
});
