import { describe, expect, it } from 'vitest';
import { bankLogoAssetKey, WestAfricaPayerBankLauncherRegistry } from '@swimpay/contracts';
import { checkoutBankLogoDataUri } from './screens/BankLogoAssets.js';

describe('West Africa payer launcher logos', () => {
  it('resolves an inline logo data URI (real app icon PNG or brand SVG) for every West Africa launcher', () => {
    for (const launcher of WestAfricaPayerBankLauncherRegistry) {
      const key = bankLogoAssetKey(launcher.bank_id);
      expect(key).not.toBe('ic_bank_unknown');
      const dataUri = checkoutBankLogoDataUri(key);
      expect(dataUri, `missing logo for ${launcher.bank_id} (${key})`).toBeDefined();
      // WA app icons are now the real launcher PNGs (Wave/Orange/MTN); SVG brand marks remain valid too.
      expect(dataUri).toMatch(/^data:image\/(png|svg\+xml);base64,/u);
    }
  });
});
