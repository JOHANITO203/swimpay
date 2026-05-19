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

  it('renders the checkout SwimPay header mark with the official launcher symbol geometry', () => {
    expect(checkoutSource).toContain('class="swimpay-launcher-symbol-mark"');
    expect(checkoutSource).toContain('function swimPayLauncherSymbolSvg');
    expect(checkoutSource).toContain('M 184.83,27.69');
    expect(checkoutSource).toContain('L 70.71,224.17');
    expect(checkoutSource).toContain('background: #060708;');
    expect(checkoutSource).toContain('color: #FFFFFF;');
    expect(checkoutSource).not.toContain('class="swimpay-waves-mark"');
  });

  it('documents that checkout mark is an aligned runtime rendering, not a new asset file', () => {
    expect(assetRegistry).toContain('Checkout inline SwimPay launcher mark');
    expect(assetRegistry).toContain('aligned to the official Android launcher symbol');
    expect(assetRegistry).toContain('must not become a new resource logo file');
  });
});
