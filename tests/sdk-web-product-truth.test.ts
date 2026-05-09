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

  it('documents a buyer-facing web checkout button that only asks the merchant backend for checkout_url', () => {
    const docs = [
      'docs/SDK_WEB_QUICKSTART.md',
      'packages/swimpay-node/README.md'
    ].map((file) => readFileSync(join(process.cwd(), file), 'utf8')).join('\n');

    expect(docs).toContain('Payer avec SwimPay');
    expect(docs).toContain('swimpay-button');
    expect(docs).toContain('/api/orders/${orderId}/swimpay-checkout');
    expect(docs).toContain('checkout.checkoutUrl');

    const buttonDocs = docs
      .split(/\n/)
      .filter((line) =>
        /swimpay-button|checkout\.checkoutUrl|\/api\/orders\/\$\{orderId\}\/swimpay-checkout|button\.disabled|window\.location/iu.test(line)
      )
      .join('\n');
    expect(buttonDocs).not.toMatch(/SWIMPAY_SECRET_KEY|SWIMPAY_WEBHOOK_SECRET|sk_test_|sk_live_|whsec_/iu);
  });
});
