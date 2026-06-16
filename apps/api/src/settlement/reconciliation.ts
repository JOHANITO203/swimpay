/**
 * Reconciliation — confirm a leg actually settled, from an AUTHORITATIVE source.
 *
 * Changement de classe: since SwimPay *initiates* the payment, confirmation comes
 * first-hand — never from a hoped-for notification.
 *   - on-chain leg → the chain (tx confirmations).
 *   - fiat leg     → the ramp's payout status (API).
 *   - notification → corroboration ONLY; never confirms a leg on its own.
 *
 * Matching is deterministic: a proof matches an expected leg on
 * (kind, currency, destination, amount ± tolerance). Proof references are
 * idempotent (a tx hash / callback id confirms at most once). An order is
 * RECONCILED only when EVERY expected leg is confirmed; partial → retry the
 * pending legs (swarm resilience).
 */

export type LegKind = 'on_chain' | 'fiat';
export type LegStatus = 'expected' | 'confirmed';
export type ProofSource = 'chain' | 'ramp' | 'notification';

export interface ExpectedLeg {
  id: string;
  orderId: string;
  kind: LegKind;
  amountMinor: number;
  currency: string;
  destination: string;
}

export interface Proof {
  /** Unique proof id (tx hash / callback id) — idempotency key. */
  reference: string;
  source: ProofSource;
  kind: LegKind;
  amountMinor: number;
  currency: string;
  destination: string;
  /**
   * The expected leg this proof settles, when known (a payout we initiated carries
   * our own leg id). Bound matching by `legRef` is exact; only unsolicited proofs
   * (e.g. an incoming collection, a notification) fall back to attribute matching.
   */
  legRef?: string;
}

export type ReconcileResult =
  | { status: 'confirmed'; legId: string; proofRef: string; source: ProofSource }
  | { status: 'corroborated'; legId: string; note: 'awaiting_authoritative' }
  | { status: 'discrepancy'; type: 'amount_mismatch' | 'unexpected' | 'duplicate'; detail: string };

const AUTHORITATIVE: ReadonlySet<ProofSource> = new Set<ProofSource>(['chain', 'ramp']);

export class Reconciler {
  private readonly legs = new Map<string, ExpectedLeg>();
  private readonly status = new Map<string, LegStatus>();
  private readonly appliedProofs = new Set<string>();
  private readonly amountToleranceMinor: number;

  public constructor(options: { amountToleranceMinor?: number } = {}) {
    this.amountToleranceMinor = options.amountToleranceMinor ?? 0;
  }

  public registerExpected(leg: ExpectedLeg): void {
    this.legs.set(leg.id, leg);
    if (!this.status.has(leg.id)) this.status.set(leg.id, 'expected');
  }

  public legStatus(legId: string): LegStatus | null {
    return this.status.get(legId) ?? null;
  }

  public pendingLegs(orderId: string): ExpectedLeg[] {
    return [...this.legs.values()].filter((l) => l.orderId === orderId && this.status.get(l.id) === 'expected');
  }

  /** True only when the order has ≥1 expected leg and ALL of them are confirmed. */
  public allConfirmed(orderId: string): boolean {
    const legs = [...this.legs.values()].filter((l) => l.orderId === orderId);
    return legs.length > 0 && legs.every((l) => this.status.get(l.id) === 'confirmed');
  }

  public applyProof(proof: Proof): ReconcileResult {
    // Idempotency: a proof reference confirms at most once.
    if (this.appliedProofs.has(proof.reference)) {
      return { status: 'discrepancy', type: 'duplicate', detail: `proof ${proof.reference} already applied` };
    }

    // Bound matching: a proof that names its leg (a payout we initiated) confirms
    // exactly that leg. Only unsolicited proofs fall back to attribute matching.
    let candidate: ExpectedLeg | undefined;
    if (proof.legRef) {
      const leg = this.legs.get(proof.legRef);
      if (
        !leg ||
        this.status.get(leg.id) !== 'expected' ||
        leg.kind !== proof.kind ||
        leg.currency.toUpperCase() !== proof.currency.toUpperCase() ||
        leg.destination !== proof.destination
      ) {
        return { status: 'discrepancy', type: 'unexpected', detail: `no expected leg for ref ${proof.legRef}` };
      }
      candidate = leg;
    } else {
      candidate = [...this.legs.values()].find(
        (l) =>
          this.status.get(l.id) === 'expected' &&
          l.kind === proof.kind &&
          l.currency.toUpperCase() === proof.currency.toUpperCase() &&
          l.destination === proof.destination,
      );
    }

    if (!candidate) {
      // Could be a deposit we never expected (collection to match) or an anomaly.
      return { status: 'discrepancy', type: 'unexpected', detail: 'no matching expected leg' };
    }

    if (Math.abs(candidate.amountMinor - proof.amountMinor) > this.amountToleranceMinor) {
      return {
        status: 'discrepancy',
        type: 'amount_mismatch',
        detail: `expected ${candidate.amountMinor}, proof ${proof.amountMinor}`,
      };
    }

    // Notification is corroboration only — it never confirms on its own.
    if (!AUTHORITATIVE.has(proof.source)) {
      return { status: 'corroborated', legId: candidate.id, note: 'awaiting_authoritative' };
    }

    this.appliedProofs.add(proof.reference);
    this.status.set(candidate.id, 'confirmed');
    return { status: 'confirmed', legId: candidate.id, proofRef: proof.reference, source: proof.source };
  }
}
