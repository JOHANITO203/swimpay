import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getApkDiscoveryBankDefinition } from './banks.js';
import type { ApkDiscoveryReport } from './types.js';

export function renderMarkdownReport(report: ApkDiscoveryReport): string {
  const bank = getApkDiscoveryBankDefinition(report.bankId);
  const title = bank?.displayName ?? report.bankId;
  const candidates = report.capability.deeplinkCandidates.length > 0
    ? report.capability.deeplinkCandidates.map((candidate) => `- ${candidate.uriPattern} (${candidate.confidence}, ${candidate.status})`)
    : ['- none'];
  const activities = report.manifest.browsableActivities.length > 0
    ? report.manifest.browsableActivities.map((activity) => `- ${activity.activityName}`)
    : ['- none'];
  const schemes = report.manifest.discoveredSchemes.length > 0 ? report.manifest.discoveredSchemes.map((scheme) => `- ${scheme}`) : ['- none'];
  const hosts = report.manifest.discoveredHosts.length > 0 ? report.manifest.discoveredHosts.map((host) => `- ${host}`) : ['- none'];
  const certificates = report.certificate.certificateSha256.length > 0
    ? report.certificate.certificateSha256.map((fingerprint) => `- ${fingerprint}`)
    : ['- none observed in META-INF'];
  const warnings = report.warnings.length > 0 ? report.warnings.map((warning) => `- ${warning}`) : ['- none'];
  const unknowns = report.unknowns.length > 0 ? report.unknowns.map((unknown) => `- ${unknown}`) : ['- none'];

  return `# ${title} Discovery Report

Package:
${report.manifest.packageName}

Version:
${report.manifest.versionName ?? 'unknown'} (${report.manifest.versionCode ?? 'unknown'})

Observed Schemes:
${schemes.join('\n')}

Observed Hosts:
${hosts.join('\n')}

Browsable Activities:
${activities.join('\n')}

Observed Deeplink Candidates:
${candidates.join('\n')}

Certificate SHA-256:
${certificates.join('\n')}

Status:
${report.capability.testedStatus}

Runtime Verification: ${String(report.runtimeValidation.runtimeVerified)}

Warnings:
${warnings.join('\n')}

Unknowns:
${unknowns.join('\n')}

## Safety Boundary

APK discovery != runtime support
runtime support != certified
deeplink found != safe
deeplink safe != payment support

This report is static manifest/signature metadata only. It does not modify APKs, bypass protections, extract secrets or automate bank actions.
`;
}

export async function writeDiscoveryReports(input: {
  reportsDir: string;
  report: ApkDiscoveryReport;
}): Promise<{ reportJsonPath: string; reportMarkdownPath: string }> {
  await mkdir(input.reportsDir, { recursive: true });
  const reportJsonPath = join(input.reportsDir, `${input.report.bankId}.json`);
  const reportMarkdownPath = join(input.reportsDir, `${input.report.bankId}.md`);
  await writeFile(reportJsonPath, `${JSON.stringify(input.report, null, 2)}\n`, 'utf8');
  await writeFile(reportMarkdownPath, renderMarkdownReport(input.report), 'utf8');
  return { reportJsonPath, reportMarkdownPath };
}
