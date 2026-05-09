import {
  AppShell,
  Button,
  Card,
  StatusChip,
  SwimPayBrand,
  escapeHtml
} from '../ui/Components.js';
import type { BuyerSafeReceivingRoute, PayerBankLauncherOption, ReceiverBankOption } from '@swimpay/contracts';
import type { CheckoutSession, CheckoutRecipient } from '../index.js';

type BuyerCheckoutStep = 'intro' | 'bank' | 'route' | 'launcher' | 'instructions' | 'waiting';
type CheckoutStateTone = 'info' | 'success' | 'warning' | 'danger';
type TimelineState = 'done' | 'active' | 'pending' | 'danger';

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
  const visibleRoutes = filterRoutesForSession(routes, session.payment_method);
  const selectedRoute = visibleRoutes.find((route) => route.route_id === session.selected_receiving_route_id);
  const selectedLauncher = launchers.find((launcher) => launcher.payer_bank_launcher_id === session.selected_payer_bank_launcher_id);
  const step = getCheckoutStep(session);

  return AppShell({
    title: 'Payer avec SwimPay',
    chrome: 'checkout',
    children: `<section class="screen buyer-checkout"><div class="buyer-checkout-content">
      ${SwimPayBrand()}
      ${renderStepProgress(step)}
      <div class="checkout-flow">
        ${step === 'intro' ? renderIntroFlow(session, banks) : ''}
        ${step === 'bank' ? renderReceiverBankSelection(session, banks) : ''}
        ${step === 'route' ? renderReceivingRouteSelection(session, visibleRoutes) : ''}
        ${step === 'launcher' ? renderPayerLauncherSelection(session, selectedRoute, launchers) : ''}
        ${step === 'instructions' ? renderInstructionsStep(session, selectedRoute, selectedLauncher) : ''}
        ${step === 'waiting' ? renderWaitingStatusStep(session) : ''}
      </div>
      ${step !== 'intro' ? renderCheckoutSummary(session, displayStatus, selectedRoute, selectedLauncher) : ''}
      ${step === 'instructions' || step === 'waiting' ? renderBuyerTruthNotice() : ''}
    </div></section>
    ${buyerCheckoutStyles()}
    ${buyerCheckoutScript()}`
  });
}

function getCheckoutStep(session: CheckoutSession): BuyerCheckoutStep {
  if (isWaitingBuyerState(session)) return 'waiting';
  if (!session.payment_method) return 'intro';
  if (!session.selected_receiver_bank_id) return 'bank';
  if (!session.selected_receiving_route_id) return 'route';
  if (!session.selected_payer_bank_launcher_id) return 'launcher';
  return 'instructions';
}

function filterRoutesForSession(
  routes: readonly BuyerSafeReceivingRoute[],
  paymentMethod: CheckoutSession['payment_method']
): readonly BuyerSafeReceivingRoute[] {
  if (paymentMethod === 'card') return routes.filter((route) => route.rail_type === 'card_transfer');
  if (paymentMethod === 'sbp') return routes.filter((route) => route.rail_type === 'phone_transfer');
  return routes;
}

function isWaitingBuyerState(session: CheckoutSession): boolean {
  return [
    'buyer_claimed_paid',
    'signal_detected',
    'matching',
    'needs_review',
    'manual_confirmed',
    'fulfilled',
    'rejected',
    'expired'
  ].includes(session.status);
}

function renderStepProgress(step: BuyerCheckoutStep): string {
  const current = step === 'intro' ? 1 : step === 'bank' ? 2 : step === 'route' || step === 'launcher' || step === 'instructions' ? 3 : 4;
  const labels = ['Intro', 'Infos', 'Paiement', 'Suivi'];
  return `<nav class="checkout-stepper" aria-label="Progression du paiement">
    ${labels.map((label, index) => {
      const state = index + 1 < current ? 'done' : index + 1 === current ? 'active' : 'pending';
      return `<span class="checkout-step checkout-step-${state}"><i>${index + 1}</i><b>${escapeHtml(label)}</b></span>`;
    }).join('')}
  </nav>`;
}

function renderIntroFlow(session: CheckoutSession, banks: readonly ReceiverBankOption[]): string {
  return `<div class="checkout-panel-stack">
    ${renderIntroStep()}
    ${renderBuyerIdentityStep(session, banks, true)}
  </div>`;
}

