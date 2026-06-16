/**
 * Settlement rails — the physical-world edges, behind one interface.
 *
 * These are the ONLY parts that touch the real world (on-chain escrow, chain
 * confirmation, licensed off-ramp). They cannot be truly implemented in-process:
 * a real impl needs a deployed contract, chain RPC + keys, and a licensed ramp's
 * API. So the engine talks to this interface, and we ship a SIMULATED impl —
 * explicitly labelled — so nothing mistakes it for live settlement.
 *
 * `SimulatedRails.simulated === true`. It NEVER claims a real settlement; it
 * produces deterministic, clearly-sourced proofs so the deterministic core can be
 * exercised end-to-end. Swap in LiveRails (real contracts + ramp) when available.
 */

import type { LegKind, Proof } from './reconciliation.js';

export interface RailLeg {
  legId: string;
  kind: LegKind;
  amountMinor: number;
  currency: string;
  destination: string;
}

export interface RailOutcome {
  ok: boolean;
  /** Authoritative proof for reconciliation (chain for on_chain, ramp for fiat). */
  proof?: Proof;
  detail?: string;
}

export interface SettlementRails {
  /** Bring value in (entrée): agent 402 payment / ramp on-ramp. */
  fund(orderId: string, leg: RailLeg): Promise<RailOutcome>;
  /** Push value out (sortie): off-ramp payout / on-chain release. */
  payout(orderId: string, leg: RailLeg): Promise<RailOutcome>;
  /** Return value to the payer (refund). */
  refund(orderId: string, leg: RailLeg): Promise<RailOutcome>;
}

export interface SimulatedRailsDeps {
  generateRef: () => string;
  /** Leg ids that should FAIL (to exercise partial/retry paths). */
  failLegs?: ReadonlySet<string>;
}

export class SimulatedRails implements SettlementRails {
  /** Hard, visible marker: this is NOT live settlement. */
  public readonly simulated = true as const;

  private readonly generateRef: () => string;
  private readonly failLegs: ReadonlySet<string>;

  public constructor(deps: SimulatedRailsDeps) {
    this.generateRef = deps.generateRef;
    this.failLegs = deps.failLegs ?? new Set();
  }

  private authoritativeProof(leg: RailLeg): Proof {
    return {
      reference: this.generateRef(),
      source: leg.kind === 'on_chain' ? 'chain' : 'ramp',
      kind: leg.kind,
      amountMinor: leg.amountMinor,
      currency: leg.currency,
      destination: leg.destination,
      legRef: leg.legId, // bind the proof to the leg we initiated
    };
  }

  private run(leg: RailLeg, action: string): RailOutcome {
    if (this.failLegs.has(leg.legId)) {
      return { ok: false, detail: `simulated ${action} failure for ${leg.legId}` };
    }
    return { ok: true, proof: this.authoritativeProof(leg) };
  }

  public async fund(_orderId: string, leg: RailLeg): Promise<RailOutcome> {
    return this.run(leg, 'fund');
  }

  public async payout(_orderId: string, leg: RailLeg): Promise<RailOutcome> {
    return this.run(leg, 'payout');
  }

  public async refund(_orderId: string, leg: RailLeg): Promise<RailOutcome> {
    return this.run(leg, 'refund');
  }
}
