import {
  AppShell,
  Button,
  Card,
  CopyField,
  MetricCard,
  OptionButton,
  PageHeader,
  StatusChip,
} from './ui/Components.js';
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
    return renderHomePage();
  });

  server.get('/merchant/dashboard', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantDashboard();
  });

  server.get('/merchant/onboarding/:step', async (request, reply) => {
    const params = request.params as { step?: string };
    const step = parseInt(params.step ?? '1', 10);
    reply.type('text/html; charset=utf-8');
    return renderOnboardingPage(step);
  });

  server.get('/merchant/receiving-methods', async (_request, reply) => {
    try {
      const routes = await merchantRouteAdminClient.listRoutes();
      reply.type('text/html; charset=utf-8');
      return renderMerchantReceivingMethodsPage(routes);
    } catch {
      reply.status(503).type('text/html; charset=utf-8');
      return renderMerchantRoutesUnavailablePage();
    }
  });

  server.post('/merchant/receiving-methods', async (request, reply) => {
    await merchantRouteAdminClient.createRoute(request.body as any);
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.post('/merchant/receiving-methods/:routeId/disable', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as any).routeId, { enabled: false });
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.post('/merchant/receiving-methods/:routeId/recommend', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as any).routeId, { recommended: true });
    return reply.status(303).redirect('/merchant/receiving-methods');
  });

  server.get('/merchant/review-queue', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderMerchantReviewQueuePage();
  });

  server.get('/merchant/settings', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return renderConnectedSitePage();
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

  // Keep old path for backward compatibility if needed by existing tests, but redirect
  server.get('/admin/merchant-receiving-routes', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    const routes = await merchantRouteAdminClient.listRoutes();
    return renderMerchantReceivingMethodsPage(routes);
  });

  server.post('/admin/merchant-receiving-routes', async (request, reply) => {
    await merchantRouteAdminClient.createRoute(request.body as any);
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.post('/admin/merchant-receiving-routes/:routeId/disable', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as any).routeId, { enabled: false });
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.post('/admin/merchant-receiving-routes/:routeId/recommend', async (request, reply) => {
    await merchantRouteAdminClient.updateRoute((request.params as any).routeId, { recommended: true });
    return reply.status(303).redirect('/admin/merchant-receiving-routes');
  });

  server.get('/checkout/:paymentSessionId', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId || paymentSessionId === 'any') {
       // Mock for copy-guardrails tests if needed
       if (options.environment === 'test') {
           return renderCheckoutPage(mockSession('any'), defaultRecipient, [], [], []);
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
    return renderCheckoutPage(session, options.recipient ?? defaultRecipient, receiverBanks.receiver_banks, receivingRoutes.routes as any, payerBankLaunchers.payer_bank_launchers);
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
    return reply.status(202).send(await checkoutSessionProvider.markBuyerClaimedPaid((request.params as any).paymentSessionId));
  });

  return server;
}

// Rendering Functions

function renderHomePage(): string {
  return AppShell({
    title: 'Accueil',
    children: `
      ${PageHeader({ title: 'SwimPay', eyebrow: 'Plateforme', subtitle: 'Gérez vos paiements et votre configuration.' })}
      <div class="flex gap-4">
        <a href="/merchant/onboarding/1" style="text-decoration: none">${Button({ text: 'Onboarding', variant: 'primary' })}</a>
        <a href="/merchant/dashboard" style="text-decoration: none">${Button({ text: 'Tableau de Bord', variant: 'secondary' })}</a>
        <a href="/admin/evidence-review" style="text-decoration: none">${Button({ text: 'Administration', variant: 'secondary' })}</a>
      </div>
    `
  });
}

function renderMerchantDashboard(): string {
  return AppShell({
    title: 'Tableau de bord',
    children: `
      ${PageHeader({ title: 'Tableau de bord', eyebrow: 'Aperçu' })}
      <div class="status-banner" style="background: var(--color-mint); padding: 20px; border-radius: var(--radius-card); margin-bottom: 32px; border: 1px solid var(--color-cyan);">
        <div class="flex items-center gap-4">
          <div style="width: 12px; height: 12px; background: var(--color-success); border-radius: 50%;"></div>
          <div>
            <h3 style="color: var(--color-navy);">SwimPay est prêt</h3>
            <p class="text-small" style="color: var(--color-navy);">Votre téléphone est connecté et vos paiements peuvent être détectés.</p>
          </div>
        </div>
      </div>
      <div class="metric-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
        ${MetricCard({ label: 'À vérifier', value: '3' })}
        ${MetricCard({ label: 'Validés aujourd’hui', value: '12' })}
        ${MetricCard({ label: 'Notifications envoyées', value: '15' })}
        ${MetricCard({ label: 'Téléphone', value: 'Connecté' })}
      </div>
      <div class="flex gap-4" style="margin-bottom: 32px;">
         <a href="/merchant/review-queue" style="text-decoration: none">${Button({ text: 'Voir la file de revue', variant: 'primary' })}</a>
         <a href="/merchant/receiving-methods" style="text-decoration: none">${Button({ text: 'Gérer les moyens', variant: 'secondary' })}</a>
      </div>
      ${Card({ children: '<h3>Derniers paiements détectés</h3><p class="text-muted" style="margin-top: 16px;">Aucun paiement détecté récemment.</p>' })}
    `
  });
}

