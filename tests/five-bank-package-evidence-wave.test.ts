import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Sprint 6B five-bank package evidence collection wave', () => {
  test('records limited ADB discovery authorization and Sprint 6B queue order', () => {
    const requiredFiles = [
      '.swimpay-agent/LIMITED_BANK_PACKAGE_DISCOVERY_AUTHORIZATION.md',
      '.swimpay-agent/BANK_PACKAGE_CANDIDATES.md',
      '.swimpay-agent/SPRINT_6B_REPORT.md'
    ];

    for (const file of requiredFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }

    const authorization = readFileSync(join(root, '.swimpay-agent/LIMITED_BANK_PACKAGE_DISCOVERY_AUTHORIZATION.md'), 'utf8');
    for (const keyword of ['sber', 'tinkoff', 'tbank', 'vtb', 'alfa', 'gazprom', 'gazprombank']) {
      expect(authorization).toContain(keyword);
    }
    expect(authorization).toContain('no full installed-app report');
    expect(authorization).toContain('no production trust');
    expect(authorization).toContain('no auto-confirm');

    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');
    const orderedTasks = [
      '282_limited_bank_package_discovery_authorization',
      '283_adb_filtered_bank_package_lookup',
      '284_operator_candidate_package_selection',
      '285_five_bank_package_evidence_collection',
      '286_five_bank_evidence_review_only_approval',
      '287_five_bank_matrix_update',
      '288_sprint_6b_closeout_review'
    ];

    let previousIndex = -1;
    for (const task of orderedTasks) {
      const index = queue.search(new RegExp(`\\\`${task}\\\` - status: (pending|completed|blocked) - source: \\\`tasks/${task}\\.md\\\``));
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  test('candidate report only contains allowed keyword package names and no full package listing', () => {
    const report = readFileSync(join(root, '.swimpay-agent/BANK_PACKAGE_CANDIDATES.md'), 'utf8');
    const packageNames = [...report.matchAll(/`([a-z0-9_.]+)`/giu)].map((match) => match[1]!);
    const candidatePackages = packageNames.filter((value) => value.includes('.'));

    for (const packageName of candidatePackages) {
      expect(/sber|tinkoff|tbank|vtb|alfa|gazprom|gazprombank/iu.test(packageName), packageName).toBe(true);
    }

    expect(report).toContain('Filtered ADB lookup only');
    expect(report).not.toContain('package:com.android.');
    expect(report).not.toContain('package:com.google.');
    expect(report).not.toContain('package:com.sec.');
  });

  test('matrix keeps evidence review-only and auto-confirm disabled for all five banks', () => {
    const matrix = JSON.parse(readFileSync(join(root, 'packages/bank-templates/v1-bank-mvp-matrix.json'), 'utf8')) as {
      banks: Array<{
        bank_profile_id: string;
        package_name?: string;
        cert_evidence_status: string;
        auto_confirm_status: string;
        beta_readiness_status: string;
      }>;
    };

    expect(matrix.banks).toHaveLength(5);
    for (const bank of matrix.banks) {
      expect(bank.auto_confirm_status).toBe('disabled');
      expect(bank.cert_evidence_status).not.toBe('production_trust_approved');
      expect(bank.cert_evidence_status).not.toBe('trusted');
    }

    const sber = matrix.banks.find((bank) => bank.bank_profile_id === 'sber_ru');
    expect(sber?.package_name).toBe('ru.sberbankmobile');

    const remainingBanks = matrix.banks.filter((bank) => bank.bank_profile_id !== 'sber_ru');
    expect(remainingBanks.some((bank) => bank.cert_evidence_status === 'approved_for_review_only')).toBe(true);
  });
});
