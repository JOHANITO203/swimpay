import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const fiveBankIds = ['sber_ru', 'tbank_ru', 'vtb_ru', 'alfa_ru', 'gazprombank_ru'] as const;
const requiredFixtureCategories = [
  'incoming_transfer',
  'amount_only',
  'cashback',
  'refund',
  'outgoing_payment',
  'promo',
  'failed_transfer'
] as const;

interface MatrixEntry {
  bank_profile_id: string;
  cert_evidence_status: string;
  receiver_selection_status: string;
  synthetic_shadow_runtime_status: string;
  real_notification_shadow_status: string;
  auto_confirm_status: string;
  beta_readiness_status: string;
}

interface ShadowFixtureSet {
  banks: Array<{
    bank_profile_id: string;
    fixtures: Array<{
      category: string;
      title_redacted: string;
      body_redacted: string;
      expected_decision: string;
      expected_webhook_type?: string;
      confirmation_type?: string;
      official_bank_confirmation: boolean;
      auto_confirm_expected: boolean;
    }>;
  }>;
}

describe('Sprint 6C five-bank review-only shadow runtime rehearsal', () => {
  test('creates Sprint 6C task files and active task queue order', () => {
    const requiredFiles = [
      'tasks/289_five_bank_receiver_review_only_selection.md',
      'tasks/290_five_bank_synthetic_signal_fixture_set.md',
      'tasks/291_five_bank_shadow_runtime_review_queue_rehearsal.md',
      'tasks/292_five_bank_webhook_disclosure_rehearsal.md',
      'tasks/293_five_bank_negative_signal_safety_rehearsal.md',
      'tasks/294_five_bank_matrix_shadow_status_update.md',
      'tasks/295_sprint_6c_closeout_review.md',
      '.swimpay-agent/SPRINT_6C_REPORT.md'
    ];

    for (const file of requiredFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }

    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');
    const orderedTasks = [
      '289_five_bank_receiver_review_only_selection',
      '290_five_bank_synthetic_signal_fixture_set',
      '291_five_bank_shadow_runtime_review_queue_rehearsal',
      '292_five_bank_webhook_disclosure_rehearsal',
      '293_five_bank_negative_signal_safety_rehearsal',
      '294_five_bank_matrix_shadow_status_update',
      '295_sprint_6c_closeout_review'
    ];

    let previousIndex = -1;
    for (const task of orderedTasks) {
      const index = queue.search(new RegExp(`\\\`${task}\\\` - status: (pending|completed|blocked) - source: \\\`tasks/${task}\\.md\\\``));
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }

    expect(queue).not.toContain('status: missing');
  });

  test('defines redacted synthetic shadow fixtures for each V1 bank and signal category', () => {
    const fixturePath = join(root, 'packages/bank-templates/five-bank-synthetic-shadow-fixtures.json');
    expect(existsSync(fixturePath)).toBe(true);

    const fixtureSet = JSON.parse(readFileSync(fixturePath, 'utf8')) as ShadowFixtureSet;
    expect(fixtureSet.banks.map((bank) => bank.bank_profile_id)).toEqual([...fiveBankIds]);

    for (const bank of fixtureSet.banks) {
      expect(bank.fixtures.map((fixture) => fixture.category)).toEqual([...requiredFixtureCategories]);

      for (const fixture of bank.fixtures) {
        const serialized = JSON.stringify(fixture);
        expect(serialized).toMatch(/<AMOUNT>|<PHONE>|<REFERENCE>|<PERSON>|<CURRENCY>/u);
        expect(serialized).not.toMatch(/\+?\d[\d\s().-]{7,}\d/u);
        expect(fixture.official_bank_confirmation).toBe(false);
        expect(fixture.auto_confirm_expected).toBe(false);
        if (fixture.expected_webhook_type) {
          expect(fixture.confirmation_type).toBe('notification_signal');
        }
      }
    }
  });

  test('marks all five banks as synthetic-shadow rehearsed while real notifications stay not started', () => {
    const matrix = JSON.parse(readFileSync(join(root, 'packages/bank-templates/v1-bank-mvp-matrix.json'), 'utf8')) as {
      banks: MatrixEntry[];
    };

    expect(matrix.banks.map((entry) => entry.bank_profile_id)).toEqual([...fiveBankIds]);

    for (const entry of matrix.banks) {
      expect(entry.receiver_selection_status).toBe('review_only_ready');
      expect(entry.synthetic_shadow_runtime_status).toBe('passed');
      expect(entry.real_notification_shadow_status).toBe('not_started');
      expect(entry.auto_confirm_status).toBe('disabled');
      expect(entry.beta_readiness_status).toBe('pending_real_notification_shadow');
      expect(entry.cert_evidence_status).not.toBe('production_trust_approved');
      expect(entry.cert_evidence_status).not.toBe('trusted');
    }
  });

  test('documents review-only shadow rehearsal without real notification processing or official confirmation claims', () => {
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_6C_REPORT.md'), 'utf8');
    const matrixDoc = readFileSync(join(root, 'docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md'), 'utf8');

    for (const content of [report, matrixDoc]) {
      expect(content).toContain('review-only');
      expect(content).toContain('real notification');
      expect(content).toContain('not started');
      expect(content).toContain('official_bank_confirmation=false');
      expect(content).toContain('confirmation_type=notification_signal');
      expect(content).not.toContain('official_bank_confirmation=true');
      expect(content).not.toContain('bank_confirmed');
      expect(content).not.toContain('ready_auto_confirm');
    }
  });
});