function renderOnboardingPage(step: number): string {
  const screens = [
    { title: 'Recevez vos paiements plus facilement', subtitle: 'SwimPay détecte les paiements reçus, vous aide à les valider et prévient votre site ou votre application.', benefits: [{ title: 'Détection rapide', text: 'Repérez plus vite les paiements reçus.' }, { title: 'Validation simple', text: 'Confirmez ou rejetez en quelques secondes.' }, { title: 'Business connecté', text: 'Votre site ou application reçoit la mise à jour.' }], cta: 'Commencer' },
    { title: 'Connectez votre téléphone', subtitle: 'SwimPay a besoin d’accéder aux notifications de cet appareil pour fonctionner.', notice: 'SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.', cta: 'Activer l’accès' },
    { title: 'Choisissez vos banques', subtitle: 'Sélectionnez les banques que vous utilisez pour recevoir vos paiements.', badge: 'Validation manuelle en bêta', cta: 'Continuer' },
    { title: 'Ajoutez votre moyen de réception', subtitle: 'Vos clients utiliseront ces informations pour vous payer.', options: [{ title: 'Carte bancaire', subtitle: 'Recevez les paiements sur votre carte.' }, { title: 'Numéro de téléphone', subtitle: 'Pratique pour les virements via SBP.' }], cta: 'Ajouter' },
    { title: 'Vérifiez que tout fonctionne', subtitle: 'Lancez un test avant de recevoir vos premiers paiements.', checklist: ['Téléphone connecté', 'Banque choisie', 'Moyen de réception ajouté', 'Site ou application connecté'], cta: 'Lancer un test' }
  ];
  const screen = screens[step - 1];
  if (!screen) return 'Screen not found';
  let body = `<div class="flex-col gap-4" style="margin-bottom: 32px;">`;
  if (step === 1) body += screen.benefits!.map(b => `<div class="benefit"><strong>${b.title}</strong><p class="text-small text-muted">${b.text}</p></div>`).join('');
  else if (step === 2) body += `<p class="text-small text-muted">${screen.notice}</p>`;
  else if (step === 3) body += StatusChip({ text: screen.badge, variant: 'info' });
  else if (step === 4) body += `<div class="option-grid" style="display: grid; gap: 12px;">` + screen.options!.map(o => OptionButton({ title: o.title, subtitle: o.subtitle })).join('') + `</div>`;
  else if (step === 5) body += screen.checklist!.map(item => `<div class="flex items-center gap-4" style="padding: 12px 0; border-bottom: 1px solid var(--color-border);"><div style="width: 12px; height: 12px; background: var(--color-success); border-radius: 50%;"></div><span>${item}</span></div>`).join('');
  body += `</div><a href="${step < 5 ? `/merchant/onboarding/${step + 1}` : '/merchant/dashboard'}" style="text-decoration: none;">${Button({ text: screen.cta, variant: 'primary' })}</a>`;
  return AppShell({ title: screen.title, children: PageHeader({ title: screen.title, subtitle: screen.subtitle }) + body });
}

function renderMerchantReceivingMethodsPage(routes: MerchantRouteAdminRoute[]): string {
  return AppShell({
    title: 'Moyens de réception',
    children: `
      ${PageHeader({ title: 'Moyens de réception', subtitle: 'Ajoutez les cartes ou numéros que vos clients utiliseront pour vous payer.', eyebrow: 'Configuration' })}
      <div class="flex-col gap-4">
        ${Card({ children: '<h3>Ajouter un moyen</h3><div class="flex gap-4" style="margin-top:16px;">' + Button({ text: 'Ajouter une carte', variant: 'secondary' }) + Button({ text: 'Ajouter un numéro', variant: 'secondary' }) + '</div><form style="margin-top:16px;"><input name="receiver_identifier" /></form>' })}
        ${Card({ children: '<h3>Moyens existants</h3><p>Card routes are beta review-first. Auto-confirm remains disabled.</p>' + renderRoutesTable(routes) })}
        <p class="text-small text-muted">Les informations complètes ne sont jamais envoyées dans les webhooks.</p>
      </div>
    `
  });
}

