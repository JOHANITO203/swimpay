import {
  AppShell,
  Button,
  Card,
  CopyField,
  StatusChip,
  SwimPayBrand,
  escapeHtml
} from '../ui/Components.js';
import type { BuyerSafeReceivingRoute, PayerBankLauncherOption, ReceiverBankOption } from '@swimpay/contracts';
import type { CheckoutSession, CheckoutRecipient } from '../index.js';

type BuyerCheckoutStep = 'bank' | 'route' | 'launcher' | 'instructions';
type CheckoutStateTone = 'info' | 'success' | 'warning' | 'danger';

interface CheckoutStateView {
  title: string;
  text: string;
  tone: CheckoutStateTone;
  icon: string;
}

export function renderCheckoutPage(
  session: CheckoutSession,
  _recipient: CheckoutRecipient,
  banks: readonly ReceiverBankOption[],
  routes: readonly BuyerSafeReceivingRoute[],
  launchers: readonly PayerBankLauncherOption[],
  displayStatus: string
): string {
  const selectedRoute = routes.find((route) => route.route_id === session.selected_receiving_route_id);
  const selectedLauncher = launchers.find((launcher) => launcher.payer_bank_launcher_id === session.selected_payer_bank_launcher_id);
  const step = getCheckoutStep(session);
  const showStatePanel = step === 'instructions' || isTerminalBuyerState(session);

  return AppShell({
    title: 'Payer avec SwimPay',
    chrome: 'checkout',
    children: `<section class="screen merchant-screen buyer-checkout"><div class="screen-content buyer-checkout-content">
      ${SwimPayBrand()}
      <div class="checkout-grid">
        <div class="stack-lg">
          ${renderBuyerIntro(step)}
          ${step === 'bank' ? renderReceiverBankSelection(session, banks) : ''}
          ${step === 'route' ? renderReceivingRouteSelection(session, routes) : ''}
          ${step === 'launcher' ? renderPayerLauncherSelection(session, launchers) : ''}
          ${step === 'instructions' ? renderInstructions(session, selectedRoute, selectedLauncher) : ''}
          ${showStatePanel ? renderCheckoutStatePanel(session) : ''}
        </div>
        <aside class="stack checkout-side">
          ${renderCheckoutSummary(session, displayStatus)}
          ${renderDesktopQrHandoff(session)}
          <div class="checkout-note">SwimPay suit le signal côté marchand. Ce n'est pas un reçu bancaire officiel.</div>
        </aside>
      </div>
    </div></section>
    ${buyerCheckoutStyles()}`
  });
}

function getCheckoutStep(session: CheckoutSession): BuyerCheckoutStep {
  if (!session.selected_receiver_bank_id) return 'bank';
  if (!session.selected_receiving_route_id) return 'route';
  if (!session.selected_payer_bank_launcher_id) return 'launcher';
  return 'instructions';
}

function isTerminalBuyerState(session: CheckoutSession): boolean {
  return ['expired', 'rejected', 'manual_confirmed', 'auto_confirmed', 'fulfilled'].includes(session.status);
}

function renderBuyerIntro(step: BuyerCheckoutStep): string {
  if (step !== 'bank') return '';
  return Card({
    class: 'checkout-hero-card',
    children: `<p class="eyebrow">SwimPay</p>
      <h1>Payer avec SwimPay</h1>
      <p class="checkout-lead">Suivez votre paiement bancaire jusqu’à validation.</p>
      <div class="benefit-grid">
        ${renderBenefit('P', 'Paiement guidé')}
        ${renderBenefit('T', 'Suivi en temps réel')}
        ${renderBenefit('M', 'Retour au marchand après validation')}
      </div>
      <a class="btn btn-primary btn-wide checkout-anchor" href="#receiver-banks">Continuer</a>`
  });
}

function renderBenefit(icon: string, label: string): string {
  return `<div class="checkout-benefit"><span>${escapeHtml(icon)}</span><strong>${escapeHtml(label)}</strong></div>`;
}

