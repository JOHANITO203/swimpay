/**
 * Cost Oracle — honest end-to-end transfer-cost quote.
 *
 * Composes a corridor quote from up to three legs, each carrying its own source
 * and freshness, and each independently `available`:
 *   - FX leg      : reference conversion via FxRateService (ECB / CBR / UEMOA peg).
 *   - Network leg : on-chain (gas) cost estimate.
 *   - Ramp leg    : off-ramp partner fee (published schedule, dated).
 *
 * Honesty rules (inherited from FxRateService):
 *   - A cost is NEVER invented. A leg with no data → available:false.
 *   - The total is `available` ONLY when every leg is available; otherwise the
 *     quote is partial (totalCostMinor / amountDeliveredMinor = null) and each
 *     leg is still reported so the caller can show an honest "indisponible".
 *   - Deterministic: no clock/network here; sources are injected. Minor units are
 *     integers; the FX conversion does a single final rounding inside FxRateService.
 *
 * Corridor-agnostic: corridors are a pluggable registry. Adding a corridor is one
 * registry entry. Sanctions/KYC screening is a SETTLEMENT-time control (the rules
 * engine), not a quote-time concern — the Cost Oracle only computes cost.
 */

import type { FxRouteResult } from './fx.js';

// ─── Public types ────────────────────────────────────────────────────────────

export type CostLegKind = 'fx' | 'network' | 'ramp';

export interface CostLeg {
  kind: CostLegKind;
  available: boolean;
  /** Cost of this leg in the FROM-currency minor units (null when unavailable). FX leg = 0 (reference mid-rate has no explicit fee). */
  feeMinor: number | null;
  source: string | null;
  /** Freshness of the leg's data (ISO string), or null. */
  asOf: string | null;
  detail: string | null;
}

export interface CorridorQuote {
  from: string;
  to: string;
  amountInMinor: number;
  /** Full amount converted at the reference rate, in TO-currency minor units (before fees). Null if FX unavailable. */
  referenceAmountMinor: number | null;
  legs: CostLeg[];
  /** Sum of leg fees in FROM-currency minor units. Null unless every leg is available. */
  totalCostMinor: number | null;
  /** What the beneficiary actually receives, in TO-currency minor units (after fees). Null unless fully available. */
  amountDeliveredMinor: number | null;
  available: boolean;
  /** Honest caveats the published data cannot capture (e.g. ramp spread). */
  caveats: string[];
}

export interface Corridor {
  from: string;
  to: string;
  rampId: string;
}

// ─── Injected source interfaces (so the module is pure & unit-testable) ───────

/** Minimal slice of FxRateService used here. */
export interface FxQuoter {
  quote(
    source: string,
    target: string,
    amountMinor: number,
    sourceMinorDigits: number,
    targetMinorDigits: number,
  ): Promise<FxRouteResult>;
}

export interface NetworkFeeEstimate {
  available: boolean;
  /** Fee in FROM-currency minor units. */
  feeMinor: number | null;
  source: string | null;
  asOf: string | null;
  detail: string | null;
}

export interface NetworkFeeSource {
  estimate(corridor: Corridor): NetworkFeeEstimate;
}

export interface RampFeeQuote {
  available: boolean;
  /** Proportional fee, e.g. 0.02 for 2%. */
  pct: number | null;
  /** Fixed fee in FROM-currency minor units. */
  fixedMinor: number | null;
  source: string | null;
  asOf: string | null;
  detail: string | null;
}

export interface RampFeeSource {
  fee(rampId: string, fromCurrency: string): RampFeeQuote;
}

// ─── Corridor registry ────────────────────────────────────────────────────────
// `rampId` is the XOF-side OFF-ramp; the input currency is handled by the FX leg.
// RUB→XOF: rouble priced via CBR (FxRateService); screening enforced at settlement.

const ACTIVE_CORRIDORS: readonly Corridor[] = [
  { from: 'USD', to: 'XOF', rampId: 'yellow_card' },
  { from: 'EUR', to: 'XOF', rampId: 'yellow_card' },
  { from: 'RUB', to: 'XOF', rampId: 'yellow_card' },
];

export function findCorridor(from: string, to: string): Corridor | null {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  return ACTIVE_CORRIDORS.find((c) => c.from === f && c.to === t) ?? null;
}

export function listActiveCorridors(): readonly Corridor[] {
  return ACTIVE_CORRIDORS;
}

// ─── Composition ──────────────────────────────────────────────────────────────

/**
 * Compose an honest end-to-end cost quote for one corridor.
 * `fromDigits` / `toDigits` are the minor-unit decimal places of each currency.
 */
