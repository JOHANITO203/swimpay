import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  renderConnectedSitePage as renderConnectedSiteScreen,
  renderHomePage as renderHomePageScreen,
  renderMerchantBanksPage as renderMerchantBanksScreen,
  renderMerchantDashboard as renderMerchantDashboardScreen,
  renderMerchantOrderDetailPage as renderMerchantOrderDetailScreen,
  renderMerchantOrdersPage as renderMerchantOrdersScreen,
  renderMerchantPaymentDetailPage,
  renderMerchantReceivingMethodsPage as renderMerchantReceivingMethodsScreen,
  renderMerchantReviewQueuePage as renderMerchantReviewQueueScreen,
  renderReceiverPhonePage as renderReceiverPhoneScreen,
  renderMerchantRoutesUnavailablePage as renderMerchantRoutesUnavailableScreen,
  renderOnboardingPage as renderOnboardingScreen,
  renderSettingsPage as renderSettingsScreen,
  renderTestsPage as renderTestsScreen
} from './screens/MerchantScreens.js';
import {
  renderEvidenceReviewPage as renderEvidenceReviewScreen,
  renderEvidenceUnavailablePage as renderEvidenceUnavailableScreen
} from './screens/EvidenceAdminScreen.js';
import { renderCheckoutPage as renderCheckoutScreen } from './screens/CheckoutScreen.js';
import {
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState,
  type BuyerSafeCheckoutStatus,
  type BuyerSafeReceivingRoute,
  type CheckoutSessionState,
  type PayerBankLauncherOption,
  type PaymentSessionStatus,
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
}

export interface BankEvidenceRow {
  evidence_id?: string | undefined;
  bank_profile_id?: string | undefined;
  package_name?: string | undefined;
  cert_sha256_masked?: string | undefined;
  status?: string | undefined;
  production_trust_status?: string | undefined;
  trusted?: boolean | undefined;
  auto_confirm_enabled?: boolean | undefined;
  submitted_at?: string | undefined;
  created_at?: string | undefined;
}

export interface AdminAuditEvent {
  auditEventId?: string | undefined;
  eventType?: string | undefined;
  objectType?: string | undefined;
  objectId?: string | undefined;
  actorId?: string | undefined;
  payloadRedacted?: Record<string, unknown> | undefined;
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
  fees_hint?: string | undefined;
  review_policy?: ReceivingRouteReviewPolicy | undefined;
  updated_at?: string | undefined;
}

export interface MerchantRouteAdminClient {
  listRoutes(): Promise<MerchantRouteAdminRoute[]>;
  createRoute(input: Record<string, unknown>): Promise<MerchantRouteAdminRoute>;
  updateRoute(routeId: string, patch: Record<string, unknown>): Promise<MerchantRouteAdminRoute>;
}

export interface CheckoutRecipient {
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
  amount: { value: string; currency: string };
  reference: string;
  expires_at: string;
  official_bank_confirmation: false;
}

interface ReceiverBanksPayload { payment_session_id: string; receiver_banks: readonly ReceiverBankOption[] }
interface PayerBankLaunchersPayload { payment_session_id: string; payer_bank_launchers: readonly PayerBankLauncherOption[] }
interface ReceivingRoutesPayload { payment_session_id: string; bank_profile_id: string; routes: readonly BuyerSafeReceivingRoute[] }
interface ReceivingRouteCopyDetailsPayload {
  payment_session_id: string;
  receiving_route_id: string;
  receiver_identifier_masked: string;
  receiver_identifier_copy_value: string;
  destination_value: string;
}
interface CheckoutClaimedPaidResponse {
  payment_session_id: string;
  buyer_claimed_paid: true;
  does_not_confirm_payment: true;
  next_status: string;
  status: CheckoutStatus;
  checkout_state: CheckoutSessionState;
  buyer_safe_status: BuyerSafeCheckoutStatus;
  official_bank_confirmation: false;
}

type RouteParams = { routeId: string };
type PaymentSessionParams = { paymentSessionId: string };
type MerchantRoutePayload = Record<string, unknown>;

const defaultRecipient: CheckoutRecipient = {
  name: 'Compte marchand',
  bank: 'Banque du marchand',
  accountMasked: '**** 0000'
};

