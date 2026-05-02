import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { BankProfile, BankTemplateStatus, TrustedBankApp } from './types.js';

export interface BankProfileRuntimeBehavior {
  bankProfileId: string;
  profileKnown: boolean;
  status: Exclude<BankTemplateStatus, 'new'> | 'review_only';
  autoConfirmStatus: 'disabled' | 'review_only' | 'shadow_testing' | 'trusted_low_amount' | 'trusted';
  allowAutoConfirmCandidate: boolean;
  reasonCodes: string[];
}

export interface BankAppTrustInput {
  bankProfileId: string;
  packageName: string;
  certSha256: string;
}

export interface BankAppTrustResult {
  trusted: boolean;
  reasonCode:
    | 'trusted_bank_app'
    | 'unknown_bank_profile'
    | 'bank_app_not_registered'
    | 'bank_app_pending_verification'
    | 'bank_app_rejected'
    | 'bank_app_deprecated';
}

const requiredProfileFields = [
  'bank_profile_id',
  'display_name',
  'country',
  'status',
  'trusted_apps',
  'field_priority',
  'template_defaults'
] as const;

const bankProfileAliases: Record<string, string> = {
  sber_ru: 'sberbank_ru'
};

export class BankProfileRegistry {
  private readonly profilesById: Map<string, BankProfile>;

  public constructor(profiles: BankProfile[]) {
    this.profilesById = new Map(profiles.map((profile) => [profile.bankProfileId, profile]));
  }

  public static async loadDefault(): Promise<BankProfileRegistry> {
    return new BankProfileRegistry(await loadBankProfilesFromDirectory(getDefaultBankProfilesDirectory()));
  }

  public listProfiles(): BankProfile[] {
    return [...this.profilesById.values()].sort((left, right) => left.bankProfileId.localeCompare(right.bankProfileId));
  }

  public getProfile(bankProfileId: string): BankProfile | null {
    return this.profilesById.get(resolveBankProfileId(bankProfileId)) ?? null;
  }

  public getRuntimeBehavior(bankProfileId: string): BankProfileRuntimeBehavior {
    const profile = this.getProfile(bankProfileId);
    if (!profile) {
      return {
        bankProfileId,
        profileKnown: false,
        status: 'review_only',
        autoConfirmStatus: 'disabled',
        allowAutoConfirmCandidate: false,
        reasonCodes: ['unknown_bank_profile', 'requires_review']
      };
    }

    const profileAllowsAutoConfirm = profile.status === 'trusted_low_amount' || profile.status === 'trusted';
    const autoConfirmEnabled = profile.autoConfirmStatus === 'trusted_low_amount' || profile.autoConfirmStatus === 'trusted';

    return {
      bankProfileId: profile.bankProfileId,
      profileKnown: true,
      status: profile.status,
      autoConfirmStatus: profile.autoConfirmStatus,
      allowAutoConfirmCandidate: profileAllowsAutoConfirm && autoConfirmEnabled,
      reasonCodes: profileAllowsAutoConfirm && autoConfirmEnabled ? ['trusted_bank_profile'] : ['requires_review']
    };
  }

  public evaluateBankAppTrust(input: BankAppTrustInput): BankAppTrustResult {
    const profile = this.getProfile(input.bankProfileId);
    if (!profile) {
      return {
        trusted: false,
        reasonCode: 'unknown_bank_profile'
      };
    }

    const app = profile.trustedApps.find(
      (candidate) => candidate.packageName === input.packageName && candidate.certSha256 === input.certSha256
    );
    if (!app) {
      return {
        trusted: false,
        reasonCode: 'bank_app_not_registered'
      };
    }

    if (app.packageName === 'TO_VERIFY' || app.certSha256 === 'TO_VERIFY' || app.verificationStatus === 'pending_verification') {
      return {
        trusted: false,
        reasonCode: 'bank_app_pending_verification'
      };
    }

    if (app.verificationStatus === 'rejected') {
      return {
        trusted: false,
        reasonCode: 'bank_app_rejected'
      };
    }

    if (app.verificationStatus === 'deprecated') {
      return {
        trusted: false,
        reasonCode: 'bank_app_deprecated'
      };
    }

    return {
      trusted: true,
      reasonCode: 'trusted_bank_app'
    };
  }
}