function renderReceiverBankSelection(session: CheckoutSession, banks: readonly ReceiverBankOption[]): string {
  return `<section id="receiver-banks" class="checkout-section">
    <div class="checkout-section-head">
      <h2>Choisissez une banque</h2>
      <p>Sélectionnez où envoyer le paiement.</p>
    </div>
    <div class="bank-option-grid">${banks.map((bank) => {
      const available = (bank.available_route_count ?? 0) > 0;
      return `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/receiver-bank" data-bank-selection="${escapeHtml(bank.receiver_bank_id)}" class="selection-form">
        <button class="bank-option-card" type="submit" ${available ? '' : 'disabled'}>
          <span class="bank-logo-mark">${escapeHtml(bank.display_name.slice(0, 1))}</span>
          <span class="bank-copy">
            <strong>${escapeHtml(bank.display_name)}</strong>
            <small>${available ? 'Disponible' : 'Temporairement indisponible'}</small>
          </span>
          <span class="bank-chevron">→</span>
        </button>
      </form>`;
    }).join('')}</div>
  </section>`;
}

function renderReceivingRouteSelection(session: CheckoutSession, routes: readonly BuyerSafeReceivingRoute[]): string {
  if (routes.length === 0) {
    return Card({
      class: 'checkout-empty',
      children: `<h2>Choisissez comment payer</h2><p>Aucun moyen disponible pour cette banque pour le moment.</p>`
    });
  }

  return `<section class="checkout-section">
    <div class="checkout-section-head">
      <h2>Choisissez comment payer</h2>
    </div>
    <div class="method-grid">${routes.map((route) => {
      const isPhone = route.rail_type === 'phone_transfer';
      const title = isPhone ? 'Numéro de téléphone' : 'Carte bancaire';
      const subtitle = isPhone ? 'Pratique pour les virements via SBP' : 'Simple et neutre';
      const detail = isPhone ? '' : 'Frais possibles selon votre banque';
      return `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/receiving-route" class="selection-form">
        <input type="hidden" name="receiving_route_id" value="${escapeHtml(route.route_id)}">
        <button class="method-card" type="submit">
          <span class="method-icon">${isPhone ? 'Tel' : 'Card'}</span>
          <span class="method-copy">
            <strong>${title}</strong>
            <small>${subtitle}</small>
            ${detail ? `<em>${detail}</em>` : ''}
          </span>
          <span class="method-chevron">→</span>
        </button>
      </form>`;
    }).join('')}</div>
    <div class="checkout-action-row">${Button({ text: 'Continuer', variant: 'primary', class: 'btn-wide' })}</div>
  </section>`;
}

function renderPayerLauncherSelection(session: CheckoutSession, launchers: readonly PayerBankLauncherOption[]): string {
  return `<section class="checkout-section">
    <div class="checkout-section-head">
      <h2>Ouvrir votre banque</h2>
      <p>Choisissez l’application que vous souhaitez utiliser.</p>
    </div>
    <div class="launcher-list">${launchers.map((launcher) => `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/payer-bank-launcher" class="selection-form">
      <input type="hidden" name="payer_bank_launcher_id" value="${escapeHtml(launcher.payer_bank_launcher_id)}">
      <button class="launcher-card" type="submit">
        <span class="bank-logo-mark">${escapeHtml(launcher.display_name.slice(0, 1))}</span>
        <span class="launcher-copy">
          <strong>${escapeHtml(launcher.display_name)}</strong>
          <small>${launcher.launch_url ? 'Ouvrir l’application' : 'Copier les détails'}</small>
        </span>
        <span class="bank-chevron">→</span>
      </button>
    </form>`).join('')}</div>
  </section>`;
}

