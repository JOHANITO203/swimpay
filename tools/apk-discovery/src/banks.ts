import type { ApkDiscoveryBankId } from './types.js';

export interface ApkDiscoveryBankDefinition {
  bankId: ApkDiscoveryBankId;
  displayName: string;
  fileNameHints: readonly string[];
}

export const ApkDiscoveryBanks: readonly ApkDiscoveryBankDefinition[] = [
  {
    bankId: 'sber_ru',
    displayName: 'Sberbank',
    fileNameHints: ['sber', 'сбер']
  },
  {
    bankId: 'tbank_ru',
    displayName: 'T-Bank',
    fileNameHints: ['t-bank', 'tbank', 'тинькофф', 'т-банк']
  },
  {
    bankId: 'vtb_ru',
    displayName: 'VTB',
    fileNameHints: ['vtb', 'втб']
  },
  {
    bankId: 'alfa_ru',
    displayName: 'Alfa-Bank',
    fileNameHints: ['alfa', 'альфа']
  },
  {
    bankId: 'gazprombank_ru',
    displayName: 'Gazprombank',
    fileNameHints: ['gazprom', 'газпром']
  },
  {
    bankId: 'ozon_bank',
    displayName: 'Ozon Bank',
    fileNameHints: ['ozon', 'озон']
  }
] as const;

export function getApkDiscoveryBankDefinition(bankId: string): ApkDiscoveryBankDefinition | null {
  return ApkDiscoveryBanks.find((bank) => bank.bankId === bankId) ?? null;
}

export function inferBankIdFromApkFileName(fileName: string): ApkDiscoveryBankId | null {
  const normalized = fileName.toLocaleLowerCase('ru-RU');
  return ApkDiscoveryBanks.find((bank) => bank.fileNameHints.some((hint) => normalized.includes(hint)))?.bankId ?? null;
}