export async function composeQuote(
  corridor: Corridor,
  amountInMinor: number,
  fromDigits: number,
  toDigits: number,
  sources: { fx: FxQuoter; network: NetworkFeeSource; ramp: RampFeeSource },
): Promise<CorridorQuote> {
  const caveats: string[] = [];

  // FX leg — full-amount reference conversion (before fees).
  let referenceAmountMinor: number | null = null;
  const fxLeg: CostLeg = { kind: 'fx', available: false, feeMinor: 0, source: null, asOf: null, detail: null };
  try {
    const fxFull = await sources.fx.quote(corridor.from, corridor.to, amountInMinor, fromDigits, toDigits);
    if (fxFull.kind === 'ok') {
      referenceAmountMinor = fxFull.quote.amountMinorTarget;
      fxLeg.available = true;
      fxLeg.source = fxFull.quote.source;
      fxLeg.asOf = fxFull.quote.rateTimestamp;
      fxLeg.detail = `taux de référence ${fxFull.quote.rate} (mid-market, hors spread)`;
    }
  } catch {
    // leave FX unavailable — never throw, never invent
  }

  // Network leg.
  const net = sources.network.estimate(corridor);
  const networkLeg: CostLeg = {
    kind: 'network',
    available: net.available,
    feeMinor: net.available ? net.feeMinor : null,
    source: net.source,
    asOf: net.asOf,
    detail: net.detail,
  };

  // Ramp leg.
  const ramp = sources.ramp.fee(corridor.rampId, corridor.from);
  const rampFeeMinor =
    ramp.available && ramp.pct !== null
      ? Math.round(amountInMinor * ramp.pct) + (ramp.fixedMinor ?? 0)
      : null;
  const rampLeg: CostLeg = {
    kind: 'ramp',
    available: ramp.available,
    feeMinor: rampFeeMinor,
    source: ramp.source,
    asOf: ramp.asOf,
    detail: ramp.detail,
  };

  if (rampLeg.available) {
    caveats.push('Le spread de change appliqué par la rampe n’est pas visible dans son barème public : le montant livré réel peut être légèrement inférieur.');
  }

  const allAvailable =
    fxLeg.available && networkLeg.available && rampLeg.available && referenceAmountMinor !== null;

  let totalCostMinor: number | null = null;
  let amountDeliveredMinor: number | null = null;
  let available = false;

  if (allAvailable) {
    totalCostMinor = (networkLeg.feeMinor ?? 0) + (rampLeg.feeMinor ?? 0);
    const netInMinor = amountInMinor - totalCostMinor;
    if (netInMinor > 0) {
      try {
        const delivered = await sources.fx.quote(corridor.from, corridor.to, netInMinor, fromDigits, toDigits);
        if (delivered.kind === 'ok' && delivered.quote.amountMinorTarget > 0) {
          amountDeliveredMinor = delivered.quote.amountMinorTarget;
          available = true;
        }
      } catch {
        // delivered conversion unavailable — keep partial
      }
    }
    // Fees exceed the amount, or delivery conversion failed → not deliverable.
  }

  return {
    from: corridor.from,
    to: corridor.to,
    amountInMinor,
    referenceAmountMinor,
    legs: [fxLeg, networkLeg, rampLeg],
    totalCostMinor,
    amountDeliveredMinor,
    available,
    caveats,
  };
}

// ─── Default production sources (published, dated; swap for live later) ───────

/**
 * On-chain cost estimate. v1 carries a documented typical L2 (Base) stablecoin
 * transfer estimate — labelled as an estimate, dated, NOT a live quote. Replace
 * with a live gas oracle later by injecting a different NetworkFeeSource.
 * Source: typical L2 USDC transfer fee, ~sub-cent to a few cents (Base, 2026).
 */
export class StaticNetworkFeeSource implements NetworkFeeSource {
  // ~2 cents in FROM-currency minor units (USD/EUR have 2 digits). Conservative typical.
  private readonly typicalFeeMinor: number;
  private readonly asOf: string;

  public constructor(options: { typicalFeeMinor?: number; asOf?: string } = {}) {
    this.typicalFeeMinor = options.typicalFeeMinor ?? 2;
    this.asOf = options.asOf ?? '2026-06';
  }

  public estimate(_corridor: Corridor): NetworkFeeEstimate {
    return {
      available: true,
      feeMinor: this.typicalFeeMinor,
      source: 'l2_typical_estimate',
      asOf: this.asOf,
      detail: 'estimation L2 typique (Base), varie selon le réseau — pas un devis live',
    };
  }
}

/**
 * Off-ramp partner fees from PUBLISHED schedules (dated). A partner whose fee is
 * not publicly disclosed returns available:false — never invented.
 *   - yellow_card: ≈2% mobile money XOF withdrawal (published, 2026-06).
 *     Sources: westafricatradehub.com / cryptowisser.com Yellow Card reviews.
 *   - bitnob: schedule not publicly disclosed → unavailable until confirmed.
 */
export class PublishedRampFeeSource implements RampFeeSource {
  public fee(rampId: string, _fromCurrency: string): RampFeeQuote {
    switch (rampId) {
      case 'yellow_card':
        return {
          available: true,
          pct: 0.02,
          fixedMinor: 0,
          source: 'yellow_card_published',
          asOf: '2026-06',
          detail: '≈2% retrait mobile money (barème public estimé)',
        };
      case 'bitnob':
        return {
          available: false,
          pct: null,
          fixedMinor: null,
          source: 'bitnob',
          asOf: null,
          detail: 'barème non publié — à confirmer via API',
        };
      default:
        return {
          available: false,
          pct: null,
          fixedMinor: null,
          source: null,
          asOf: null,
          detail: 'rampe inconnue',
        };
    }
  }
}
