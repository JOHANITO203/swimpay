export const SupportedApkDiscoveryBankIds = [
  'sber_ru',
  'tbank_ru',
  'vtb_ru',
  'alfa_ru',
  'gazprombank_ru',
  'ozon_bank'
] as const;

export type ApkDiscoveryBankId = (typeof SupportedApkDiscoveryBankIds)[number];

export interface ApkManifestDiscovery {
  packageName: string;
  versionCode?: string;
  versionName?: string;
  applicationLabel?: string;
  browsableActivities: BrowsableActivity[];
  discoveredSchemes: string[];
  discoveredHosts: string[];
  generatedAt: string;
}

export interface BrowsableActivity {
  activityName: string;
  exported?: boolean;
  autoVerify?: boolean;
  intentFilters: IntentFilterDiscovery[];
}

export interface IntentFilterDiscovery {
  actions: string[];
  categories: string[];
  data: IntentDataDiscovery[];
}

export interface IntentDataDiscovery {
  scheme?: string;
  host?: string;
  path?: string;
  pathPrefix?: string;
  pathPattern?: string;
}

export interface DeeplinkCandidate {
  uriPattern: string;
  source: 'apktool_observation' | 'manifest_discovery';
  confidence: 'low' | 'medium';
  status: 'candidate' | 'observed' | 'unknown';
  relatedActivity?: string;
}

export interface BankLauncherCapability {
  bankId: string;
  packageName: string;
  discoveredSchemes: string[];
  discoveredHosts: string[];
  deeplinkCandidates: DeeplinkCandidate[];
  browsableActivities: string[];
  source: 'apktool_observation';
  testedStatus: 'experimental' | 'observed' | 'unknown';
  runtimeVerified: false;
  generatedAt: string;
}

export interface ApkCertificateDiscovery {
  packageName: string;
  certificateSha256: string[];
  source: 'apk_signature_observation';
  generatedAt: string;
}

export interface RuntimeValidationChecklist {
  packageLaunchTested: boolean;
  deeplinkTested: boolean;
  resolveActivityTested: boolean;
  fallbackManualTested: boolean;
  runtimeVerified: boolean;
}

export interface ApkDiscoveryReport {
  bankId: string;
  manifest: ApkManifestDiscovery;
  certificate: ApkCertificateDiscovery;
  capability: BankLauncherCapability;
  runtimeValidation: RuntimeValidationChecklist;
  warnings: string[];
  unknowns: string[];
}