function renderIntroStep(): string {
  return Card({
    class: 'checkout-panel checkout-intro-panel',
    children: `<p class="eyebrow">SwimPay</p>
      <h1>Payer avec SwimPay</h1>
      <p class="checkout-lead">Suivez votre paiement bancaire jusqu&rsquo;a validation.</p>
      <div class="benefit-grid">
        ${renderBenefit('P', 'Paiement guid&eacute;', 'Nous vous guidons etape par etape.')}
        ${renderBenefit('T', 'Suivi en temps reel', 'Suivez l&rsquo;etat du paiement.')}
        ${renderBenefit('M', 'Retour au marchand', 'Vous retournez apres validation.')}
      </div>
      <button class="btn btn-primary btn-wide checkout-next" type="button" data-show-panel="buyer-identity">Continuer</button>
      <p class="checkout-footer-note">Paiement securise avec SwimPay</p>`
  });
}

function renderBenefit(icon: string, label: string, text: string): string {
  return `<article class="checkout-benefit">
    <span>${escapeHtml(icon)}</span>
    <strong>${label}</strong>
    <small>${text}</small>
  </article>`;
}

function renderBuyerIdentityStep(session: CheckoutSession, banks: readonly ReceiverBankOption[], hidden = false): string {
  return `<section id="buyer-identity" class="checkout-panel checkout-identity-panel" data-checkout-panel="buyer-identity" ${hidden ? 'hidden' : ''}>
    <div class="checkout-section-head">
      <h2>Vos informations</h2>
      <p>Ces donnees servent a reconnaitre le signal de paiement.</p>
    </div>
    <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/expected-payment-profile" class="expected-profile-form">
      <div class="recognition-grid">
        <label>Prenom<input name="buyer_first_name" autocomplete="given-name" required></label>
        <label>Nom<input name="buyer_last_name" autocomplete="family-name" required></label>
      </div>
      <div class="field-group-title">Methode de paiement</div>
      <div class="method-toggle" role="radiogroup" aria-label="Methode de paiement">
        <label class="payment-method-card selected">
          <input type="radio" name="payment_method" value="card" checked>
          <span class="radio-dot"></span>
          <span><strong>Carte</strong><small>Virement par carte</small></span>
        </label>
        <label class="payment-method-card">
          <input type="radio" name="payment_method" value="sbp">
          <span class="radio-dot"></span>
          <span><strong>Telephone SBP</strong><small>Transfert par telephone</small></span>
        </label>
      </div>
      <label class="full-field">Banque d'envoi
        <select name="sender_bank_id" required>
          ${banks.map((bank) => `<option value="${escapeHtml(bank.bank_profile_id)}">${escapeHtml(bank.display_name)}</option>`).join('')}
        </select>
      </label>
      <div class="method-field-stack">
        <label data-method-field="card">Carte d'envoi<input name="sender_card_number" inputmode="numeric" autocomplete="cc-number" placeholder="4242 .... .... ...."></label>
        <label data-method-field="sbp" hidden>Telephone d'envoi<input name="sender_phone" type="tel" autocomplete="tel" placeholder="+7 ..." disabled></label>
      </div>
      <p class="security-note">Pas de CVV, pas de date d'expiration, pas de code SMS.</p>
      <div class="checkout-action-row">${Button({ text: 'Continuer', variant: 'primary', class: 'btn-wide', type: 'submit' })}</div>
    </form>
  </section>`;
}

function renderReceiverBankSelection(session: CheckoutSession, banks: readonly ReceiverBankOption[]): string {
  return `<section class="checkout-panel">
    <div class="checkout-section-head">
      <h2>Banque du destinataire</h2>
      <p>Choisissez la banque configuree par le marchand.</p>
    </div>
    <div class="bank-option-grid">${banks.map((bank) => {
      const available = (bank.available_route_count ?? 0) > 0;
      return `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/receiver-bank" class="selection-form">
        <input type="hidden" name="receiver_bank_id" value="${escapeHtml(bank.receiver_bank_id)}">
        <button class="bank-option-card" type="submit" ${available ? '' : 'disabled'}>
          <span class="bank-logo-mark">${escapeHtml(bank.display_name.slice(0, 1))}</span>
          <span class="bank-copy">
            <strong>${escapeHtml(bank.display_name)}</strong>
            <small>${available ? 'Disponible' : 'Indisponible'}</small>
          </span>
          <span class="bank-chevron">-&gt;</span>
        </button>
      </form>`;
    }).join('')}</div>
  </section>`;
}

