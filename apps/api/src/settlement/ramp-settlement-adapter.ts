/**
 * Ramp settlement adapter — bridges the engine's generic `SettlementRails.payout` to the
 * real off-ramp `RampPayoutRouter` (HoneyCoin primary, Conduit/BVNK fallback).
 *
 * `fund`/`refund` delegate to a base rails (entrée + refund edges are handled elsewhere —
 * the on-ramp/intent side). `payout` models the async off-ramp in two phases, which the
 * engine already supports (pending shard → deliverPending):
 *   1st call   → initiate ramp payout → PENDING → ok:false  (shard stays pending)
 *   deliverPending (after the ramp settles) → DELIVERED → ok:true + authoritative ramp
 *                proof → engine posts SETTLE + reconciles → RECONCILED.
 *
 * The proof's `legRef` binds it to the leg we initiated (anti-decoupling), exactly like
 * SimulatedRails. This is the wiring; swap a real HoneyCoinRampRails into the router and the
 * same path goes live — no engine change.
 */

import type { BeneficiaryChannel, PayoutRequest, RampPayoutRouter } from './ramp-payout.js';
import type { RailLeg, RailOutcome, SettlementRails } from './settlement-rails.js';

export interface RampSettlementAdapterOpts {
  /** Resolve the merchant payout channel from the leg destination (e.g. mobile money number). */
  beneficiaryChannel: (destination: string) => BeneficiaryChannel;
  /** Source stablecoin moved into the ramp (default 'USDC'). */
  tokenSymbol?: string;
}

export class RampSettlementAdapter implements SettlementRails {
  private readonly payoutIdByLeg = new Map<string, string>();

  public constructor(
    private readonly router: RampPayoutRouter,
    private readonly base: SettlementRails,
    private readonly opts: RampSettlementAdapterOpts,
  ) {}

  public async fund(orderId: string, leg: RailLeg): Promise<RailOutcome> {
    return this.base.fund(orderId, leg);
  }

  public async refund(orderId: string, leg: RailLeg): Promise<RailOutcome> {
    return this.base.refund(orderId, leg);
  }

  public async payout(_orderId: string, leg: RailLeg): Promise<RailOutcome> {
    // Initiate once (idempotent by leg id); thereafter just poll the same payout.
    let payoutId = this.payoutIdByLeg.get(leg.legId);
    if (!payoutId) {
      const req: PayoutRequest = {
        reference: leg.legId,
        amountMinor: leg.amountMinor,
        tokenSymbol: this.opts.tokenSymbol ?? 'USDC',
        destinationCurrency: leg.currency,
        beneficiary: this.opts.beneficiaryChannel(leg.destination),
      };
      try {
        const init = await this.router.payout(req);
        payoutId = init.payoutId;
        this.payoutIdByLeg.set(leg.legId, payoutId);
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : 'payout init failed' };
      }
    }

    const status = await this.router.getStatus(payoutId);
    if (status.status === 'DELIVERED') {
      return {
        ok: true,
        proof: {
          reference: payoutId,
          source: 'ramp',
          kind: leg.kind,
          amountMinor: leg.amountMinor,
          currency: leg.currency,
          destination: leg.destination,
          legRef: leg.legId, // bind the proof to the leg we initiated
        },
      };
    }
    // PENDING/FAILED → leave the shard pending; the engine retries via deliverPending.
    return { ok: false, detail: `payout_${status.status.toLowerCase()}` };
  }
}
