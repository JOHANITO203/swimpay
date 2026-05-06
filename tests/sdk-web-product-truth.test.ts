import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SDK_FACING_FILES = [
  'docs/SDK_WEB_QUICKSTART.md',
  'examples/web-node-basic/README.md',
  'examples/web-node-basic/server.ts',
  'examples/web-node-basic/.env.example',
  'packages/swimpay-node/README.md'
];

describe('SDK Web product truth guardrails', () => {
  it('ships the expected SDK-facing docs and examples', () => {
    for (const file of SDK_FACING_FILES) {
      expect(existsSync(join(process.cwd(), file)), `${file} should exist`).toBe(true);
    }
  });

  it('does not publish unsafe SDK-facing snippets or claims', () => {
    const corpus = SDK_FACING_FILES.map((file) => readFileSync(join(process.cwd(), file), 'utf8')).join('\n');

    expect(corpus).not.toMatch(/auto_confirm\s*:\s*true|autoConfirm\s*:\s*true/iu);
    expect(corpus).not.toMatch(/decision\s*[:=]\s*['"]auto_confirmed['"]/iu);
    expect(corpus).not.toMatch(/official_bank_confirmation\s*[:=]\s*true|officialBankConfirmation\s*[:=]\s*true/iu);
    expect(corpus).not.toMatch(/payment\.signal_detected[\s\S]{0,120}(release|fulfill|ship|confirm|traiter la commande)/iu);
    expect(corpus).not.toMatch(/payment\.needs_review[\s\S]{0,120}(release|fulfill|ship|confirm|traiter la commande)/iu);
    expect(corpus).not.toMatch(/cvv|cvc|expiration date|date d'expiration|expiry/iu);
    expect(corpus).not.toMatch(/J['’]ai pay[ée][\s\S]{0,80}(confirms|confirme|confirmation du paiement)/iu);
  });

  it('keeps merchant secret keys out of browser and Android snippets', () => {
    const browserAndAndroidCorpus = SDK_FACING_FILES.map((file) => readFileSync(join(process.cwd(), file), 'utf8'))
      .join('\n')
      .split(/\n/)
      .filter((line) => /browser|frontend|android|apk|client-side|cote client|côté client|redirectToCheckout/iu.test(line))
      .join('\n');

    expect(browserAndAndroidCorpus).not.toMatch(/SWIMPAY_SECRET_KEY|sk_live_|sk_test_|Authorization:\s*Bearer/iu);
  });
});