export async function loadBankProfilesFromDirectory(directory: string): Promise<BankProfile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const profiles: BankProfile[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const profilePath = join(directory, entry.name, 'profile.yml');
    const document = parseYaml(await readFile(profilePath, 'utf8')) as unknown;
    profiles.push(validateBankProfileDocument(document));
  }

  return profiles.sort((left, right) => left.bankProfileId.localeCompare(right.bankProfileId));
}

export function getDefaultBankProfilesDirectory(): string {
  return resolve(fileURLToPath(new URL('../banks', import.meta.url)));
}

export function validateBankProfileDocument(document: unknown): BankProfile {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Bank profile document must be a YAML object.');
  }

  const record = document as Record<string, unknown>;
  for (const field of requiredProfileFields) {
    if (!(field in record)) {
      throw new Error(`Bank profile is missing required field: ${field}`);
    }
  }

  const trustedApps = record.trusted_apps;
  if (!Array.isArray(trustedApps)) {
    throw new Error('Bank profile trusted_apps must be an array.');
  }

  const fieldPriority = record.field_priority;
  if (!Array.isArray(fieldPriority)) {
    throw new Error('Bank profile field_priority must be an array.');
  }

  return {
    bankProfileId: requireString(record.bank_profile_id, 'bank_profile_id'),
    displayName: requireString(record.display_name, 'display_name'),
    country: requireString(record.country, 'country') as 'RU',
    status: requireProfileStatus(record.status),
    autoConfirmStatus: requireAutoConfirmStatus(record.auto_confirm_status),
    trustedApps: trustedApps.map((item) => toTrustedBankApp(item)),
    supportedLocales: arrayOfStrings(record.supported_locales),
    fieldPriority: arrayOfStrings(record.field_priority)
  };
}

function resolveBankProfileId(bankProfileId: string): string {
  return bankProfileAliases[bankProfileId] ?? bankProfileId;
}

function toTrustedBankApp(value: unknown): TrustedBankApp {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Bank profile trusted app must be an object.');
  }

  const record = value as Record<string, unknown>;
  return {
    packageName: requireString(record.package_name, 'trusted_apps.package_name'),
    certSha256: requireString(record.cert_sha256, 'trusted_apps.cert_sha256'),
    verificationStatus: requireVerificationStatus(record.verification_status)
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Bank profile field ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function requireProfileStatus(value: unknown): Exclude<BankTemplateStatus, 'new'> {
  const status = requireString(value, 'status');
  if (!['learning', 'shadow_testing', 'trusted_low_amount', 'trusted', 'degraded', 'review_only', 'disabled'].includes(status)) {
    throw new Error(`Bank profile status is invalid: ${status}`);
  }

  return status as Exclude<BankTemplateStatus, 'new'>;
}

function requireAutoConfirmStatus(value: unknown): BankProfile['autoConfirmStatus'] {
  const status = typeof value === 'string' ? value : 'disabled';
  if (!['disabled', 'review_only', 'shadow_testing', 'trusted_low_amount', 'trusted'].includes(status)) {
    throw new Error(`Bank profile auto_confirm_status is invalid: ${status}`);
  }

  return status as BankProfile['autoConfirmStatus'];
}

function requireVerificationStatus(value: unknown): TrustedBankApp['verificationStatus'] {
  const status = requireString(value, 'trusted_apps.verification_status');
  if (!['pending_verification', 'verified', 'rejected', 'deprecated'].includes(status)) {
    throw new Error(`Bank app verification_status is invalid: ${status}`);
  }

  return status as TrustedBankApp['verificationStatus'];
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}
