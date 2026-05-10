import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const serverSource = readFileSync('examples/real-staging-merchant/server.mjs', 'utf8');
const readme = readFileSync('examples/real-staging-merchant/README.md', 'utf8');

describe('real staging external merchant app', () => {
  it('uses the SwimPay Node SDK for order creation and webhook verification', () => {
    expect(serverSource).toContain("import { SwimPay, SwimPayApiError, WebhooksClient }");
    expect(serverSource).toContain("swimpay.orders.create");
    expect(serverSource).toContain("webhooks.verify");
  });

  it('preserves SDK setup errors as structured external app responses', () => {
    expect(serverSource).toContain('error instanceof SwimPayApiError');
    expect(serverSource).toContain('statusCode: error.statusCode');
    expect(serverSource).toContain('code: error.code');
    expect(serverSource).toContain('details: error.details');
    expect(serverSource).toContain('merchant_payment_setup_required');
  });

  it('fulfills only after verified payment.confirmed with notification signal semantics', () => {
    expect(serverSource).toContain("event.type !== 'payment.confirmed'");
    expect(serverSource).toContain("fulfilled_after_manual_confirmation");
    expect(serverSource).toContain("officialBankConfirmation");
    expect(serverSource).not.toMatch(/signal_detected|needs_review|autoConfirm|auto_confirm/iu);
  });

  it('documents staging-only secret handling without committing real values', () => {
    expect(readme).toContain('SWIMPAY_STAGING_API_BASE_URL=https://staging.swimpay.pro');
    expect(readme).toContain('Do not commit real values.');
    expect(readme).not.toMatch(/sk_live_|whsec_live_/u);
  });
});
