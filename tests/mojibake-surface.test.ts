import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

const ignoredSegments = new Set([
  '.apk-research',
  '.external-skills',
  '.git',
  '.gradle',
  '.swimpay-agent',
  'build',
  'dist',
  'node_modules',
  'visual-baselines',
  'screenshots'
]);

const ignoredExtensions = new Set([
  '.apk',
  '.avif',
  '.bin',
  '.db',
  '.gif',
  '.ico',
  '.jar',
  '.jpg',
  '.jpeg',
  '.keystore',
  '.lock',
  '.pdf',
  '.png',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.webp',
  '.xapk',
  '.zip'
]);

const allowedMojibakeFiles = new Set([
  path.normalize('packages/bank-templates/src/fixtures.ts'),
  path.normalize('packages/bank-templates/src/parser.ts'),
  path.normalize('tests/mojibake-surface.test.ts')
]);

const mojibakePattern = /\uFFFD|\u00C3[\u0080-\u00BF]|\u00C2|\u00E2[\u0080-\u00BF]|\u00EF\u00BF\u00BD|\u00D0[\u0080-\u00BF]|\u00D1[\u0080-\u00BF]/u;

function shouldSkip(filePath: string): boolean {
  const relative = path.relative(repoRoot, filePath);
  const parts = relative.split(path.sep);
  if (parts.some((part) => ignoredSegments.has(part))) return true;
  return ignoredExtensions.has(path.extname(filePath).toLowerCase());
}

function collectFiles(dir: string, output: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const filePath = path.join(dir, entry);
    if (shouldSkip(filePath)) continue;
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      collectFiles(filePath, output);
    } else if (stats.isFile()) {
      output.push(filePath);
    }
  }
  return output;
}

describe('repository mojibake guardrail', () => {
  it('does not contain mojibake outside explicit bank-template encoding fixtures', () => {
    const offenders = collectFiles(repoRoot)
      .map((filePath) => {
        const relative = path.normalize(path.relative(repoRoot, filePath));
        if (allowedMojibakeFiles.has(relative)) return null;
        const content = readFileSync(filePath, 'utf8');
        return mojibakePattern.test(content) ? relative : null;
      })
      .filter((entry): entry is string => Boolean(entry));

    expect(offenders).toEqual([]);
  });
});