function renderInstructions(
  session: CheckoutSession,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined
): string {
  if (!selectedRoute) {
    return Card({
      class: 'checkout-empty',
      children: `<h2>Envoyez le paiement</h2><p>Sélectionnez d’abord un moyen de paiement.</p>`
    });
  }

  const isPhone = selectedRoute.rail_type === 'phone_transfer';
  const destinationLabel = isPhone ? 'Téléphone' : 'Carte';

  return Card({
    class: 'payment-instructions-card',
    children: `<div class="checkout-section-head">
      <h2>Envoyez le paiement</h2>
      <p>SwimPay suit le signal côté marchand.</p>
    </div>
    <div class="instruction-destination">
      <span class="method-icon">${isPhone ? 'Tel' : 'Card'}</span>
      <div>
        <small>${destinationLabel}</small>
        <strong>${escapeHtml(selectedRoute.receiver_identifier_masked)}</strong>
      </div>
      <button class="copy-btn" type="button" aria-label="Copier ${escapeHtml(destinationLabel)}">Copier</button>
    </div>
    <div class="instruction-grid">
      ${CopyField({ label: 'Montant', value: `${session.amount.value} ${session.amount.currency}`, masked: false })}
      ${CopyField({ label: 'Référence', value: session.reference, masked: false })}
    </div>
    ${isPhone ? `<label class="sender-phone-field">Votre numéro d’envoi<input type="tel" placeholder="+7 *** *** **67" autocomplete="tel"></label>` : ''}
    ${selectedLauncher ? `<p class="launcher-note">Ouvrir votre banque avec <strong>${escapeHtml(selectedLauncher.display_name)}</strong>, ou copiez les détails manuellement.</p>` : ''}
    <div class="instruction-actions">
      ${Button({ text: 'Ouvrir ma banque', variant: 'secondary' })}
      <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/claimed-paid">
        ${Button({ text: "J'ai payé", id: 'paid-button', variant: 'primary', type: 'submit' })}
      </form>
    </div>`
  });
}

function renderCheckoutStatePanel(session: CheckoutSession): string {
  const state = checkoutStateView(session);
  return Card({
    class: `buyer-state-panel buyer-state-${state.tone}`,
    children: `<div class="buyer-state-icon">${escapeHtml(state.icon)}</div>
      <div class="buyer-state-copy">
        <h2>${escapeHtml(state.title)}</h2>
        <p>${escapeHtml(state.text)}</p>
      </div>`
  });
}

function checkoutStateView(session: CheckoutSession): CheckoutStateView {
  const safe = session.buyer_safe_status;
  if (session.status === 'expired' || safe === 'expired') {
    return { title: 'Session expirée', text: 'Le paiement n’a pas été validé à temps.', tone: 'warning', icon: 'Time' };
  }
  if (session.status === 'rejected' || safe === 'not_validated') {
    return { title: 'Paiement non validé', text: 'Veuillez réessayer ou contacter le marchand.', tone: 'danger', icon: 'Stop' };
  }
  if (session.status === 'manual_confirmed' || session.status === 'auto_confirmed' || session.status === 'fulfilled' || safe === 'confirmed') {
    return { title: 'Paiement validé', text: 'Votre commande peut maintenant être traitée.', tone: 'success', icon: 'OK' };
  }
  if (session.status === 'needs_review' || session.status === 'matching' || safe === 'needs_review') {
    return { title: 'Vérification en cours', text: 'Le marchand vérifie ce paiement.', tone: 'warning', icon: 'Check' };
  }
  if (session.status === 'signal_detected' || safe === 'signal_detected') {
    return { title: 'Signal détecté', text: 'Nous vérifions les détails du paiement.', tone: 'info', icon: 'Wave' };
  }
  if (session.status === 'buyer_claimed_paid' || safe === 'searching_signal') {
    return { title: 'Recherche du signal', text: 'Nous vérifions la réception côté marchand.', tone: 'info', icon: 'Scan' };
  }
  return { title: 'Paiement en attente', text: 'Effectuez le paiement dans votre application bancaire.', tone: 'info', icon: 'Pay' };
}

function renderCheckoutSummary(session: CheckoutSession, displayStatus: string): string {
  return Card({
    class: 'checkout-summary-card',
    children: `<h3>Résumé</h3>
      <div class="detail-lite"><span>Montant</span><strong>${escapeHtml(session.amount.value)} ${escapeHtml(session.amount.currency)}</strong></div>
      <div class="detail-lite"><span>Référence</span><strong>${escapeHtml(session.reference)}</strong></div>
      <div class="detail-lite"><span>Statut</span>${StatusChip({ text: displayStatus, variant: 'info' })}</div>`
  });
}

function renderDesktopQrHandoff(session: CheckoutSession): string {
  return Card({
    class: 'desktop-handoff-card',
    children: `<h3>Continuer sur mobile</h3>
      <div class="qr-box" aria-label="QR vers cette session"><span>QR</span></div>
      <div class="detail-lite"><span>Montant</span><strong>${escapeHtml(session.amount.value)} ${escapeHtml(session.amount.currency)}</strong></div>
      <div class="detail-lite"><span>Référence</span><strong>${escapeHtml(session.reference)}</strong></div>
      <button class="copy-btn copy-details-btn" type="button">Copier les détails</button>
      <p class="muted">Scannez le QR ou suivez les instructions manuelles sur ce navigateur.</p>`
  });
}

