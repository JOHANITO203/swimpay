import { describe, expect, it } from 'vitest';
import { InMemoryChainReader } from './chain-reader.js';

const TOKEN = '0xToKeN';
const MERCHANT = '0xMerchant';

describe('InMemoryChainReader', () => {
  it('finds a matching incoming transfer', async () => {
    const r = new InMemoryChainReader({ block: 100 });
    r.seedTransfer({ token: TOKEN, to: MERCHANT, amountMinor: 100_000_000, blockNumber: 101, txHash: '0xabc' });

    const proof = await r.findIncomingTransfer({ token: TOKEN, to: MERCHANT, minAmountMinor: 100_000_000, fromBlock: 100 });
    expect(proof?.txHash).toBe('0xabc');
    expect(proof?.amountMinor).toBe(100_000_000);
  });

  it('accepts an overpayment (amount ≥ min)', async () => {
    const r = new InMemoryChainReader({ block: 100 });
    r.seedTransfer({ token: TOKEN, to: MERCHANT, amountMinor: 120_000_000, blockNumber: 101, txHash: '0xover' });
    expect((await r.findIncomingTransfer({ token: TOKEN, to: MERCHANT, minAmountMinor: 100_000_000, fromBlock: 100 }))?.txHash).toBe('0xover');
  });

  it('rejects wrong token, underpayment, or a transfer before fromBlock', async () => {
    const r = new InMemoryChainReader({ block: 100 });
    r.seedTransfer({ token: '0xOther', to: MERCHANT, amountMinor: 100_000_000, blockNumber: 101, txHash: '0xwrongtoken' });
    r.seedTransfer({ token: TOKEN, to: MERCHANT, amountMinor: 99_000_000, blockNumber: 101, txHash: '0xunder' });
    r.seedTransfer({ token: TOKEN, to: MERCHANT, amountMinor: 100_000_000, blockNumber: 50, txHash: '0xtooearly' });

    expect(await r.findIncomingTransfer({ token: TOKEN, to: MERCHANT, minAmountMinor: 100_000_000, fromBlock: 100 })).toBeNull();
  });

  it('reports the current block', async () => {
    const r = new InMemoryChainReader({ block: 42 });
    expect(await r.currentBlock()).toBe(42);
    r.setBlock(43);
    expect(await r.currentBlock()).toBe(43);
  });
});
