import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState,
  V1ReceiverBankOptions,
  type BuyerSafeCheckoutStatus,
  type BuyerSafeReceivingRoute,
  type CheckoutSessionState,
  type PayerBankLauncherOption,
  type ReceiverBankOption,
  type ReceiverIdentifierType,
  type ReceivingRouteRailType,
  type ReceivingRouteReviewPolicy
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
  selected_receiving_route_id?: string | undefined;
  selected_payer_bank_launcher_id?: string | undefined;
  buyer_sender_phone_masked?: string | undefined;
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
  getReceivingRoutes(paymentSessionId: string, bankProfileId: string): Promise<ReceivingRoutesPayload>;
  selectReceivingRoute(paymentSessionId: string, receivingRouteId: string): Promise<CheckoutSession>;
  getReceivingRouteCopyDetails(paymentSessionId: string): Promise<ReceivingRouteCopyDetailsPayload>;
  saveBuyerSenderPhoneHint(paymentSessionId: string, buyerSenderPhone: string): Promise<CheckoutSession>;
  getPayerBankLaunchers(paymentSessionId: string): Promise<PayerBankLaunchersPayload>;
  selectPayerBankLauncher(paymentSessionId: string, payerBankLauncherId: string): Promise<CheckoutSession>;
  markPaymentInstructionsShown(paymentSessionId: string): Promise<CheckoutSession>;
  markBuyerClaimedPaid(paymentSessionId: string): Promise<CheckoutClaimedPaidResponse>;
}

export interface WebServerOptions {
  environment: string;
  checkoutSessionProvider?: CheckoutSessionProvider | undefined;
  adminEvidenceClient?: AdminEvidenceClient | undefined;
  merchantRouteAdminClient?: MerchantRouteAdminClient | undefined;
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

export interface MerchantRouteAdminRoute {
  route_id: string;
  bank_profile_id: string;
  rail_type: ReceivingRouteRailType;
  receiver_identifier_type: ReceiverIdentifierType;
  receiver_identifier_masked: string;
  route_code: string;
  display_label: string;
  enabled: boolean;
  recommended: boolean;
  review_policy: ReceivingRouteReviewPolicy;
  fees_hint?: string | undefined;
  updated_at?: string | undefined;
}

export interface MerchantRouteAdminClient {
  listRoutes(): Promise<MerchantRouteAdminRoute[]>;
  createRoute(input: Record<string, unknown>): Promise<MerchantRouteAdminRoute>;
  updateRoute(routeId: string, patch: Record<string, unknown>): Promise<MerchantRouteAdminRoute>;
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

interface ReceivingRoutesPayload {
  payment_session_id: string;
  bank_profile_id: string;
  routes: readonly BuyerSafeReceivingRoute[];
}

interface ReceivingRouteCopyDetailsPayload {
  payment_session_id: string;
  receiving_route_id: string;
  rail_type: string;
  receiver_identifier_type: string;
  receiver_identifier_masked: string;
  masked_identifier: string;
  receiver_identifier_copy_value: string;
  destination_value: string;
  reveal_expires_at: string;
  copy_action: 'explicit_buyer_copy';
  does_not_confirm_payment: true;
  official_bank_confirmation: false;
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
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
  const checkoutMerchantId = process.env.CHECKOUT_MERCHANT_ID ?? 'mch_dev';
  const checkoutSessionProvider =
    options.checkoutSessionProvider ?? new ApiCheckoutSessionProvider(apiBaseUrl, checkoutMerchantId);
  const adminEvidenceClient =
    options.adminEvidenceClient ??
    new ApiAdminEvidenceClient(
      apiBaseUrl,
      process.env.SWIMPAY_ADMIN_TOKEN ?? process.env.DEV_ADMIN_TOKEN ?? 'change_me_local_admin_token'
    );
  const merchantRouteAdminClient =
    options.merchantRouteAdminClient ?? new ApiMerchantRouteAdminClient(apiBaseUrl, checkoutMerchantId);
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

