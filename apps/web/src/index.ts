import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState,
  type BuyerSafeCheckoutStatus,
  type CheckoutSessionState,
  type PayerBankLauncherOption,
  type ReceiverBankOption
} from '@swimpay/contracts';

export type CheckoutStatus =
  | 'created'
  | 'receiver_arming'
  | 'receiver_armed'
  | 'payment_instructions_shown'
  | 'awaiting_payment'
  | 'buyer_claimed_paid'
  | 'signal_detected'
  | 'matching'
  | 'needs_review'
  | 'auto_confirmed'
  | 'manual_confirmed'
  | 'fulfilled'
  | 'rejected'
  | 'expired';

export interface CheckoutSession {
  payment_session_id: string;
  order_id: string;
  status: CheckoutStatus;
  checkout_state?: CheckoutSessionState | undefined;
  buyer_safe_status?: BuyerSafeCheckoutStatus | undefined;
  selected_receiver_bank_id?: string | undefined;
  selected_receiver_bank_profile_id?: string | undefined;
  selected_payer_bank_launcher_id?: string | undefined;
  payment_instructions_shown_at?: string | undefined;
  buyer_claimed_paid_at?: string | undefined;
  official_bank_confirmation?: false | undefined;
  amount: {
    value: string;
    currency: string;
  };
  reference: string;
  receiver_status: string;
  expires_at: string;
  product_name?: string | undefined;
}

export interface CheckoutSessionProvider {
  getCheckoutSession(paymentSessionId: string): Promise<CheckoutSession | null>;
  getReceiverBanks(paymentSessionId: string): Promise<ReceiverBanksPayload>;
  selectReceiverBank(paymentSessionId: string, receiverBankId: string): Promise<CheckoutSession>;
  getPayerBankLaunchers(paymentSessionId: string): Promise<PayerBankLaunchersPayload>;
  selectPayerBankLauncher(paymentSessionId: string, payerBankLauncherId: string): Promise<CheckoutSession>;
  markPaymentInstructionsShown(paymentSessionId: string): Promise<CheckoutSession>;
  markBuyerClaimedPaid(paymentSessionId: string): Promise<CheckoutClaimedPaidResponse>;
}

export interface WebServerOptions {
  environment: string;
  checkoutSessionProvider?: CheckoutSessionProvider | undefined;
  adminEvidenceClient?: AdminEvidenceClient | undefined;
  recipient?: CheckoutRecipient | undefined;
}

export interface AdminEvidenceClient {
  getDashboard(): Promise<BankEvidenceDashboard>;
  getAuditEvents(): Promise<AdminAuditEvent[]>;
}

export interface BankEvidenceDashboard {
  total_count?: number | undefined;
  counts_by_status?: Record<string, number> | undefined;
  review_queue?: BankEvidenceRow[] | undefined;
  recent_evidence?: BankEvidenceRow[] | undefined;
  next_actions?: string[] | undefined;
  safety?: {
    trusted?: boolean | undefined;
    production_trust_requested?: boolean | undefined;
    auto_confirm_enabled?: boolean | undefined;
  } | undefined;
}

export interface BankEvidenceRow {
  evidence_id?: string | undefined;
  bank_profile_id?: string | undefined;
  package_name?: string | undefined;
  cert_sha256?: string | undefined;
  cert_sha256_masked?: string | undefined;
  app_version?: string | undefined;
  install_source?: string | undefined;
  source?: string | undefined;
  status?: string | undefined;
  production_trust_status?: string | undefined;
  trusted?: boolean | undefined;
  auto_confirm_enabled?: boolean | undefined;
  submitted_at?: string | undefined;
  created_at?: string | undefined;
  reviewed_at?: string | undefined;
  reviewed_by?: string | undefined;
  requested_by?: string | undefined;
  requested_at?: string | undefined;
}

export interface AdminAuditEvent {
  auditEventId?: string | undefined;
  eventType?: string | undefined;
  objectType?: string | undefined;
  objectId?: string | undefined;
  actorId?: string | undefined;
  payloadRedacted?: Record<string, unknown> | undefined;
  occurredAt?: string | undefined;
  createdAt?: string | undefined;
}

interface CheckoutRecipient {
  name: string;
  bank: string;
  accountMasked: string;
}

interface CheckoutStatusResponse {
  payment_session_id: string;
  order_id: string;
  status: CheckoutStatus;
  checkout_state: CheckoutSessionState;
  buyer_safe_status: BuyerSafeCheckoutStatus;
  display_status: string;
  result_state: 'pending' | 'review' | 'recognized' | 'rejected' | 'expired';
  amount: {
    value: string;
    currency: string;
  };
  reference: string;
  expires_at: string;
  official_bank_confirmation: false;
}

interface ReceiverBanksPayload {
  payment_session_id: string;
  receiver_banks: readonly ReceiverBankOption[];
}

