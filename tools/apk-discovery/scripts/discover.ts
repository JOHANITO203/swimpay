#!/usr/bin/env node
import { resolve } from 'node:path';
import { discoverApk } from '../src/index.js';

interface DiscoverCliArgs {
  apkPath: string;
  bankId: string;
  outputDir: string;
  reportsDir: string;
  timeoutMs: number;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await discoverApk({
    bankId: args.bankId,
    apkPath: args.apkPath,
    outputDir: args.outputDir,
    reportsDir: args.reportsDir,
    timeoutMs: args.timeoutMs
  });

  console.log(JSON.stringify({
    bank_id: result.bankId,
    package_name: result.manifest.packageName,
    version_name: result.manifest.versionName ?? null,
    runtime_verified: result.runtimeValidation.runtimeVerified,
    output_dir: result.outputVersionDir,
    report_json: result.reportJsonPath,
    report_markdown: result.reportMarkdownPath
  }, null, 2));
}

function parseArgs(argv: readonly string[]): DiscoverCliArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key?.startsWith('--') && value && !value.startsWith('--')) {
      values.set(key.slice(2), value);
      index += 1;
    }
  }

  const apkPath = values.get('apk');
  const bankId = values.get('bank');
  if (!apkPath || !bankId) {
    throw new Error('Usage: npm run apk:discover -- --apk ./input/sber.apk --bank sber_ru');
  }

  return {
    apkPath: resolve(apkPath),
    bankId,
    outputDir: resolve(values.get('output-dir') ?? 'tools/apk-discovery/output'),
    reportsDir: resolve(values.get('reports-dir') ?? 'tools/apk-discovery/reports'),
    timeoutMs: Number.parseInt(values.get('timeout-ms') ?? '180000', 10)
  };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'APK discovery failed.');
  process.exitCode = 1;
});
