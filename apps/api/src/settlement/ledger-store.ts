/**
 * LedgerStore — async storage boundary for the ledger.
 *
 * The engine depends on this interface, not on a concrete store, so the same
 * deterministic orchestration runs over either:
 *   - InMemoryLedgerStore — wraps the proven sync `Ledger` (tests, dev).
 *   - PgLedgerStore — durable + concurrency-safe (Postgres), for production.
 *
 * All methods are async (Postgres is async). The invariants (double-entry balance,
 * idempotency, append-only, derived balances) are upheld by EACH implementation.
 */

import { Ledger, type Account, type LedgerDeps, type PostInput, type Transaction } from './ledger.js';

export interface LedgerStore {
  openAccount(account: Account): Promise<void>;
  post(input: PostInput): Promise<Transaction>;
  balance(accountId: string): Promise<number>;
  transactionsForOrder(orderId: string): Promise<Array<{ id: string; transition: string }>>;
  conservationViolations(): Promise<Array<{ currency: string; net: number }>>;
}

/** In-memory store: delegates to the synchronous, fully-tested `Ledger`. */
export class InMemoryLedgerStore implements LedgerStore {
  private readonly ledger: Ledger;

  public constructor(deps: LedgerDeps) {
    this.ledger = new Ledger(deps);
  }

  public async openAccount(account: Account): Promise<void> {
    this.ledger.openAccount(account);
  }

  public async post(input: PostInput): Promise<Transaction> {
    return this.ledger.post(input);
  }

  public async balance(accountId: string): Promise<number> {
    return this.ledger.balance(accountId);
  }

  public async transactionsForOrder(orderId: string): Promise<Array<{ id: string; transition: string }>> {
    return this.ledger.transactionsForOrder(orderId).map((t) => ({ id: t.id, transition: t.transition }));
  }

  public async conservationViolations(): Promise<Array<{ currency: string; net: number }>> {
    return this.ledger.conservationViolations();
  }
}
