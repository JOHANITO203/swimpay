/**
 * Settlement engine — drives a PaymentOrder through its states, writing exactly
 * one balanced ledger transaction per transition, under the guard of the rules
 * engine, sharding the payout via the swarm, and gating RECONCILED on authoritative
 * reconciliation.
 *
 * This is the deterministic conductor. It is real: every decision, posting, split,
 * and shard is genuine logic. It depends on the async `LedgerStore` interface, so it
 * runs identically over the in-memory store (tests) or the durable Postgres store.
 * Only the physical edges (SettlementRails) are simulated — and explicitly so.
 *
 *   authorize → fund(entrée, reconcile) → [convert] → hold/release(rules)
 *   → split → swarm → payout(per shard, reconcile) → SETTLED → RECONCILED (if all confirmed)
 */

import type { Account } from './ledger.js';
import type { LedgerStore } from './ledger-store.js';
import {
  applyTransition,
  type Beneficiary,
  type PaymentOrder,
  stateAfterFunded,
} from './payment-order.js';
import { Reconciler } from './reconciliation.js';
import { evaluateRules, planSwarm, type EvaluationResult, type Rule, type RuleContext } from './rules-engine.js';
import type { SettlementRails } from './settlement-rails.js';

export class EngineError extends Error {}

export interface Converter {
  convert(
    amountMinor: number,
    from: string,
    to: string,
    fromDigits: number,
    toDigits: number,
  ): Promise<{ amountOutMinor: number; rate: string; source: string } | null>;
}

export interface EngineDeps {
  ledger: LedgerStore;
  rails: SettlementRails;
  reconciler: Reconciler;
  converter: Converter;
  minorDigits: (currency: string) => number;
  /** Swarm shard cap, in currencyOut minor units. */
  technicalCapMinor: number;
  rules?: Rule[];
}

export interface SettlementResult {
  order: PaymentOrder;
  state: PaymentOrder['state'];
  reconciled: boolean;
  pendingLegIds: string[];
  conservationViolations: Array<{ currency: string; net: number }>;
  decision?: EvaluationResult;
}

/** Exact, loss-free split of `distributable` across beneficiaries (fixed first, then shares). */
export function computeSplit(distributable: number, beneficiaries: Beneficiary[]): Map<string, number> {
  const fixed = beneficiaries.filter((b) => typeof b.fixedMinor === 'number');
  const shares = beneficiaries.filter((b) => typeof b.shareBps === 'number');
  const sumFixed = fixed.reduce((a, b) => a + (b.fixedMinor ?? 0), 0);
  if (sumFixed > distributable) throw new EngineError('fixed amounts exceed distributable');

  const forShares = distributable - sumFixed;
  const map = new Map<string, number>();
  for (const b of fixed) map.set(b.id, b.fixedMinor!);

  let allocated = 0;
  for (const b of shares) {
    const amt = Math.floor(forShares * (b.shareBps! / 10_000));
    map.set(b.id, amt);
    allocated += amt;
  }
  const leftover = forShares - allocated;
  if (shares.length > 0) {
    const last = shares[shares.length - 1]!;
    map.set(last.id, (map.get(last.id) ?? 0) + leftover); // remainder → last share, no minor unit lost
  } else if (leftover !== 0) {
    throw new EngineError('fixed-only split does not cover the distributable amount');
  }
  return map;
}

export class SettlementEngine {
  private readonly d: EngineDeps;

  public constructor(deps: EngineDeps) {
    this.d = deps;
  }

  private async ensure(id: string, owner: string, currency: string, type: Account['type']): Promise<void> {
    await this.d.ledger.openAccount({ id, owner, currency, type });
  }

  private async result(order: PaymentOrder, decision?: EvaluationResult): Promise<SettlementResult> {
    return {
      order,
      state: order.state,
      reconciled: order.state === 'RECONCILED',
      pendingLegIds: this.d.reconciler.pendingLegs(order.id).map((l) => l.id),
      conservationViolations: await this.d.ledger.conservationViolations(),
      ...(decision ? { decision } : {}),
    };
  }

