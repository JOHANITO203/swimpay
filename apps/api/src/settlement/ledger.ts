/**
 * Ledger — double-entry, append-only, idempotent, derived balances.
 *
 * The spine of the programmable-settlement core. Every state transition of a
 * payment order produces exactly one balanced Transaction here.
 *
 * Invariants (enforced, not aspirational):
 *   1. Double-entry: every Transaction's entries sum to ZERO per currency.
 *   2. Append-only: entries are never edited or deleted; a correction is a new
 *      reversing transaction (contre-passation).
 *   3. Derived balances: a balance is always computed = sum of entries, never stored.
 *   4. Idempotent: a Transaction carries an idempotencyKey; re-posting the same key
 *      is a no-op that returns the original transaction (replays never double-count).
 *   5. Traceability: every Transaction references its orderId.
 *
 * Deterministic: no clock/random inside — id generation and `now` are injected.
 */

export type AccountType =
  | 'payer'
  | 'escrow'
  | 'beneficiary'
  | 'fee'
  | 'fx_bridge'
  | 'ramp_in'
  | 'ramp_out';

export interface Account {
  id: string;
  owner: string; // merchant/payer id, or 'system'
  currency: string;
  type: AccountType;
}

export interface Entry {
  id: string;
  accountId: string;
  /** Signed minor units: positive = credit, negative = debit. */
  amountMinor: number;
  currency: string;
  txnId: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  transition: string;
  idempotencyKey: string;
  entries: Entry[];
  createdAt: string;
}

/** A single side of a transaction, before entry ids/currency are resolved. */
export interface PostingLeg {
  accountId: string;
  amountMinor: number;
}

export interface PostInput {
  orderId: string;
  transition: string;
  idempotencyKey: string;
  legs: PostingLeg[];
}

export interface LedgerDeps {
  generateTxnId: () => string;
  generateEntryId: () => string;
  now: () => string; // ISO timestamp
}

export class LedgerError extends Error {}
export class UnbalancedTransactionError extends LedgerError {}
export class UnknownAccountError extends LedgerError {}

export class Ledger {
  private readonly accounts = new Map<string, Account>();
  private readonly entries: Entry[] = [];
  private readonly transactions = new Map<string, Transaction>();
  /** idempotencyKey → txnId */
  private readonly idempotency = new Map<string, string>();
  private readonly deps: LedgerDeps;

  public constructor(deps: LedgerDeps) {
    this.deps = deps;
  }

  // ─── Accounts ───────────────────────────────────────────────────────────────

  public openAccount(account: Account): Account {
    if (this.accounts.has(account.id)) {
      return this.accounts.get(account.id)!;
    }
    this.accounts.set(account.id, { ...account, currency: account.currency.toUpperCase() });
    return this.accounts.get(account.id)!;
  }

  public getAccount(accountId: string): Account | null {
    return this.accounts.get(accountId) ?? null;
  }

  // ─── Posting ──────────────────────────────────────────────────────────────────

  /**
   * Post a balanced transaction. Validates that every referenced account exists
   * and that the legs sum to zero per currency. Idempotent on idempotencyKey.
   */
  public post(input: PostInput): Transaction {
    // Idempotency: replay returns the original, never double-posts.
    const seen = this.idempotency.get(input.idempotencyKey);
    if (seen) {
      return this.transactions.get(seen)!;
    }

    if (input.legs.length === 0) {
      throw new UnbalancedTransactionError('transaction has no legs');
    }

    // Resolve currencies from accounts + verify existence.
    const perCurrency = new Map<string, number>();
    const resolved: Array<{ accountId: string; amountMinor: number; currency: string }> = [];
    for (const leg of input.legs) {
      const account = this.accounts.get(leg.accountId);
      if (!account) {
        throw new UnknownAccountError(`unknown account: ${leg.accountId}`);
      }
      if (!Number.isSafeInteger(leg.amountMinor)) {
        throw new LedgerError(`amountMinor must be a safe integer (got ${leg.amountMinor})`);
      }
      perCurrency.set(account.currency, (perCurrency.get(account.currency) ?? 0) + leg.amountMinor);
      resolved.push({ accountId: leg.accountId, amountMinor: leg.amountMinor, currency: account.currency });
    }

    // Double-entry: each currency must net to zero.
    for (const [currency, sum] of perCurrency) {
      if (sum !== 0) {
        throw new UnbalancedTransactionError(`unbalanced in ${currency}: net ${sum} (must be 0)`);
      }
    }

    const txnId = this.deps.generateTxnId();
    const createdAt = this.deps.now();
    const entries: Entry[] = resolved.map((r) => ({
      id: this.deps.generateEntryId(),
      accountId: r.accountId,
      amountMinor: r.amountMinor,
      currency: r.currency,
      txnId,
    }));

    const txn: Transaction = {
      id: txnId,
      orderId: input.orderId,
      transition: input.transition,
      idempotencyKey: input.idempotencyKey,
      entries,
      createdAt,
    };

    for (const e of entries) {
      this.entries.push(e);
    }
    this.transactions.set(txnId, txn);
    this.idempotency.set(input.idempotencyKey, txnId);
    return txn;
  }

  // ─── Reads (all derived) ──────────────────────────────────────────────────────

  /** Derived balance for an account = sum of its entries. */
  public balance(accountId: string): number {
    let sum = 0;
    for (const e of this.entries) {
      if (e.accountId === accountId) sum += e.amountMinor;
    }
    return sum;
  }

  public getTransaction(txnId: string): Transaction | null {
    return this.transactions.get(txnId) ?? null;
  }

  public transactionsForOrder(orderId: string): Transaction[] {
    return [...this.transactions.values()].filter((t) => t.orderId === orderId);
  }

  /**
   * Global conservation check: across ALL accounts, the sum of entries per
   * currency must be zero. A non-empty result means a bug created/destroyed money.
   */
  public conservationViolations(): Array<{ currency: string; net: number }> {
    const perCurrency = new Map<string, number>();
    for (const e of this.entries) {
      perCurrency.set(e.currency, (perCurrency.get(e.currency) ?? 0) + e.amountMinor);
    }
    return [...perCurrency.entries()]
      .filter(([, net]) => net !== 0)
      .map(([currency, net]) => ({ currency, net }));
  }
}
