import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('runtime product truth neutralization', () => {
  it('keeps V1 runtime surfaces free from auto-confirm execution paths', () => {
    const runtime = read('apps/signal-worker/src/runtime.ts');
    const matchingCore = read('packages/matching-core/src/index.ts');
    const paymentSessions = read('apps/api/src/payment-sessions.ts');
    const contracts = read('packages/contracts/src/index.ts');

    for (const [label, content] of [
      ['signal runtime', runtime],
      ['matching core', matchingCore],
      ['payment sessions API', paymentSessions],
      ['public contracts', contracts]
    ] as const) {
      expect(content, label).not.toContain('autoConfirm(');
      expect(content, label).not.toContain('canAutoConfirm');
      expect(content, label).not.toContain("'auto_confirmed'");
      expect(content, label).not.toContain('"auto_confirmed"');
      expect(content, label).not.toContain('DECISION_AUTO_CONFIRMED');
    }
  });

  it('keeps active merchant UI and operator docs from presenting auto-confirm as a V1 state', () => {
    const activeText = [
      read('AGENTS.md'),
      read('apps/web/src/index.ts'),
      read('apps/web/src/screens/CheckoutScreen.ts'),
      read('docs/02_SYSTEM_ARCHITECTURE.md'),
      read('docs/04_SERVICES_SPEC.md'),
      read('docs/05_DATABASE_SCHEMA.md'),
      read('docs/07_EVENT_CATALOG.md'),
      read('docs/10_MATCHING_AND_SCORING.md'),
      read('docs/19_BANK_PROFILES_V1.md'),
      read('docs/SIGNAL_RUNTIME_PIPELINE.md')
    ].join('\n');

    expect(activeText).not.toContain('auto_confirmed');
    expect(activeText).not.toMatch(/auto-confirm only if/iu);
    expect(activeText).not.toContain('decision.auto_confirmed');
    expect(activeText).not.toContain('payment.signal_detected');
    expect(activeText).not.toContain('payment.needs_review');
    expect(activeText).not.toContain('official_bank_confirmation = true');
  });
});
