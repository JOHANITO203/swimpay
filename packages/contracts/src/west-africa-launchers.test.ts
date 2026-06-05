import { describe, expect, it } from 'vitest';
import {
  PayerBankLauncherRegistry,
  WestAfricaPayerBankLauncherRegistry,
  payerLaunchersForCurrency,
  receivingCurrencyForBankProfile,
  toAvailableSenderBanks
} from './index.js';

describe('West Africa payer launchers', () => {
  it('exposes the harvested UEMOA mobile money + bank launchers', () => {
    const ids = WestAfricaPayerBankLauncherRegistry.map((l) => l.payer_bank_launcher_id);
    expect(ids).toEqual(['wave_ci', 'orange_money_ci', 'mtn_momo_ci']);
    for (const l of WestAfricaPayerBankLauncherRegistry) {
      expect(l.country).toBe('CI');
    }
  });

  it('activates the entries (enabled) but keeps them unvalidated and non-confirming', () => {
    for (const l of WestAfricaPayerBankLauncherRegistry) {
      expect(l.enabled).toBe(true);
      expect(l.tested_status).toBe('not_validated');
      expect(l.runtime_verified).toBe(false);
      expect(l.can_prefill_amount).toBe(false);
      expect(l.does_not_confirm_payment).toBe(true);
      // Every launcher keeps the manual copy-paste fallback for a deeplink miss.
      expect(l.fallback_strategy).toBe('copy_details_manual_transfer');
    }
  });

  it('routes payer launchers by session currency (XOF -> West Africa, else RU)', () => {
    expect(payerLaunchersForCurrency('XOF')).toBe(WestAfricaPayerBankLauncherRegistry);
    expect(payerLaunchersForCurrency('xof')).toBe(WestAfricaPayerBankLauncherRegistry);
    expect(payerLaunchersForCurrency('XAF')).toBe(WestAfricaPayerBankLauncherRegistry);
    expect(payerLaunchersForCurrency('RUB')).toBe(PayerBankLauncherRegistry);
    expect(payerLaunchersForCurrency(undefined)).toBe(PayerBankLauncherRegistry);

    const xofSenderBanks = toAvailableSenderBanks(payerLaunchersForCurrency('XOF')).map((b) => b.payer_bank_launcher_id);
    expect(xofSenderBanks).toContain('wave_ci');
    expect(xofSenderBanks).toContain('orange_money_ci');
    expect(xofSenderBanks).toContain('mtn_momo_ci');
    expect(receivingCurrencyForBankProfile('orange_money_ci')).toBe('XOF');
  });

  it('carries manifest-extracted deeplink schemes on the CI launchers', () => {
    const wave = WestAfricaPayerBankLauncherRegistry.find((l) => l.payer_bank_launcher_id === 'wave_ci');
    expect(wave?.deeplink_schemes).toContain('wave');
    expect(wave?.launch_strategy).toBe('deeplink_then_package');

    const mtn = WestAfricaPayerBankLauncherRegistry.find((l) => l.payer_bank_launcher_id === 'mtn_momo_ci');
    expect(mtn?.ussd_transfer_template).toBe('*133#');
  });

  it('does NOT leak West Africa launchers into the default (RU) sender bank list', () => {
    const ruIds = PayerBankLauncherRegistry.map((l) => l.payer_bank_launcher_id);
    expect(ruIds).not.toContain('wave_ci');

    const senderBankIds = toAvailableSenderBanks().map((b) => b.payer_bank_launcher_id);
    for (const waId of WestAfricaPayerBankLauncherRegistry.map((l) => l.payer_bank_launcher_id)) {
      expect(senderBankIds).not.toContain(waId);
    }
  });
});
