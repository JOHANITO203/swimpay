import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readDoc(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('product truth SDK-facing docs', () => {
  it('documents public webhooks as post-manual-confirmation outcomes only', () => {
    const webhooks = readDoc('docs/12_WEBHOOKS.md');

    expect(webhooks).toContain('Webhooks');
    expect(webhooks).toContain('manual confirmation');
    expect(webhooks).toContain('"official_bank_confirmation": false');
    expect(webhooks).toContain('"decision": "manual_confirmed"');
    expect(webhooks).not.toContain('payment.signal_detected');
    expect(webhooks).not.toContain('payment.needs_review');
    expect(webhooks).not.toContain('"decision": "auto_confirmed"');
    expect(webhooks).not.toContain('"official_bank_confirmation": true');
  });

  it('keeps order creation and checkout docs free from V1 auto-confirm examples', () => {
    const apiSpec = readDoc('docs/06_API_SPEC.md');

    expect(apiSpec).toContain('continue-to-bank');
    expect(apiSpec).toContain('claimed-paid');
    expect(apiSpec).toContain('payment_session_created');
    expect(apiSpec).toContain('receiver_armed');
    expect(apiSpec).toContain("J'ai paye");
    expect(apiSpec).not.toContain('"auto_confirm"');
    expect(apiSpec).not.toContain('payment.needs_review');
    expect(apiSpec).not.toContain('payment.signal_detected');
    expect(apiSpec).not.toContain('"official_bank_confirmation": true');
  });
});
