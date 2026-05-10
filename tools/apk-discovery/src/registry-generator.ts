import { detectDeeplinkCandidates } from './deeplink-candidates.js';
import type { ApkCertificateDiscovery, ApkManifestDiscovery, BankLauncherCapability, RuntimeValidationChecklist } from './types.js';

export interface BankDiscoveryInput {
  bankId: string;
  manifest: ApkManifestDiscovery;
  certificate: ApkCertificateDiscovery;
}

export function generateBankLauncherRegistry(discoveries: readonly BankDiscoveryInput[]): BankLauncherCapability[] {
  return discoveries.map((entry) => ({
    bankId: entry.bankId,
    packageName: entry.manifest.packageName,
    discoveredSchemes: entry.manifest.discoveredSchemes,
    discoveredHosts: entry.manifest.discoveredHosts,
    deeplinkCandidates: detectDeeplinkCandidates(entry.manifest),
    browsableActivities: entry.manifest.browsableActivities.map((activity) => activity.activityName),
    source: 'apktool_observation',
    testedStatus: entry.manifest.browsableActivities.length > 0 ? 'experimental' : 'unknown',
    runtimeVerified: false,
    generatedAt: entry.manifest.generatedAt
  }));
}

export function defaultRuntimeValidationChecklist(): RuntimeValidationChecklist {
  return {
    packageLaunchTested: false,
    deeplinkTested: false,
    resolveActivityTested: false,
    fallbackManualTested: false,
    runtimeVerified: false
  };
}
