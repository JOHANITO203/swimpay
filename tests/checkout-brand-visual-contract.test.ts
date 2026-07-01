import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const checkoutSource = readFileSync('apps/web/src/screens/CheckoutScreen.ts', 'utf8');
const assetRegistry = readFileSync('design/ASSET_REGISTRY.md', 'utf8');

describe('checkout visual brand contract', () => {
  it('uses the noir-vivant Caméléon monochrome token ramp for the hosted checkout palette', () => {
    // The whole surface ramp is tinted at one hue (--h), the active app's brand
    // hue, animated via @property. Legacy --sp-* aliases are remapped onto the ramp.
    expect(checkoutSource).toContain('@property --h');
    expect(checkoutSource).toContain('color-scheme: dark;');
    expect(checkoutSource).toContain('--accent: hsl(var(--h) var(--as) var(--al));');
    expect(checkoutSource).toContain('--bg: hsl(var(--h) 26% 5.5%);');
    expect(checkoutSource).toContain('--surface: hsl(var(--h) 19% 10.5%);');
    expect(checkoutSource).toContain('--ink1: hsl(var(--h) 18% 96%);');
    expect(checkoutSource).toContain('--sp-ink: var(--ink1);');
    expect(checkoutSource).toContain('--sp-background: var(--bg);');
  });

  it('renders the checkout SwimPay header mark with the official launcher symbol geometry', () => {
    expect(checkoutSource).toContain('class="swimpay-launcher-symbol-mark"');
    expect(checkoutSource).toContain('function swimPayLauncherSymbolSvg');
    expect(checkoutSource).toContain('M 184.83,27.69');
    expect(checkoutSource).toContain('L 70.71,224.17');
    // Noir-vivant Caméléon: the header mark now carries the active app's accent hue.
    expect(checkoutSource).toContain('background: var(--accent);');
    expect(checkoutSource).toContain('color: var(--accent-ink);');
    expect(checkoutSource).not.toContain('class="swimpay-waves-mark"');
  });

  it('documents that checkout mark is an aligned runtime rendering, not a new asset file', () => {
    expect(assetRegistry).toContain('Checkout inline SwimPay launcher mark');
    expect(assetRegistry).toContain('aligned to the official Android launcher symbol');
    expect(assetRegistry).toContain('must not become a new resource logo file');
  });
});
