import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const fiveBankIds = ['sber_ru', 'tbank_ru', 'vtb_ru', 'alfa_ru', 'gazprombank_ru'] as const;

interface FiveBankMatrixEntry {
  bank_profile_id: string;
  display_name: string;
  package_input_status: string;
  package_name?: string;
  cert_evidence_status: string;
  package_visibility_status: string;
  receiver_selection_status: string;
  notification_listener_capture_status: string;
  sample_notification_status: string;
  parser_status: string;
  review_routing_status: string;
  webhook_status: string;
  auto_confirm_status: string;
  beta_readiness_status: string;
  blockers: string[];
}

describe('Phase 6 five-bank MVP readiness foundation', () => {
  test('defines the Phase 6 plan and Sprint 6A task queue instead of continuing Sprint 5C', () => {
    const requiredFiles = [
      '.swimpay-agent/PHASE_6_FIVE_BANK_MVP_PLAN.md',
      '.swimpay-agent/SPRINT_6A_REPORT.md',
      'docs/FIVE_BANK_MVP_VALIDATION_MATRIX.md',
      'docs/FIVE_BANK_NOTIFICATION_SHADOW_POLICY.md',
      'docs/BETA_MERCHANT_ONBOARDING_FLOW.md',
      'docs/PRIVATE_BETA_READINESS.md',
      'packages/bank-templates/v1-bank-mvp-matrix.json'
    ];

    for (const file of requiredFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }

    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');
    const orderedTasks = [
      '273_phase_6_five_bank_mvp_direction',
      '274_five_bank_mvp_validation_matrix',
      '275_five_bank_package_evidence_collection_plan',
      '276_five_bank_receiver_selection_and_readiness',
      '277_five_bank_redacted_notification_shadow_policy',
      '278_five_bank_review_only_runtime_tests',
      '279_beta_merchant_onboarding_flow',
      '280_private_beta_go_no_go_checklist',
      '281_sprint_6a_closeout_review'
    ];

    let previousIndex = -1;
    for (const task of orderedTasks) {
      const index = queue.search(new RegExp(`\\\`${task}\\\` - status: (pending|completed|blocked) - source: \\\`tasks/${task}\\.md\\\``));
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }

    expect(queue).not.toContain('273_production');
    expect(queue).not.toContain('5C');
  });

  test('tracks exactly the V1 five-bank MVP matrix without invented package metadata', () => {
    const matrix = JSON.parse(readFileSync(join(root, 'packages/bank-templates/v1-bank-mvp-matrix.json'), 'utf8')) as {
      phase: string;
      banks: FiveBankMatrixEntry[];
    };

    expect(matrix.phase).toBe('phase_6_five_bank_mvp_validation');
    expect(matrix.banks.map((entry) => entry.bank_profile_id)).toEqual([...fiveBankIds]);

    const sber = matrix.banks.find((entry) => entry.bank_profile_id === 'sber_ru');
    expect(sber).toMatchObject({
      display_name: 'Sberbank',
      package_input_status: 'operator_provided',
      package_name: 'ru.sberbankmobile',
      auto_confirm_status: 'disabled'
    });
    expect(['approved_for_review_only', 'production_trust_revoked']).toContain(sber?.cert_evidence_status);

    for (const entry of matrix.banks.filter((bank) => bank.bank_profile_id !== 'sber_ru')) {
      expect(entry.package_input_status).toBe('package_input_needed');
      expect(entry.package_name).toBeUndefined();
      expect(entry.cert_evidence_status).toBe('not_collected');
      expect(entry.auto_confirm_status).toBe('disabled');
      expect(entry.review_routing_status).toBe('review_only_required');
    }
  });

  test('documents private beta as review-only shadow mode with no real notification processing yet', () => {
    const phasePlan = readFileSync(join(root, '.swimpay-agent/PHASE_6_FIVE_BANK_MVP_PLAN.md'), 'utf8');
    const shadowPolicy = readFileSync(join(root, 'docs/FIVE_BANK_NOTIFICATION_SHADOW_POLICY.md'), 'utf8');
    const betaReadiness = readFileSync(join(root, 'docs/PRIVATE_BETA_READINESS.md'), 'utf8');

    for (const content of [phasePlan, shadowPolicy, betaReadiness]) {
      expect(content).toContain('review-only');
      expect(content).toContain('auto-confirm');
      expect(content).toContain('disabled');
      expect(content).toContain('not official bank confirmation');
      expect(content).not.toContain('official_bank_confirmation: true');
      expect(content).not.toContain('bank_confirmed');
      expect(content).not.toContain('guaranteed_payment');
    }

    expect(phasePlan).toContain('production/admin hardening is paused');
    expect(shadowPolicy).toContain('No raw notification text storage by default');
    expect(betaReadiness).toContain('no auto-confirm on real banks');
  });
});
