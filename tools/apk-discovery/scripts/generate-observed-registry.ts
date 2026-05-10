#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ApkDiscoveryReport, BankLauncherCapability } from '../src/index.js';

const DEFAULT_BANKS = ['sber_ru', 'tbank_ru', 'vtb_ru', 'alfa_ru', 'gazprombank_ru', 'ozon_bank'] as const;

interface GenerateRegistryArgs {
  reportsDir: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const capabilities: BankLauncherCapability[] = [];
  const missing: string[] = [];

  for (const bankId of DEFAULT_BANKS) {
    const reportPath = join(args.reportsDir, `${bankId}.json`);
    const report = await readReport(reportPath).catch(() => null);
    if (!report) {
      missing.push(bankId);
      continue;
    }
    capabilities.push(report.capability);
  }

  await mkdir(args.reportsDir, { recursive: true });
  const registryPath = join(args.reportsDir, 'bank-launcher-registry.observed.json');
  await writeFile(registryPath, `${JSON.stringify(capabilities, null, 2)}\n`, 'utf8');

  if (missing.length > 0) {
    console.warn(`Missing discovery reports: ${missing.join(', ')}`);
  }
  console.log(`Observed registry: ${registryPath}`);
}

function parseArgs(argv: readonly string[]): GenerateRegistryArgs {
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
    reportsDir: resolve(values.get('reports-dir') ?? 'tools/apk-discovery/reports')
  };
}

async function readReport(reportPath: string): Promise<ApkDiscoveryReport> {
  const text = await readFile(reportPath, 'utf8');
  return JSON.parse(text) as ApkDiscoveryReport;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Observed registry generation failed.');
  process.exitCode = 1;
});
