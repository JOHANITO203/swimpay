import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const checkoutSource = readFileSync('apps/web/src/screens/CheckoutScreen.ts', 'utf8');
const assetRegistry = readFileSync('design/ASSET_REGISTRY.md', 'utf8');

describe('checkout visual brand contract', () => {
  it('uses Android premium token values for the hosted checkout palette', () => {
    expect(checkoutSource).toContain('--sp-ink: #071126');
    expect(checkoutSource).toContain('--sp-navy: #0F172A');
    expect(checkoutSource).toContain('--sp-blue: #155BD8');
    expect(checkoutSource).toContain('--sp-cyan: #16ADEC');
    expect(checkoutSource).toContain('--sp-teal: #0EA5A4');
    expect(checkoutSource).toContain('--sp-background: #F2F7FA');
  });

  it('renders the checkout SwimPay mark with the compact app waves geometry', () => {
    expect(checkoutSource).toContain('class="swimpay-waves-mark"');
    expect(checkoutSource).toContain('<path d="M14 17h20"/>');
    expect(checkoutSource).toContain('<path d="M14 24h20"/>');
    expect(checkoutSource).toContain('<path d="M14 31h20"/>');
    expect(checkoutSource).toContain('<path d="M15.5 12.5a13 13 0 0 0 0 23"/>');
    expect(checkoutSource).toContain('background: var(--sp-navy);');
    expect(checkoutSource).toContain('color: var(--sp-cyan);');
  });

  it('documents that checkout mark is an aligned runtime rendering, not a new asset file', () => {
    expect(assetRegistry).toContain('Checkout inline SwimPay mark');
    expect(assetRegistry).toContain('aligned to Android compact waves mark');
    expect(assetRegistry).toContain('must not become a new resource logo file');
  });
});
