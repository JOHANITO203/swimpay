import { describe, expect, it } from 'vitest';
import {
  CoinbaseOnrampError,
  buildCoinbaseOnrampUrl,
  buildCoinbaseSessionTokenRequest,
  type CoinbaseOnrampConfig,
} from './coinbase-onramp.js';

const config: CoinbaseOnrampConfig = { appId: 'app_123', network: 'base', asset: 'USDC', defaultFiatCurrency: 'EUR' };

describe('buildCoinbaseSessionTokenRequest', () => {
  it('locks destination + asset/network + the exact crypto amount', () => {
    const body = buildCoinbaseSessionTokenRequest(
      { walletAddress: '0xMerchant', cryptoAmount: '100', fiatCurrency: 'EUR', partnerOrderId: 'intent_1' },
      config,
    );
    expect(body).toMatchObject({
      appId: 'app_123',
      addresses: [{ address: '0xMerchant', blockchains: ['base'] }],
      assets: ['USDC'],
      defaultAsset: 'USDC',
      defaultNetwork: 'base',
      presetCryptoAmount: 100,
      fiatCurrency: 'EUR',
      partnerUserId: 'intent_1',
    });
  });

  it('uppercases the fiat and falls back to the config default', () => {
    const body = buildCoinbaseSessionTokenRequest(
      { walletAddress: '0xM', cryptoAmount: 17, partnerOrderId: 'i2' },
      config,
    );
    expect(body.fiatCurrency).toBe('EUR'); // default
  });

  it('rejects XOF as an input — it is the off-ramp output, never the entry', () => {
    expect(() =>
      buildCoinbaseSessionTokenRequest(
        { walletAddress: '0xM', cryptoAmount: 1, fiatCurrency: 'xof', partnerOrderId: 'i3' },
        config,
      ),
    ).toThrow(CoinbaseOnrampError);
  });
});

describe('buildCoinbaseOnrampUrl', () => {
  it('builds the hosted URL from a single-use sessionToken (no secret in the URL)', () => {
    const url = buildCoinbaseOnrampUrl('sess_abc');
    expect(url).toBe('https://pay.coinbase.com/buy?sessionToken=sess_abc');
    expect(url.toLowerCase()).not.toContain('secret');
  });

  it('requires a sessionToken', () => {
    expect(() => buildCoinbaseOnrampUrl('')).toThrow(CoinbaseOnrampError);
  });
});