interface PayerBankLaunchersPayload {
  payment_session_id: string;
  payer_bank_launchers: readonly PayerBankLauncherOption[];
}

interface CheckoutClaimedPaidResponse {
  payment_session_id: string;
  buyer_claimed_paid: true;
  does_not_confirm_payment: true;
  next_status: string;
  status?: CheckoutStatus | undefined;
  checkout_state?: CheckoutSessionState | undefined;
  buyer_safe_status?: BuyerSafeCheckoutStatus | undefined;
  official_bank_confirmation?: false | undefined;
}

const defaultRecipient: CheckoutRecipient = {
  name: 'Compte marchand',
  bank: 'Banque du marchand',
  accountMasked: '**** 0000'
};

export function buildWebServer(options: WebServerOptions): FastifyInstance {
  const server = Fastify({ logger: true });
  const checkoutSessionProvider =
    options.checkoutSessionProvider ?? new ApiCheckoutSessionProvider(process.env.API_BASE_URL ?? 'http://localhost:3000');
  const adminEvidenceClient =
    options.adminEvidenceClient ??
    new ApiAdminEvidenceClient(
      process.env.API_BASE_URL ?? 'http://localhost:3000',
      process.env.SWIMPAY_ADMIN_TOKEN ?? process.env.DEV_ADMIN_TOKEN ?? 'change_me_local_admin_token'
    );
  const recipient = options.recipient ?? defaultRecipient;

  server.get('/health', async () => ({
    service: 'swimpay-web',
    version: '0.1.0',
    environment: options.environment
  }));

  server.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderHomePage();
  });

  server.get('/checkout/:paymentSessionId', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    const [session, receiverBanks, payerBankLaunchers] = await Promise.all([
      checkoutSessionProvider.getCheckoutSession(paymentSessionId),
      checkoutSessionProvider.getReceiverBanks(paymentSessionId),
      checkoutSessionProvider.getPayerBankLaunchers(paymentSessionId)
    ]);
    if (!session) {
      return reply.status(404).send({ error: { code: 'not_found', message: 'Checkout session was not found.' } });
    }

    reply.type('text/html; charset=utf-8');
    return renderCheckoutPage(session, recipient, receiverBanks.receiver_banks, payerBankLaunchers.payer_bank_launchers);
  });

  server.get('/checkout/:paymentSessionId/receiver-banks', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    return reply.status(200).send(await checkoutSessionProvider.getReceiverBanks(paymentSessionId));
  });

  server.post('/checkout/:paymentSessionId/receiver-bank', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const body = request.body as { receiver_bank_id?: string } | undefined;
    const paymentSessionId = params.paymentSessionId;
    const receiverBankId = body?.receiver_bank_id;
    if (!paymentSessionId || !receiverBankId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Receiver bank id is required.' } });
    }

    return reply.status(200).send(toCheckoutStatusResponse(await checkoutSessionProvider.selectReceiverBank(paymentSessionId, receiverBankId)));
  });

  server.get('/checkout/:paymentSessionId/payer-bank-launchers', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    return reply.status(200).send(await checkoutSessionProvider.getPayerBankLaunchers(paymentSessionId));
  });

  server.post('/checkout/:paymentSessionId/payer-bank-launcher', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const body = request.body as { payer_bank_launcher_id?: string } | undefined;
    const paymentSessionId = params.paymentSessionId;
    const payerBankLauncherId = body?.payer_bank_launcher_id;
    if (!paymentSessionId || !payerBankLauncherId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payer bank launcher id is required.' } });
    }

    return reply.status(200).send(
      toCheckoutStatusResponse(await checkoutSessionProvider.selectPayerBankLauncher(paymentSessionId, payerBankLauncherId))
    );
  });

  server.get('/checkout/:paymentSessionId/status', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    const session = await checkoutSessionProvider.getCheckoutSession(paymentSessionId);
    if (!session) {
      return reply.status(404).send({ error: { code: 'not_found', message: 'Checkout session was not found.' } });
    }

    return reply.status(200).send(toCheckoutStatusResponse(session));
  });

  server.get('/admin/evidence-review', async (_request, reply) => {
    try {
      const [dashboard, auditEvents] = await Promise.all([
        adminEvidenceClient.getDashboard(),
        adminEvidenceClient.getAuditEvents()
      ]);
      reply.type('text/html; charset=utf-8');
      return renderEvidenceReviewPage(dashboard, auditEvents);
    } catch {
      reply.status(503).type('text/html; charset=utf-8');
      return renderEvidenceUnavailablePage();
    }
  });

  server.post('/checkout/:paymentSessionId/payment-instructions-shown', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    return reply.status(200).send(toCheckoutStatusResponse(await checkoutSessionProvider.markPaymentInstructionsShown(paymentSessionId)));
  });

  server.post('/checkout/:paymentSessionId/claimed-paid', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    return reply.status(202).send(await checkoutSessionProvider.markBuyerClaimedPaid(paymentSessionId));
  });

  return server;
}

