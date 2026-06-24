import { describe, expect, it } from 'vitest';
import { InMemoryChainReader } from './chain-reader.js';
import { IntentError, PaymentIntentService, type FxQuoter, type PaymentIntentServiceDeps, type TokenConfig } from './payment-intent.js';

const USDC: TokenConfig = { symbol: 'USDC', address: '0xUSDC', decimals: 6, chain: 'base-sepolia' };
const MERCHANT = '0xMerchant';
const DIGITS: Record<string, number> = { USD: 2, XOF: 0 };

// XOF→USD stub: 1 XOF = 0.0017 USD.
const fxStub: FxQuoter = {
  async quote(_src, tgt, amountMinor, sd, td) {
    if (tgt.toUpperCase() !== 'USD') return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    const rate = 0.0017;
    const target = Math.round(amountMinor * rate * (10 ** td / 10 ** sd));
    return { kind: 'ok', quote: { rate: String(rate), rateTimestamp: '2026-06-16T08:00:00.000Z', amountMinorTarget: target, source: 'cbr' } };
  },
};

function makeService(over: Partial<PaymentIntentServiceDeps> = {}) {
  const reader = new InMemoryChainReader({ block: 100 });
  let seq = 0;
  let nowMs = Date.parse('2026-06-16T10:00:00.000Z');
  const clock = { advance: (ms: number) => (nowMs += ms) };
  const service = new PaymentIntentService({
    fxQuoter: fxStub,
    minorDigits: (c) => DIGITS[c.toUpperCase()] ?? 2,
    now: () => new Date(nowMs).toISOString(),
    generateId: (p) => `${p}_${++seq}`,
    chainReader: reader,
    token: USDC,
    minConfirmations: 1,
    ttlMs: 1000,
    ...over,
  });
  return { service, reader, clock };
}

const baseInput = { merchantId: 'm1', merchantAddress: MERCHANT, payerType: 'agent_ai' as const };

describe('PaymentIntentService — non-custodial', () => {
  it('is read-only / non-custodial', () => {
    expect(makeService().service.custodial).toBe(false);
  });

  it('quotes USD price directly (identity) into USDC base units', async () => {
    const { service } = makeService();
    // $100.00 = 10000 USD minor → 10000 * 10^4 = 100,000,000 USDC base units (100 USDC).
    const intent = await service.createIntent({ ...baseInput, priceCurrency: 'USD', priceAmountMinor: 10_000 });
    expect(intent.settlementAmountMinor).toBe(100_000_000);
    expect(intent.quote?.source).toBe('identity');
    expect(intent.state).toBe('AWAITING_PAYMENT');
    expect(service.instructionFor(intent).custody).toBe('non_custodial');
  });

  it('quotes a fiat price (XOF) into stablecoin via FX', async () => {
    const { service } = makeService();
    // 10000 XOF * 0.0017 = $17.00 = 1700 USD minor → 17,000,000 USDC base units.
    const intent = await service.createIntent({ ...baseInput, priceCurrency: 'XOF', priceAmountMinor: 10_000 });
    expect(intent.settlementAmountMinor).toBe(17_000_000);
    expect(intent.quote?.source).toBe('cbr');
  });

  it('confirms once the payer transfer lands with enough confirmations', async () => {
    const { service, reader, clock } = makeService();
    const intent = await service.createIntent({ ...baseInput, priceCurrency: 'USD', priceAmountMinor: 10_000 });

    // No transfer yet → still awaiting.
    expect((await service.refresh(intent.id))?.state).toBe('AWAITING_PAYMENT');

    // Payer pays directly to the merchant; block advances past the confirmation depth.
    reader.seedTransfer({ token: USDC.address, to: MERCHANT, amountMinor: 100_000_000, blockNumber: 101, txHash: '0xpaid' });
    reader.setBlock(102); // 102 - 101 = 1 ≥ minConfirmations
    clock.advance(5_000);

    const confirmed = await service.refresh(intent.id);
    expect(confirmed?.state).toBe('CONFIRMED');
    expect(confirmed?.confirmation?.txHash).toBe('0xpaid');
  });

  it('stays awaiting when confirmations are insufficient', async () => {
    const { service, reader } = makeService({ minConfirmations: 3 });
    const intent = await service.createIntent({ ...baseInput, priceCurrency: 'USD', priceAmountMinor: 10_000 });
    reader.seedTransfer({ token: USDC.address, to: MERCHANT, amountMinor: 100_000_000, blockNumber: 101, txHash: '0xpaid' });
    reader.setBlock(102); // only 1 confirmation, need 3
    expect((await service.refresh(intent.id))?.state).toBe('AWAITING_PAYMENT');
  });

  it('expires when the TTL passes with no payment', async () => {
    const { service, clock } = makeService();
    const intent = await service.createIntent({ ...baseInput, priceCurrency: 'USD', priceAmountMinor: 10_000 });
    clock.advance(2_000); // ttl is 1000ms
    expect((await service.refresh(intent.id))?.state).toBe('EXPIRED');
  });

  it('rejects a non-USD price when no FX is available', async () => {
    const { service } = makeService({ fxQuoter: null });
    await expect(service.createIntent({ ...baseInput, priceCurrency: 'XOF', priceAmountMinor: 10_000 })).rejects.toBeInstanceOf(IntentError);
  });

  it('adds a Transak on-ramp URL to the instruction when configured (locked address + crypto amount)', async () => {
    const { service } = makeService({
      transak: { apiKey: 'pk_x', environment: 'STAGING', network: 'base', defaultPaymentMethod: 'sepa_bank_transfer' },
    });
    const intent = await service.createIntent({ ...baseInput, priceCurrency: 'USD', priceAmountMinor: 10_000 });
    const inst = service.instructionFor(intent);
    expect(inst.onramp?.provider).toBe('transak');
    const u = new URL(inst.onramp!.url);
    expect(u.searchParams.get('walletAddress')).toBe(MERCHANT);
    expect(u.searchParams.get('disableWalletAddressForm')).toBe('true');
    expect(u.searchParams.get('cryptoAmount')).toBe('100'); // 100 USDC = exactly what's owed
    expect(u.searchParams.get('cryptoCurrencyCode')).toBe('USDC');
    expect(u.searchParams.get('partnerOrderId')).toBe(intent.id);
  });

  it('omits the on-ramp when no Transak config is present', async () => {
    const { service } = makeService();
    const intent = await service.createIntent({ ...baseInput, priceCurrency: 'USD', priceAmountMinor: 10_000 });
    expect(service.instructionFor(intent).onramp).toBeNull();
  });
});