function buyerCheckoutStyles(): string {
  return `<style>
    .buyer-checkout .brand { margin-bottom: 36px; }
    .buyer-checkout-content { width: 100%; max-width: 1120px; }
    .checkout-grid { display:grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 28px; align-items:start; }
    .checkout-hero-card { text-align:center; padding: 34px; }
    .checkout-hero-card h1 { font-size: clamp(34px, 5vw, 56px); }
    .checkout-lead { max-width: 560px; margin: 14px auto 0; color: var(--color-muted); font-size: 20px; }
    .checkout-anchor { margin-top: 24px; }
    .benefit-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 26px; }
    .checkout-benefit {
      display:flex; flex-direction:column; align-items:center; gap:10px;
      min-height: 116px; padding: 18px 12px;
      border-radius: 24px; background: var(--color-bg);
      color: var(--color-navy); font-weight: 800;
    }
    .checkout-benefit span, .method-icon, .bank-logo-mark, .buyer-state-icon {
      display:grid; place-items:center; width:52px; height:52px;
      border-radius:18px; background: var(--color-mint); color: var(--color-teal);
      font-weight: 900; box-shadow: 0 10px 24px rgba(7, 27, 51, 0.06);
    }
    .checkout-section { min-width: 0; scroll-margin-top: 24px; }
    .checkout-section-head { margin-bottom: 18px; }
    .checkout-section-head h2 { font-size: clamp(28px, 4vw, 42px); line-height: 1.08; }
    .checkout-section-head p { margin: 10px 0 0; color: var(--color-muted); font-size: 18px; }
    .bank-option-grid, .launcher-list, .method-grid { display:flex; flex-direction:column; gap:14px; }
    .selection-form { margin:0; }
    .bank-option-card, .launcher-card, .method-card {
      width:100%; min-height: 90px; border:1px solid rgba(225,232,237,0.86);
      border-radius: 26px; background: rgba(255,255,255,0.96);
      box-shadow: var(--shadow-soft); padding:18px;
      display:flex; align-items:center; gap:16px; text-align:left;
      min-width: 0;
      cursor:pointer; color: var(--color-navy);
      transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }
    .bank-option-card:active, .launcher-card:active, .method-card:active { transform: scale(0.99); }
    .bank-option-card:disabled { opacity:0.62; cursor:not-allowed; }
    .bank-option-card:not(:disabled):hover, .launcher-card:hover, .method-card:hover {
      border-color: rgba(0,151,167,0.42); box-shadow: var(--shadow-medium);
    }
    .bank-copy, .launcher-copy, .method-copy { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
    .bank-copy strong, .launcher-copy strong, .method-copy strong { font-size:22px; color:var(--color-navy); }
    .bank-copy small, .launcher-copy small, .method-copy small { color:var(--color-muted); font-size:16px; }
    .method-copy em { color: var(--color-muted); font-style: normal; font-size: 14px; }
    .bank-chevron, .method-chevron { color: var(--color-teal); font-weight: 900; font-size: 24px; }
    .checkout-action-row { margin-top: 18px; }
    .payment-instructions-card { padding: 28px; min-width: 0; }
    .instruction-destination {
      display:flex; align-items:center; gap:16px;
      padding:18px; border-radius:24px; background: var(--color-bg);
      border:1px solid rgba(225,232,237,0.9); margin-bottom:18px;
      min-width: 0;
    }
    .instruction-destination div { display:flex; flex-direction:column; flex:1; min-width: 0; gap:3px; }
    .instruction-destination small { color: var(--color-muted); font-weight:700; }
    .instruction-destination strong { color: var(--color-navy); font-size:24px; overflow-wrap: anywhere; }
    .instruction-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:14px; }
    .sender-phone-field {
      display:flex; flex-direction:column; gap:8px; margin-top:16px;
      color: var(--color-muted); font-weight: 800;
    }
    .sender-phone-field input {
      min-height:54px; border-radius: var(--radius-input);
      border:1px solid rgba(225,232,237,0.9); padding:14px 16px;
      color: var(--color-navy); background:white;
    }
    .launcher-note { color: var(--color-muted); margin: 16px 0 0; }
    .instruction-actions { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:18px; }
    .instruction-actions form, .instruction-actions .btn { width:100%; }
    .buyer-state-panel {
      display:flex; align-items:center; gap:18px;
      border-width:1px;
      min-width: 0;
    }
    .buyer-state-panel h2 { font-size: 28px; }
    .buyer-state-panel p { margin: 4px 0 0; color: var(--color-muted); font-size:18px; }
    .buyer-state-success { border-color: rgba(34,181,115,0.28); }
    .buyer-state-warning { border-color: rgba(245,166,35,0.28); }
    .buyer-state-danger { border-color: rgba(229,72,77,0.28); }
    .checkout-side { position: sticky; top: 24px; min-width: 0; }
    .checkout-note {
      padding: 18px; background: var(--color-mint);
      border: 1px solid rgba(35,199,201,0.28);
      border-radius: var(--radius-card); color: var(--color-navy);
      font-weight: 700;
    }
    .detail-lite { display:flex; justify-content:space-between; gap:14px; padding:12px 0; border-bottom:1px solid rgba(225,232,237,0.9); }
    .detail-lite:last-child { border-bottom:none; }
    .detail-lite span { color: var(--color-muted); }
    .detail-lite strong { color: var(--color-navy); text-align:right; }
    .desktop-handoff-card h3, .checkout-summary-card h3 { margin-bottom: 12px; }
    .qr-box {
      width: 154px; aspect-ratio: 1; margin: 10px auto 16px;
      border-radius: 28px; background:
        radial-gradient(circle at 18px 18px, var(--color-navy) 0 5px, transparent 6px),
        radial-gradient(circle at calc(100% - 18px) 18px, var(--color-navy) 0 5px, transparent 6px),
        radial-gradient(circle at 18px calc(100% - 18px), var(--color-navy) 0 5px, transparent 6px),
        linear-gradient(90deg, rgba(7,27,51,.10) 2px, transparent 2px),
        linear-gradient(rgba(7,27,51,.10) 2px, transparent 2px),
        white;
      background-size: 18px 18px;
      border: 12px solid white;
      box-shadow: var(--shadow-soft);
      display:grid; place-items:center;
    }
    .qr-box span { border-radius: var(--radius-pill); padding: 8px 12px; color:white; background: var(--color-navy); font-weight:900; }
    .copy-details-btn { width:100%; min-height:44px; border-radius: var(--radius-pill); background: var(--color-bg); margin: 10px 0; }
    @media (max-width: 900px) {
      .checkout-grid { grid-template-columns: 1fr; }
      .checkout-side { position: static; }
      .desktop-handoff-card { display:none; }
    }
    @media (max-width: 620px) {
      .buyer-checkout .brand { margin-bottom: 28px; }
      .checkout-hero-card, .payment-instructions-card { padding:22px; }
      .benefit-grid, .instruction-grid, .instruction-actions { grid-template-columns: 1fr; }
      .buyer-state-panel { align-items:flex-start; }
      .instruction-destination { align-items:flex-start; flex-wrap: wrap; }
      .instruction-destination strong { font-size:20px; }
    }
    @media (max-width: 430px) {
      .checkout-grid { gap: 20px; }
      .checkout-hero-card, .payment-instructions-card { padding: 20px; border-radius: 24px; }
      .checkout-hero-card h1 { font-size: 32px; }
      .checkout-lead, .checkout-section-head p, .buyer-state-panel p { font-size: 16px; }
      .checkout-section-head h2 { font-size: 28px; }
      .bank-option-card, .launcher-card, .method-card {
        min-height: 82px;
        padding: 15px;
        gap: 13px;
        border-radius: 22px;
      }
      .bank-copy strong, .launcher-copy strong, .method-copy strong { font-size: 19px; }
      .bank-copy small, .launcher-copy small, .method-copy small { font-size: 14px; }
      .instruction-destination { padding: 15px; border-radius: 20px; }
      .instruction-destination .copy-btn { width: 100%; min-height: 44px; border-radius: var(--radius-pill); background: white; }
      .buyer-state-icon { flex: 0 0 52px; }
      .buyer-state-panel h2 { font-size: 24px; }
    }
  </style>`;
}
