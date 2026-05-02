import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';

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
}

export interface WebServerOptions {
  environment: string;
  checkoutSessionProvider?: CheckoutSessionProvider | undefined;
  recipient?: CheckoutRecipient | undefined;
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
  display_status: string;
  result_state: 'pending' | 'review' | 'recognized' | 'rejected' | 'expired';
  amount: {
    value: string;
    currency: string;
  };
  reference: string;
  expires_at: string;
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

    const session = await checkoutSessionProvider.getCheckoutSession(paymentSessionId);
    if (!session) {
      return reply.status(404).send({ error: { code: 'not_found', message: 'Checkout session was not found.' } });
    }

    reply.type('text/html; charset=utf-8');
    return renderCheckoutPage(session, recipient);
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

  server.post('/checkout/:paymentSessionId/claimed-paid', async (request, reply) => {
    const params = request.params as { paymentSessionId?: string };
    const paymentSessionId = params.paymentSessionId;
    if (!paymentSessionId) {
      return reply.status(400).send({ error: { code: 'invalid_request', message: 'Payment session id is required.' } });
    }

    return reply.status(202).send({
      payment_session_id: paymentSessionId,
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      next_status: 'Recherche du signal bancaire'
    });
  });

  return server;
}

export class ApiCheckoutSessionProvider implements CheckoutSessionProvider {
  public constructor(private readonly apiBaseUrl: string) {}

  public async getCheckoutSession(paymentSessionId: string): Promise<CheckoutSession | null> {
    const response = await fetch(`${this.apiBaseUrl}/v1/payment-sessions/${encodeURIComponent(paymentSessionId)}`, {
      headers: {
        authorization: `Bearer test_${process.env.CHECKOUT_MERCHANT_ID ?? 'mch_dev'}`
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Checkout session API returned ${response.status}`);
    }

    return (await response.json()) as CheckoutSession;
  }
}

export function toCheckoutStatusResponse(session: CheckoutSession): CheckoutStatusResponse {
  const status = mapCheckoutStatus(session.status);
  return {
    payment_session_id: session.payment_session_id,
    order_id: session.order_id,
    status: session.status,
    display_status: status.displayStatus,
    result_state: status.resultState,
    amount: session.amount,
    reference: session.reference,
    expires_at: session.expires_at
  };
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

function renderCheckoutPage(session: CheckoutSession, recipient: CheckoutRecipient): string {
  const status = mapCheckoutStatus(session.status);
  const amount = `${escapeHtml(session.amount.value)} ${escapeHtml(session.amount.currency)}`;
  const productName = escapeHtml(session.product_name ?? 'Commande SwimPay');
  const reference = escapeHtml(session.reference);
  const sessionId = escapeHtml(session.payment_session_id);

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
    `<p class="eyebrow">Paiement par transfert bancaire</p>`,
    `<h1 id="checkout-title">${productName}</h1>`,
    '<p class="safe-copy">SwimPay reconnait le paiement a partir du signal de reception cote marchand.</p>',
    '</section>',
    '<section class="checkout-grid" aria-label="Parcours de paiement">',
    renderStep('1', 'Resume', [
      row('Montant exact', amount),
      row('Methode', 'Transfert bancaire'),
      row('Statut', status.displayStatus),
      `<p class="timer" data-expires-at="${escapeHtml(session.expires_at)}">Temps restant: <span id="countdown">calcul...</span></p>`
    ]),
    renderStep('2', 'Identite acheteur', [
      '<label class="field-label" for="buyer-phone">Numero utilise dans votre app bancaire</label>',
      '<input id="buyer-phone" class="input" name="buyer-phone" inputmode="tel" autocomplete="tel" placeholder="+7 *** *** **67">',
      '<p class="help">Ce numero sert uniquement a reconnaitre votre paiement. SwimPay ne lit pas votre telephone et ne se connecte pas a votre banque.</p>',
      '<label class="field-label" for="buyer-name">Nom/prenom utilise dans la banque</label>',
      '<input id="buyer-name" class="input" name="buyer-name" autocomplete="name" placeholder="Optionnel">'
    ]),
    renderStep('3', 'Instructions de paiement', [
      row('Destinataire', escapeHtml(recipient.name)),
      row('Banque', escapeHtml(recipient.bank)),
      row('Compte', escapeHtml(recipient.accountMasked)),
      row('Montant', amount),
      row('Reference', reference),
      `<button class="button secondary" type="button" data-copy="${amount}">Copier le montant</button>`,
      `<button class="button secondary" type="button" data-copy="${reference}">Copier la reference</button>`,
      '<button class="button secondary" type="button" aria-disabled="true">Ouvrir la banque</button>',
      `<button id="paid-button" class="button primary" type="button" data-session-id="${sessionId}" data-does-not-confirm="true">J&#39;ai paye</button>`,
      '<p class="help">Ce bouton signale seulement que vous avez lance le transfert. Il ne valide pas le paiement.</p>'
    ]),
    renderStep('4', 'Attente', [
      `<p id="status-text" class="status-pill" data-status="${session.status}">${status.displayStatus}</p>`,
      '<p class="help">Le statut vient du backend SwimPay et peut demander une verification manuelle.</p>'
    ]),
    renderStep('5', 'Resultat', [
      `<p id="result-text">${resultText(status.resultState)}</p>`
    ]),
    '</section>',
    '</main>',
    checkoutScript(sessionId),
    '</body>',
    '</html>'
  ].join('');
}

function renderStep(index: string, title: string, children: string[]): string {
  return `<article class="step"><div class="step-index">${index}</div><div><h2>${title}</h2>${children.join('')}</div></article>`;
}

function row(label: string, value: string): string {
  return `<div class="row"><span>${label}</span><strong>${value}</strong></div>`;
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
      return 'Paiement reconnu par SwimPay. Produit active.';
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
  if (state === 'recognized') return 'Paiement reconnu par SwimPay. Produit active.';
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
  });
});

paidButton?.addEventListener('click', async () => {
  paidButton.setAttribute('disabled', 'disabled');
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
.checkout-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.step { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 14px; border: 1px solid #d8e0e3; border-radius: 8px; background: #fff; padding: 18px; min-height: 180px; }
.step-index { width: 32px; height: 32px; border-radius: 50%; background: #0f766e; color: #fff; display: grid; place-items: center; font-weight: 700; }
.row { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #eef2f3; padding: 10px 0; }
.row span { color: #65747a; }
.row strong { text-align: right; }
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