export class ApiCheckoutSessionProvider implements CheckoutSessionProvider {
  public constructor(private readonly apiBaseUrl: string) {}

  public async getCheckoutSession(paymentSessionId: string): Promise<CheckoutSession | null> {
    const response = await this.fetchApi(`/v1/payment-sessions/${encodeURIComponent(paymentSessionId)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Checkout session API returned ${response.status}`);
    }

    return (await response.json()) as CheckoutSession;
  }

  public async getReceiverBanks(paymentSessionId: string): Promise<ReceiverBanksPayload> {
    return this.fetchJson<ReceiverBanksPayload>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/receiver-banks`);
  }

  public async selectReceiverBank(paymentSessionId: string, receiverBankId: string): Promise<CheckoutSession> {
    return this.fetchJson<CheckoutSession>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/receiver-bank`, {
      method: 'POST',
      body: JSON.stringify({ receiver_bank_id: receiverBankId })
    });
  }

  public async getPayerBankLaunchers(paymentSessionId: string): Promise<PayerBankLaunchersPayload> {
    return this.fetchJson<PayerBankLaunchersPayload>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/payer-bank-launchers`);
  }

  public async selectPayerBankLauncher(paymentSessionId: string, payerBankLauncherId: string): Promise<CheckoutSession> {
    return this.fetchJson<CheckoutSession>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/payer-bank-launcher`, {
      method: 'POST',
      body: JSON.stringify({ payer_bank_launcher_id: payerBankLauncherId })
    });
  }

  public async markPaymentInstructionsShown(paymentSessionId: string): Promise<CheckoutSession> {
    return this.fetchJson<CheckoutSession>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/payment-instructions-shown`, {
      method: 'POST'
    });
  }

  public async markBuyerClaimedPaid(paymentSessionId: string): Promise<CheckoutClaimedPaidResponse> {
    return this.fetchJson<CheckoutClaimedPaidResponse>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/claimed-paid`, {
      method: 'POST'
    });
  }

  private async fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchApi(path, init);
    if (!response.ok) {
      throw new Error(`Checkout API returned ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private async fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer test_${process.env.CHECKOUT_MERCHANT_ID ?? 'mch_dev'}`);
    return fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  }
}

export class ApiAdminEvidenceClient implements AdminEvidenceClient {
  public constructor(
    private readonly apiBaseUrl: string,
    private readonly adminToken: string
  ) {}

  public async getDashboard(): Promise<BankEvidenceDashboard> {
    return this.fetchJson<BankEvidenceDashboard>('/v1/admin/bank-evidence/review-dashboard');
  }

