import { describe, expect, it } from 'vitest';
import {
  PayerBankLauncherRegistry,
  WestAfricaPayerBankLauncherRegistry,
  payerLaunchersForCurrency,
  toAvailableSenderBanks
} from './index.js';

describe('West Africa payer launchers', () => {
  it('exposes the harvested UEMOA mobile money + bank launchers', () => {
    const ids = WestAfricaPayerBankLauncherRegistry.map((l) => l.payer_bank_launcher_id);
    expect(ids).toEqual([
      'orange_money_sn',
      'orange_money_ci',
      'orange_money_africa',
      'wave_sn',
      'mtn_momo_ci',
      'moov_money_ci',
      'free_money_sn',
      'wizall_sn',
      'djamo_ci',
      'sg_connect_ci',
      'ecobank_ci'
    ]);
    for (const l of WestAfricaPayerBankLauncherRegistry) {
      expect(['SN', 'CI', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW']).toContain(l.country);
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
    expect(xofSenderBanks).toContain('wave_sn');
    expect(xofSenderBanks).toContain('orange_money_sn');
  });

  it('carries manifest-extracted deeplink schemes and a ussd_dial prefill template', () => {
    const wave = WestAfricaPayerBankLauncherRegistry.find((l) => l.payer_bank_launcher_id === 'wave_sn');
    expect(wave?.deeplink_schemes).toContain('wave');

    const orangeSn = WestAfricaPayerBankLauncherRegistry.find((l) => l.payer_bank_launcher_id === 'orange_money_sn');
    expect(orangeSn?.launch_strategy).toBe('ussd_dial');
    expect(orangeSn?.ussd_transfer_template).toContain('{amount}');
    // ussd_dial carries no static launch_url (the template is filled at runtime).
    expect(orangeSn?.launch_url).toBeNull();
  });

  it('does NOT leak West Africa launchers into the default (RU) sender bank list', () => {
    const ruIds = PayerBankLauncherRegistry.map((l) => l.payer_bank_launcher_id);
    expect(ruIds).not.toContain('wave_sn');

    const senderBankIds = toAvailableSenderBanks().map((b) => b.payer_bank_launcher_id);
    for (const waId of WestAfricaPayerBankLauncherRegistry.map((l) => l.payer_bank_launcher_id)) {
      expect(senderBankIds).not.toContain(waId);
    }
  });
});
