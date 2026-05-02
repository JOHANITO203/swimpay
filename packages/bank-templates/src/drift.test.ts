import { describe, expect, it } from 'vitest';

import {
  calculateTemplateSimilarity,
  createTemplateDriftEvent,
  evaluateBankTemplateDrift,
  loadAllBankTemplateFixtures,
  loadBankTemplatesFromDirectory
} from './index.js';

const knownTemplates = [
  {
    templateId: 'sberbank_ru_incoming_customer_transfer_v1',
    bankProfileId: 'sberbank_ru',
    status: 'learning' as const,
    directionLabel: 'incoming_customer_transfer' as const,
    patterns: [
      'Поступление <AMOUNT> <CURRENCY>',
      'Перевод от <PERSON> <PHONE>',
      'Коммент <REFERENCE>'
    ]
  }
];

describe('bank template drift radar', () => {
  it('calculates high similarity for known canonical template variants', () => {
    const similarity = calculateTemplateSimilarity(
      'Поступление <AMOUNT> <CURRENCY> Перевод от <PERSON> <PHONE>',
      'Поступление 137 ₽ Перевод от Иван +7 999 123-45-67'
    );

    expect(similarity).toBeGreaterThanOrEqual(0.78);
  });

  it('keeps new template candidates untrusted and non auto-confirming', () => {
    const result = evaluateBankTemplateDrift({
      bankProfileId: 'sberbank_ru',
      knownTemplates,
      observations: [
        {
          observationId: 'obs_new_01',
          bankProfileId: 'sberbank_ru',
          text: 'Новый формат входящего платежа 137 ₽ ref SWP-A8K2',
          directionLabel: 'incoming_customer_transfer',
          signalQuality: 75,
          amountPresent: true,
          phonePresent: false,
          referencePresent: true
        }
      ]
    });

    expect(result.newTemplateCandidates).toHaveLength(1);
    expect(result.newTemplateCandidates[0]?.status).toBe('new');
    expect(result.newTemplateCandidates[0]?.allowAutoConfirmCandidate).toBe(false);
    expect(result.newTemplateCandidates[0]?.recommendedStatus).toBe('learning');
    expect(result.reasonCodes).toContain('new_template_candidate');
  });

  it('disables bank auto-confirm on critical drift', () => {
    const result = evaluateBankTemplateDrift({
      bankProfileId: 'sberbank_ru',
      knownTemplates,
      observations: [
        unknownObservation('obs_unknown_01', false),
        unknownObservation('obs_unknown_02', false),
        unknownObservation('obs_unknown_03', true),
        knownObservation('obs_known_01')
      ]
    });

    expect(result.status).toBe('critical_drift');
    expect(result.autoConfirmAllowedForBank).toBe(false);
    expect(result.recommendedBankAutoConfirmStatus).toBe('review_only');
    expect(result.reasonCodes).toContain('critical_drift_detected');
    expect(result.reasonCodes).toContain('auto_confirm_disabled_for_bank');
  });

  it('creates a drift event with reason codes and operational metrics', () => {
    const result = evaluateBankTemplateDrift({
      bankProfileId: 'sberbank_ru',
      knownTemplates,
      observations: [unknownObservation('obs_unknown_01', false), knownObservation('obs_known_01')]
    });

    const event = createTemplateDriftEvent({
      eventId: 'evt_drift_01',
      occurredAt: '2026-05-02T10:00:00.000Z',
      evaluation: result
    });

    expect(event.eventType).toBe('template.drift_detected');
    expect(event.data.reasonCodes.length).toBeGreaterThan(0);
    expect(event.data.metrics.unknownRate24h).toBeGreaterThan(0);
  });

  it('loads default YAML templates for fixture similarity checks', async () => {
    const templates = await loadBankTemplatesFromDirectory();
    const fixtures = await loadAllBankTemplateFixtures();
    const incoming = fixtures.find((fixture) => fixture.fixture_id.endsWith('incoming_full_001'));

    expect(templates.length).toBeGreaterThanOrEqual(30);
    expect(incoming).toBeDefined();

    const result = evaluateBankTemplateDrift({
      bankProfileId: incoming!.bank_profile_id,
      knownTemplates: templates,
      observations: [
        {
          observationId: incoming!.fixture_id,
          bankProfileId: incoming!.bank_profile_id,
          text: incoming!.parserText,
          directionLabel: incoming!.expected.direction_label,
          signalQuality: 90,
          amountPresent: incoming!.expected.amount_present,
          phonePresent: incoming!.expected.phone_present,
          referencePresent: incoming!.expected.reference_present
        }
      ]
    });

    expect(result.metrics.similarityToBestTemplate).toBeGreaterThanOrEqual(0.78);
    expect(result.status).not.toBe('critical_drift');
  });
});

function knownObservation(observationId: string) {
  return {
    observationId,
    bankProfileId: 'sberbank_ru',
    text: 'Поступление 137 ₽ Перевод от Иван +7 999 123-45-67',
    directionLabel: 'incoming_customer_transfer' as const,
    signalQuality: 92,
    amountPresent: true,
    phonePresent: true,
    referencePresent: false
  };
}

function unknownObservation(observationId: string, amountPresent: boolean) {
  return {
    observationId,
    bankProfileId: 'sberbank_ru',
    text: `Неизвестный шаблон ${observationId}`,
    directionLabel: 'unknown' as const,
    signalQuality: 20,
    amountPresent,
    phonePresent: false,
    referencePresent: false
  };
}
