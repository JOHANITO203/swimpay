import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateRawSync } from 'node:zlib';
import {
  detectDeeplinkCandidates,
  discoverDecodedApk,
  extractApkCertificates,
  generateBankLauncherRegistry,
  parseAndroidManifestXml
} from '../tools/apk-discovery/src/index.js';

const manifestFixture = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
  package="ru.sberbankmobile"
  android:versionCode="170500"
  android:versionName="17.5.0">
  <application android:label="SberBank">
    <activity
      android:name="ru.sberbankmobile.MainActivity"
      android:exported="true">
      <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="sberbank" android:host="pay" android:pathPrefix="/transfer" />
        <data android:scheme="https" android:host="online.sberbank.ru" android:path="/pay" />
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="sberbank" android:host="card" android:pathPattern="/recipient/.*" android:mimeType="ignored" />
      </intent-filter>
    </activity>
    <activity android:name="ru.sberbankmobile.InternalActivity" android:exported="false">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
      </intent-filter>
    </activity>
  </application>
</manifest>`;

describe('apk deeplink discovery', () => {
  it('parses package metadata and browsable VIEW intent filters from AndroidManifest.xml', () => {
    const discovery = parseAndroidManifestXml(manifestFixture, '2026-05-10T00:00:00.000Z');

    expect(discovery).toMatchObject({
      packageName: 'ru.sberbankmobile',
      versionCode: '170500',
      versionName: '17.5.0',
      applicationLabel: 'SberBank',
      discoveredSchemes: ['https', 'sberbank'],
      discoveredHosts: ['card', 'online.sberbank.ru', 'pay'],
      generatedAt: '2026-05-10T00:00:00.000Z'
    });
    expect(discovery.browsableActivities).toHaveLength(1);
    expect(discovery.browsableActivities[0]).toMatchObject({
      activityName: 'ru.sberbankmobile.MainActivity',
      exported: true
    });
    expect(discovery.browsableActivities[0]?.intentFilters).toHaveLength(2);
    expect(discovery.browsableActivities[0]?.intentFilters[0]).toMatchObject({
      actions: ['android.intent.action.VIEW'],
      categories: ['android.intent.category.DEFAULT', 'android.intent.category.BROWSABLE'],
      data: [
        { scheme: 'sberbank', host: 'pay', pathPrefix: '/transfer' },
        { scheme: 'https', host: 'online.sberbank.ru', path: '/pay' }
      ]
    });
  });

  it('does not invent browsable activities when a manifest has no browsable VIEW filters', () => {
    const manifest = `<manifest package="ru.bank"><application><activity android:name=".Main" /></application></manifest>`;
    const discovery = parseAndroidManifestXml(manifest, '2026-05-10T00:00:00.000Z');

    expect(discovery.browsableActivities).toEqual([]);
    expect(discovery.discoveredSchemes).toEqual([]);
    expect(discovery.discoveredHosts).toEqual([]);
  });

  it('rejects malformed manifests instead of silently producing an unsafe registry', () => {
    expect(() => parseAndroidManifestXml('<manifest><application>', '2026-05-10T00:00:00.000Z')).toThrow(
      /Malformed AndroidManifest/
    );
  });

  it('detects deeplink candidates without claiming runtime support', () => {
    const discovery = parseAndroidManifestXml(manifestFixture, '2026-05-10T00:00:00.000Z');
    const candidates = detectDeeplinkCandidates(discovery);

    expect(candidates).toContainEqual({
      uriPattern: 'sberbank://pay/transfer*',
      source: 'manifest_discovery',
      confidence: 'medium',
      status: 'candidate',
      relatedActivity: 'ru.sberbankmobile.MainActivity'
    });
    expect(candidates.every((candidate) => candidate.status !== 'certified')).toBe(true);
  });

  it('generates an observed launcher registry with runtime verification disabled by default', () => {
    const discovery = parseAndroidManifestXml(manifestFixture, '2026-05-10T00:00:00.000Z');
    const registry = generateBankLauncherRegistry([
      {
        bankId: 'sber_ru',
        manifest: discovery,
        certificate: {
          packageName: discovery.packageName,
          certificateSha256: ['abc123'],
          source: 'apk_signature_observation',
          generatedAt: discovery.generatedAt
        }
      }
    ]);

    expect(registry).toEqual([
      expect.objectContaining({
        bankId: 'sber_ru',
        packageName: 'ru.sberbankmobile',
        discoveredSchemes: ['https', 'sberbank'],
        discoveredHosts: ['card', 'online.sberbank.ru', 'pay'],
        browsableActivities: ['ru.sberbankmobile.MainActivity'],
        source: 'apktool_observation',
        testedStatus: 'experimental',
        runtimeVerified: false
      })
    ]);
  });

  it('discovers decoded APK manifest and emits JSON plus markdown reports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'swimpay-apk-discovery-'));
    try {
      const decodedDir = join(root, 'decoded');
      await mkdir(decodedDir, { recursive: true });
      await writeFile(join(root, 'AndroidManifest.xml'), manifestFixture, 'utf8');
      await rename(join(root, 'AndroidManifest.xml'), join(decodedDir, 'AndroidManifest.xml'));

      const result = await discoverDecodedApk({
        bankId: 'sber_ru',
        decodedDir,
        outputDir: join(root, 'out'),
        reportsDir: join(root, 'reports'),
        generatedAt: '2026-05-10T00:00:00.000Z'
      });

      expect(result.capability.runtimeVerified).toBe(false);
      expect(result.reportJsonPath.endsWith('reports\\sber_ru.json') || result.reportJsonPath.endsWith('reports/sber_ru.json')).toBe(true);

      const markdown = await readFile(result.reportMarkdownPath, 'utf8');
      expect(markdown).toContain('# Sberbank Discovery Report');
      expect(markdown).toContain('Runtime Verification: false');
      expect(markdown).toContain('APK discovery != runtime support');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses apktool.yml version metadata when decoded manifest omits version fields', async () => {
    const root = await mkdtemp(join(tmpdir(), 'swimpay-apk-discovery-version-'));
    try {
      const decodedDir = join(root, 'decoded');
      await mkdir(decodedDir, { recursive: true });
      await writeFile(
        join(decodedDir, 'AndroidManifest.xml'),
        `<manifest package="ru.bank"><application android:label="Bank"><activity android:name=".Main" /></application></manifest>`,
        'utf8'
      );
      await writeFile(
        join(decodedDir, 'apktool.yml'),
        `version: 3.0.2\nversionInfo:\n  versionCode: 42\n  versionName: 1.2.3\n`,
        'utf8'
      );

      const result = await discoverDecodedApk({
        bankId: 'sber_ru',
        decodedDir,
        outputDir: join(root, 'out'),
        reportsDir: join(root, 'reports'),
        generatedAt: '2026-05-10T00:00:00.000Z'
      });

      expect(result.manifest.versionCode).toBe('42');
      expect(result.manifest.versionName).toBe('1.2.3');
      expect(result.outputVersionDir.endsWith('1.2.3')).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('extracts SHA-256 fingerprints from META-INF certificate entries without modifying APKs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'swimpay-apk-cert-'));
    try {
      const apkPath = join(root, 'fixture.apk');
      await writeFile(apkPath, createTinyZip([{ name: 'META-INF/CERT.RSA', body: Buffer.from('certificate') }]));

      const certificate = await extractApkCertificates({
        apkPath,
        packageName: 'ru.sberbankmobile',
        generatedAt: '2026-05-10T00:00:00.000Z'
      });

      expect(certificate).toEqual({
        packageName: 'ru.sberbankmobile',
        certificateSha256: ['03d66dd08835c1ca3f128cceacd1f31ac94163096b20f445ae84285bc0832d72'],
        source: 'apk_signature_observation',
        generatedAt: '2026-05-10T00:00:00.000Z'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function createTinyZip(entries: readonly { name: string; body: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const body = deflateRawSync(entry.body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(entry.body.length, 22);
    local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(entry.body.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralDirectory.push(central, name);
    offset += local.length + name.length + body.length;
  }

  const centralStart = offset;
  const centralBody = Buffer.concat(centralDirectory);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBody.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  return Buffer.concat([...chunks, centralBody, eocd]);
}
