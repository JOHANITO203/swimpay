import { describe, expect, it } from 'vitest';
import { baseUnitsToAmount, buildTransakOnrampUrl, type TransakConfig } from './transak.js';

const config: TransakConfig = {
  apiKey: 'pk_test_123',
  environment: 'STAGING',
  network: 'base',
  defaultPaymentMethod: 'sepa_bank_transfer',
  redirectUrl: 'https://app.swimpay.pro/return',
};

describe('baseUnitsToAmount', () => {
  it('converts USDC base units (6 decimals) to human units', () => {
    expect(baseUnitsToAmount(100_000_000, 6)).toBe('100'); // 100 USDC
    expect(baseUnitsToAmount(17_000_000, 6)).toBe('17');
    expect(baseUnitsToAmount(1_500_000, 6)).toBe('1.5');
    expect(baseUnitsToAmount(1, 6)).toBe('0.000001');
  });
  it('handles zero-decimal tokens', () => {
    expect(baseUnitsToAmount(60_000, 0)).toBe('60000');
  });
});

describe('buildTransakOnrampUrl', () => {
  it('builds a locked-destination, locked-crypto-amount widget URL', () => {
    const url = buildTransakOnrampUrl(
      {
        fiatCurrency: 'eur',
        cryptoCurrencyCode: 'usdc',
        walletAddress: '0x1111111111111111111111111111111111111111',
        cryptoAmount: 100,
        partnerOrderId: 'intent_abc',
      },
      config,
    );
    const u = new URL(url);
    expect(u.origin).toBe('https://global-stg.transak.com');
    const p = u.searchParams;
    expect(p.get('apiKey')).toBe('pk_test_123');
    expect(p.get('productsAvailed')).toBe('BUY');
    expect(p.get('fiatCurrency')).toBe('EUR'); // upper-cased
    expect(p.get('cryptoCurrencyCode')).toBe('USDC');
    expect(p.get('network')).toBe('base');
    expect(p.get('walletAddress')).toBe('0x1111111111111111111111111111111111111111');
    expect(p.get('disableWalletAddressForm')).toBe('true'); // destination locked
    expect(p.get('cryptoAmount')).toBe('100'); // merchant gets exactly this; buyer pays + fees
    expect(p.get('partnerOrderId')).toBe('intent_abc');
    expect(p.get('paymentMethod')).toBe('sepa_bank_transfer'); // cheapest rail by default
    expect(p.get('redirectURL')).toBe('https://app.swimpay.pro/return');
  });

  it('uses the production base URL and never leaks a secret (only the public apiKey)', () => {
    const url = buildTransakOnrampUrl(
      { fiatCurrency: 'EUR', cryptoCurrencyCode: 'USDC', walletAddress: '0xabc', cryptoAmount: 50, partnerOrderId: 'i1' },
      { ...config, environment: 'PRODUCTION' },
    );
    expect(url.startsWith('https://global.transak.com/?')).toBe(true);
    expect(url.toLowerCase()).not.toContain('secret');
  });
});
