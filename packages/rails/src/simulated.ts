import {
  type CreatePayinRequest,
  type CreatePayinResult,
  type CreatePayoutRequest,
  type CreatePayoutResult,
  type NormalizedRailEvent,
  type RailAdapter,
  type RailCapabilities,
  type RailStatus,
  type WebhookVerdict,
  RailRejectedError,
  RailUnavailableError,
} from './types.js';

/**
 * Le rail simule.
 *
 * Ce n'est pas un bouchon de test : c'est un rail de plein droit, deterministe
 * et pilotable, qui sert a trois choses.
 *   1. Faire tourner le Cerveau AVANT d'avoir les bras. Les modules sont ecrits
 *      et eprouves contre lui pendant que PayDunya et la DGI attendent leurs
 *      acces.
 *   2. Reproduire a volonte ce qu'un vrai rail fait de pire : le timeout, le
 *      double webhook, le montant qui ne tombe pas juste, la panne.
 *   3. Faire la demo hors ligne.
 *
 * Rien n'y est aleatoire. Un scenario donne produit toujours la meme suite —
 * sans quoi un test qui echoue une fois sur dix ne prouve rien.
 */

export type SimulatedOutcome = 'succeed' | 'fail' | 'timeout' | 'expire';

export interface SimulatedScenario {
  /** Ce que devient l'operation. Par defaut : elle reussit. */
  outcome?: SimulatedOutcome | undefined;
  /** Le montant reellement passe, s'il differe du demande (frais, arrondi). */
  settledAmountMinor?: number | undefined;
  /** Le rail perd la reference : le rapprocheur devra se debrouiller. */
  dropReference?: boolean | undefined;
  /** Le numero du payeur, quand le rail le restitue. */
  payerMsisdn?: string | undefined;
  operator?: string | undefined;
}

export interface SimulatedRailOptions {
  name?: string;
  /** Horloge injectee : un test ne depend pas de l'heure qu'il est. */
  now?: () => Date;
  /** Le rail est en panne : toute demande est refusee proprement. */
  down?: boolean;
}

interface SimulatedOp {
  railRef: string;
  operation: 'payin' | 'payout';
  amountMinor: number;
  reference?: string | undefined;
  status: RailStatus;
  scenario: SimulatedScenario;
  createdAt: Date;
}

export class SimulatedRail implements RailAdapter {
  readonly name: string;
  private readonly now: () => Date;
  private down: boolean;

  /** Les operations vues, par railRef. */
  private readonly ops = new Map<string, SimulatedOp>();
  /** Les cles d'idempotence deja honorees : rejouer rend le meme resultat. */
  private readonly byIdempotency = new Map<string, string>();
  /** Le scenario a appliquer a la prochaine operation portant cette reference. */
  private readonly scenarios = new Map<string, SimulatedScenario>();
  private counter = 0;

  constructor(options: SimulatedRailOptions = {}) {
    this.name = options.name ?? 'sim';
    this.now = options.now ?? (() => new Date());
    this.down = options.down ?? false;
  }

  // ── pilotage par les tests ───────────────────────────────────────────────

  /** Programme ce qui arrivera a l'operation portant cette reference. */
  program(reference: string, scenario: SimulatedScenario): void {
    this.scenarios.set(reference, scenario);
  }

  setDown(down: boolean): void {
    this.down = down;
  }

  /** Fabrique le webhook que le rail enverrait pour cette operation. */
  webhookFor(railRef: string, options: { attempt?: number } = {}): unknown {
    const op = this.ops.get(railRef);
    if (!op) throw new Error(`SimulatedRail : railRef inconnu ${railRef}`);
    const settled = op.scenario.settledAmountMinor ?? op.amountMinor;
    return {
      rail: this.name,
      operation: op.operation,
      rail_ref: railRef,
      status: op.status,
      amount_minor: settled,
      reference: op.scenario.dropReference ? undefined : op.reference,
      payer_msisdn: op.scenario.payerMsisdn,
      operator: op.scenario.operator,
      occurred_at: op.createdAt.toISOString(),
      /* Le meme evenement peut arriver plusieurs fois. C'est la cle de dedup
         qui le dit, pas le nombre de tentatives : deux livraisons du meme
         evenement portent la MEME cle. */
      delivery_attempt: options.attempt ?? 1,
    };
  }

  // ── le contrat RailAdapter ───────────────────────────────────────────────

  capabilities(): RailCapabilities {
    return {
      payin: true,
      payout: true,
      operators: ['orange-money-ci', 'wave-ci', 'mtn-ci', 'moov-ci', 'djamo-ci'],
    };
  }

