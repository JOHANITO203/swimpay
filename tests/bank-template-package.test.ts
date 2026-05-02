import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BankTemplateReasonCodes,
  DirectionLabels,
  TemplateStatuses,
  isNegativePaymentDirection
} from '@swimpay/bank-templates';

const root = process.cwd();

describe('bank template package setup', () => {
  test('exports TypeScript status and reason-code stubs through the workspace package', () => {
    expect(TemplateStatuses).toContain('learning');
    expect(DirectionLabels).toContain('incoming_customer_transfer');
    expect(BankTemplateReasonCodes.TEMPLATE_MATCHED).toBe('template_matched');
    expect(isNegativePaymentDirection('outgoing_payment')).toBe(true);
  });

  test('keeps bank-template YAML and JSONL assets present and trackable', () => {
    const requiredAssets = [
      'packages/bank-templates/INDEX.md',
      'packages/bank-templates/banks/sberbank/profile.yml',
      'packages/bank-templates/banks/tbank/templates/incoming_customer_transfer.yml',
      'packages/bank-templates/banks/vtb/fixtures/redacted_samples.jsonl',
      'packages/bank-templates/fixtures/adversarial_notifications.jsonl',
      'packages/bank-templates/policies/template_lifecycle_policy.yml',
      'packages/bank-templates/schemas/template.schema.json',
      'packages/bank-templates/shared/redaction_tokens.yml'
    ];

    for (const asset of requiredAssets) {
      expect(existsSync(join(root, asset)), asset).toBe(true);
    }

    const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
    expect(gitignore).not.toMatch(/^\*\.ya?ml$/m);
    expect(gitignore).not.toMatch(/^\*\.jsonl$/m);
  });
});