  public async getAuditEvents(): Promise<AdminAuditEvent[]> {
    const payload = await this.fetchJson<{ audit_events?: AdminAuditEvent[] }>('/v1/admin/audit-events?object_type=bank_package_evidence');
    return payload.audit_events ?? [];
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${this.adminToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Admin evidence API returned ${response.status}`);
    }

    return (await response.json()) as T;
  }
}

export function toCheckoutStatusResponse(session: CheckoutSession): CheckoutStatusResponse {
  const status = mapCheckoutStatus(session.status);
  const checkoutState = session.checkout_state ?? inferCheckoutState(session);
  return {
    payment_session_id: session.payment_session_id,
    order_id: session.order_id,
    status: session.status,
    checkout_state: checkoutState,
    buyer_safe_status: session.buyer_safe_status ?? mapCheckoutStateToBuyerSafeStatus(checkoutState),
    display_status: status.displayStatus,
    result_state: status.resultState,
    amount: session.amount,
    reference: session.reference,
    expires_at: session.expires_at,
    official_bank_confirmation: false
  };
}

function renderEvidenceReviewPage(dashboard: BankEvidenceDashboard, auditEvents: AdminAuditEvent[]): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Evidence operator review - SwimPay</title>',
    baseStyles(),
    evidenceStyles(),
    '</head>',
    '<body>',
    '<main class="admin-shell">',
    '<section class="admin-header" aria-labelledby="evidence-title">',
    '<p class="eyebrow">Operator evidence workflow</p>',
    '<h1 id="evidence-title">Evidence operator review</h1>',
    '<p class="safe-copy">Review-only evidence is not production trust. Auto-confirm remains disabled. Production trust requires dual-control.</p>',
    '</section>',
    '<section class="safety-strip" aria-label="Evidence safety state">',
    safetyChip('trusted', false),
    safetyChip('auto_confirm_enabled', false),
    safetyChip('metadata_trust_requires_dual_control', true),
    '</section>',
    renderEvidenceCounts(dashboard.counts_by_status ?? {}),
    '<section class="admin-section" aria-labelledby="review-queue-title">',
    '<h2 id="review-queue-title">Review queue</h2>',
    renderEvidenceTable(dashboard.review_queue ?? []),
    '</section>',
    '<section class="admin-section" aria-labelledby="recent-evidence-title">',
    '<h2 id="recent-evidence-title">Recent evidence</h2>',
    renderEvidenceTable(dashboard.recent_evidence ?? []),
    '</section>',
    '<section class="admin-section" aria-labelledby="audit-trace-title">',
    '<h2 id="audit-trace-title">Production trust audit drill</h2>',
    '<p class="help">Audit traces below are redacted. A production trust request still needs a different approving actor.</p>',
    renderAuditTable(auditEvents),
    '</section>',
    '</main>',
    '</body>',
    '</html>'
  ].join('');
}

function renderEvidenceUnavailablePage(): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Evidence API unavailable - SwimPay</title>',
    baseStyles(),
    evidenceStyles(),
    '</head>',
    '<body>',
    '<main class="admin-shell">',
    '<section class="admin-header" aria-labelledby="evidence-unavailable-title">',
    '<p class="eyebrow">Operator evidence workflow</p>',
    '<h1 id="evidence-unavailable-title">Evidence API unavailable</h1>',
    '<p class="safe-copy">Check local backend health and admin token configuration.</p>',
    '</section>',
    '<section class="safety-strip" aria-label="Evidence safety state">',
    safetyChip('trusted', false),
    safetyChip('auto_confirm_enabled', false),
    safetyChip('no_sensitive_payload_displayed', true),
    '</section>',
    '</main>',
    '</body>',
    '</html>'
  ].join('');
}

function renderHomePage(): string {
  return [
    '<!doctype html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>SwimPay</title>',
    baseStyles(),
    '</head>',
    '<body>',
    '<main class="shell">',
    '<h1>SwimPay</h1>',
    '<p>Payment Signal Engine foundation.</p>',
    '</main>',
    '</body>',
    '</html>'
  ].join('');
}

function renderEvidenceCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    return '<section class="metric-grid" aria-label="Evidence status counts"><div class="metric"><span>No status counts</span><strong>0</strong></div></section>';
  }

  return [
    '<section class="metric-grid" aria-label="Evidence status counts">',
    ...entries.map(([status, count]) => `<div class="metric"><span>${escapeHtml(status)}</span><strong>${escapeHtml(String(count))}</strong></div>`),
    '</section>'
  ].join('');
}

function renderEvidenceTable(rows: BankEvidenceRow[]): string {
  if (rows.length === 0) {
    return '<p class="empty-state">No evidence rows in this view.</p>';
  }

  return [
    '<div class="table-wrap"><table>',
    '<thead><tr><th>Evidence</th><th>Bank profile</th><th>Package</th><th>Cert</th><th>Status</th><th>Trust</th><th>Submitted</th></tr></thead>',
    '<tbody>',
    ...rows.map((item) =>
      [
        '<tr>',
        `<td>${escapeHtml(item.evidence_id ?? 'unknown')}</td>`,
        `<td>${escapeHtml(item.bank_profile_id ?? 'unknown')}</td>`,
        `<td>${escapeHtml(item.package_name ?? 'unknown')}</td>`,
        `<td>${escapeHtml(safeCertificateDisplay(item))}</td>`,
        `<td>${statusBadge(item.status ?? 'unknown')}<span class="subtle">${escapeHtml(item.production_trust_status ?? 'not_requested')}</span></td>`,
        `<td>${escapeHtml(trustDisplay(item))}</td>`,
        `<td>${escapeHtml(item.submitted_at ?? item.created_at ?? 'unknown')}</td>`,
        '</tr>'
      ].join('')
    ),
    '</tbody>',
    '</table></div>'
  ].join('');
}

function renderAuditTable(events: AdminAuditEvent[]): string {
  if (events.length === 0) {
    return '<p class="empty-state">No evidence audit events found.</p>';
  }

  return [
    '<div class="table-wrap"><table>',
    '<thead><tr><th>Event</th><th>Object</th><th>Actor</th><th>Cert</th><th>Safety</th><th>Created</th></tr></thead>',
    '<tbody>',
    ...events.map((event) =>
      [
        '<tr>',
        `<td>${escapeHtml(event.eventType ?? 'unknown')}</td>`,
        `<td>${escapeHtml(event.objectId ?? 'unknown')}</td>`,
        `<td>${escapeHtml(event.actorId ?? 'unknown')}</td>`,
        `<td>${escapeHtml(maskedPayloadCert(event.payloadRedacted))}</td>`,
        `<td>${escapeHtml(auditSafetyDisplay(event.payloadRedacted))}</td>`,
        `<td>${escapeHtml(event.createdAt ?? event.occurredAt ?? 'unknown')}</td>`,
        '</tr>'
      ].join('')
    ),
    '</tbody>',
    '</table></div>'
  ].join('');
}

function safetyChip(label: string, value: boolean): string {
  return `<div class="safety-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function statusChip(label: string, value: string): string {
  return `<div class="status-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function statusBadge(status: string): string {
  return `<span class="status-badge">${escapeHtml(status)}</span>`;
}

function safeCertificateDisplay(item: BankEvidenceRow): string {
  if (item.cert_sha256_masked && !isFullSha256(item.cert_sha256_masked)) {
    return item.cert_sha256_masked;
  }

  return '[masked]';
}

function maskedPayloadCert(payload: Record<string, unknown> | undefined): string {
  const candidate = typeof payload?.cert_sha256_masked === 'string' ? payload.cert_sha256_masked : undefined;
  if (candidate && !isFullSha256(candidate)) {
    return candidate;
  }

  return '[masked]';
}

function trustDisplay(item: BankEvidenceRow): string {
  return `trusted=${String(item.trusted === true)} auto_confirm_enabled=${String(item.auto_confirm_enabled === true)}`;
}

function auditSafetyDisplay(payload: Record<string, unknown> | undefined): string {
  const trusted = payload?.trusted === true;
  const autoConfirm = payload?.auto_confirm_enabled === true;
  return `trusted=${String(trusted)} auto_confirm_enabled=${String(autoConfirm)}`;
}

function isFullSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function renderCheckoutPage(
  session: CheckoutSession,
  recipient: CheckoutRecipient,
  receiverBanks: readonly ReceiverBankOption[],
  payerBankLaunchers: readonly PayerBankLauncherOption[]
): string {
  const status = mapCheckoutStatus(session.status);
  const amount = `${escapeHtml(session.amount.value)} ${escapeHtml(session.amount.currency)}`;
  const productName = escapeHtml(session.product_name ?? 'Commande SwimPay');
  const reference = escapeHtml(session.reference);
  const sessionId = escapeHtml(session.payment_session_id);
  const checkoutState = session.checkout_state ?? inferCheckoutState(session);
  const buyerSafeStatus = session.buyer_safe_status ?? mapCheckoutStateToBuyerSafeStatus(checkoutState);
  const selectedLauncher = payerBankLaunchers.find((launcher) => launcher.payer_bank_launcher_id === session.selected_payer_bank_launcher_id);

  return [
    '<!doctype html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${productName} - SwimPay</title>`,
    baseStyles(),
    '</head>',
    '<body>',
    '<main class="checkout-shell">',
    '<section class="checkout-header" aria-labelledby="checkout-title">',
    `<p class="eyebrow">Pay with SwimPay</p>`,
    `<h1 id="checkout-title">${productName}</h1>`,
    '<p class="safe-copy">SwimPay recherchera le signal de paiement côté marchand.</p>',
    '<p class="help">SwimPay aide le marchand à reconnaître un signal de notification. Ce n’est pas une confirmation officielle de banque.</p>',
    '</section>',
    '<section class="checkout-state" aria-label="Etat du checkout">',
    statusChip('Etape', checkoutState),
    statusChip('Statut acheteur', buyerSafeStatus),
    statusChip('Confirmation officielle banque', 'false'),
    '</section>',
    '<section class="checkout-grid" aria-label="Parcours de paiement">',
    renderStep('1', 'Choisir la banque du marchand', [
      '<p class="help">La banque de réception détermine où SwimPay cherchera le signal côté marchand. Toutes les banques V1 restent en review beta.</p>',
      renderReceiverBankOptions(receiverBanks, session.selected_receiver_bank_id)
    ]),
    renderStep('2', 'Choisir votre app bancaire', [
      '<p class="help">Cette étape sert uniquement à vous aider à ouvrir ou retrouver votre banque. Elle ne prouve pas le paiement.</p>',
      renderPayerLauncherOptions(payerBankLaunchers, session.selected_payer_bank_launcher_id)
    ]),
    renderStep('3', 'Résumé', [
      row('Montant exact', amount),
      row('Methode', 'Transfert bancaire'),
      row('Statut', status.displayStatus),
      `<p class="timer" data-expires-at="${escapeHtml(session.expires_at)}">Temps restant: <span id="countdown">calcul...</span></p>`
    ]),
    renderStep('4', 'Identité acheteur', [
      '<label class="field-label" for="buyer-phone">Numero utilise dans votre app bancaire</label>',
      '<input id="buyer-phone" class="input" name="buyer-phone" inputmode="tel" autocomplete="tel" placeholder="+7 *** *** **67">',
      '<p class="help">Ce numero sert uniquement a reconnaitre votre paiement. SwimPay ne lit pas votre telephone et ne se connecte pas a votre banque.</p>',
      '<label class="field-label" for="buyer-name">Nom/prenom utilise dans la banque</label>',
      '<input id="buyer-name" class="input" name="buyer-name" autocomplete="name" placeholder="Optionnel">'
    ]),
    renderStep('5', 'Instructions de paiement', [
      row('Destinataire', escapeHtml(recipient.name)),
      row('Banque', escapeHtml(recipient.bank)),
      row('Compte', escapeHtml(recipient.accountMasked)),
      row('Montant', amount),
      row('Reference', reference),
      `<button class="button secondary" type="button" data-copy="${amount}">Copier le montant</button>`,
      `<button class="button secondary" type="button" data-copy="${reference}">Copier la reference</button>`,
      renderOpenBankAction(selectedLauncher),
      `<button id="paid-button" class="button primary" type="button" data-session-id="${sessionId}" data-does-not-confirm="true">J&#39;ai paye</button>`,
      '<p class="help">Ce bouton signale seulement que vous avez lancé le transfert. Il ne valide pas le paiement.</p>'
    ]),
    renderStep('6', 'Attente du signal', [
      `<p id="status-text" class="status-pill" data-status="${session.status}">${status.displayStatus}</p>`,
      '<p class="help">Le statut vient du backend SwimPay et peut demander une verification manuelle.</p>'
    ]),
    renderStep('7', 'Résultat', [
      `<p id="result-text">${resultText(status.resultState)}</p>`
    ]),
    '</section>',
    '</main>',
    checkoutScript(sessionId),
    '</body>',
    '</html>'
  ].join('');
}

function renderReceiverBankOptions(receiverBanks: readonly ReceiverBankOption[], selectedReceiverBankId: string | undefined): string {
  return [
    '<div class="option-list" data-option-list="receiver-bank">',
    ...receiverBanks.map((bank) =>
      [
        `<button class="option-button${bank.receiver_bank_id === selectedReceiverBankId ? ' selected' : ''}" type="button" data-receiver-bank-id="${escapeHtml(bank.receiver_bank_id)}">`,
        `<strong>${escapeHtml(bank.display_name)}</strong>`,
        `<span>${escapeHtml(bank.status)} · review_only=${escapeHtml(String(bank.review_only))}</span>`,
        `<small>detection_supported=${escapeHtml(String(bank.detection_supported))} auto_confirm=false</small>`,
        '</button>'
      ].join('')
    ),
    '</div>'
  ].join('');
}

function renderPayerLauncherOptions(payerBankLaunchers: readonly PayerBankLauncherOption[], selectedLauncherId: string | undefined): string {
  return [
    '<div class="option-list" data-option-list="payer-launcher">',
    ...payerBankLaunchers.map((launcher) =>
      [
        `<button class="option-button${launcher.payer_bank_launcher_id === selectedLauncherId ? ' selected' : ''}" type="button" data-payer-bank-launcher-id="${escapeHtml(launcher.payer_bank_launcher_id)}">`,
        `<strong>${escapeHtml(launcher.display_name)}</strong>`,
        `<span>${escapeHtml(launcher.fallback_strategy)} · does_not_confirm_payment=${escapeHtml(String(launcher.does_not_confirm_payment))}</span>`,
        `<small>${escapeHtml(launcher.android_package_hint ?? 'instructions manuelles')}</small>`,
        '</button>'
      ].join('')
    ),
    '</div>'
  ].join('');
}

function renderOpenBankAction(launcher: PayerBankLauncherOption | undefined): string {
  if (launcher?.launch_url) {
    return `<a class="button secondary" href="${escapeHtml(launcher.launch_url)}" rel="noopener">Ouvrir ${escapeHtml(launcher.display_name)}</a>`;
  }

  const label = launcher ? `Ouvrir ${escapeHtml(launcher.display_name)}` : "Ouvrir l'app bancaire";
  return `<button class="button secondary" type="button" aria-disabled="true" data-manual-fallback="true">${label}</button><p class="help">Ouverture automatique non garantie. Copiez le montant et la référence puis payez manuellement dans votre banque.</p>`;
}

function renderStep(index: string, title: string, children: string[]): string {
  return `<article class="step"><div class="step-index">${index}</div><div><h2>${title}</h2>${children.join('')}</div></article>`;
}

function row(label: string, value: string): string {
  return `<div class="row"><span>${label}</span><strong>${value}</strong></div>`;
}

function inferCheckoutState(session: CheckoutSession): CheckoutSessionState {
  if (session.status === 'payment_instructions_shown') {
    return 'payment_instructions';
  }
  if (session.status === 'fulfilled') {
    return 'confirmed';
  }

  return mapPaymentSessionToCheckoutState({
    paymentSessionStatus: session.status,
    selectedReceiverBankId: session.selected_receiver_bank_id,
    selectedPayerBankLauncherId: session.selected_payer_bank_launcher_id,
    paymentInstructionsShownAt: session.payment_instructions_shown_at
  });
}

function mapCheckoutStatus(status: CheckoutStatus): {
  displayStatus: string;
  resultState: CheckoutStatusResponse['result_state'];
} {
  switch (status) {
    case 'buyer_claimed_paid':
      return { displayStatus: 'Recherche du signal bancaire', resultState: 'pending' };
    case 'signal_detected':
      return { displayStatus: 'Signal detecte', resultState: 'pending' };
    case 'matching':
      return { displayStatus: 'Verification SwimPay', resultState: 'pending' };
    case 'needs_review':
      return { displayStatus: 'Verification manuelle necessaire', resultState: 'review' };
    case 'auto_confirmed':
    case 'manual_confirmed':
    case 'fulfilled':
      return { displayStatus: 'Paiement reconnu', resultState: 'recognized' };
    case 'rejected':
      return { displayStatus: 'Paiement non reconnu', resultState: 'rejected' };
    case 'expired':
      return { displayStatus: 'Commande expiree', resultState: 'expired' };
    case 'created':
    case 'receiver_arming':
    case 'receiver_armed':
    case 'payment_instructions_shown':
    case 'awaiting_payment':
      return { displayStatus: 'En attente du transfert', resultState: 'pending' };
  }
}

function resultText(resultState: CheckoutStatusResponse['result_state']): string {
  switch (resultState) {
    case 'recognized':
      return 'Paiement reconnu par SwimPay après la politique de revue du marchand.';
    case 'review':
      return 'Paiement en verification. Le marchand doit valider ce paiement.';
    case 'expired':
      return 'Commande expiree. Creez une nouvelle commande avant de payer.';
    case 'rejected':
      return 'Paiement non reconnu. Contactez le marchand si vous avez deja effectue le transfert.';
    case 'pending':
      return 'En attente du signal de reception cote marchand.';
  }
}

function checkoutScript(sessionId: string): string {
  return `<script>
const sessionId = ${JSON.stringify(sessionId)};
const statusText = document.getElementById('status-text');
const resultText = document.getElementById('result-text');
const countdown = document.getElementById('countdown');
const paidButton = document.getElementById('paid-button');
const timer = document.querySelector('[data-expires-at]');

function resultCopy(state) {
  if (state === 'recognized') return 'Paiement reconnu par SwimPay après la politique de revue du marchand.';
  if (state === 'review') return 'Paiement en verification. Le marchand doit valider ce paiement.';
  if (state === 'expired') return 'Commande expiree. Creez une nouvelle commande avant de payer.';
  if (state === 'rejected') return 'Paiement non reconnu. Contactez le marchand si vous avez deja effectue le transfert.';
  return 'En attente du signal de reception cote marchand.';
}

async function pollStatus() {
  const response = await fetch('/checkout/' + encodeURIComponent(sessionId) + '/status');
  if (!response.ok) return;
  const payload = await response.json();
  statusText.textContent = payload.display_status;
  statusText.dataset.status = payload.status;
  resultText.textContent = resultCopy(payload.result_state);
}

function tick() {
  if (!timer || !countdown) return;
  const expiresAt = new Date(timer.dataset.expiresAt).getTime();
  const remaining = Math.max(0, expiresAt - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  countdown.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(button.dataset.copy || '');
    await fetch('/checkout/' + encodeURIComponent(sessionId) + '/payment-instructions-shown', { method: 'POST' });
  });
});

document.querySelectorAll('[data-receiver-bank-id]').forEach((button) => {
  button.addEventListener('click', async () => {
    await fetch('/checkout/' + encodeURIComponent(sessionId) + '/receiver-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_bank_id: button.dataset.receiverBankId })
    });
    window.location.reload();
  });
});

document.querySelectorAll('[data-payer-bank-launcher-id]').forEach((button) => {
  button.addEventListener('click', async () => {
    await fetch('/checkout/' + encodeURIComponent(sessionId) + '/payer-bank-launcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payer_bank_launcher_id: button.dataset.payerBankLauncherId })
    });
    window.location.reload();
  });
});

paidButton?.addEventListener('click', async () => {
  paidButton.setAttribute('disabled', 'disabled');
  await fetch('/checkout/' + encodeURIComponent(sessionId) + '/payment-instructions-shown', { method: 'POST' });
  await fetch('/checkout/' + encodeURIComponent(sessionId) + '/claimed-paid', { method: 'POST' });
  statusText.textContent = 'Recherche du signal bancaire';
});

tick();
setInterval(tick, 1000);
setInterval(pollStatus, 5000);
</script>`;
}

function baseStyles(): string {
  return `<style>
:root { color-scheme: light; font-family: Inter, Arial, sans-serif; background: #f5f7f8; color: #172026; }
body { margin: 0; }
.shell, .checkout-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0; }
.checkout-header { padding: 24px 0 16px; }
.eyebrow { margin: 0 0 8px; color: #42606b; font-size: 14px; font-weight: 700; text-transform: uppercase; }
h1 { margin: 0 0 12px; font-size: 36px; line-height: 1.1; letter-spacing: 0; }
h2 { margin: 0 0 14px; font-size: 18px; letter-spacing: 0; }
.safe-copy, .help { color: #4d5c62; line-height: 1.5; }
.checkout-state { display: flex; flex-wrap: wrap; gap: 10px; margin: 6px 0 18px; }
.status-chip { display: inline-flex; align-items: center; gap: 8px; min-height: 34px; border: 1px solid #cfd8dc; border-radius: 6px; padding: 0 10px; background: #fff; }
.status-chip span { color: #516269; }
.checkout-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.step { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 14px; border: 1px solid #d8e0e3; border-radius: 8px; background: #fff; padding: 18px; min-height: 180px; }
.step-index { width: 32px; height: 32px; border-radius: 50%; background: #0f766e; color: #fff; display: grid; place-items: center; font-weight: 700; }
.row { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #eef2f3; padding: 10px 0; }
.row span { color: #65747a; }
.row strong { text-align: right; }
.option-list { display: grid; gap: 8px; }
.option-button { display: grid; gap: 4px; width: 100%; min-height: 70px; text-align: left; border: 1px solid #d8e0e3; border-radius: 8px; background: #fff; padding: 10px; color: inherit; cursor: pointer; }
.option-button span, .option-button small { color: #516269; }
.option-button.selected { border-color: #0f766e; box-shadow: inset 4px 0 0 #0f766e; background: #f2fbf9; }
.field-label { display: block; font-weight: 700; margin: 10px 0 6px; }
.input { box-sizing: border-box; width: 100%; min-height: 42px; border: 1px solid #cfd8dc; border-radius: 6px; padding: 8px 10px; font: inherit; }
.button { min-height: 40px; border-radius: 6px; border: 1px solid #0f766e; padding: 8px 12px; margin: 6px 8px 6px 0; font: inherit; font-weight: 700; cursor: pointer; }
.button.primary { background: #0f766e; color: #fff; }
.button.secondary { background: #fff; color: #0f766e; }
.status-pill { display: inline-flex; min-height: 34px; align-items: center; border-radius: 999px; padding: 0 12px; background: #e8f4f2; color: #0f625c; font-weight: 700; }
.timer { font-weight: 700; }
@media (max-width: 760px) { .checkout-grid { grid-template-columns: 1fr; } h1 { font-size: 28px; } .step { min-height: auto; } }
</style>`;
}

function evidenceStyles(): string {
  return `<style>
.admin-shell { width: min(1240px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 40px; }
.admin-header { padding: 18px 0 14px; }
.safety-strip { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0 18px; }
.safety-chip { display: inline-flex; gap: 8px; align-items: center; min-height: 32px; border: 1px solid #cfd8dc; border-radius: 6px; padding: 0 10px; background: #fff; }
.safety-chip span { color: #516269; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 12px 0 18px; }
.metric { border: 1px solid #d8e0e3; border-radius: 8px; background: #fff; padding: 12px; }
.metric span { display: block; color: #516269; font-size: 13px; }
.metric strong { display: block; margin-top: 4px; font-size: 24px; }
.admin-section { margin-top: 22px; }
.table-wrap { overflow-x: auto; border: 1px solid #d8e0e3; border-radius: 8px; background: #fff; }
table { width: 100%; border-collapse: collapse; min-width: 860px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #eef2f3; text-align: left; vertical-align: top; font-size: 14px; }
th { color: #516269; background: #f8fafb; font-weight: 700; }
.status-badge { display: inline-flex; align-items: center; min-height: 26px; border-radius: 999px; padding: 0 10px; background: #e8f4f2; color: #0f625c; font-weight: 700; }
.subtle { display: block; margin-top: 4px; color: #65747a; font-size: 12px; }
.empty-state { border: 1px dashed #cfd8dc; border-radius: 8px; padding: 14px; background: #fff; color: #516269; }
@media (max-width: 760px) { .admin-shell { width: min(100% - 20px, 1240px); } .metric-grid { grid-template-columns: 1fr; } }
</style>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function start(): Promise<void> {
  const server = buildWebServer({
    environment: process.env.NODE_ENV ?? 'development'
  });

  await server.listen({
    host: process.env.WEB_HOST ?? '0.0.0.0',
    port: Number.parseInt(process.env.WEB_PORT ?? '3001', 10)
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await start();
}
