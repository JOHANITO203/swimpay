#!/usr/bin/env node
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { discoverApk, inferBankIdFromApkFileName, type BankLauncherCapability } from '../src/index.js';

interface DiscoverAllArgs {
  inputDir: string;
  outputDir: string;
  reportsDir: string;
  timeoutMs: number;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const apkFiles = await listApkFiles(args.inputDir);
  const capabilities: BankLauncherCapability[] = [];

  for (const apkPath of apkFiles) {
    const bankId = inferBankIdFromApkFileName(apkPath);
    if (!bankId) {
      console.warn(`Skipping APK with unknown bank id: ${apkPath}`);
      continue;
    }
    const result = await discoverApk({
      bankId,
      apkPath,
      outputDir: args.outputDir,
      reportsDir: args.reportsDir,
      timeoutMs: args.timeoutMs
    });
    capabilities.push(result.capability);
    console.log(`${bankId}: ${result.manifest.packageName} -> ${result.reportMarkdownPath}`);
  }

  await mkdir(args.reportsDir, { recursive: true });
  const registryPath = join(args.reportsDir, 'bank-launcher-registry.observed.json');
  await writeFile(registryPath, `${JSON.stringify(capabilities, null, 2)}\n`, 'utf8');
  console.log(`Observed registry: ${registryPath}`);
}

function parseArgs(argv: readonly string[]): DiscoverAllArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key?.startsWith('--') && value && !value.startsWith('--')) {
      values.set(key.slice(2), value);
      index += 1;
    }
  }

  return {
    inputDir: resolve(values.get('input-dir') ?? defaultInputDir()),
    outputDir: resolve(values.get('output-dir') ?? 'tools/apk-discovery/output'),
    reportsDir: resolve(values.get('reports-dir') ?? 'tools/apk-discovery/reports'),
    timeoutMs: Number.parseInt(values.get('timeout-ms') ?? '180000', 10)
  };
}

function defaultInputDir(): string {
  return process.env.SWIMPAY_APK_DISCOVERY_INPUT_DIR ?? 'tools/apk-discovery/input';
}

async function listApkFiles(inputDir: string): Promise<string[]> {
  const localFiles = await readApkFiles(inputDir);
  if (localFiles.length > 0) {
    return localFiles;
  }

  const operatorDrop = 'C:\\Users\\Lenovo\\Downloads\\apkanalyser';
  const fallbackFiles = await readApkFiles(operatorDrop).catch(() => []);
  return fallbackFiles.length > 0 ? fallbackFiles : localFiles;
}

async function readApkFiles(inputDir: string): Promise<string[]> {
  const entries = await readdir(inputDir).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(inputDir, entry);
    const info = await stat(path).catch(() => null);
    if (info?.isFile() && entry.toLocaleLowerCase('en-US').endsWith('.apk')) {
      files.push(path);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'APK discovery failed.');
  process.exitCode = 1;
});
