/**
 * ChainReader — READ-ONLY view of a chain, for non-custodial confirmation.
 *
 * In the non-custodial model SwimPay NEVER holds keys or moves funds: the payer
 * sends stablecoin directly to the merchant's wallet. SwimPay's only on-chain role
 * is to OBSERVE that the expected transfer happened. So this is read-only — no
 * private key, no signing, no custody.
 *
 *   - InMemoryChainReader — deterministic fake for tests/dev.
 *   - JsonRpcChainReader  — real, dependency-free (JSON-RPC over fetch). Reads
 *     ERC-20 Transfer logs. NOT integration-tested here (no RPC in this env);
 *     verify against a real node before trust.
 */

export interface TransferProof {
  txHash: string;
  /** Transferred amount in the token's base units (e.g. USDC has 6 decimals). */
  amountMinor: number;
  blockNumber: number;
}

export interface FindTransferParams {
  /** ERC-20 token contract address. */
  token: string;
  /** Recipient (merchant) address. */
  to: string;
  /** Minimum amount in token base units. */
  minAmountMinor: number;
  /** Scan from this block (set at intent creation, so we never match an older payment). */
  fromBlock: number;
}

export interface ChainReader {
  currentBlock(): Promise<number>;
  /** First matching incoming transfer at/after fromBlock, or null. Read-only. */
  findIncomingTransfer(params: FindTransferParams): Promise<TransferProof | null>;
}

// ─── In-memory (tests/dev) ──────────────────────────────────────────────────

export interface SeededTransfer {
  token: string;
  to: string;
  amountMinor: number;
  blockNumber: number;
  txHash: string;
}

export class InMemoryChainReader implements ChainReader {
  private block: number;
  private readonly transfers: SeededTransfer[] = [];

  public constructor(options: { block?: number } = {}) {
    this.block = options.block ?? 0;
  }

  public setBlock(n: number): void {
    this.block = n;
  }

  public seedTransfer(t: SeededTransfer): void {
    this.transfers.push(t);
  }

  public async currentBlock(): Promise<number> {
    return this.block;
  }

  public async findIncomingTransfer(params: FindTransferParams): Promise<TransferProof | null> {
    const match = this.transfers.find(
      (t) =>
        t.token.toLowerCase() === params.token.toLowerCase() &&
        t.to.toLowerCase() === params.to.toLowerCase() &&
        t.amountMinor >= params.minAmountMinor &&
        t.blockNumber >= params.fromBlock,
    );
    return match ? { txHash: match.txHash, amountMinor: match.amountMinor, blockNumber: match.blockNumber } : null;
  }
}

// ─── JSON-RPC (real, dependency-free) ─────────────────────────────────────────

/** keccak256("Transfer(address,address,uint256)") */
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function toAddressTopic(address: string): string {
  return '0x' + address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

function hexToSafeInt(hex: string): number | null {
  try {
    const n = BigInt(hex);
    if (n > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(n);
  } catch {
    return null;
  }
}

export class JsonRpcChainReader implements ChainReader {
  public constructor(private readonly rpcUrl: string, private readonly fetchImpl: typeof fetch = fetch) {}

  private async rpc<T>(method: string, params: unknown[]): Promise<T | null> {
    try {
      const res = await this.fetchImpl(this.rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { result?: T; error?: unknown };
      return body.error || body.result === undefined ? null : (body.result as T);
    } catch {
      return null;
    }
  }

  public async currentBlock(): Promise<number> {
    const hex = await this.rpc<string>('eth_blockNumber', []);
    if (!hex) return 0;
    return hexToSafeInt(hex) ?? 0;
  }

  public async findIncomingTransfer(params: FindTransferParams): Promise<TransferProof | null> {
    const logs = await this.rpc<Array<{ data: string; blockNumber: string; transactionHash: string }>>('eth_getLogs', [
      {
        fromBlock: '0x' + params.fromBlock.toString(16),
        toBlock: 'latest',
        address: params.token,
        topics: [TRANSFER_TOPIC, null, toAddressTopic(params.to)],
      },
    ]);
    if (!logs || logs.length === 0) return null;

    for (const log of logs) {
      const amount = hexToSafeInt(log.data);
      const blockNumber = hexToSafeInt(log.blockNumber);
      if (amount === null || blockNumber === null) continue;
      if (amount >= params.minAmountMinor && blockNumber >= params.fromBlock) {
        return { txHash: log.transactionHash, amountMinor: amount, blockNumber };
      }
    }
    return null;
  }
}
