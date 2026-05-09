import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  renderConnectedSitePage as renderConnectedSiteScreen,
  renderDeveloperIntegrationWizardPage as renderDeveloperIntegrationWizardScreen,
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
import {
  renderIntelligenceReviewPage as renderIntelligenceReviewScreen,
  renderIntelligenceUnavailablePage as renderIntelligenceUnavailableScreen
} from './screens/IntelligenceAdminScreen.js';
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
  payment_method?: 'card' | 'sbp' | undefined;
  sender_bank_id?: string | undefined;
  sender_card_masked?: string | undefined;
  sender_phone_masked?: string | undefined;
  display_amount?: { value: string; currency: string } | undefined;
  payable_amount?: { value: string; currency: string } | undefined;
  reconciliation_delta_minor?: number | undefined;
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
  submitExpectedPaymentProfile(paymentSessionId: string, body: ExpectedPaymentProfileFormPayload): Promise<CheckoutSession>;
  selectReceiverBank(paymentSessionId: string, receiverBankId: string): Promise<CheckoutSession>;
  getReceivingRoutes(paymentSessionId: string, bankProfileId: string): Promise<ReceivingRoutesPayload>;
  selectReceivingRoute(paymentSessionId: string, receivingRouteId: string): Promise<CheckoutSession>;
  getReceivingRouteCopyDetails(paymentSessionId: string): Promise<ReceivingRouteCopyDetailsPayload>;
  saveBuyerSenderPhoneHint(paymentSessionId: string, buyerSenderPhone: string): Promise<CheckoutSession>;
  getPayerBankLaunchers(paymentSessionId: string): Promise<PayerBankLaunchersPayload>;
  selectPayerBankLauncher(paymentSessionId: string, payerBankLauncherId: string): Promise<CheckoutSession>;
  markReceiverArmed(paymentSessionId: string): Promise<CheckoutSession>;
  markPaymentInstructionsShown(paymentSessionId: string): Promise<CheckoutSession>;
  markBuyerClaimedPaid(paymentSessionId: string): Promise<CheckoutClaimedPaidResponse>;
}

export interface ExpectedPaymentProfileFormPayload {
  buyer_first_name: string;
  buyer_last_name: string;
  payment_method: 'card' | 'sbp';
  sender_bank_id: string;
  sender_card_number?: string | undefined;
  sender_phone?: string | undefined;
}

export interface WebServerOptions {
  environment: string;
  checkoutSessionProvider?: CheckoutSessionProvider | undefined;
  adminEvidenceClient?: AdminEvidenceClient | undefined;
  adminIntelligenceClient?: AdminIntelligenceClient | undefined;
  merchantRouteAdminClient?: MerchantRouteAdminClient | undefined;
  merchantIntegrationClient?: MerchantIntegrationClient | null | undefined;
  recipient?: CheckoutRecipient | undefined;
}

export interface AdminEvidenceClient {
  getDashboard(): Promise<BankEvidenceDashboard>;
  getAuditEvents(): Promise<AdminAuditEvent[]>;
}