    const receivingRoutes = session.selected_receiver_bank_id
      ? await checkoutSessionProvider.getReceivingRoutes(paymentSessionId, session.selected_receiver_bank_id)
      : { payment_session_id: paymentSessionId, bank_profile_id: '', routes: [] };

    reply.type('text/html; charset=utf-8');
    return renderCheckoutPage(
      session,
      recipient,
      receiverBanks.receiver_banks,
      receivingRoutes.routes,
      payerBankLaunchers.payer_bank_launchers
    );
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

  server.get('/checkout/:paymentSessionId/receiver-banks/:bankProfileId/routes', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string; bankProfileId?: string };
    const paymentSessionId = params.paymentSessionId;
    const bankProfileId = params.bankProfileId;
    if (!paymentSessionId || !bankProfileId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id and bank profile id are required.' } });
    }

    return reply.status(200).send(await checkoutSessionProvider.getReceivingRoutes(paymentSessionId, bankProfileId));
  });

  server.post('/checkout/:paymentSessionId/receiving-route', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const body = request.body as { receiving_route_id?: string } | undefined;
    const paymentSessionId = params.paymentSessionId;
    const receivingRouteId = body?.receiving_route_id;
    if (!paymentSessionId || !receivingRouteId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Receiving route id is required.' } });
    }

    return reply.status(200).send(toCheckoutStatusResponse(await checkoutSessionProvider.selectReceivingRoute(paymentSessionId, receivingRouteId)));
  });

  server.get('/checkout/:paymentSessionId/receiving-route/copy-details', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    setNoStoreHeaders(reply);
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    return reply.status(200).send(await checkoutSessionProvider.getReceivingRouteCopyDetails(paymentSessionId));
  });

  server.post('/checkout/:paymentSessionId/buyer-sender-phone', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const body = request.body as { buyer_sender_phone?: string } | undefined;
    const paymentSessionId = params.paymentSessionId;
    const buyerSenderPhone = body?.buyer_sender_phone;
    if (!paymentSessionId || !buyerSenderPhone) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Buyer sender phone is required.' } });
    }

    return reply.status(200).send(toCheckoutStatusResponse(await checkoutSessionProvider.saveBuyerSenderPhoneHint(paymentSessionId, buyerSenderPhone)));
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

  server.get('/admin/merchant-receiving-routes', async (_request, reply) => {
    try {
      const routes = await merchantRouteAdminClient.listRoutes();
      reply.type('text/html; charset=utf-8');
      return renderMerchantReceivingRoutesPage(routes);
    } catch {
      reply.status(503).type('text/html; charset=utf-8');
      return renderMerchantRoutesUnavailablePage();
    }
  });

  server.post('/admin/merchant-receiving-routes', async (request, reply) => {
    await merchantRouteAdminClient.createRoute(normalizeAdminRouteBody(request.body));
    return redirectToMerchantRoutes(reply);
  });

  server.post('/admin/merchant-receiving-routes/:routeId/disable', async (request, reply) => {
    const params = request.params as { routeId?: string };
    if (!params.routeId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Route id is required.' } });
    }

    await merchantRouteAdminClient.updateRoute(params.routeId, { enabled: false });
    return redirectToMerchantRoutes(reply);
  });

  server.post('/admin/merchant-receiving-routes/:routeId/recommend', async (request, reply) => {
    const params = request.params as { routeId?: string };
    if (!params.routeId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Route id is required.' } });
    }

    await merchantRouteAdminClient.updateRoute(params.routeId, { recommended: true });
    return redirectToMerchantRoutes(reply);
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
  public constructor(
    private readonly apiBaseUrl: string,
    private readonly merchantId = 'mch_dev'
  ) {}

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

  public async getReceivingRoutes(paymentSessionId: string, bankProfileId: string): Promise<ReceivingRoutesPayload> {
    return this.fetchJson<ReceivingRoutesPayload>(
      `/v1/checkout/${encodeURIComponent(paymentSessionId)}/receiver-banks/${encodeURIComponent(bankProfileId)}/routes`
    );
  }

  public async selectReceivingRoute(paymentSessionId: string, receivingRouteId: string): Promise<CheckoutSession> {
    return this.fetchJson<CheckoutSession>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/receiving-route`, {
      method: 'POST',
      body: JSON.stringify({ receiving_route_id: receivingRouteId })
    });
  }

  public async getReceivingRouteCopyDetails(paymentSessionId: string): Promise<ReceivingRouteCopyDetailsPayload> {
    return this.fetchJson<ReceivingRouteCopyDetailsPayload>(
      `/v1/checkout/${encodeURIComponent(paymentSessionId)}/receiving-route/copy-details`
    );
  }

  public async saveBuyerSenderPhoneHint(paymentSessionId: string, buyerSenderPhone: string): Promise<CheckoutSession> {
    return this.fetchJson<CheckoutSession>(`/v1/checkout/${encodeURIComponent(paymentSessionId)}/buyer-sender-phone`, {
      method: 'POST',
      body: JSON.stringify({ buyer_sender_phone: buyerSenderPhone })
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
    headers.set('authorization', `Bearer test_${this.merchantId}`);
    return fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  }
}

export class ApiMerchantRouteAdminClient implements MerchantRouteAdminClient {
  public constructor(
    private readonly apiBaseUrl: string,
    private readonly merchantId: string
  ) {}

  public async listRoutes(): Promise<MerchantRouteAdminRoute[]> {
    const payload = await this.fetchJson<{ routes?: MerchantRouteAdminRoute[] }>('/v1/merchant/receiving-routes');
    return payload.routes ?? [];
  }

  public async createRoute(input: Record<string, unknown>): Promise<MerchantRouteAdminRoute> {
    const payload = await this.fetchJson<{ route: MerchantRouteAdminRoute }>('/v1/merchant/receiving-routes', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return payload.route;
  }

  public async updateRoute(routeId: string, patch: Record<string, unknown>): Promise<MerchantRouteAdminRoute> {
    const payload = await this.fetchJson<{ route: MerchantRouteAdminRoute }>(
      `/v1/merchant/receiving-routes/${encodeURIComponent(routeId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch)
      }
    );
    return payload.route;
  }

  private async fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer test_${this.merchantId}`);
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers
    });

    if (!response.ok) {
      throw new Error(`Merchant receiving route API returned ${response.status}`);
    }

    return (await response.json()) as T;
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

function renderMerchantReceivingRoutesPage(routes: MerchantRouteAdminRoute[]): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Merchant receiving routes - SwimPay</title>',
    baseStyles(),
    evidenceStyles(),
    '</head>',
    '<body>',
    '<main class="admin-shell">',
    '<section class="admin-header" aria-labelledby="merchant-routes-title">',
    '<p class="eyebrow">Merchant route administration</p>',
    '<h1 id="merchant-routes-title">Merchant receiving routes</h1>',
    '<p class="safe-copy">Masked display is the default. Full card or phone values are accepted only during create/edit and are never shown after save.</p>',
    '<p class="help">Card routes are beta review-first. Auto-confirm remains disabled.</p>',
    '</section>',
    '<section class="admin-section" aria-labelledby="create-route-title">',
    '<h2 id="create-route-title">Create route</h2>',
    renderMerchantRouteCreateForm(),
    '</section>',
    '<section class="admin-section" aria-labelledby="route-list-title">',
    '<h2 id="route-list-title">Routes</h2>',
    renderMerchantRoutesTable(routes),
    '</section>',
    '</main>',
    '</body>',
    '</html>'
  ].join('');
}

function renderMerchantRoutesUnavailablePage(): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Merchant routes unavailable - SwimPay</title>',
    baseStyles(),
    evidenceStyles(),
    '</head>',
    '<body>',
    '<main class="admin-shell">',
    '<section class="admin-header" aria-labelledby="merchant-routes-unavailable-title">',
    '<p class="eyebrow">Merchant route administration</p>',
    '<h1 id="merchant-routes-unavailable-title">Merchant receiving routes unavailable</h1>',
    '<p class="safe-copy">Check the local backend before editing route configuration.</p>',
    '</section>',
    '</main>',
    '</body>',
    '</html>'
  ].join('');
}

function renderMerchantRouteCreateForm(): string {
  return [
    '<form class="admin-form" method="post" action="/admin/merchant-receiving-routes">',
    '<label class="field-label" for="bank-profile">Bank</label>',
    '<select id="bank-profile" class="input" name="bank_profile_id">',
    ...V1ReceiverBankOptions.map(
      (bank) => `<option value="${escapeHtml(bank.bank_profile_id)}">${escapeHtml(bank.display_name)}</option>`
    ),
    '</select>',
    '<label class="field-label" for="rail-type">Rail type</label>',
    '<select id="rail-type" class="input" name="rail_type">',
    '<option value="phone_transfer">phone_transfer</option>',
    '<option value="card_transfer">card_transfer</option>',
    '</select>',
    '<label class="field-label" for="receiver-identifier">Full card or phone for encrypted storage</label>',
    '<input id="receiver-identifier" class="input" name="receiver_identifier" autocomplete="off" placeholder="Enter once, masked after save">',
    '<label class="field-label" for="route-code">Route code</label>',
    '<input id="route-code" class="input" name="route_code" placeholder="SBER-PHONE">',
    '<label class="field-label" for="display-label">Display label</label>',
    '<input id="display-label" class="input" name="display_label" placeholder="Sberbank phone">',
    '<label class="field-label" for="fees-hint">Fees hint</label>',
    '<input id="fees-hint" class="input" name="fees_hint" placeholder="Manual transfer">',
    '<label class="field-label"><input type="checkbox" name="recommended" value="true"> Recommended</label>',
    '<button class="button primary" type="submit">Create route</button>',
    '<p class="help">The public checkout shows only masked route details until the buyer performs an explicit copy action.</p>',
    '</form>'
  ].join('');
}

function renderMerchantRoutesTable(routes: MerchantRouteAdminRoute[]): string {
  if (routes.length === 0) {
    return '<p class="empty-state">No receiving routes configured.</p>';
  }

  return [
    '<div class="table-wrap"><table>',
    '<thead><tr><th>Bank</th><th>Rail</th><th>Destination</th><th>Route code</th><th>Status</th><th>Review policy</th><th>Actions</th></tr></thead>',
    '<tbody>',
    ...routes.map((route) =>
      [
        '<tr>',
        `<td>${escapeHtml(bankDisplayName(route.bank_profile_id))}</td>`,
        `<td>${escapeHtml(route.rail_type)}</td>`,
        `<td>${escapeHtml(route.receiver_identifier_masked)}</td>`,
        `<td>${escapeHtml(route.route_code)}<span class="subtle">${escapeHtml(route.display_label)}</span></td>`,
        `<td>${escapeHtml(route.enabled ? 'enabled' : 'disabled')}<span class="subtle">recommended=${escapeHtml(String(route.recommended))}</span></td>`,
        `<td>${escapeHtml(route.review_policy)}${route.fees_hint ? `<span class="subtle">${escapeHtml(route.fees_hint)}</span>` : ''}</td>`,
        '<td>',
        route.enabled
          ? `<form method="post" action="/admin/merchant-receiving-routes/${escapeHtml(route.route_id)}/disable"><button class="button secondary" type="submit">Disable</button></form>`
          : '<span class="subtle">Disabled</span>',
        route.recommended
          ? '<span class="subtle">Recommended</span>'
          : `<form method="post" action="/admin/merchant-receiving-routes/${escapeHtml(route.route_id)}/recommend"><button class="button secondary" type="submit">Mark recommended</button></form>`,
        '</td>',
        '</tr>'
      ].join('')
    ),
    '</tbody>',
    '</table></div>'
  ].join('');
}

function bankDisplayName(bankProfileId: string): string {
  return V1ReceiverBankOptions.find((bank) => bank.bank_profile_id === bankProfileId)?.display_name ?? bankProfileId;
}

function normalizeAdminRouteBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const input = body as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...input };
  normalized.recommended = input.recommended === true || input.recommended === 'true' || input.recommended === 'on';
  return normalized;
}

function redirectToMerchantRoutes(reply: { status(code: number): { header(name: string, value: string): { send(): unknown } } }): unknown {
  return reply.status(303).header('Location', '/admin/merchant-receiving-routes').send();
}

function setNoStoreHeaders(reply: { header(name: string, value: string): unknown }): void {
  reply.header('Cache-Control', 'no-store');
  reply.header('Pragma', 'no-cache');
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
  receivingRoutes: readonly BuyerSafeReceivingRoute[],
  payerBankLaunchers: readonly PayerBankLauncherOption[]
): string {
  const status = mapCheckoutStatus(session.status);
  const amount = `${escapeHtml(session.amount.value)} ${escapeHtml(session.amount.currency)}`;
  const productName = escapeHtml(session.product_name ?? 'Commande SwimPay');
  const reference = escapeHtml(session.reference);
  const sessionId = escapeHtml(session.payment_session_id);
  const checkoutState = session.checkout_state ?? inferCheckoutState(session);
  const buyerSafeStatus = session.buyer_safe_status ?? mapCheckoutStateToBuyerSafeStatus(checkoutState);
  const selectedReceiverBank = receiverBanks.find((bank) => bank.receiver_bank_id === session.selected_receiver_bank_id);
  const selectedRoute = receivingRoutes.find((route) => route.route_id === session.selected_receiving_route_id);
  const selectedLauncher = payerBankLaunchers.find((launcher) => launcher.payer_bank_launcher_id === session.selected_payer_bank_launcher_id);
  const canShowPaymentInstructions = Boolean(selectedReceiverBank && selectedRoute && selectedLauncher);

  return renderCheckoutPageV2({
    session,
    receiverBanks,
    receivingRoutes,
    payerBankLaunchers,
    status,
    amount,
    productName,
    reference,
    sessionId,
    checkoutState,
    buyerSafeStatus,
    selectedReceiverBank,
    selectedRoute,
    selectedLauncher,
    canShowPaymentInstructions
  });

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

function renderCheckoutPageV2(params: {
  session: CheckoutSession;
  receiverBanks: readonly ReceiverBankOption[];
  receivingRoutes: readonly BuyerSafeReceivingRoute[];
  payerBankLaunchers: readonly PayerBankLauncherOption[];
  status: ReturnType<typeof mapCheckoutStatus>;
  amount: string;
  productName: string;
  reference: string;
  sessionId: string;
  checkoutState: CheckoutSessionState;
  buyerSafeStatus: BuyerSafeCheckoutStatus;
  selectedReceiverBank?: ReceiverBankOption | undefined;
  selectedRoute?: BuyerSafeReceivingRoute | undefined;
  selectedLauncher?: PayerBankLauncherOption | undefined;
  canShowPaymentInstructions: boolean;
}): string {
  return [
    '<!doctype html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${params.productName} - SwimPay</title>`,
    baseStyles(),
    '</head>',
    '<body>',
    '<main class="checkout-shell">',
    '<section class="checkout-header" aria-labelledby="checkout-title">',
    '<p class="eyebrow">Pay with SwimPay</p>',
    `<h1 id="checkout-title">${params.productName}</h1>`,
    '<p class="safe-copy">SwimPay recherchera le signal de paiement cote marchand.</p>',
    '<p class="help">SwimPay aide le marchand a reconnaitre un signal de notification. Ce n’est pas une confirmation officielle de banque.</p>',
    '</section>',
    '<section class="checkout-state" aria-label="Etat du checkout">',
    statusChip('Etape', params.checkoutState),
    statusChip('Statut acheteur', params.buyerSafeStatus),
    statusChip('Confirmation officielle banque', 'false'),
    '</section>',
    '<section class="checkout-grid" aria-label="Parcours de paiement">',
    renderStep('1', 'Choisir la banque de reception', [
      '<p class="help">Choisissez seulement la banque ou le marchand recevra le transfert. Les details de destination apparaissent apres.</p>',
      renderReceiverBankOptionsV2(params.receiverBanks, params.session.selected_receiver_bank_id)
    ]),
    renderStep('2', 'Choisir la route de reception', [
      params.selectedReceiverBank
        ? `<p class="help">${escapeHtml(params.selectedReceiverBank.display_name)} accepte ces routes en review beta. La selection ne confirme pas le paiement.</p>`
        : '<p class="help">Selectionnez d’abord une banque pour afficher les routes disponibles.</p>',
      params.selectedReceiverBank ? renderReceivingRouteOptions(params.receivingRoutes, params.session.selected_receiving_route_id) : ''
    ]),
    renderStep('3', 'Choisir votre app bancaire', [
      '<p class="help">Cette etape sert uniquement a ouvrir ou retrouver votre banque. Elle ne prouve pas le paiement.</p>',
      params.selectedRoute
        ? renderPayerLauncherOptionsV2(params.payerBankLaunchers, params.session.selected_payer_bank_launcher_id)
        : '<p class="help">Selectionnez une route avant de choisir votre app bancaire.</p>'
    ]),
    renderStep('4', 'Resume', [
      row('Montant exact', params.amount),
      row('Methode', params.selectedRoute ? routeLabel(params.selectedRoute.rail_type) : 'Transfert bancaire'),
      row('Statut', params.status.displayStatus),
      `<p class="timer" data-expires-at="${escapeHtml(params.session.expires_at)}">Temps restant: <span id="countdown">calcul...</span></p>`
    ]),
    renderStep('5', 'Instructions de paiement', [
      params.canShowPaymentInstructions && params.selectedRoute
        ? row(params.selectedRoute.rail_type === 'card_transfer' ? 'Carte' : 'Telephone', escapeHtml(params.selectedRoute.receiver_identifier_masked))
        : '<p class="help">Selectionnez une banque, une route et une app bancaire pour afficher les instructions.</p>',
      row('Montant', params.amount),
      row('Reference', params.reference),
      params.selectedRoute?.rail_type === 'phone_transfer'
        ? '<label class="field-label" for="buyer-phone">Numero d’envoi — utilise uniquement pour reconnaitre votre paiement.</label><input id="buyer-phone" class="input" name="buyer-phone" inputmode="tel" autocomplete="tel" placeholder="+7 *** *** **67">'
        : '',
      params.canShowPaymentInstructions && params.selectedRoute
        ? '<button class="button secondary" type="button" data-copy-route="true">Copier la destination</button>'
        : '',
      params.canShowPaymentInstructions ? `<button class="button secondary" type="button" data-copy="${params.amount}">Copier le montant</button>` : '',
      params.canShowPaymentInstructions ? `<button class="button secondary" type="button" data-copy="${params.reference}">Copier la reference</button>` : '',
      params.canShowPaymentInstructions ? renderOpenBankAction(params.selectedLauncher) : '',
      params.canShowPaymentInstructions
        ? `<button id="paid-button" class="button primary" type="button" data-session-id="${params.sessionId}" data-does-not-confirm="true">J&#39;ai paye</button>`
        : '',
      '<p class="help">SwimPay suit le signal de reception cote marchand. Ce bouton ne valide pas le paiement.</p>'
    ]),
    renderStep('6', 'Attente du signal', [
      `<p id="status-text" class="status-pill" data-status="${params.session.status}">${params.status.displayStatus}</p>`,
      '<p class="help">Le statut vient du backend SwimPay et peut demander une verification manuelle.</p>'
    ]),
    renderStep('7', 'Resultat', [
      `<p id="result-text">${resultText(params.status.resultState)}</p>`
    ]),
    '</section>',
    '</main>',
    checkoutScript(params.sessionId),
    '</body>',
    '</html>'
  ].join('');
}

