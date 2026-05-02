import { describe, expect, it } from 'vitest';

import {
  loadAllBankTemplateFixtures,
  loadJsonlFixturesFromFile,
  parseBankNotification
} from './index.js';

describe('bank template fixture corpus', () => {
  it('loads global, adversarial and bank-specific JSONL fixtures', async () => {
    const fixtures = await loadAllBankTemplateFixtures();

    expect(fixtures.length).toBeGreaterThanOrEqual(56);
    expect(fixtures.some((fixture) => fixture.sourceFile.endsWith('global_redacted_notifications.jsonl'))).toBe(true);
    expect(fixtures.some((fixture) => fixture.sourceFile.endsWith('adversarial_notifications.jsonl'))).toBe(true);
    expect(fixtures.some((fixture) => fixture.sourceFile.endsWith('redacted_samples.jsonl'))).toBe(true);
  });

  it('matches expected direction labels and auto-confirm candidate flags', async () => {
    const fixtures = await loadAllBankTemplateFixtures();

    for (const fixture of fixtures) {
      const parsed = parseBankNotification({
        bankProfileId: fixture.bank_profile_id,
        text: fixture.parserText
      });

      expect(parsed.directionLabel, fixture.fixture_id).toBe(fixture.expected.direction_label);
      expect(parsed.allowAutoConfirmCandidate, fixture.fixture_id).toBe(fixture.expected.auto_confirm_candidate);
      expect(Boolean(parsed.amountMinor), fixture.fixture_id).toBe(fixture.expected.amount_present);
      expect(Boolean(parsed.senderPhoneNormalized), fixture.fixture_id).toBe(fixture.expected.phone_present);
      expect(Boolean(parsed.referenceCode), fixture.fixture_id).toBe(fixture.expected.reference_present);

      for (const expectedReasonCode of fixture.expected.reason_codes) {
        expect(parsed.reasonCodes, `${fixture.fixture_id} missing ${expectedReasonCode}`).toContain(expectedReasonCode);
      }
    }
  });

  it('never marks negative or amount-only fixtures as auto-confirm candidates', async () => {
    const fixtures = await loadAllBankTemplateFixtures();
    const unsafeFixtures = fixtures.filter(
      (fixture) =>
        fixture.expected.direction_label !== 'incoming_customer_transfer' ||
        fixture.fixture_id.includes('amount_only')
    );

    expect(unsafeFixtures.length).toBeGreaterThan(0);

    for (const fixture of unsafeFixtures) {
      const parsed = parseBankNotification({
        bankProfileId: fixture.bank_profile_id,
        text: fixture.parserText
      });

      expect(parsed.allowAutoConfirmCandidate, fixture.fixture_id).toBe(false);
    }
  });

  it('materializes redacted placeholders without raw notification fixtures', async () => {
    const fixtures = await loadJsonlFixturesFromFile(
      'packages/bank-templates/fixtures/adversarial_notifications.jsonl'
    );

    expect(fixtures[0]?.parserText).toContain('137');
    expect(fixtures[0]?.parserText).toContain('₽');
    expect(fixtures[0]?.parserText).not.toContain('<AMOUNT>');
    expect(fixtures[0]?.parserText).not.toContain('<PHONE>');
  });
});