export interface AdminIntelligenceClient {
  getFeedback(): Promise<AdminIntelligenceFeedbackResponse>;
  getUnknownShapes(): Promise<AdminIntelligenceUnknownShapesResponse>;
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

export interface AdminIntelligenceFeedbackResponse {
  feedback?: IntelligenceFeedbackRow[] | undefined;
  read_only?: boolean | undefined;
  mutates_runtime_rules?: boolean | undefined;
  promotes_profile?: boolean | undefined;
  official_bank_confirmation?: boolean | undefined;
}

export interface AdminIntelligenceUnknownShapesResponse {
  unknown_shapes?: IntelligenceUnknownShapeRow[] | undefined;
  read_only?: boolean | undefined;
  mutates_runtime_rules?: boolean | undefined;
  promotes_profile?: boolean | undefined;
  official_bank_confirmation?: boolean | undefined;
}

export interface IntelligenceFeedbackRow {
  feedback_id?: string | undefined;
  merchant_id?: string | undefined;
  shape_hash?: string | undefined;
  bank_profile_id?: string | undefined;
  package_name?: string | undefined;
  profile_version?: string | undefined;
  classification_guess?: string | undefined;
  human_label?: string | undefined;
  feedback?: string | undefined;
  timestamp?: string | undefined;
  review_status?: string | undefined;
  learning_metadata?: IntelligenceLearningMetadata | undefined;
  mutates_runtime_rules?: boolean | undefined;
  promotes_profile?: boolean | undefined;
  official_bank_confirmation?: boolean | undefined;
}

export interface IntelligenceUnknownShapeRow {
  shape_hash?: string | undefined;
  bank_profile_id?: string | undefined;
  package_name?: string | undefined;
  profile_version?: string | undefined;
  classification_guess?: string | undefined;
  seen_count?: number | undefined;
  first_seen_at?: string | undefined;
  last_seen_at?: string | undefined;
  review_status?: string | undefined;
  learning_context?: string | undefined;
  read_only?: boolean | undefined;
  mutates_runtime_rules?: boolean | undefined;
  promotes_profile?: boolean | undefined;
  official_bank_confirmation?: boolean | undefined;
  creates_payment_review?: boolean | undefined;
}

export interface IntelligenceLearningMetadata {
  learning_context?: string | undefined;
  intent_relation?: string | undefined;
  active_payment_intent_present?: boolean | undefined;
  collision_detected?: boolean | undefined;
  payment_window_status?: string | undefined;
  review_created?: boolean | undefined;
  profile_version?: string | undefined;
  shape_hash?: string | undefined;
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

interface MerchantReceivingMethodApiPayload {
  id?: string | undefined;
  route_id?: string | undefined;
  type?: 'card' | 'phone' | undefined;
  bank_id?: string | undefined;
  bank_profile_id?: string | undefined;
  label?: string | undefined;
  masked_value?: string | undefined;
  receiver_identifier_masked?: string | undefined;
  last4?: string | undefined;
  status?: 'active' | 'inactive' | 'pending_verification' | undefined;
  is_default?: boolean | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export interface MerchantRouteAdminClient {
  listRoutes(): Promise<MerchantRouteAdminRoute[]>;
  createRoute(input: Record<string, unknown>): Promise<MerchantRouteAdminRoute>;
  updateRoute(routeId: string, patch: Record<string, unknown>): Promise<MerchantRouteAdminRoute>;
}

export interface MerchantIntegrationClient {
  getIntegration(): Promise<MerchantIntegrationPayload>;
  ensureKeys(): Promise<MerchantIntegrationPayload>;
  rotateKeys(): Promise<MerchantIntegrationPayload>;
  rotateWebhookSecret(): Promise<MerchantIntegrationPayload>;
  updateWebhookUrl(webhookUrl: string): Promise<MerchantIntegrationPayload>;
  testWebhook(): Promise<MerchantWebhookTestPayload>;
  listDeliveries(): Promise<MerchantWebhookDeliveryPayload[]>;
  retryDelivery(deliveryId: string): Promise<MerchantWebhookRetryPayload>;
}

export interface MerchantIntegrationPayload {
  merchant_id: string;
  api_base_url?: string | undefined;
  public_key: string;
  secret_key_masked?: string | null | undefined;
  secret_key_once?: string | undefined;
  secret_key_show_once?: boolean | undefined;
  secret_key_created_at?: string | null | undefined;
  secret_key_last_rotated_at?: string | null | undefined;
  webhook_secret_masked?: string | null | undefined;
  webhook_secret_once?: string | undefined;
  webhook_secret_show_once?: boolean | undefined;
  webhook_secret_created_at?: string | null | undefined;
  webhook_secret_last_rotated_at?: string | null | undefined;
  webhook_url?: string | null | undefined;
  webhook_status?: 'not_configured' | 'active' | 'problem' | string | undefined;
  integration_type?: 'web' | 'android' | 'both' | string | undefined;
  public_webhook_events?: string[] | undefined;
  payment_confirmed_after_manual_confirmation?: boolean | undefined;
  official_bank_confirmation?: false | undefined;
}

export interface MerchantWebhookDeliveryPayload {
  event_id: string;
  event_type: string;
  delivery_id: string;
  status: string;
  attempts: number;
  last_http_status?: number | null | undefined;
  created_at: string;
  delivered_at?: string | null | undefined;
  next_retry_at?: string | null | undefined;
  safe_error_summary?: string | null | undefined;
}

export interface MerchantWebhookTestPayload {
  status: 'test_queued' | 'action_required' | string;
  delivery_id?: string | undefined;
  event_id?: string | undefined;
  safe_status: string;
  test_only: true;
  triggers_fulfillment: false;
  official_bank_confirmation: false;
}

export interface MerchantWebhookRetryPayload {
  status: 'retry_queued' | 'not_found' | 'not_retryable' | string;
  delivery_id?: string | undefined;
  replay_of_delivery_id?: string | undefined;
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

export interface MerchantServerBearerOptions {
  environment: string;
  checkoutMerchantId: string;
  explicitToken?: string | undefined;
  allowDevFallback?: boolean | undefined;
}

const defaultRecipient: CheckoutRecipient = {
  name: 'Compte marchand',
  bank: 'Banque du marchand',
  accountMasked: '**** 0000'
};

export function buildWebServer(options: WebServerOptions): FastifyInstance {
  const server = Fastify({ logger: true });
  server.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_request, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(String(body))));
  });
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
  const checkoutMerchantId = process.env.CHECKOUT_MERCHANT_ID ?? 'mch_dev';
  const merchantServerBearerToken = resolveMerchantServerBearerToken({
    environment: options.environment,
    checkoutMerchantId,
    explicitToken: process.env.MERCHANT_INTEGRATION_BEARER_TOKEN,
    allowDevFallback: process.env.SWIMPAY_ALLOW_DEV_MERCHANT_SESSION !== 'false'
  });
  const checkoutSessionProvider = options.checkoutSessionProvider ?? new ApiCheckoutSessionProvider(apiBaseUrl, checkoutMerchantId);
  const adminEvidenceClient = options.adminEvidenceClient ?? new ApiAdminEvidenceClient(apiBaseUrl, process.env.SWIMPAY_ADMIN_TOKEN ?? 'change_me');
  const adminIntelligenceClient = options.adminIntelligenceClient ?? new ApiAdminIntelligenceClient(apiBaseUrl, process.env.SWIMPAY_ADMIN_TOKEN ?? 'change_me');
  const merchantRouteAdminClient = options.merchantRouteAdminClient
    ?? (merchantServerBearerToken ? new ApiMerchantRouteAdminClient(apiBaseUrl, merchantServerBearerToken) : null);
  const merchantIntegrationClient = options.merchantIntegrationClient === undefined
    ? createDefaultMerchantIntegrationClient(apiBaseUrl, merchantServerBearerToken)
    : options.merchantIntegrationClient;

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
    if (!merchantRouteAdminClient) {
      reply.status(503).type('text/html; charset=utf-8');
      return renderMerchantRoutesUnavailableScreen();
    }
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
    if (!merchantRouteAdminClient) {
      return reply.status(303).redirect('/merchant/receiving-methods?result=unavailable');
    }
    await merchantRouteAdminClient.createRoute((request.body ?? {}) as MerchantRoutePayload);
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.post('/merchant/receiving-methods/:routeId/disable', async (request, reply) => {
    if (!merchantRouteAdminClient) {
      return reply.status(303).redirect('/merchant/receiving-methods?result=unavailable');
    }
    await merchantRouteAdminClient.updateRoute((request.params as RouteParams).routeId, { enabled: false });
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.post('/merchant/receiving-methods/:routeId/recommend', async (request, reply) => {
    if (!merchantRouteAdminClient) {
      return reply.status(303).redirect('/merchant/receiving-methods?result=unavailable');
    }
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

  server.get('/merchant/developer-integration', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantIntegrationWizard(merchantIntegrationClient);
  });

  server.post('/merchant/developer-integration/keys', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantIntegrationAction(merchantIntegrationClient, (client) => client.ensureKeys(), 'Clé secrète créée.');
  });

  server.post('/merchant/developer-integration/keys/rotate', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantIntegrationAction(merchantIntegrationClient, (client) => client.rotateKeys(), 'Clé secrète renouvelée.');
  });

  server.post('/merchant/developer-integration/webhook-secret/rotate', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantIntegrationAction(merchantIntegrationClient, (client) => client.rotateWebhookSecret(), 'Secret webhook renouvelé.');
  });

