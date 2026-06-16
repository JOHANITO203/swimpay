import { describe, expect, it } from 'vitest';
import { InMemoryChainReader, JsonRpcChainReader } from './chain-reader.js';

/** Minimal fetch mock: route by JSON-RPC method, return { result }. */
function mockFetch(handlers: Record<string, (params: any[]) => unknown>): typeof fetch {
  return (async (_url: string, init: { body: string }) => {
    const req = JSON.parse(init.body);
    const result = handlers[req.method]?.(req.params);
    return { ok: true, json: async () => ({ result }) } as Response;
  }) as unknown as typeof fetch;
}

const hex = (n: number) => '0x' + n.toString(16);
const padData = (n: number) => '0x' + n.toString(16).padStart(64, '0');

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

describe('JsonRpcChainReader (hardening)', () => {
  it('decodes a recipient-filtered transfer log into a proof', async () => {
    const reader = new JsonRpcChainReader('http://rpc', {
      maxLookbackBlocks: 0, // no clamp → use fromBlock as-is
      fetchImpl: mockFetch({
        eth_getLogs: () => [{ data: padData(1000), blockNumber: hex(90), transactionHash: '0xfeed' }],
      }),
    });
    const proof = await reader.findIncomingTransfer({ token: '0xtok', to: '0xto', minAmountMinor: 500, fromBlock: 80 });
    expect(proof).toEqual({ txHash: '0xfeed', amountMinor: 1000, blockNumber: 90 });
  });

  it('bounds the scan window to maxLookbackBlocks from the tip', async () => {
    let capturedFrom = '';
    const reader = new JsonRpcChainReader('http://rpc', {
      maxLookbackBlocks: 1000,
      fetchImpl: mockFetch({
        eth_blockNumber: () => hex(100_000),
        eth_getLogs: (params: any[]) => { capturedFrom = params[0].fromBlock; return []; },
      }),
    });
    // Requested fromBlock=5, but tip is 100000 and lookback is 1000 → clamp to 99000.
    await reader.findIncomingTransfer({ token: '0xtok', to: '0xto', minAmountMinor: 1, fromBlock: 5 });
    expect(Number.parseInt(capturedFrom, 16)).toBe(99_000);
  });

  it('fails gracefully (null/0) when the RPC throws or times out', async () => {
    const reader = new JsonRpcChainReader('http://rpc', {
      fetchImpl: (async () => { throw new Error('boom'); }) as unknown as typeof fetch,
    });
    expect(await reader.currentBlock()).toBe(0);
    expect(await reader.findIncomingTransfer({ token: '0xtok', to: '0xto', minAmountMinor: 1, fromBlock: 0 })).toBeNull();
  });
});