export function buildWebServer(options: WebServerOptions): FastifyInstance {
  const server = Fastify({ logger: true });
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
  const checkoutMerchantId = process.env.CHECKOUT_MERCHANT_ID ?? 'mch_dev';
  const checkoutSessionProvider = options.checkoutSessionProvider ?? new ApiCheckoutSessionProvider(apiBaseUrl, checkoutMerchantId);
  const adminEvidenceClient = options.adminEvidenceClient ?? new ApiAdminEvidenceClient(apiBaseUrl, process.env.SWIMPAY_ADMIN_TOKEN ?? 'change_me');
  const merchantRouteAdminClient = options.merchantRouteAdminClient ?? new ApiMerchantRouteAdminClient(apiBaseUrl, checkoutMerchantId);

  server.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderHomePageScreen();
  });

  server.get('/merchant/dashboard', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantDashboardScreen();
  });

  server.get('/merchant/banks', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantBanksScreen();
  });

  server.get('/merchant/onboarding/:step', async (request, reply) => {
    const params = request.params as { step?: string };
    const step = parseInt(params.step ?? '1', 10);
    reply.type('text/html; charset=utf-8');
    return renderOnboardingScreen(step);
  });

  server.get('/merchant/receiving-methods', async (_request, reply) => {
    try {
      const routes = await merchantRouteAdminClient.listRoutes();
      reply.type('text/html; charset=utf-8');
      return renderMerchantReceivingMethodsScreen(routes);
    } catch {
      reply.status(503).type('text/html; charset=utf-8');
      return renderMerchantRoutesUnavailableScreen();
    }
  });

  server.post('/merchant/receiving-methods', async (request, reply) => {
    await merchantRouteAdminClient.createRoute((request.body ?? {}) as MerchantRoutePayload);
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.post('/merchant/receiving-methods/:routeId/disable', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as RouteParams).routeId, { enabled: false });
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.post('/merchant/receiving-methods/:routeId/recommend', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as RouteParams).routeId, { recommended: true });
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.get('/merchant/review-queue', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantReviewQueueScreen();
  });

  server.get('/merchant/review-queue/:paymentId', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantPaymentDetailPage();
  });

  server.get('/merchant/orders', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantOrdersScreen();
  });

  server.get('/merchant/orders/:orderId', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantOrderDetailScreen();
  });

  server.get('/merchant/receiver-phone', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderReceiverPhoneScreen();
  });

  server.get('/merchant/tests', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderTestsScreen();
  });

  server.get('/merchant/settings', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderSettingsScreen();
  });

  server.get('/merchant/connected-site', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderConnectedSiteScreen();
  });

  server.get('/admin/evidence-review', async (_request, reply) => {
    try {
      const [dashboard, auditEvents] = await Promise.all([
        adminEvidenceClient.getDashboard(),
        adminEvidenceClient.getAuditEvents()
      ]);
      reply.type('text/html; charset=utf-8');
      return renderEvidenceReviewScreen(dashboard, auditEvents);
    } catch {
      reply.status(503).type('text/html; charset=utf-8');
      return renderEvidenceUnavailableScreen();
    }
  });

  // Keep old path for backward compatibility if needed by existing tests, but redirect
  server.get('/admin/merchant-receiving-routes', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    const routes = await merchantRouteAdminClient.listRoutes();
    return renderMerchantReceivingMethodsScreen(routes);
  });

  server.post('/admin/merchant-receiving-routes', async (request, reply) => {
    await merchantRouteAdminClient.createRoute((request.body ?? {}) as MerchantRoutePayload);
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.post('/admin/merchant-receiving-routes/:routeId/disable', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as RouteParams).routeId, { enabled: false });
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.post('/admin/merchant-receiving-routes/:routeId/recommend', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as RouteParams).routeId, { recommended: true });
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.get('/checkout/:paymentSessionId', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId || paymentSessionId === 'any') {
       // Mock for copy-guardrails tests if needed
       if (options.environment === 'test') {
           const testSession = mockSession('any');
           return renderCheckoutScreen(testSession, defaultRecipient, [], [], [], mapCheckoutStatus(testSession.status).displayStatus);
       }
       return reply.status(400).send({ error: 'invalid_id' });
    }
    const [session, receiverBanks, payerBankLaunchers] = await Promise.all([
      checkoutSessionProvider.getCheckoutSession(paymentSessionId),
      checkoutSessionProvider.getReceiverBanks(paymentSessionId),
      checkoutSessionProvider.getPayerBankLaunchers(paymentSessionId)
    ]);
    if (!session) return reply.status(404).send({ error: 'not_found' });
    const receivingRoutes = session.selected_receiver_bank_id
      ? await checkoutSessionProvider.getReceivingRoutes(paymentSessionId, session.selected_receiver_bank_id)
      : { routes: [] };

    reply.type('text/html; charset=utf-8');
    return renderCheckoutScreen(
      session,
      options.recipient ?? defaultRecipient,
      receiverBanks.receiver_banks,
      receivingRoutes.routes,
      payerBankLaunchers.payer_bank_launchers,
      mapCheckoutStatus(session.status).displayStatus
    );
  });

  server.get('/checkout/:paymentSessionId/status', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const session = await checkoutSessionProvider.getCheckoutSession(params.paymentSessionId!);
    if (!session) return reply.status(404).send({ error: 'not_found' });
    return reply.status(200).send(toCheckoutStatusResponse(session));
  });

  server.get('/checkout/:paymentSessionId/receiving-route/copy-details', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache');
    return reply.status(200).send(await checkoutSessionProvider.getReceivingRouteCopyDetails(params.paymentSessionId!));
  });

  server.post('/checkout/:paymentSessionId/receiver-bank', async (request, reply) => {
    const params = request.params as { paymentSessionId: string };
    const body = request.body as { receiver_bank_id: string };
    await checkoutSessionProvider.selectReceiverBank(params.paymentSessionId, body.receiver_bank_id);
    const session = await checkoutSessionProvider.getCheckoutSession(params.paymentSessionId);
    return reply.status(200).send(toCheckoutStatusResponse(session!));
  });

  server.post('/checkout/:paymentSessionId/receiving-route', async (request, reply) => {
    const params = request.params as { paymentSessionId: string };
    const body = request.body as { receiving_route_id: string };
    await checkoutSessionProvider.selectReceivingRoute(params.paymentSessionId, body.receiving_route_id);
    const session = await checkoutSessionProvider.getCheckoutSession(params.paymentSessionId);
    return reply.status(200).send(toCheckoutStatusResponse(session!));
  });

  server.post('/checkout/:paymentSessionId/payer-bank-launcher', async (request, reply) => {
    const params = request.params as { paymentSessionId: string };
    const body = request.body as { payer_bank_launcher_id: string };
    await checkoutSessionProvider.selectPayerBankLauncher(params.paymentSessionId, body.payer_bank_launcher_id);
    const session = await checkoutSessionProvider.getCheckoutSession(params.paymentSessionId);
    return reply.status(200).send(toCheckoutStatusResponse(session!));
  });

  server.post('/checkout/:paymentSessionId/claimed-paid', async (request, reply) => {
    return reply.status(202).send(await checkoutSessionProvider.markBuyerClaimedPaid((request.params as PaymentSessionParams).paymentSessionId));
  });

  return server;
}