function renderReceivingRouteSelection(session: CheckoutSession, routes: readonly BuyerSafeReceivingRoute[]): string {
  if (routes.length === 0) {
    return Card({
      class: 'checkout-panel checkout-empty',
      children: `<h2>Methode indisponible</h2>
        <p>Ce marchand n'a pas encore configure cette methode de reception.</p>`
    });
  }

  return `<section class="checkout-panel">
    <div class="checkout-section-head">
      <h2>Instructions de paiement</h2>
      <p>Choisissez la destination compatible avec votre methode.</p>
    </div>
    <div class="method-grid">${routes.map((route) => {
      const isPhone = route.rail_type === 'phone_transfer';
      const title = isPhone ? 'Telephone du destinataire' : 'Carte du destinataire';
      return `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/receiving-route" class="selection-form">
        <input type="hidden" name="receiving_route_id" value="${escapeHtml(route.route_id)}">
        <button class="method-card" type="submit">
          <span class="method-icon">${isPhone ? 'Tel' : 'Card'}</span>
          <span class="method-copy">
            <strong>${title}</strong>
            <small>${escapeHtml(route.receiver_identifier_masked)}</small>
          </span>
          <span class="method-chevron">Utiliser</span>
        </button>
      </form>`;
    }).join('')}</div>
  </section>`;
}

function renderPayerLauncherSelection(
  session: CheckoutSession,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  launchers: readonly PayerBankLauncherOption[]
): string {
  if (!selectedRoute) {
    return Card({
      class: 'checkout-panel checkout-empty',
      children: `<h2>Methode indisponible</h2><p>Selectionnez une destination compatible.</p>`
    });
  }

  const orderedLaunchers = orderLaunchers(launchers, session.sender_bank_id);
  return `<section class="checkout-panel">
    <div class="checkout-section-head">
      <h2>Ouvrir ma banque</h2>
      <p>Choisissez l'application bancaire a ouvrir.</p>
    </div>
    ${renderInstructionPreview(session, selectedRoute)}
    <div class="launcher-list">${orderedLaunchers.map((launcher) => `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/payer-bank-launcher" class="selection-form">
      <input type="hidden" name="payer_bank_launcher_id" value="${escapeHtml(launcher.payer_bank_launcher_id)}">
      <button class="launcher-card" type="submit">
        <span class="bank-logo-mark">${escapeHtml(launcher.display_name.slice(0, 1))}</span>
        <span class="launcher-copy">
          <strong>${escapeHtml(launcher.display_name)}</strong>
          <small>${launcher.launch_url ? 'Ouvrir si disponible' : 'Instructions manuelles'}</small>
        </span>
        <span class="bank-chevron">-&gt;</span>
      </button>
    </form>`).join('')}</div>
  </section>`;
}

function renderInstructionsStep(
  session: CheckoutSession,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined
): string {
  if (!selectedRoute) {
    return Card({
      class: 'checkout-panel checkout-empty',
      children: `<h2>Methode indisponible</h2><p>Selectionnez une destination compatible.</p>`
    });
  }

  const isPhone = selectedRoute.rail_type === 'phone_transfer';
  const amount = session.payable_amount ?? session.amount;
  const destinationLabel = isPhone ? 'Telephone du destinataire' : 'Carte du destinataire';
  const methodLabel = isPhone ? 'Telephone SBP' : 'Carte';
  const bankLabel = selectedLauncher?.display_name ?? 'Banque choisie';
  const summary = [
    `Montant exact: ${amount.value} ${amount.currency}`,
    `Reference: ${session.reference}`,
    `${destinationLabel}: ${selectedRoute.receiver_identifier_masked}`,
    `Banque: ${bankLabel}`
  ].join('\\n');

  return `<section class="checkout-panel">
    <div class="checkout-section-head">
      <h2>Instructions de paiement</h2>
      <p>Effectuez le paiement bancaire avec les details ci-dessous.</p>
    </div>
    <div class="payment-details-card">
      ${renderCopyablePaymentRow('Montant exact', `${amount.value} ${amount.currency}`, `${amount.value} ${amount.currency}`)}
      ${renderCopyablePaymentRow('Reference', session.reference, session.reference)}
      ${renderCopyablePaymentRow(destinationLabel, selectedRoute.receiver_identifier_masked, '', true, session.payment_session_id)}
      ${renderCopyablePaymentRow('Banque', bankLabel, bankLabel)}
      ${renderCopyablePaymentRow('Methode', methodLabel, methodLabel)}
    </div>
    <div class="countdown-card">
      <span>Completez le paiement dans</span>
      <strong data-countdown-target="${escapeHtml(session.expires_at)}">--:--</strong>
    </div>
    <div class="instruction-actions">
      <button class="btn btn-secondary btn-wide" type="button" data-copy-value="${escapeHtml(summary)}">Copier les details</button>
      <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/continue-to-bank">
        ${Button({ text: 'Ouvrir ma banque', variant: 'primary', class: 'btn-wide', type: 'submit' })}
      </form>
      <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/claimed-paid">
        ${Button({ text: "J'ai paye", id: 'paid-button', variant: 'secondary', class: 'btn-wide', type: 'submit' })}
      </form>
    </div>
  </section>`;
}