  public async settle(order: PaymentOrder, ctx: RuleContext): Promise<SettlementResult> {
    const oid = order.id;
    const inCur = order.currencyIn;
    const outCur = order.currencyOut;

    // 1. Authorization (rules on the aggregate).
    const authz = evaluateRules(order, 'authorization', ctx, this.d.rules);
    if (authz.decision === 'deny') {
      return this.result(applyTransition(order, authz.reasons.includes('expired') ? 'EXPIRED' : 'REJECTED'), authz);
    }
    order = applyTransition(order, 'AUTHORIZED');

    // Accounts.
    await this.ensure(`ramp_in:${oid}`, 'system', inCur, 'ramp_in');
    await this.ensure(`escrow_in:${oid}`, oid, inCur, 'escrow');
    await this.ensure(`ramp_out:${oid}`, 'system', outCur, 'ramp_out');

    // 2. Fund (entrée) + reconcile before holding (never escrow phantom funds).
    const fundKind = order.payer.type === 'human' ? ('fiat' as const) : ('on_chain' as const);
    const fundLegId = `${oid}:fund`;
    const fundDest = `escrow_in:${oid}`;
    this.d.reconciler.registerExpected({ id: fundLegId, orderId: oid, kind: fundKind, amountMinor: order.amountInMinor, currency: inCur, destination: fundDest });
    const funded = await this.d.rails.fund(oid, { legId: fundLegId, kind: fundKind, amountMinor: order.amountInMinor, currency: inCur, destination: fundDest });
    if (!funded.ok || !funded.proof) {
      return this.result(applyTransition(order, 'FAILED'), authz);
    }
    this.d.reconciler.applyProof(funded.proof);
    await this.d.ledger.post({
      orderId: oid,
      transition: 'FUNDED',
      idempotencyKey: `${oid}:FUNDED`,
      legs: [
        { accountId: `ramp_in:${oid}`, amountMinor: -order.amountInMinor },
        { accountId: `escrow_in:${oid}`, amountMinor: +order.amountInMinor },
      ],
    });
    order = applyTransition(order, 'FUNDED');

    // 3. Conversion (bridge) → resolve the hold account/amount in currencyOut.
    let holdAccount: string;
    let holdAmount: number;
    if (order.channel === 'bridge') {
      const conv = await this.d.converter.convert(order.amountInMinor, inCur, outCur, this.d.minorDigits(inCur), this.d.minorDigits(outCur));
      if (!conv) return this.result(applyTransition(order, 'FAILED'), authz);
      await this.ensure(`bridge_in:${inCur}`, 'system', inCur, 'fx_bridge');
      await this.ensure(`bridge_out:${outCur}`, 'system', outCur, 'fx_bridge');
      await this.ensure(`escrow_out:${oid}`, oid, outCur, 'escrow');
      await this.d.ledger.post({
        orderId: oid,
        transition: 'CONVERT',
        idempotencyKey: `${oid}:CONVERT`,
        legs: [
          { accountId: `escrow_in:${oid}`, amountMinor: -order.amountInMinor },
          { accountId: `bridge_in:${inCur}`, amountMinor: +order.amountInMinor },
          { accountId: `bridge_out:${outCur}`, amountMinor: -conv.amountOutMinor },
          { accountId: `escrow_out:${oid}`, amountMinor: +conv.amountOutMinor },
        ],
      });
      holdAccount = `escrow_out:${oid}`;
      holdAmount = conv.amountOutMinor;
    } else {
      holdAccount = `escrow_in:${oid}`; // in === out
      holdAmount = order.amountInMinor;
    }

    // 4. Hold vs release.
    order = applyTransition(order, stateAfterFunded(order));
    if (order.state === 'HELD') {
      const rel = evaluateRules(order, 'release', ctx, this.d.rules);
      if (rel.decision === 'hold') {
        return this.result(order, rel); // waits in HELD until the condition is met
      }
      if (rel.decision === 'deny') {
        // expired in hold → refund the payer.
        order = applyTransition(order, 'REFUNDING');
        await this.ensure(`payer_refund:${oid}`, order.payer.id, outCur, 'payer');
        await this.d.ledger.post({
          orderId: oid,
          transition: 'REFUND',
          idempotencyKey: `${oid}:REFUND`,
          legs: [
            { accountId: holdAccount, amountMinor: -holdAmount },
            { accountId: `payer_refund:${oid}`, amountMinor: +holdAmount },
          ],
        });
        await this.d.rails.refund(oid, { legId: `${oid}:refund`, kind: 'fiat', amountMinor: holdAmount, currency: outCur, destination: `payer:${order.payer.id}` });
        return this.result(applyTransition(order, 'REFUNDED'), rel);
      }
      order = applyTransition(order, 'RELEASING');
    }

    // 5. Release: split (− fee) and post.
    const fee = order.quote?.feeMinor ?? 0;
    const distributable = holdAmount - fee;
    if (distributable <= 0) return this.result(applyTransition(order, 'FAILED'), authz);

    const split = computeSplit(distributable, order.beneficiaries);
    await this.ensure(`fee:${outCur}`, 'system', outCur, 'fee');
    const releaseLegs: Array<{ accountId: string; amountMinor: number }> = [{ accountId: holdAccount, amountMinor: -holdAmount }];
    if (fee > 0) releaseLegs.push({ accountId: `fee:${outCur}`, amountMinor: +fee });
    for (const [bid, amount] of split) {
      await this.ensure(`benef:${oid}:${bid}`, bid, outCur, 'beneficiary');
      releaseLegs.push({ accountId: `benef:${oid}:${bid}`, amountMinor: +amount });
    }
    await this.d.ledger.post({ orderId: oid, transition: 'RELEASE', idempotencyKey: `${oid}:RELEASE`, legs: releaseLegs });

    // 6. Swarm: shard each beneficiary's amount under the technical cap, pay out, reconcile.
    for (const [bid, amount] of split) {
      const shards = planSwarm(amount, this.d.technicalCapMinor);
      for (let i = 0; i < shards.length; i++) {
        await this.deliverShard(oid, bid, i, shards[i]!, outCur, this.d.rails);
      }
    }

    // 7. SETTLED, then RECONCILED only if every leg (entrée + all shards) is confirmed.
    order = applyTransition(order, 'SETTLED');
    if (this.d.reconciler.allConfirmed(oid)) {
      order = applyTransition(order, 'RECONCILED');
    }
    return this.result(order, authz);
  }