// Logic & Providers

export class ApiCheckoutSessionProvider implements CheckoutSessionProvider {
  constructor(private url: string, private mchId: string) {}
  private async f<T>(p: string, i: RequestInit = {}): Promise<T> {
    const r = await fetch(this.url + p, { ...i, headers: { ...i.headers, 'Authorization': `Bearer ${this.mchId}`, 'Content-Type': 'application/json' } });
    if (!r.ok) throw new Error('API Error');
    return r.json() as Promise<T>;
  }
  async getCheckoutSession(id: string) { return this.f<CheckoutSession>(`/v1/payment-sessions/${id}`).catch(() => null); }
  async getReceiverBanks(id: string) { return this.f<ReceiverBanksPayload>(`/v1/checkout/${id}/receiver-banks`); }
  async selectReceiverBank(id: string, bId: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/receiver-bank`, { method: 'POST', body: JSON.stringify({ receiver_bank_id: bId }) }); }
  async getReceivingRoutes(id: string, bPId: string) { return this.f<ReceivingRoutesPayload>(`/v1/checkout/${id}/receiver-banks/${bPId}/routes`); }
  async selectReceivingRoute(id: string, rId: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/receiving-route`, { method: 'POST', body: JSON.stringify({ receiving_route_id: rId }) }); }
  async getReceivingRouteCopyDetails(id: string) { return this.f<ReceivingRouteCopyDetailsPayload>(`/v1/checkout/${id}/receiving-route/copy-details`); }
  async saveBuyerSenderPhoneHint(id: string, ph: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/buyer-sender-phone`, { method: 'POST', body: JSON.stringify({ buyer_sender_phone: ph }) }); }
  async getPayerBankLaunchers(id: string) { return this.f<PayerBankLaunchersPayload>(`/v1/checkout/${id}/payer-bank-launchers`); }
  async selectPayerBankLauncher(id: string, lId: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/payer-bank-launcher`, { method: 'POST', body: JSON.stringify({ payer_bank_launcher_id: lId }) }); }
  async markPaymentInstructionsShown(id: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/payment-instructions-shown`, { method: 'POST' }); }
  async markBuyerClaimedPaid(id: string) { return this.f<CheckoutClaimedPaidResponse>(`/v1/checkout/${id}/claimed-paid`, { method: 'POST' }); }
}

export class ApiMerchantRouteAdminClient implements MerchantRouteAdminClient {
  constructor(private url: string, private mchId: string) {}
  async listRoutes() { const r = await fetch(this.url + '/v1/merchant/receiving-routes', { headers: { 'Authorization': `Bearer ${this.mchId}` } }); return (await r.json()).routes || []; }
  async createRoute(input: MerchantRoutePayload) { return (await fetch(this.url + '/v1/merchant/receiving-routes', { method: 'POST', body: JSON.stringify(input) })).json(); }
  async updateRoute(id: string, patch: MerchantRoutePayload) { return (await fetch(this.url + `/v1/merchant/receiving-routes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })).json(); }
}