  server.post('/merchant/developer-integration/webhook-url', async (request, reply) => {
    const body = (request.body ?? {}) as { webhook_url?: unknown };
    const webhookUrl = typeof body.webhook_url === 'string' ? body.webhook_url : '';
    reply.type('text/html; charset=utf-8');
    return renderMerchantIntegrationAction(
      merchantIntegrationClient,
      (client) => client.updateWebhookUrl(webhookUrl),
      'URL webhook enregistrée.'
    );
  });

  server.post('/merchant/developer-integration/test-webhook', async (_request, reply) => {
    if (!merchantIntegrationClient) {
      return reply.status(303).redirect('/merchant/developer-integration?result=unavailable');
    }
    await merchantIntegrationClient.testWebhook().catch(() => null);
    return reply.status(303).redirect('/merchant/developer-integration?result=test-webhook');
  });

  server.post('/merchant/developer-integration/webhook-deliveries/:deliveryId/retry', async (request, reply) => {
    if (!merchantIntegrationClient) {
      return reply.status(303).redirect('/merchant/developer-integration?result=unavailable');
    }
    const deliveryId = (request.params as { deliveryId?: string }).deliveryId;
    if (deliveryId) {
      await merchantIntegrationClient.retryDelivery(deliveryId).catch(() => null);
    }
    return reply.status(303).redirect('/merchant/developer-integration?result=retry');
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

  server.get('/admin/intelligence-review', async (_request, reply) => {
    try {
      const [feedback, unknownShapes] = await Promise.all([
        adminIntelligenceClient.getFeedback(),
        adminIntelligenceClient.getUnknownShapes()
      ]);
      reply.type('text/html; charset=utf-8');
      return renderIntelligenceReviewScreen(feedback, unknownShapes);
    } catch {
      reply.status(503).type('text/html; charset=utf-8');
      return renderIntelligenceUnavailableScreen();
    }
  });

  // Keep old path for backward compatibility if needed by existing tests, but redirect
  server.get('/admin/merchant-receiving-routes', async (_request, reply) => {
    if (!merchantRouteAdminClient) {
      reply.status(503).type('text/html; charset=utf-8');
      return renderMerchantRoutesUnavailableScreen();
    }
    reply.type('text/html; charset=utf-8');
    const routes = await merchantRouteAdminClient.listRoutes();
    return renderMerchantReceivingMethodsScreen(routes);
  });

  server.post('/admin/merchant-receiving-routes', async (request, reply) => {
    if (!merchantRouteAdminClient) {
      return reply.status(303).redirect('/admin/merchant-receiving-routes?result=unavailable');
    }
    await merchantRouteAdminClient.createRoute((request.body ?? {}) as MerchantRoutePayload);
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.post('/admin/merchant-receiving-routes/:routeId/disable', async (request, reply) => {
    if (!merchantRouteAdminClient) {
      return reply.status(303).redirect('/admin/merchant-receiving-routes?result=unavailable');
    }
    await merchantRouteAdminClient.updateRoute((request.params as RouteParams).routeId, { enabled: false });
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.post('/admin/merchant-receiving-routes/:routeId/recommend', async (request, reply) => {
    if (!merchantRouteAdminClient) {
      return reply.status(303).redirect('/admin/merchant-receiving-routes?result=unavailable');
    }
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
    let session = await checkoutSessionProvider.getCheckoutSession(paymentSessionId);
    if (!session) return reply.status(404).send({ error: 'not_found' });
    if (
      session.status === 'receiver_arming' &&
      session.payment_method &&
      session.selected_receiver_bank_id &&
      session.selected_receiving_route_id &&
      session.selected_payer_bank_launcher_id &&
      !session.payment_instructions_shown_at
    ) {
      session = await checkoutSessionProvider.markPaymentInstructionsShown(paymentSessionId);
    }
    const [receiverBanks, payerBankLaunchers] = await Promise.all([
      checkoutSessionProvider.getReceiverBanks(paymentSessionId),
      checkoutSessionProvider.getPayerBankLaunchers(paymentSessionId)
    ]);
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

  server.post('/checkout/:paymentSessionId/expected-payment-profile', async (request, reply) => {
    const params = request.params as { paymentSessionId: string };
    const body = request.body as ExpectedPaymentProfileFormPayload;
    await checkoutSessionProvider.submitExpectedPaymentProfile(params.paymentSessionId, body);
    return reply.status(303).redirect(`/checkout/${encodeURIComponent(params.paymentSessionId)}`);
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

  server.post('/checkout/:paymentSessionId/continue-to-bank', async (request, reply) => {
    const session = await checkoutSessionProvider.markReceiverArmed((request.params as PaymentSessionParams).paymentSessionId);
    return reply.status(200).send(toCheckoutStatusResponse(session));
  });

  server.post('/checkout/:paymentSessionId/claimed-paid', async (request, reply) => {
    return reply.status(202).send(await checkoutSessionProvider.markBuyerClaimedPaid((request.params as PaymentSessionParams).paymentSessionId));
  });

  return server;
}

async function renderMerchantIntegrationWizard(client: MerchantIntegrationClient | null): Promise<string> {
  if (!client) {
    return renderDeveloperIntegrationWizardScreen({ unavailable: true, integration: null, deliveries: [] });
  }
  try {
    const [integration, deliveries] = await Promise.all([client.getIntegration(), client.listDeliveries()]);
    return renderDeveloperIntegrationWizardScreen({ integration, deliveries });
  } catch {
    return renderDeveloperIntegrationWizardScreen({ unavailable: true, integration: null, deliveries: [] });
  }
}

async function renderMerchantIntegrationAction(
  client: MerchantIntegrationClient | null,
  action: (client: MerchantIntegrationClient) => Promise<MerchantIntegrationPayload>,
  actionMessage: string
): Promise<string> {
  if (!client) {
    return renderDeveloperIntegrationWizardScreen({
      unavailable: true,
      integration: null,
      deliveries: [],
      actionMessage: 'Service momentanément indisponible.'
    });
  }
  try {
    const integration = await action(client);
    const deliveries = await client.listDeliveries().catch(() => []);
    return renderDeveloperIntegrationWizardScreen({ integration, deliveries, actionMessage });
  } catch {
    return renderDeveloperIntegrationWizardScreen({
      unavailable: true,
      integration: null,
      deliveries: [],
      actionMessage: 'Action non enregistrée. Réessayez plus tard.'
    });
  }
}

// Logic & Providers

export class ApiCheckoutSessionProvider implements CheckoutSessionProvider {
  constructor(private url: string, checkoutMerchantId: string) {
    void checkoutMerchantId;
  }
  private async f<T>(p: string, i: RequestInit = {}): Promise<T> {
    const r = await fetch(this.url + p, { ...i, headers: { ...i.headers, 'Content-Type': 'application/json' } });
    if (!r.ok) throw new Error('API Error');
    return r.json() as Promise<T>;
  }
  async getCheckoutSession(id: string) { return this.f<CheckoutSession>(`/v1/payment-sessions/${id}`).catch(() => null); }
  async getReceiverBanks(id: string) { return this.f<ReceiverBanksPayload>(`/v1/checkout/${id}/receiver-banks`); }
  async submitExpectedPaymentProfile(id: string, body: ExpectedPaymentProfileFormPayload) { return this.f<CheckoutSession>(`/v1/checkout/${id}/expected-payment-profile`, { method: 'POST', body: JSON.stringify(body) }); }
  async selectReceiverBank(id: string, bId: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/receiver-bank`, { method: 'POST', body: JSON.stringify({ receiver_bank_id: bId }) }); }
  async getReceivingRoutes(id: string, bPId: string) { return this.f<ReceivingRoutesPayload>(`/v1/checkout/${id}/receiver-banks/${bPId}/routes`); }
  async selectReceivingRoute(id: string, rId: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/receiving-route`, { method: 'POST', body: JSON.stringify({ receiving_route_id: rId }) }); }
  async getReceivingRouteCopyDetails(id: string) { return this.f<ReceivingRouteCopyDetailsPayload>(`/v1/checkout/${id}/receiving-route/copy-details`); }
  async saveBuyerSenderPhoneHint(id: string, ph: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/buyer-sender-phone`, { method: 'POST', body: JSON.stringify({ buyer_sender_phone: ph }) }); }
  async getPayerBankLaunchers(id: string) { return this.f<PayerBankLaunchersPayload>(`/v1/checkout/${id}/payer-bank-launchers`); }
  async selectPayerBankLauncher(id: string, lId: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/payer-bank-launcher`, { method: 'POST', body: JSON.stringify({ payer_bank_launcher_id: lId }) }); }
  async markReceiverArmed(id: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/continue-to-bank`, { method: 'POST' }); }
  async markPaymentInstructionsShown(id: string) { return this.f<CheckoutSession>(`/v1/checkout/${id}/payment-instructions-shown`, { method: 'POST' }); }
  async markBuyerClaimedPaid(id: string) { return this.f<CheckoutClaimedPaidResponse>(`/v1/checkout/${id}/claimed-paid`, { method: 'POST' }); }
}

function toMerchantRouteAdminRoute(method: MerchantReceivingMethodApiPayload): MerchantRouteAdminRoute {
  const type = method.type ?? 'card';
  const label = method.label ?? (type === 'phone' ? 'Telephone SBP' : 'Carte bancaire');
  return {
    route_id: method.id ?? method.route_id ?? '',
    bank_profile_id: method.bank_id ?? method.bank_profile_id ?? '',
    rail_type: type === 'phone' ? 'phone_transfer' : 'card_transfer',
    receiver_identifier_type: type === 'phone' ? 'phone' : 'card',
    receiver_identifier_masked: method.masked_value ?? method.receiver_identifier_masked ?? '',
    route_code: label,
    display_label: label,
    enabled: method.status !== 'inactive',
    recommended: Boolean(method.is_default),
    review_policy: type === 'phone' ? 'eligible_low_risk_later' : 'review_first',
    updated_at: method.updated_at ?? method.created_at
  };
}

function toReceivingMethodCreatePayload(input: MerchantRoutePayload): MerchantRoutePayload {
  const railType = String(input.rail_type ?? '');
  const type = input.type === 'phone' || railType === 'phone_transfer' ? 'phone' : 'card';
  return {
    type,
    value: input.value ?? input.receiver_identifier,
    bank_id: input.bank_id ?? input.bank_profile_id,
    label: input.label ?? input.display_label,
    is_default: input.is_default ?? input.recommended,
    status: input.status ?? (input.enabled === false ? 'inactive' : 'active')
  };
}

function toReceivingMethodPatchPayload(input: MerchantRoutePayload): MerchantRoutePayload {
  const patch: MerchantRoutePayload = {};
  if (input.enabled === false || input.status === 'inactive') {
    patch.status = 'inactive';
  } else if (input.enabled === true || input.status === 'active') {
    patch.status = 'active';
  }
  if (input.recommended === true || input.is_default === true) {
    patch.is_default = true;
  } else if (input.recommended === false || input.is_default === false) {
    patch.is_default = false;
  }
  if (typeof input.display_label === 'string' || typeof input.label === 'string') {
    patch.label = input.label ?? input.display_label;
  }
  return patch;
}

export class ApiMerchantRouteAdminClient implements MerchantRouteAdminClient {
  constructor(private url: string, private bearerToken: string) {}

  async listRoutes() {
    const r = await this.request<{ methods?: MerchantReceivingMethodApiPayload[]; routes?: MerchantRouteAdminRoute[] }>(
      '/v1/merchant/receiving-methods'
    );
    if (Array.isArray(r.methods)) {
      return r.methods.map(toMerchantRouteAdminRoute);
    }
    return r.routes || [];
  }

  async createRoute(input: MerchantRoutePayload) {
    const response = await this.request<{ method?: MerchantReceivingMethodApiPayload; route?: MerchantRouteAdminRoute }>(
      '/v1/merchant/receiving-methods',
      {
      method: 'POST',
        body: JSON.stringify(toReceivingMethodCreatePayload(input))
      }
    );
    return response.method ? toMerchantRouteAdminRoute(response.method) : response.route!;
  }

  async updateRoute(id: string, patch: MerchantRoutePayload) {
    const productPatch = toReceivingMethodPatchPayload(patch);
    const actionOnly = productPatch.status === 'inactive' || productPatch.is_default === true;
    const path = productPatch.status === 'inactive'
      ? `/v1/merchant/receiving-methods/${encodeURIComponent(id)}/disable`
      : productPatch.is_default === true
        ? `/v1/merchant/receiving-methods/${encodeURIComponent(id)}/set-default`
        : `/v1/merchant/receiving-methods/${encodeURIComponent(id)}`;
    const init: RequestInit = { method: actionOnly ? 'POST' : 'PATCH' };
    if (!actionOnly) {
      init.body = JSON.stringify(productPatch);
    }
    const response = await this.request<{ method?: MerchantReceivingMethodApiPayload; route?: MerchantRouteAdminRoute }>(path, init);
    return response.method ? toMerchantRouteAdminRoute(response.method) : response.route!;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.bearerToken}`);
    headers.set('Accept', 'application/json');
    if (init.body) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(this.url + path, { ...init, headers });
    if (!response.ok) {
      throw new Error(`Merchant route API returned ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}

export class ApiMerchantIntegrationClient implements MerchantIntegrationClient {
  constructor(private url: string, private bearerToken: string) {}

  async getIntegration(): Promise<MerchantIntegrationPayload> {
    return this.withApiBaseUrl(await this.request<MerchantIntegrationPayload>('/v1/merchant/integration'));
  }

  async ensureKeys(): Promise<MerchantIntegrationPayload> {
    return this.withApiBaseUrl(await this.request<MerchantIntegrationPayload>('/v1/merchant/integration/keys', { method: 'POST' }));
  }

  async rotateKeys(): Promise<MerchantIntegrationPayload> {
    return this.withApiBaseUrl(await this.request<MerchantIntegrationPayload>('/v1/merchant/integration/keys/rotate', { method: 'POST' }));
  }

  async rotateWebhookSecret(): Promise<MerchantIntegrationPayload> {
    return this.withApiBaseUrl(await this.request<MerchantIntegrationPayload>('/v1/merchant/integration/webhook-secret/rotate', { method: 'POST' }));
  }

  async updateWebhookUrl(webhookUrl: string): Promise<MerchantIntegrationPayload> {
    return this.withApiBaseUrl(await this.request<MerchantIntegrationPayload>('/v1/merchant/integration/webhook-url', {
      method: 'PUT',
      body: JSON.stringify({ webhook_url: webhookUrl })
    }));
  }

  async testWebhook(): Promise<MerchantWebhookTestPayload> {
    return this.request<MerchantWebhookTestPayload>('/v1/merchant/integration/test-webhook', { method: 'POST' });
  }

  async listDeliveries(): Promise<MerchantWebhookDeliveryPayload[]> {
    const response = await this.request<{ deliveries?: MerchantWebhookDeliveryPayload[] }>('/v1/merchant/integration/webhook-deliveries');
    return response.deliveries ?? [];
  }

  async retryDelivery(deliveryId: string): Promise<MerchantWebhookRetryPayload> {
    return this.request<MerchantWebhookRetryPayload>(
      `/v1/merchant/integration/webhook-deliveries/${encodeURIComponent(deliveryId)}/retry`,
      { method: 'POST' }
    );
  }

  private withApiBaseUrl(payload: MerchantIntegrationPayload): MerchantIntegrationPayload {
    return { ...payload, api_base_url: this.url };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.bearerToken}`);
    headers.set('Accept', 'application/json');
    if (init.body) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(this.url + path, { ...init, headers });
    if (!response.ok) {
      throw new Error(`Merchant integration API returned ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}

function createDefaultMerchantIntegrationClient(apiBaseUrl: string, bearerToken: string | null): MerchantIntegrationClient | null {
  if (!bearerToken) {
    return null;
  }
  return new ApiMerchantIntegrationClient(apiBaseUrl, bearerToken);
}

export function resolveMerchantServerBearerToken(options: MerchantServerBearerOptions): string | null {
  const explicitToken = options.explicitToken?.trim();
  if (explicitToken) {
    if (options.environment === 'production' && isLocalDevMerchantBearerToken(explicitToken)) {
      return null;
    }
    return explicitToken;
  }

  if (options.environment === 'production' || options.allowDevFallback === false) {
    return null;
  }

  const merchantId = options.checkoutMerchantId.replace(/^test_/u, '');
  return `test_${merchantId}`;
}

function isLocalDevMerchantBearerToken(token: string): boolean {
  return /^test_[A-Za-z0-9_-]+$/u.test(token);
}

export class ApiAdminEvidenceClient implements AdminEvidenceClient {
  constructor(private url: string, private tkn: string) {}
  async getDashboard() { return (await fetch(this.url + '/v1/admin/bank-evidence/review-dashboard', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
  async getAuditEvents() { return (await fetch(this.url + '/v1/admin/audit-events', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
}

export class ApiAdminIntelligenceClient implements AdminIntelligenceClient {
  constructor(private url: string, private tkn: string) {}
  async getFeedback() { return (await fetch(this.url + '/v1/admin/intelligence/feedback', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
  async getUnknownShapes() { return (await fetch(this.url + '/v1/admin/intelligence/unknown-shapes', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
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
  if (['manual_confirmed', 'fulfilled'].includes(s)) return { displayStatus: 'Reconnu', resultState: 'recognized' };
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
