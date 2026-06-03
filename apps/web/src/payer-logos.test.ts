import { describe, expect, it } from 'vitest';
import { bankLogoAssetKey, WestAfricaPayerBankLauncherRegistry } from '@swimpay/contracts';
import { checkoutBankLogoDataUri } from './screens/BankLogoAssets.js';

describe('West Africa payer launcher logos', () => {
  it('resolves a clean SVG logo data URI for every West Africa launcher', () => {
    for (const launcher of WestAfricaPayerBankLauncherRegistry) {
      const key = bankLogoAssetKey(launcher.bank_id);
      expect(key).not.toBe('ic_bank_unknown');
      const dataUri = checkoutBankLogoDataUri(key);
      expect(dataUri, `missing logo for ${launcher.bank_id} (${key})`).toBeDefined();
      expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/u);
    }
  });
});