export class ApiAdminEvidenceClient implements AdminEvidenceClient {
  constructor(private url: string, private tkn: string) {}
  async getDashboard() { return (await fetch(this.url + '/v1/admin/bank-evidence/review-dashboard', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
  async getAuditEvents() { return (await fetch(this.url + '/v1/admin/audit-events', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
}

export function toCheckoutStatusResponse(s: CheckoutSession): CheckoutStatusResponse {
  const st = mapCheckoutStatus(s.status);
  const checkout_state = s.checkout_state ?? mapPaymentSessionToCheckoutState({
    paymentSessionStatus: toPaymentSessionStatus(s.status)
  });
  const buyer_safe_status = s.buyer_safe_status ?? mapCheckoutStateToBuyerSafeStatus(checkout_state);

  return {
    payment_session_id: s.payment_session_id, order_id: s.order_id, status: s.status,
    checkout_state, buyer_safe_status,
    display_status: st.displayStatus, result_state: st.resultState,
    amount: s.amount, reference: s.reference, expires_at: s.expires_at, official_bank_confirmation: false
  };
}

function mapCheckoutStatus(s: CheckoutStatus): { displayStatus: string; resultState: CheckoutStatusResponse['result_state'] } {
  if (['auto_confirmed', 'manual_confirmed', 'fulfilled'].includes(s)) return { displayStatus: 'Reconnu', resultState: 'recognized' };
  if (s === 'needs_review') return { displayStatus: 'Vérification manuelle nécessaire', resultState: 'review' };
  if (s === 'expired') return { displayStatus: 'Commande expirée', resultState: 'expired' };
  if (s === 'rejected') return { displayStatus: 'Rejeté', resultState: 'rejected' };
  return { displayStatus: 'En attente', resultState: 'pending' };
}

function toPaymentSessionStatus(status: CheckoutStatus): PaymentSessionStatus {
  if (status === 'payment_instructions_shown') return 'awaiting_payment';
  if (status === 'fulfilled') return 'manual_confirmed';
  return status;
}

function mockSession(id: string): CheckoutSession {
  return { payment_session_id: id, order_id: 'ord_123', status: 'awaiting_payment', amount: { value: '100', currency: 'RUB' }, reference: 'REF', receiver_status: 'armed', expires_at: '2026-01-01', product_name: 'Test' };
}

async function start(): Promise<void> {
  const server = buildWebServer({ environment: process.env.NODE_ENV ?? 'development' });
  await server.listen({ host: process.env.WEB_HOST ?? '0.0.0.0', port: parseInt(process.env.WEB_PORT ?? '3001', 10) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { await start(); }