function renderReceiverBankOptionsV2(receiverBanks: readonly ReceiverBankOption[], selectedReceiverBankId: string | undefined): string {
  return [
    '<div class="option-list" data-option-list="receiver-bank">',
    ...receiverBanks.map((bank) =>
      [
        `<button class="option-button${bank.receiver_bank_id === selectedReceiverBankId ? ' selected' : ''}" type="button" data-receiver-bank-id="${escapeHtml(bank.receiver_bank_id)}">`,
        `<strong>${escapeHtml(bank.display_name)}</strong>`,
        `<span>${escapeHtml(bank.status === 'review_required_beta' ? 'Disponible en beta review' : bank.status)}</span>`,
        `<small>${escapeHtml(routeSummaryForBank(bank))}</small>`,
        '</button>'
      ].join('')
    ),
    '</div>'
  ].join('');
}

function renderReceivingRouteOptions(routes: readonly BuyerSafeReceivingRoute[], selectedRouteId: string | undefined): string {
  if (routes.length === 0) {
    return '<p class="help">Aucune route active pour cette banque. Choisissez une autre banque ou contactez le marchand.</p>';
  }

  return [
    '<div class="option-list" data-option-list="receiving-route">',
    ...routes.map((route) =>
      [
        `<button class="option-button${route.route_id === selectedRouteId ? ' selected' : ''}" type="button" data-receiving-route-id="${escapeHtml(route.route_id)}">`,
        `<strong>${escapeHtml(routeLabel(route.rail_type))}</strong>`,
        `<span>${escapeHtml(route.receiver_identifier_masked)}</span>`,
        `<small>${escapeHtml(route.recommended ? 'Recommande · review beta' : 'Review beta')}${route.fees_hint ? ` · ${escapeHtml(route.fees_hint)}` : ''}</small>`,
        '</button>'
      ].join('')
    ),
    '</div>'
  ].join('');
}

