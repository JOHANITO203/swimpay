import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decodeApk } from './apktool.js';
import { extractApkCertificates } from './certificate-extractor.js';
import { defaultRuntimeValidationChecklist, generateBankLauncherRegistry } from './registry-generator.js';
import { writeDiscoveryReports } from './reports.js';
import { parseAndroidManifestXml } from './manifest-parser.js';
import type { ApkCertificateDiscovery, ApkDiscoveryReport } from './types.js';

export interface DiscoverDecodedApkInput {
  bankId: string;
  decodedDir: string;
  outputDir: string;
  reportsDir: string;
  generatedAt?: string | undefined;
  certificate?: ApkCertificateDiscovery | undefined;
}

export interface DiscoverDecodedApkResult extends ApkDiscoveryReport {
  outputVersionDir: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
}

export async function discoverDecodedApk(input: DiscoverDecodedApkInput): Promise<DiscoverDecodedApkResult> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const manifestXml = await readFile(join(input.decodedDir, 'AndroidManifest.xml'), 'utf8');
  const manifest = parseAndroidManifestXml(manifestXml, generatedAt);
  const apktoolVersionInfo = await readApktoolVersionInfo(input.decodedDir);
  if (!manifest.versionCode && apktoolVersionInfo.versionCode) {
    manifest.versionCode = apktoolVersionInfo.versionCode;
  }
  if (!manifest.versionName && apktoolVersionInfo.versionName) {
    manifest.versionName = apktoolVersionInfo.versionName;
  }
  const certificate =
    input.certificate ??
    ({
      packageName: manifest.packageName,
      certificateSha256: [],
      source: 'apk_signature_observation',
      generatedAt
    } satisfies ApkCertificateDiscovery);
  const capability = generateBankLauncherRegistry([{ bankId: input.bankId, manifest, certificate }])[0];
  if (!capability) {
    throw new Error(`Could not generate launcher capability for ${input.bankId}.`);
  }

  const runtimeValidation = defaultRuntimeValidationChecklist();
  const warnings = [
    'Static APK discovery only; do not treat observed deeplinks as runtime support.',
    'Generated entries are experimental and runtimeVerified=false by design.'
  ];
  const unknowns = [
    ...(!certificate.certificateSha256.length ? ['No META-INF certificate fingerprint observed. APK may use newer signing blocks.'] : []),
    ...(!capability.deeplinkCandidates.length ? ['No browsable deeplink candidates observed.'] : [])
  ];
  const report: ApkDiscoveryReport = {
    bankId: input.bankId,
    manifest,
    certificate,
    capability,
    runtimeValidation,
    warnings,
    unknowns
  };
  const outputVersionDir = join(input.outputDir, input.bankId, sanitizePathSegment(manifest.versionName ?? manifest.versionCode ?? 'unknown'));
  await mkdir(outputVersionDir, { recursive: true });
  await writeFile(join(outputVersionDir, 'manifest-discovery.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(outputVersionDir, 'bank-launcher-capability.json'), `${JSON.stringify(capability, null, 2)}\n`, 'utf8');
  await writeFile(join(outputVersionDir, 'runtime-validation-checklist.json'), `${JSON.stringify(runtimeValidation, null, 2)}\n`, 'utf8');
  const reportPaths = await writeDiscoveryReports({ reportsDir: input.reportsDir, report });

  return {
    ...report,
    outputVersionDir,
    ...reportPaths
  };
}

export async function discoverApk(input: {
  bankId: string;
  apkPath: string;
  outputDir: string;
  reportsDir: string;
  timeoutMs?: number | undefined;
  generatedAt?: string | undefined;
}): Promise<DiscoverDecodedApkResult> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const stagingDir = join(input.outputDir, input.bankId, '_apktool_decoded');
  await decodeApk({ apkPath: input.apkPath, outputDir: stagingDir, timeoutMs: input.timeoutMs });
  const manifestXml = await readFile(join(stagingDir, 'AndroidManifest.xml'), 'utf8');
  const manifest = parseAndroidManifestXml(manifestXml, generatedAt);
  const certificate = await extractApkCertificates({
    apkPath: input.apkPath,
    packageName: manifest.packageName,
    generatedAt
  });
  const discovered = await discoverDecodedApk({
    bankId: input.bankId,
    decodedDir: stagingDir,
    outputDir: input.outputDir,
    reportsDir: input.reportsDir,
    generatedAt,
    certificate
  });
  await rm(stagingDir, { recursive: true, force: true });
  return discovered;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_') || 'unknown';
}

async function readApktoolVersionInfo(decodedDir: string): Promise<{ versionCode?: string; versionName?: string }> {
  try {
    const yaml = await readFile(join(decodedDir, 'apktool.yml'), 'utf8');
    return parseApktoolVersionInfo(yaml);
  } catch {
    return {};
  }
}

function parseApktoolVersionInfo(yaml: string): { versionCode?: string; versionName?: string } {
  const versionInfoStart = yaml.search(/^versionInfo:\s*$/m);
  if (versionInfoStart < 0) {
    return {};
  }

  const lines = yaml.slice(versionInfoStart).split(/\r?\n/).slice(1);
  const result: { versionCode?: string; versionName?: string } = {};
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      break;
    }

    const match = line.match(/^\s+(versionCode|versionName):\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const value = match[2]?.replace(/^['"]|['"]$/g, '');
    if (!value) {
      continue;
    }
    if (key === 'versionCode') {
      result.versionCode = value;
    }
    if (key === 'versionName') {
      result.versionName = value;
    }
  }
  return result;
}