  private async deliverShard(oid: string, bid: string, index: number, amount: number, currency: string, rails: SettlementRails): Promise<void> {
    const legId = `${oid}:out:${bid}:${index}`;
    const dest = `payout:${bid}`;
    this.d.reconciler.registerExpected({ id: legId, orderId: oid, kind: 'fiat', amountMinor: amount, currency, destination: dest });
    const out = await rails.payout(oid, { legId, kind: 'fiat', amountMinor: amount, currency, destination: dest });
    if (out.ok && out.proof) {
      this.d.reconciler.applyProof(out.proof);
      await this.d.ledger.post({
        orderId: oid,
        transition: 'SETTLE',
        idempotencyKey: `${oid}:SETTLE:${legId}`,
        legs: [
          { accountId: `benef:${oid}:${bid}`, amountMinor: -amount },
          { accountId: `ramp_out:${oid}`, amountMinor: +amount },
        ],
      });
    }
    // else: the shard stays pending; money remains on the beneficiary account, retriable.
  }

  /** Retry the pending sortie shards (swarm resilience). Re-attempts only what didn't confirm. */
  public async deliverPending(order: PaymentOrder, railsOverride?: SettlementRails): Promise<SettlementResult> {
    const oid = order.id;
    const rails = railsOverride ?? this.d.rails;
    for (const leg of this.d.reconciler.pendingLegs(oid)) {
      if (!leg.id.startsWith(`${oid}:out:`)) continue; // only sortie shards
      const parts = leg.id.split(':'); // [oid, 'out', bid, index]
      const bid = parts[2]!;
      const index = Number.parseInt(parts[3]!, 10);
      await this.deliverShard(oid, bid, index, leg.amountMinor, leg.currency, rails);
    }
    let o = order;
    if (o.state === 'SETTLED' && this.d.reconciler.allConfirmed(oid)) {
      o = applyTransition(o, 'RECONCILED');
    }
    return this.result(o);
  }
}