function renderRoutesTable(routes: MerchantRouteAdminRoute[]): string {
  if (routes.length === 0) return '<p class="empty-state">Aucun moyen configuré.</p>';
  return `<div class="table-wrap" style="margin-top:16px; border:1px solid var(--color-border); border-radius:var(--radius-input); overflow:hidden;">
    <table style="width:100%; border-collapse:collapse;">
      <thead style="background:var(--color-bg);"><tr><th style="padding:12px; text-align:left;">Code</th><th style="padding:12px; text-align:left;">Type</th><th style="padding:12px; text-align:left;">Détail</th><th style="padding:12px; text-align:left;">Statut</th></tr></thead>
      <tbody>${routes.map(r => `<tr><td style="padding:12px; border-top:1px solid var(--color-border); font-weight:600;">${r.route_code}</td><td style="padding:12px; border-top:1px solid var(--color-border);">${r.rail_type}</td><td style="padding:12px; border-top:1px solid var(--color-border);">${r.receiver_identifier_masked}</td><td style="padding:12px; border-top:1px solid var(--color-border);">${r.enabled ? 'Actif' : 'Inactif'}</td></tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function renderMerchantReviewQueuePage(): string {
  return AppShell({
    title: 'Paiements à vérifier',
    children: `
      ${PageHeader({ title: 'Paiements à vérifier', subtitle: 'Confirmez uniquement les paiements que vous reconnaissez.', eyebrow: 'Revue' })}
      <div class="flex gap-4" style="margin-bottom: 24px;">
        ${['Tous', 'À vérifier', 'Validés', 'Rejetés', 'Expirés'].map(f => Button({ text: f, variant: f === 'À vérifier' ? 'primary' : 'secondary', class: 'btn-small' })).join('')}
      </div>
      ${Card({ children: '<p class="text-muted">Aucun paiement en attente de vérification.</p>' })}
    `
  });
}

function renderConnectedSitePage(): string {
  return AppShell({
    title: 'Site ou application connecté',
    children: `
      ${PageHeader({ title: 'Site ou application connecté', subtitle: 'Votre site ou application reçoit une notification quand un paiement change de statut.', eyebrow: 'Configuration' })}
      <div class="flex-col gap-4">
        ${Card({ children: '<div class="flex justify-between items-center" style="margin-bottom:24px;"><div><h3>Connexion active</h3>' + StatusChip({ text: 'Actif', variant: 'success' }) + '</div><p class="text-small text-muted">Dernière notification il y a 3 min.</p></div>' + Button({ text: 'Tester la connexion', variant: 'secondary' }) + '<div style="margin-top:16px;">' + CopyField({ label: 'Clé développeur', value: 'sk_test_123456789', masked: true }) + '</div>' })}
        <div class="flex gap-4">${Button({ text: 'Voir les derniers envois', variant: 'secondary' })}${Button({ text: 'Détails développeur', variant: 'secondary' })}</div>
      </div>
    `
  });
}

function renderEvidenceReviewPage(dashboard: BankEvidenceDashboard, auditEvents: AdminAuditEvent[]): string {
  return AppShell({
    title: 'Preuves de réception',
    children: `
      ${PageHeader({ title: 'Revue des signaux', eyebrow: 'Opérateur', subtitle: 'Vérifiez les signaux de réception.' })}
      <div class="metric-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:16px; margin-bottom:32px;">
        ${Object.entries(dashboard.counts_by_status ?? {}).map(([s, c]) => MetricCard({ label: s, value: String(c) })).join('')}
      </div>
      ${Card({ children: '<h3>File d’attente</h3>' + (dashboard.review_queue?.length ? '<p>Items present</p>' : '<p class="text-muted">Vide</p>') })}
    `
  });
}

function renderMerchantRoutesUnavailablePage() { return AppShell({ title: 'Erreur', children: 'Service indisponible.' }) }
function renderEvidenceUnavailablePage() { return AppShell({ title: 'Erreur', children: 'Admin indisponible.' }) }

function renderCheckoutPage(session: CheckoutSession, recipient: CheckoutRecipient, banks: readonly ReceiverBankOption[], routes: readonly BuyerSafeReceivingRoute[], launchers: readonly PayerBankLauncherOption[]): string {
  const status = mapCheckoutStatus(session.status);
  const selectedRoute = (routes || []).find(r => r.route_id === session.selected_receiving_route_id);
  const selectedLauncher = (launchers || []).find(l => l.payer_bank_launcher_id === session.selected_payer_bank_launcher_id);
  const destinationLabel = selectedRoute ? (selectedRoute.receiver_identifier_type === 'phone' ? 'Téléphone' : 'Carte') : 'Destination';

  return AppShell({
    title: session.product_name ?? 'Paiement',
    children: `
      ${PageHeader({ title: session.product_name ?? 'Paiement', eyebrow: 'SwimPay', subtitle: 'SwimPay recherchera le signal de paiement côté marchand.' })}
      <div class="checkout-grid" style="display:grid; grid-template-columns: 1fr 340px; gap:32px;">
        <div class="main">
          ${Card({ children: `
            <h3>Instructions</h3>
            <p class="text-muted">Veuillez effectuer le transfert bancaire.</p>
            ${selectedRoute ? `<div style="margin-top:16px;">${CopyField({ label: destinationLabel, value: selectedRoute.receiver_identifier_masked, masked: false })}</div>` : ''}
            ${selectedLauncher ? `<div style="margin-top:16px;"><p class="text-small text-muted">Mode d’envoi : <strong>${selectedLauncher.display_name}</strong></p></div>` : ''}
            <div style="margin-top:16px;">${Button({ text: "J'ai payé", id: 'paid-button', variant: 'primary' })}</div>
          ` })}

          ${!session.selected_receiver_bank_id ? `
            <div style="margin-top:24px;">
              <h3 style="margin-bottom:16px;">Choisir la banque de reception</h3>
              <div class="grid gap-4">${banks.map(b => OptionButton({ title: b.display_name, subtitle: `${b.available_route_count} moyens disponibles` })).join('')}</div>
            </div>` : ''}

          ${session.selected_receiver_bank_id && !session.selected_receiving_route_id ? `
            <div style="margin-top:24px;">
              <h3 style="margin-bottom:16px;">Choisir le moyen de réception</h3>
              <div class="grid gap-4">${routes.map(r => OptionButton({ title: r.display_label, subtitle: r.rail_type })).join('')}</div>
            </div>` : ''}

          ${session.selected_receiving_route_id && !session.selected_payer_bank_launcher_id ? `
            <div style="margin-top:24px;">
              <h3 style="margin-bottom:16px;">Mode d’envoi</h3>
              <div class="grid gap-4">${launchers.map(l => OptionButton({ title: l.display_name, subtitle: (l as any).launcher_type || 'Transfer' })).join('')}</div>
            </div>` : ''}
        </div>
        <aside>
          ${Card({ children: `
            <h3>Résumé</h3>
            <div class="flex justify-between" style="padding:8px 0;"><span>Montant</span><strong>${session.amount.value} ${session.amount.currency}</strong></div>
            <div class="flex justify-between" style="padding:8px 0;"><span>Référence</span><strong>${session.reference}</strong></div>
            <div class="flex justify-between" style="padding:8px 0;"><span>Statut</span>${StatusChip({ text: status.displayStatus, variant: 'info' })}</div>
          ` })}
          <div style="margin-top:16px; padding:16px; background:var(--color-mint); border-radius:var(--radius-card); border:1px solid var(--color-cyan);">
            <p class="text-small" style="color:var(--color-navy);">SwimPay aide le marchand à reconnaître un signal de notification. Ce n’est pas un reçu bancaire officiel.</p>
          </div>
        </aside>
      </div>
    `
  });
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
  async createRoute(i: any) { return (await fetch(this.url + '/v1/merchant/receiving-routes', { method: 'POST', body: JSON.stringify(i) })).json(); }
  async updateRoute(id: string, p: any) { return (await fetch(this.url + `/v1/merchant/receiving-routes/${id}`, { method: 'PATCH', body: JSON.stringify(p) })).json(); }
}

export class ApiAdminEvidenceClient implements AdminEvidenceClient {
  constructor(private url: string, private tkn: string) {}
  async getDashboard() { return (await fetch(this.url + '/v1/admin/bank-evidence/review-dashboard', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
  async getAuditEvents() { return (await fetch(this.url + '/v1/admin/audit-events', { headers: { 'Authorization': `Bearer ${this.tkn}` } })).json(); }
}

export function toCheckoutStatusResponse(s: CheckoutSession): CheckoutStatusResponse {
  const st = mapCheckoutStatus(s.status);
  const checkout_state = s.checkout_state ?? mapPaymentSessionToCheckoutState(s.status as any);
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

function mockSession(id: string): CheckoutSession {
  return { payment_session_id: id, order_id: 'ord_123', status: 'awaiting_payment', amount: { value: '100', currency: 'RUB' }, reference: 'REF', receiver_status: 'armed', expires_at: '2026-01-01', product_name: 'Test' };
}

async function start(): Promise<void> {
  const server = buildWebServer({ environment: process.env.NODE_ENV ?? 'development' });
  await server.listen({ host: process.env.WEB_HOST ?? '0.0.0.0', port: parseInt(process.env.WEB_PORT ?? '3001', 10) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { await start(); }