function renderCopyablePaymentRow(
  label: string,
  displayValue: string,
  copyValue: string,
  destination = false,
  paymentSessionId = ''
): string {
  const attr = destination
    ? `data-copy-destination="${escapeHtml(paymentSessionId)}"`
    : `data-copy-value="${escapeHtml(copyValue)}"`;
  return `<div class="payment-row">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(displayValue)}</strong>
    <button class="copy-icon-btn" type="button" ${attr} aria-label="Copier ${escapeHtml(label)}">Copy</button>
  </div>`;
}

function renderInstructionPreview(session: CheckoutSession, selectedRoute: BuyerSafeReceivingRoute): string {
  const amount = session.payable_amount ?? session.amount;
  const destinationLabel = selectedRoute.rail_type === 'phone_transfer' ? 'Telephone' : 'Carte';
  return `<div class="instruction-preview">
    <div><span>Montant exact</span><strong>${escapeHtml(amount.value)} ${escapeHtml(amount.currency)}</strong></div>
    <div><span>Reference</span><strong>${escapeHtml(session.reference)}</strong></div>
    <div><span>${destinationLabel}</span><strong>${escapeHtml(selectedRoute.receiver_identifier_masked)}</strong></div>
  </div>`;
}

function renderWaitingStatusStep(session: CheckoutSession): string {
  const state = checkoutStateView(session);
  return `<section class="checkout-panel waiting-panel buyer-state-${state.tone}">
    <div class="waiting-hero">
      <div class="buyer-state-icon">${escapeHtml(state.icon)}</div>
      <h2>${escapeHtml(state.title)}</h2>
      <p>${escapeHtml(state.text)}</p>
    </div>
    ${renderPaymentTimeline(session)}
    ${renderWaitingAction(session)}
  </section>`;
}

function renderWaitingAction(session: CheckoutSession): string {
  if (session.status === 'manual_confirmed' || session.status === 'fulfilled') {
    return `<button class="btn btn-primary btn-wide" type="button" onclick="history.back()">Retourner au marchand</button>`;
  }
  if (session.status === 'expired') {
    return `<a class="btn btn-primary btn-wide" href="/checkout/${escapeHtml(session.payment_session_id)}">Reessayer</a>`;
  }
  if (session.status === 'rejected') {
    return `<button class="btn btn-secondary btn-wide" type="button" onclick="history.back()">Contacter le marchand</button>`;
  }
  return `<a class="btn btn-secondary btn-wide" href="/checkout/${escapeHtml(session.payment_session_id)}">Actualiser</a>`;
}