  async createPayin(req: CreatePayinRequest): Promise<CreatePayinResult> {
    this.guard();
    const existing = this.replay(req.idempotencyKey);
    if (existing) return { railRef: existing, checkoutUrl: this.checkoutUrl(existing) };
    if (req.amountMinor <= 0) {
      throw new RailRejectedError(this.name, 'montant nul ou negatif');
    }
    const railRef = this.mint('in');
    const scenario = this.scenarios.get(req.reference) ?? {};
    this.ops.set(railRef, {
      railRef,
      operation: 'payin',
      amountMinor: req.amountMinor,
      reference: req.reference,
      status: this.statusFor(scenario),
      scenario,
      createdAt: this.now(),
    });
    this.byIdempotency.set(req.idempotencyKey, railRef);
    return { railRef, checkoutUrl: this.checkoutUrl(railRef) };
  }

  async createPayout(req: CreatePayoutRequest): Promise<CreatePayoutResult> {
    this.guard();
    const existing = this.replay(req.idempotencyKey);
    if (existing) return { railRef: existing };
    if (req.amountMinor <= 0) {
      throw new RailRejectedError(this.name, 'montant nul ou negatif');
    }
    if (!req.destination.value) {
      throw new RailRejectedError(this.name, 'destination vide');
    }
    const railRef = this.mint('out');
    const scenario = req.reference ? (this.scenarios.get(req.reference) ?? {}) : {};
    this.ops.set(railRef, {
      railRef,
      operation: 'payout',
      amountMinor: req.amountMinor,
      reference: req.reference,
      status: this.statusFor(scenario),
      scenario,
      createdAt: this.now(),
    });
    this.byIdempotency.set(req.idempotencyKey, railRef);
    return { railRef };
  }

  async getStatus(railRef: string): Promise<RailStatus> {
    const op = this.ops.get(railRef);
    if (!op) throw new RailRejectedError(this.name, `railRef inconnu ${railRef}`);
    return op.status;
  }

  verifyWebhook(headers: unknown, body: unknown): WebhookVerdict {
    const h = (headers ?? {}) as Record<string, unknown>;
    /* Le rail simule signe avec un en-tete constant. Un webhook non signe est
       refuse comme le ferait un vrai rail : on ne traite pas ce qu'on n'a pas
       authentifie. */
    if (h['x-sim-signature'] !== 'sim') {
      return { valid: false, reason: 'signature absente ou invalide' };
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const railRef = typeof b.rail_ref === 'string' ? b.rail_ref : undefined;
    if (!railRef) return { valid: false, reason: 'rail_ref absent' };
    const amount = typeof b.amount_minor === 'number' ? b.amount_minor : 0;
    const occurredAt =
      typeof b.occurred_at === 'string' ? new Date(b.occurred_at) : this.now();
    const event: NormalizedRailEvent = {
      rail: this.name,
      operation: b.operation === 'payout' ? 'payout' : 'payin',
      railRef,
      status: this.readStatus(b.status),
      amountMinor: amount,
      reference: typeof b.reference === 'string' ? b.reference : undefined,
      payerMsisdn: typeof b.payer_msisdn === 'string' ? b.payer_msisdn : undefined,
      operator: typeof b.operator === 'string' ? b.operator : undefined,
      occurredAt,
      /* La cle de dedup NE contient PAS le numero de tentative : deux
         livraisons du meme evenement doivent se reduire a une. */
      dedupeKey: `${this.name}:${railRef}:${b.status}`,
    };
    return { valid: true, event };
  }

  // ── interne ──────────────────────────────────────────────────────────────

  private guard(): void {
    if (this.down) {
      throw new RailUnavailableError(this.name, 'rail simule declare en panne');
    }
  }

  private replay(idempotencyKey: string): string | undefined {
    return this.byIdempotency.get(idempotencyKey);
  }

  private mint(prefix: string): string {
    this.counter += 1;
    return `${this.name}-${prefix}-${String(this.counter).padStart(6, '0')}`;
  }

  private checkoutUrl(railRef: string): string {
    return `https://simulated.local/checkout/${railRef}`;
  }

  private statusFor(scenario: SimulatedScenario): RailStatus {
    switch (scenario.outcome) {
      case 'fail':
        return 'failed';
      case 'expire':
        return 'expired';
      case 'timeout':
        /* Un timeout n'est PAS un echec : l'operation est peut-etre passee.
           Elle reste pending, et c'est au routeur de la relancer. */
        return 'pending';
      default:
        return 'succeeded';
    }
  }

  private readStatus(value: unknown): RailStatus {
    return value === 'failed' || value === 'expired' || value === 'pending'
      ? value
      : 'succeeded';
  }
}