function routeLabel(railType: BuyerSafeReceivingRoute['rail_type']): string {
  return railType === 'card_transfer' ? 'Carte' : 'Telephone';
}

function routeSummaryForBank(bank: ReceiverBankOption): string {
  const count = bank.available_route_count ?? 0;
  if (count === 0) {
    return 'Temporairement indisponible';
  }
  const rails = (bank.rail_types ?? []).map(routeLabel).join(' / ');
  return rails ? `${count} route(s): ${rails}` : `${count} route(s) disponible(s)`;
}

function renderPayerLauncherOptionsV2(payerBankLaunchers: readonly PayerBankLauncherOption[], selectedLauncherId: string | undefined): string {
  return [
    '<div class="option-list" data-option-list="payer-launcher">',
    ...payerBankLaunchers.map((launcher) =>
      [
        `<button class="option-button${launcher.payer_bank_launcher_id === selectedLauncherId ? ' selected' : ''}" type="button" data-payer-bank-launcher-id="${escapeHtml(launcher.payer_bank_launcher_id)}">`,
        `<strong>${escapeHtml(launcher.display_name)}</strong>`,
        '<span>Ouverture app si possible, sinon paiement manuel</span>',
        '<small>Ne confirme pas le paiement</small>',
        '</button>'
      ].join('')
    ),
    '</div>'
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
    selectedReceivingRouteId: session.selected_receiving_route_id,
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

document.querySelectorAll('[data-copy-route]').forEach((button) => {
  button.addEventListener('click', async () => {
    const response = await fetch('/checkout/' + encodeURIComponent(sessionId) + '/receiving-route/copy-details');
    if (!response.ok) return;
    const payload = await response.json();
    await navigator.clipboard?.writeText(payload.destination_value || payload.receiver_identifier_copy_value || '');
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

document.querySelectorAll('[data-receiving-route-id]').forEach((button) => {
  button.addEventListener('click', async () => {
    await fetch('/checkout/' + encodeURIComponent(sessionId) + '/receiving-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiving_route_id: button.dataset.receivingRouteId })
    });
    window.location.reload();
  });
});

paidButton?.addEventListener('click', async () => {
  const buyerPhone = document.getElementById('buyer-phone');
  if (buyerPhone && buyerPhone.value) {
    await fetch('/checkout/' + encodeURIComponent(sessionId) + '/buyer-sender-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer_sender_phone: buyerPhone.value })
    });
  }
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
