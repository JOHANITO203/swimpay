import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readZipEntries } from './zip.js';
import type { ApkCertificateDiscovery } from './types.js';

export async function extractApkCertificates(input: {
  apkPath: string;
  packageName: string;
  generatedAt?: string | undefined;
}): Promise<ApkCertificateDiscovery> {
  const apk = await readFile(input.apkPath);
  const entries = readZipEntries(apk);
  const fingerprints = entries
    .filter((entry) => /^META-INF\/[^/]+\.(RSA|DSA|EC|CER)$/i.test(entry.name))
    .map((entry) => sha256(entry.body))
    .sort((a, b) => a.localeCompare(b));

  return {
    packageName: input.packageName,
    certificateSha256: [...new Set(fingerprints)],
    source: 'apk_signature_observation',
    generatedAt: input.generatedAt ?? new Date().toISOString()
  };
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
