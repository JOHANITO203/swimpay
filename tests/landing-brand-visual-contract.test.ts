import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('landing brand visual contract', () => {
  it('ships web brand assets reconciled with the monochrome launcher identity', () => {
    for (const asset of [
      'apps/landing/public/favicon.svg',
      'apps/landing/public/brand/swimpay-icon.svg',
      'apps/landing/public/brand/swimpay-symbol.svg',
      'apps/landing/public/swimpay-icon-192.png',
      'apps/landing/public/swimpay-icon-512.png',
      'apps/landing/public/apple-touch-icon.png',
      'apps/landing/public/images/swimpay-og.png'
    ]) {
      expect(existsSync(join(root, asset)), `${asset} should exist`).toBe(true);
    }

    const icon = read('apps/landing/public/brand/swimpay-icon.svg');
    expect(icon).toContain('<rect width="256" height="256" rx="58" fill="#060708"');
    expect(icon).toContain('fill="#FFFFFF"');
    expect(icon).toContain('M 184.83,27.69');
  });

  it('uses the official BrandMark in landing chrome instead of generic letter tiles', () => {
    const brandMark = read('apps/landing/src/components/BrandMark.tsx');
    const navbar = read('apps/landing/src/components/Navbar.tsx');
    const footer = read('apps/landing/src/components/Footer.tsx');

    expect(brandMark).toContain('/brand/swimpay-icon.svg');
    expect(navbar).toContain('<BrandMark size="md" />');
    expect(footer).toContain('<BrandMark size="sm" />');
    expect(footer).not.toContain('>S</div>');
  });

  it('registers favicon and install icons in landing metadata', () => {
    const index = read('apps/landing/index.html');
    const manifest = read('apps/landing/public/site.webmanifest');

    expect(index).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
    expect(index).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    expect(manifest).toContain('"src": "/swimpay-icon-192.png"');
    expect(manifest).toContain('"src": "/swimpay-icon-512.png"');
    expect(manifest).toContain('"purpose": "any maskable"');
    expect(index).not.toMatch(/Google AI Studio|AI Studio|Gemini/iu);
  });
});