function renderPaymentTimeline(session: CheckoutSession): string {
  const confirmed = session.status === 'manual_confirmed' || session.status === 'fulfilled';
  const rejectedOrExpired = session.status === 'rejected' || session.status === 'expired';
  const signal = ['signal_detected', 'matching', 'needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const review = ['needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const items: Array<[string, TimelineState]> = [
    ['Recherche du signal', signal || review || confirmed ? 'done' : rejectedOrExpired ? 'danger' : 'active'],
    ['Signal detecte', signal || review || confirmed ? 'done' : 'pending'],
    ['Validation marchand', review ? 'active' : confirmed ? 'done' : 'pending'],
    ['Paiement confirme', confirmed ? 'done' : rejectedOrExpired ? 'danger' : 'pending']
  ];

  return `<div class="payment-timeline">
    ${items.map(([label, state]) => `<div class="timeline-item timeline-${state}">
      <span></span><strong>${escapeHtml(label)}</strong>
    </div>`).join('')}
  </div>`;
}

function checkoutStateView(session: CheckoutSession): CheckoutStateView {
  const safe = session.buyer_safe_status;
  if (session.status === 'expired' || safe === 'expired') {
    return { title: 'Paiement expire', text: "Le paiement n'a pas ete valide a temps.", tone: 'warning', icon: 'Time' };
  }
  if (session.status === 'rejected' || safe === 'not_validated') {
    return { title: 'Paiement rejete', text: 'Veuillez reessayer ou contacter le marchand.', tone: 'danger', icon: 'Stop' };
  }
  if (session.status === 'manual_confirmed' || session.status === 'fulfilled' || safe === 'confirmed') {
    return { title: 'Paiement confirme', text: 'Votre commande peut maintenant etre traitee.', tone: 'success', icon: 'OK' };
  }
  if (session.status === 'needs_review' || session.status === 'matching' || safe === 'needs_review') {
    return { title: 'Validation marchand', text: 'Le marchand verifie ce paiement.', tone: 'warning', icon: 'Check' };
  }
  if (session.status === 'signal_detected' || safe === 'signal_detected') {
    return { title: 'Signal detecte', text: 'Signal detecte, en attente de validation marchand.', tone: 'info', icon: 'Wave' };
  }
  return { title: 'Paiement en cours', text: 'SwimPay suit le signal de paiement cote marchand.', tone: 'info', icon: 'Scan' };
}

function renderCheckoutSummary(
  session: CheckoutSession,
  displayStatus: string,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined
): string {
  const amount = session.payable_amount ?? session.amount;
  return Card({
    class: 'checkout-summary-card',
    children: `<h3>Resume</h3>
      <div class="detail-lite"><span>Montant</span><strong>${escapeHtml(amount.value)} ${escapeHtml(amount.currency)}</strong></div>
      <div class="detail-lite"><span>Reference</span><strong>${escapeHtml(session.reference)}</strong></div>
      ${selectedRoute ? `<div class="detail-lite"><span>Destination</span><strong>${escapeHtml(selectedRoute.receiver_identifier_masked)}</strong></div>` : ''}
      ${selectedLauncher ? `<div class="detail-lite"><span>Banque</span><strong>${escapeHtml(selectedLauncher.display_name)}</strong></div>` : ''}
      <div class="detail-lite"><span>Statut</span>${StatusChip({ text: displayStatus, variant: 'info' })}</div>`
  });
}

function renderBuyerTruthNotice(): string {
  return `<div class="checkout-note">SwimPay suit le signal cote marchand. Ce n'est pas un recu bancaire officiel.</div>`;
}

function orderLaunchers(
  launchers: readonly PayerBankLauncherOption[],
  selectedBankId: string | undefined
): readonly PayerBankLauncherOption[] {
  if (!selectedBankId) return launchers;
  return [...launchers].sort((a, b) => {
    if (a.payer_bank_launcher_id === selectedBankId) return -1;
    if (b.payer_bank_launcher_id === selectedBankId) return 1;
    return a.display_name.localeCompare(b.display_name);
  });
}

function buyerCheckoutScript(): string {
  return `<script>
    (() => {
      const showPanel = (id) => {
        const panel = document.querySelector('[data-checkout-panel="' + id + '"]');
        if (!panel) return;
        panel.hidden = false;
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = panel.querySelector('input, select, button');
        if (firstInput && firstInput.focus) setTimeout(() => firstInput.focus(), 180);
      };

      document.addEventListener('click', async (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-show-panel], [data-copy-value], [data-copy-destination]') : null;
        if (!target) return;

        if (target.hasAttribute('data-show-panel')) {
          showPanel(target.getAttribute('data-show-panel'));
          return;
        }

        if (target.hasAttribute('data-copy-value')) {
          await copyText(target, target.getAttribute('data-copy-value') || '');
          return;
        }

        if (target.hasAttribute('data-copy-destination')) {
          const id = target.getAttribute('data-copy-destination') || '';
          const response = await fetch('/checkout/' + encodeURIComponent(id) + '/receiving-route/copy-details', { cache: 'no-store' });
          if (!response.ok) {
            markCopy(target, false);
            return;
          }
          const payload = await response.json();
          await copyText(target, payload.destination_value || payload.receiver_identifier_copy_value || '');
        }
      });

      for (const form of document.querySelectorAll('.expected-profile-form')) {
        const syncMethodFields = () => {
          const method = form.querySelector('input[name="payment_method"]:checked')?.value || 'card';
          for (const card of form.querySelectorAll('.payment-method-card')) {
            card.classList.toggle('selected', card.querySelector('input')?.value === method);
          }
          for (const field of form.querySelectorAll('[data-method-field]')) {
            const active = field.getAttribute('data-method-field') === method;
            field.hidden = !active;
            const input = field.querySelector('input');
            if (input) {
              input.disabled = !active;
              input.required = active;
            }
          }
        };
        form.addEventListener('change', syncMethodFields);
        syncMethodFields();
      }

      for (const timer of document.querySelectorAll('[data-countdown-target]')) {
        const target = new Date(timer.getAttribute('data-countdown-target') || '').getTime();
        const tick = () => {
          const remaining = Math.max(0, target - Date.now());
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          timer.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        };
        tick();
        setInterval(tick, 1000);
      }

      async function copyText(button, value) {
        try {
          await navigator.clipboard.writeText(value);
          markCopy(button, true);
        } catch {
          markCopy(button, false);
        }
      }

      function markCopy(button, ok) {
        const original = button.getAttribute('data-copy-label') || button.textContent || 'Copy';
        button.setAttribute('data-copy-label', original);
        button.textContent = ok ? 'Copie' : 'Erreur';
        button.classList.toggle('copy-ok', ok);
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove('copy-ok');
        }, 1200);
      }
    })();
  </script>`;
}

function buyerCheckoutStyles(): string {
  return `<style>
    .app-shell-checkout {
      padding: max(18px, env(safe-area-inset-top)) 18px max(34px, calc(34px + env(safe-area-inset-bottom)));
    }
    .buyer-checkout {
      max-width: 560px;
      overflow: visible;
      margin: 0 auto;
      padding: 12px 0 44px;
    }
    .buyer-checkout-content {
      width: 100%;
      min-width: 0;
    }
    .buyer-checkout .brand {
      margin-bottom: 18px;
      animation: checkoutFade 420ms ease both;
    }
    .checkout-stepper {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 0 0 18px;
    }
    .checkout-step {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      color: var(--color-muted);
      font-size: 12px;
      font-weight: 800;
    }
    .checkout-step i {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #EAF1F4;
      font-style: normal;
      color: var(--color-muted);
      flex: 0 0 26px;
    }
    .checkout-step b {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .checkout-step-active i, .checkout-step-done i {
      color: white;
      background: linear-gradient(135deg, var(--color-teal), #00698B);
    }
    .checkout-step-active { color: var(--color-navy); }
    .checkout-flow, .checkout-panel-stack {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .checkout-panel {
      padding: 30px;
      border-radius: 30px;
      background: rgba(255,255,255,0.96);
      border: 1px solid rgba(225,232,237,0.8);
      box-shadow: 0 24px 70px rgba(7,27,51,0.08);
      animation: checkoutSlide 360ms ease both;
    }
    .checkout-panel[hidden] { display: none; }
    .checkout-intro-panel {
      text-align: center;
    }
    .checkout-intro-panel h1 {
      font-size: clamp(38px, 9vw, 56px);
      line-height: 1.02;
      margin-top: 8px;
    }
    .checkout-lead {
      max-width: 380px;
      margin: 18px auto 0;
      color: var(--color-muted);
      font-size: 20px;
      line-height: 1.45;
    }
    .benefit-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin: 28px 0 22px;
    }
    .checkout-benefit {
      display: grid;
      grid-template-columns: 58px 1fr;
      grid-template-rows: auto auto;
      column-gap: 14px;
      text-align: left;
      align-items: center;
      min-height: 104px;
      padding: 18px;
      border-radius: 26px;
      background: linear-gradient(135deg, rgba(232,250,248,0.92), rgba(247,251,252,0.92));
      border: 1px solid rgba(35,199,201,0.13);
    }
    .checkout-benefit span, .method-icon, .bank-logo-mark, .buyer-state-icon {
      display: grid;
      place-items: center;
      width: 54px;
      height: 54px;
      border-radius: 18px;
      background: var(--color-mint);
      color: var(--color-teal);
      font-weight: 900;
      box-shadow: 0 10px 24px rgba(7, 27, 51, 0.06);
      grid-row: 1 / span 2;
    }
    .checkout-benefit strong {
      color: var(--color-navy);
      font-size: 18px;
      line-height: 1.16;
    }
    .checkout-benefit small {
      color: var(--color-muted);
      font-weight: 700;
    }
    .checkout-footer-note {
      margin: 16px 0 0;
      color: var(--color-muted);
      font-size: 13px;
      font-weight: 800;
    }
    .checkout-section-head { margin-bottom: 20px; }
    .checkout-section-head h2 {
      font-size: clamp(30px, 7vw, 42px);
      line-height: 1.06;
    }
    .checkout-section-head p {
      margin: 10px 0 0;
      color: var(--color-muted);
      font-size: 17px;
    }
    .expected-profile-form, .method-field-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .recognition-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .recognition-grid label, .method-field-stack label, .full-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: var(--color-muted);
      font-size: 14px;
      font-weight: 900;
    }
    .recognition-grid input, .method-field-stack input, .full-field select {
      min-height: 58px;
      border-radius: 21px;
      border: 1px solid rgba(225,232,237,0.92);
      padding: 14px 16px;
      color: var(--color-navy);
      background: white;
      min-width: 0;
      box-shadow: inset 0 1px 0 rgba(7,27,51,0.02);
    }
    .field-group-title {
      color: var(--color-muted);
      font-size: 14px;
      font-weight: 900;
      margin-top: 2px;
    }
    .method-toggle {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .payment-method-card {
      min-height: 96px;
      border-radius: 24px;
      border: 1px solid rgba(225,232,237,0.92);
      background: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--color-navy);
      font-weight: 900;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .payment-method-card input { position: absolute; opacity: 0; pointer-events: none; }
    .payment-method-card small {
      display: block;
      margin-top: 3px;
      color: var(--color-muted);
      font-size: 13px;
      font-weight: 700;
    }
    .payment-method-card.selected {
      border-color: rgba(0,151,167,0.58);
      background: linear-gradient(135deg, rgba(232,250,248,0.98), white);
    }
    .payment-method-card:active { transform: scale(0.99); }
    .radio-dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid #A7B6C2;
      flex: 0 0 26px;
      position: relative;
    }
    .selected .radio-dot {
      border-color: var(--color-teal);
    }
    .selected .radio-dot::after {
      content: '';
      position: absolute;
      inset: 5px;
      border-radius: 50%;
      background: var(--color-teal);
    }
    .security-note {
      color: var(--color-navy);
      font-size: 19px;
      line-height: 1.36;
      font-weight: 900;
      margin: 8px 0 0;
    }
    .checkout-action-row { margin-top: 4px; }
    .bank-option-grid, .launcher-list, .method-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .selection-form { margin: 0; }
    .bank-option-card, .launcher-card, .method-card {
      width: 100%;
      min-height: 88px;
      border: 1px solid rgba(225,232,237,0.86);
      border-radius: 26px;
      background: rgba(255,255,255,0.98);
      box-shadow: 0 12px 30px rgba(7,27,51,0.05);
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 15px;
      text-align: left;
      min-width: 0;
      cursor: pointer;
      color: var(--color-navy);
      transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }
    .bank-option-card:disabled { opacity: 0.56; cursor: not-allowed; }
    .bank-option-card:not(:disabled):hover, .launcher-card:hover, .method-card:hover {
      border-color: rgba(0,151,167,0.42);
      box-shadow: var(--shadow-medium);
    }
    .bank-option-card:active, .launcher-card:active, .method-card:active { transform: scale(0.99); }
    .bank-copy, .launcher-copy, .method-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .bank-copy strong, .launcher-copy strong, .method-copy strong {
      color: var(--color-navy);
      font-size: 20px;
    }
    .bank-copy small, .launcher-copy small, .method-copy small {
      color: var(--color-muted);
      font-size: 15px;
      overflow-wrap: anywhere;
    }
    .bank-chevron, .method-chevron {
      color: var(--color-teal);
      font-weight: 900;
      white-space: nowrap;
    }
    .instruction-preview, .payment-details-card, .countdown-card {
      border-radius: 26px;
      background: var(--color-bg);
      border: 1px solid rgba(225,232,237,0.88);
      margin-bottom: 16px;
    }
    .instruction-preview {
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow: hidden;
    }
    .instruction-preview div, .payment-row, .detail-lite {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, auto) auto;
      gap: 12px;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid rgba(225,232,237,0.88);
    }
    .instruction-preview div {
      grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    }
    .instruction-preview div:last-child, .payment-row:last-child, .detail-lite:last-child {
      border-bottom: none;
    }
    .instruction-preview span, .payment-row span, .detail-lite span {
      color: var(--color-muted);
      font-weight: 800;
    }
    .instruction-preview strong, .payment-row strong, .detail-lite strong {
      color: var(--color-navy);
      font-size: 18px;
      text-align: right;
      overflow-wrap: anywhere;
    }
    .copy-icon-btn {
      width: 40px;
      height: 40px;
      border-radius: 14px;
      border: none;
      background: white;
      color: var(--color-teal);
      font-size: 0;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 8px 18px rgba(7,27,51,0.05);
      position: relative;
    }
    .copy-icon-btn::before {
      content: '';
      position: absolute;
      width: 13px;
      height: 15px;
      border: 2px solid currentColor;
      border-radius: 4px;
      top: 13px;
      left: 15px;
    }
    .copy-icon-btn::after {
      content: '';
      position: absolute;
      width: 13px;
      height: 15px;
      border: 2px solid currentColor;
      border-radius: 4px;
      top: 9px;
      left: 11px;
      background: white;
    }
    .copy-icon-btn.copy-ok, .copy-ok {
      background: var(--color-mint);
      color: var(--color-teal);
    }
    .countdown-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 16px;
    }
    .countdown-card span {
      color: var(--color-muted);
      font-weight: 800;
    }
    .countdown-card strong {
      color: var(--color-navy);
      font-size: 28px;
      letter-spacing: 0;
    }
    .instruction-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .instruction-actions form, .instruction-actions .btn {
      width: 100%;
    }
    .waiting-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }
    .waiting-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .waiting-hero h2 {
      font-size: clamp(32px, 8vw, 44px);
      line-height: 1.04;
    }
    .waiting-hero p {
      margin: 0;
      color: var(--color-muted);
      font-size: 17px;
    }
    .buyer-state-icon {
      grid-row: auto;
      width: 62px;
      height: 62px;
      border-radius: 21px;
    }
    .payment-timeline {
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: left;
    }
    .timeline-item {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 46px;
      padding: 12px 14px;
      border-radius: 18px;
      background: var(--color-bg);
      color: var(--color-muted);
      font-weight: 900;
    }
    .timeline-item span {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #C9D4DC;
      flex: 0 0 24px;
    }
    .timeline-done { color: var(--color-navy); }
    .timeline-done span {
      border-color: var(--color-success);
      background: var(--color-success);
    }
    .timeline-active {
      color: var(--color-navy);
      background: var(--color-mint);
    }
    .timeline-active span {
      border-color: var(--color-teal);
      box-shadow: 0 0 0 6px rgba(0,151,167,0.11);
      animation: checkoutPulse 1.6s ease infinite;
    }
    .timeline-danger span {
      border-color: var(--color-danger);
      background: var(--color-danger);
    }
    .checkout-summary-card {
      margin-top: 18px;
      border-radius: 28px;
      box-shadow: 0 16px 48px rgba(7,27,51,0.06);
    }
    .checkout-summary-card h3 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    .checkout-note {
      margin-top: 18px;
      padding: 18px;
      background: var(--color-mint);
      border: 1px solid rgba(35,199,201,0.28);
      border-radius: 24px;
      color: var(--color-navy);
      font-weight: 900;
      line-height: 1.45;
    }
    .checkout-empty {
      text-align: center;
    }
    .checkout-empty h2 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .checkout-empty p {
      margin: 0;
      color: var(--color-muted);
      font-size: 17px;
    }
    @keyframes checkoutFade {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes checkoutSlide {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes checkoutPulse {
      0%, 100% { box-shadow: 0 0 0 5px rgba(0,151,167,0.10); }
      50% { box-shadow: 0 0 0 9px rgba(0,151,167,0.05); }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 1ms !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }
    }
    @media (max-width: 620px) {
      .buyer-checkout {
        max-width: none;
        padding-bottom: calc(72px + env(safe-area-inset-bottom));
      }
      .buyer-checkout .brand {
        justify-content: center;
        margin-bottom: 16px;
      }
      .checkout-panel {
        padding: 24px;
        border-radius: 28px;
      }
      .recognition-grid, .method-toggle {
        grid-template-columns: 1fr;
      }
      .payment-row {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .payment-row strong {
        grid-column: 1 / span 1;
        text-align: left;
      }
      .payment-row .copy-icon-btn {
        grid-column: 2;
        grid-row: 1 / span 2;
      }
      .detail-lite {
        grid-template-columns: minmax(0, 1fr) auto;
      }
    }
    @media (max-width: 430px) {
      .app-shell-checkout {
        padding-left: 14px;
        padding-right: 14px;
      }
      .checkout-step b {
        display: none;
      }
      .checkout-step {
        justify-content: center;
      }
      .checkout-panel {
        padding: 22px;
        border-radius: 26px;
      }
      .checkout-intro-panel h1 {
        font-size: 38px;
      }
      .checkout-lead {
        font-size: 18px;
      }
      .checkout-benefit {
        min-height: 96px;
        padding: 16px;
      }
      .security-note {
        font-size: 18px;
      }
      .bank-option-card, .launcher-card, .method-card {
        border-radius: 23px;
        padding: 16px;
      }
      .btn-wide {
        min-height: 62px;
        font-size: 20px;
      }
    }
  </style>`;
}
