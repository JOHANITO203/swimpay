import { AppShell, Button, escapeHtml } from '../ui/Components.js';
import type {
  BuyerCheckoutPaymentMethod,
  BuyerSafeReceivingRoute,
  PayerBankLauncherOption,
  ReceiverBankOption,
  ReceivingRouteRailType
} from '@swimpay/contracts';
import type { CheckoutSession, CheckoutRecipient, StructuredCheckoutFallbackCode } from '../index.js';

type BuyerCheckoutStep = 'intro' | 'bank' | 'route' | 'launcher' | 'instructions' | 'waiting';
type VisualStage = 'intro' | 'info' | 'instructions' | 'status';
type CheckoutStateTone = 'info' | 'success' | 'warning' | 'danger';
type TimelineState = 'done' | 'active' | 'pending' | 'danger';
type BuyerMethodAvailability = Record<BuyerCheckoutPaymentMethod, boolean>;

interface CheckoutStateView {
  title: string;
  text: string;
  tone: CheckoutStateTone;
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
  const methodAvailability = getBuyerMethodAvailability(session, banks, routes);
  const step = getCheckoutStep(session);
  const stage = visualStageForStep(step);

  return AppShell({
    title: 'Payer avec SwimPay',
    chrome: 'checkout',
    children: `<section class="screen buyer-checkout checkout-screen-shell" data-current-stage="${stage}">
      <div class="checkout-shell-inner">
        ${renderCheckoutBrand()}
        ${renderSegmentProgress(stage)}
        <div class="checkout-flow" data-checkout-stage-host>
          ${renderCurrentStage(step, session, displayStatus, banks, visibleRoutes, selectedRoute, selectedLauncher, launchers, methodAvailability)}
        </div>
        ${renderCheckoutTrustFooter()}
      </div>
    </section>
    ${buyerCheckoutStyles()}
    ${buyerCheckoutScript()}`
  });
}

function renderCurrentStage(
  step: BuyerCheckoutStep,
  session: CheckoutSession,
  displayStatus: string,
  banks: readonly ReceiverBankOption[],
  visibleRoutes: readonly BuyerSafeReceivingRoute[],
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined,
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability
): string {
  if (step === 'intro') return renderIntroFlow(session, banks, methodAvailability);
  if (step === 'bank') return renderReceiverBankSelection(session, banks);
  if (step === 'route') return renderReceivingRouteSelection(session, banks, visibleRoutes, methodAvailability);
  if (step === 'launcher') return renderPayerLauncherSelection(session, banks, selectedRoute, launchers, methodAvailability);
  if (step === 'instructions') return renderInstructionsStep(session, banks, selectedRoute, selectedLauncher, methodAvailability);
  return renderWaitingStatusStep(session, displayStatus, selectedRoute, selectedLauncher);
}

function getCheckoutStep(session: CheckoutSession): BuyerCheckoutStep {
  if (isWaitingBuyerState(session)) return 'waiting';
  if (hasStructuredCheckoutFallback(session)) return 'route';
  if (!session.payment_method) return 'intro';
  if (!session.selected_receiver_bank_id) return 'bank';
  if (!session.selected_receiving_route_id) return 'route';
  if (!session.selected_payer_bank_launcher_id) return 'launcher';
  return 'instructions';
}

function visualStageForStep(step: BuyerCheckoutStep): VisualStage {
  if (step === 'intro' || step === 'bank') return step === 'intro' ? 'intro' : 'info';
  if (step === 'route' || step === 'launcher' || step === 'instructions') return 'instructions';
  return 'status';
}

function filterRoutesForSession(
  routes: readonly BuyerSafeReceivingRoute[],
  paymentMethod: CheckoutSession['payment_method']
): readonly BuyerSafeReceivingRoute[] {
  if (paymentMethod === 'card') return routes.filter((route) => route.rail_type === 'card_transfer');
  if (paymentMethod === 'sbp') return routes.filter((route) => route.rail_type === 'phone_transfer');
  return routes;
}

function getBuyerMethodAvailability(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  routes: readonly BuyerSafeReceivingRoute[]
): BuyerMethodAvailability {
  if (session.available_payment_methods) {
    return session.available_payment_methods;
  }
  const rails = new Set<ReceivingRouteRailType>();
  for (const bank of banks) {
    for (const rail of bank.rail_types ?? []) {
      rails.add(rail);
    }
  }
  for (const route of routes) {
    rails.add(route.rail_type);
  }
  return {
    card: rails.has('card_transfer'),
    sbp: rails.has('phone_transfer')
  };
}

function hasReceivingMethod(availability: BuyerMethodAvailability): boolean {
  return availability.card || availability.sbp;
}

function hasStructuredCheckoutFallback(session: CheckoutSession): boolean {
  return Boolean(session.checkout_error_code || session.unavailable_reason);
}

function getSelectedBuyerMethod(
  session: CheckoutSession,
  availability: BuyerMethodAvailability
): BuyerCheckoutPaymentMethod {
  if (session.payment_method && availability[session.payment_method]) {
    return session.payment_method;
  }
  return availability.card ? 'card' : 'sbp';
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

function renderCheckoutBrand(): string {
  return `<header class="checkout-brand" aria-label="SwimPay">
    <div class="checkout-brand-mark">${swimPayWavesSvg()}</div>
    <div class="checkout-brand-copy">
      <strong>SwimPay</strong>
      <span>Security Engine</span>
    </div>
  </header>`;
}

function renderSegmentProgress(stage: VisualStage): string {
  const current = stageIndex(stage);
  const labels = ['Intro', 'Infos', 'Paiement', 'Suivi'];
  return `<nav class="checkout-progress" data-progress-bar data-active-step="${current}" aria-label="Progression du paiement">
    ${labels.map((label, index) => {
      const segmentState = index + 1 <= current ? 'active' : 'pending';
      return `<span class="checkout-progress-segment checkout-progress-${segmentState}" aria-label="${escapeHtml(label)}"></span>`;
    }).join('')}
  </nav>`;
}

function stageIndex(stage: VisualStage): number {
  if (stage === 'intro') return 1;
  if (stage === 'info') return 2;
  if (stage === 'instructions') return 3;
  return 4;
}

function renderIntroFlow(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  methodAvailability: BuyerMethodAvailability
): string {
  if (!hasReceivingMethod(methodAvailability)) {
    return renderNoReceivingMethodsFallback(session, false);
  }
  return `<div class="checkout-stage-host">
    ${renderIntroStep()}
    ${renderBuyerIdentityStep(session, banks, methodAvailability, true)}
  </div>`;
}

function renderIntroStep(): string {
  return `<section class="checkout-stage-card checkout-intro-card" data-checkout-panel="intro" data-visual-stage="intro">
    <div class="checkout-stage-icon">${swimPayWavesSvg()}</div>
    <div class="checkout-stage-head checkout-stage-head-center">
      <p class="checkout-kicker">SwimPay</p>
      <h1>Simple. S&ucirc;r. SwimPay.</h1>
      <p>Suivez votre paiement bancaire jusqu'a validation.</p>
    </div>
    <div class="checkout-feature-list">
      ${renderFeature('shield', 'Paiement guid&eacute;', 'Nous vous guidons etape par etape.')}
      ${renderFeature('clock', 'Suivi en temps reel', 'Suivez l&rsquo;etat du paiement sans quitter le parcours.')}
      ${renderFeature('return', 'Retour au marchand', 'Retour au marchand apres validation finale.')}
    </div>
    <button class="checkout-primary-action checkout-next" type="button" data-show-panel="buyer-identity" data-progress-step="2">Commencer l&rsquo;experience</button>
    <p class="checkout-network-note"><span></span> Reseau de confiance SwimPay</p>
  </section>`;
}

function renderFeature(icon: 'shield' | 'clock' | 'return', label: string, text: string): string {
  return `<article class="checkout-feature-card">
    <span class="checkout-feature-icon">${iconSvg(icon)}</span>
    <div>
      <strong>${label}</strong>
      <small>${text}</small>
    </div>
  </article>`;
}

function renderBuyerIdentityStep(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  methodAvailability: BuyerMethodAvailability,
  hidden = false,
  title = 'Vos informations'
): string {
  if (!hasReceivingMethod(methodAvailability)) {
    return renderNoReceivingMethodsFallback(session, hidden);
  }
  const selectedMethod = getSelectedBuyerMethod(session, methodAvailability);
  const cardActive = selectedMethod === 'card';
  const sbpActive = selectedMethod === 'sbp';
  return `<section class="checkout-stage-card checkout-info-card" data-checkout-panel="buyer-identity" ${hidden ? 'hidden' : ''} data-visual-stage="info">
    <div class="checkout-stage-head">
      <h1>${escapeHtml(title)}</h1>
      <p>Ces donnees servent a reconnaitre le signal de paiement.</p>
    </div>
    <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/expected-payment-profile" class="expected-profile-form">
      <div class="checkout-input-grid">
        ${renderTextInput('Prenom', 'buyer_first_name', 'Jean', 'given-name')}
        ${renderTextInput('Nom', 'buyer_last_name', 'Dupont', 'family-name')}
      </div>
      <div class="checkout-field-block">
        <span class="checkout-field-label">Methode de paiement</span>
        <div class="method-toggle" role="radiogroup" aria-label="Methode de paiement">
          ${methodAvailability.card ? renderPaymentMethodCard('card', 'Carte', 'card', cardActive) : ''}
          ${methodAvailability.sbp ? renderPaymentMethodCard('sbp', 'SBP / telephone', 'phone', sbpActive) : ''}
        </div>
      </div>
      <label class="checkout-field">Banque d'envoi
        <select name="sender_bank_id" required>
          ${banks.map((bank) => `<option value="${escapeHtml(bank.bank_profile_id)}">${escapeHtml(bank.display_name)}</option>`).join('')}
        </select>
      </label>
      <div class="method-field-stack">
        ${methodAvailability.card ? `<label class="checkout-field" data-method-field="card" ${cardActive ? '' : 'hidden'}>Carte d'envoi
          <input name="sender_card_number" inputmode="numeric" autocomplete="cc-number" placeholder="4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;" ${cardActive ? '' : 'disabled'}>
        </label>` : ''}
        ${methodAvailability.sbp ? `<label class="checkout-field" data-method-field="sbp" ${sbpActive ? '' : 'hidden'}>Telephone d'envoi
          <input name="sender_phone" type="tel" autocomplete="tel" placeholder="+7 ..." ${sbpActive ? '' : 'disabled'}>
        </label>` : ''}
      </div>
      <p class="checkout-security-line"><span></span> Pas de CVV, pas de date d'expiration, pas de code SMS.</p>
      <button class="checkout-primary-action" type="submit">Continuer</button>
      <button class="checkout-ghost-action" type="button" data-show-panel="intro" data-progress-step="1">Retour a l'accueil</button>
    </form>
  </section>`;
}

function renderTextInput(label: string, name: string, placeholder: string, autocomplete: string): string {
  return `<label class="checkout-field">${escapeHtml(label)}
    <input name="${escapeHtml(name)}" autocomplete="${escapeHtml(autocomplete)}" placeholder="${escapeHtml(placeholder)}" required>
  </label>`;
}

function renderPaymentMethodCard(
  value: BuyerCheckoutPaymentMethod,
  label: string,
  icon: 'card' | 'phone',
  selected: boolean
): string {
  const inputAttributes = [
    'type="radio"',
    'name="payment_method"',
    `value="${value}"`,
    selected ? 'checked' : ''
  ].filter(Boolean).join(' ');
  return `<label class="payment-method-card ${selected ? 'selected' : ''}" data-payment-method="${value}">
    <input ${inputAttributes}>
    <span class="payment-method-icon">${iconSvg(icon)}</span>
    <strong>${escapeHtml(label)}</strong>
    <small>${escapeHtml(`${label} disponible`)}</small>
  </label>`;
}

function renderReceiverBankSelection(session: CheckoutSession, banks: readonly ReceiverBankOption[]): string {
  return `<section class="checkout-stage-card checkout-info-card" data-visual-stage="info">
    <div class="checkout-stage-head">
      <h1>Banque du marchand</h1>
      <p>Choisissez la banque configuree pour recevoir ce paiement.</p>
    </div>
    <div class="checkout-option-list">${banks.map((bank) => {
      const available = (bank.available_route_count ?? 0) > 0;
      return `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/receiver-bank" class="selection-form">
        <input type="hidden" name="receiver_bank_id" value="${escapeHtml(bank.receiver_bank_id)}">
        <button class="checkout-option-card" type="submit" ${available ? '' : 'disabled'}>
          <span class="bank-logo-mark">${escapeHtml(bank.display_name.slice(0, 1))}</span>
          <span class="checkout-option-copy">
            <strong>${escapeHtml(bank.display_name)}</strong>
            <small>${available ? 'Disponible' : 'Indisponible'}</small>
          </span>
          <span class="checkout-option-arrow">-&gt;</span>
        </button>
      </form>`;
    }).join('')}</div>
  </section>`;
}

function renderReceivingRouteSelection(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  routes: readonly BuyerSafeReceivingRoute[],
  methodAvailability: BuyerMethodAvailability
): string {
  if (hasStructuredCheckoutFallback(session) || routes.length === 0) {
    return `<div class="checkout-stage-host">
      ${renderStructuredFallback(session, methodAvailability)}
      ${renderBuyerIdentityStep(session, banks, methodAvailability, false, 'Changer de methode')}
    </div>`;
  }

  return `<section class="checkout-stage-card" data-visual-stage="instructions">
    <div class="checkout-stage-head">
      <p class="checkout-kicker">Instructions de paiement</p>
      <h1>Destination</h1>
      <p>Selectionnez la destination compatible avec votre methode.</p>
    </div>
    <div class="checkout-option-list">${routes.map((route) => {
      const isPhone = route.rail_type === 'phone_transfer';
      const title = isPhone ? 'Telephone du destinataire' : 'Carte du destinataire';
      return `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/receiving-route" class="selection-form">
        <input type="hidden" name="receiving_route_id" value="${escapeHtml(route.route_id)}">
        <button class="checkout-option-card route-option-card" type="submit">
          <span class="payment-method-icon">${iconSvg(isPhone ? 'phone' : 'card')}</span>
          <span class="checkout-option-copy">
            <strong>${title}</strong>
            <small>${escapeHtml(route.receiver_identifier_masked)}</small>
          </span>
          <span class="checkout-option-arrow">Utiliser</span>
        </button>
      </form>`;
    }).join('')}</div>
  </section>`;
}

function renderPayerLauncherSelection(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  launchers: readonly PayerBankLauncherOption[],
  methodAvailability: BuyerMethodAvailability
): string {
  if (!selectedRoute) {
    return `<div class="checkout-stage-host">
      ${renderStructuredFallback(session, methodAvailability)}
      ${renderBuyerIdentityStep(session, banks, methodAvailability, false, 'Changer de methode')}
    </div>`;
  }

  const orderedLaunchers = orderLaunchers(launchers, session.sender_bank_id);
  return `<section class="checkout-stage-card" data-visual-stage="instructions">
    <div class="checkout-stage-head">
      <p class="checkout-kicker">Details du virement</p>
      <h1>Ouvrir ma banque</h1>
      <p>Choisissez l'application bancaire a ouvrir.</p>
    </div>
    ${renderInstructionPreview(session, selectedRoute)}
    <div class="checkout-option-list">${orderedLaunchers.map((launcher) => `<form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/payer-bank-launcher" class="selection-form">
      <input type="hidden" name="payer_bank_launcher_id" value="${escapeHtml(launcher.payer_bank_launcher_id)}">
      <button class="checkout-option-card" type="submit">
        <span class="bank-logo-mark">${escapeHtml(launcher.display_name.slice(0, 1))}</span>
        <span class="checkout-option-copy">
          <strong>${escapeHtml(launcher.display_name)}</strong>
          <small>${launcher.launch_url ? 'Ouverture si disponible' : 'Instructions manuelles'}</small>
        </span>
        <span class="checkout-option-arrow">-&gt;</span>
      </button>
    </form>`).join('')}</div>
  </section>`;
}

function renderInstructionsStep(
  session: CheckoutSession,
  banks: readonly ReceiverBankOption[],
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined,
  methodAvailability: BuyerMethodAvailability
): string {
  if (!selectedRoute) {
    return `<div class="checkout-stage-host">
      ${renderStructuredFallback(session, methodAvailability)}
      ${renderBuyerIdentityStep(session, banks, methodAvailability, false, 'Changer de methode')}
    </div>`;
  }

  const isPhone = selectedRoute.rail_type === 'phone_transfer';
  const amount = session.payable_amount ?? session.amount;
  const destinationLabel = isPhone ? 'Telephone destinataire' : 'Carte destinataire';
  const destinationCopyLabel = isPhone ? 'Telephone du destinataire' : 'Carte du destinataire';
  const methodLabel = isPhone ? 'Telephone SBP' : 'Carte';
  const bankLabel = selectedLauncher?.display_name ?? 'Banque choisie';
  const summary = [
    `Montant exact: ${amount.value} ${amount.currency}`,
    `Reference: ${session.reference}`,
    `${destinationCopyLabel}: ${selectedRoute.receiver_identifier_masked}`,
    `Banque: ${bankLabel}`
  ].join('\\n');

  return `<section class="checkout-stage-card checkout-instructions-card" data-visual-stage="instructions">
    <div class="checkout-stage-head checkout-stage-head-center">
      <p class="checkout-kicker">Instructions de paiement</p>
      <h1>Details du virement</h1>
      <p>Veuillez effectuer le virement avec les details exacts ci-dessous.</p>
    </div>
    <div class="checkout-session-pill">
      <span><i></i> Session active <span class="sr-only">Completez le paiement dans</span></span>
      <strong data-countdown-target="${escapeHtml(session.expires_at)}">--:--</strong>
    </div>
    <div class="payment-details-card">
      ${renderCopyablePaymentRow('Montant exact', `${amount.value} ${amount.currency}`, `${amount.value} ${amount.currency}`)}
      ${renderCopyablePaymentRow('Reference', session.reference, session.reference)}
      ${renderCopyablePaymentRow(destinationLabel, selectedRoute.receiver_identifier_masked, '', true, session.payment_session_id, destinationCopyLabel)}
      ${renderCopyablePaymentRow('Banque', bankLabel, bankLabel)}
      ${renderCopyablePaymentRow('Methode', methodLabel, methodLabel)}
    </div>
    <div class="instruction-actions">
      <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/continue-to-bank">
        <button class="checkout-primary-action" type="submit">Aller a ma banque ${iconSvg('external')}<span class="sr-only">Ouvrir ma banque</span></button>
      </form>
      <button class="checkout-secondary-action" type="button" data-copy-value="${escapeHtml(summary)}" aria-label="Copier les details">Copier tous les details</button>
      <form method="post" action="/checkout/${escapeHtml(session.payment_session_id)}/claimed-paid">
        ${Button({ text: "J'ai paye", id: 'paid-button', variant: 'ghost', class: 'checkout-ghost-action checkout-paid-action', type: 'submit' })}
      </form>
      <a class="checkout-ghost-action" href="/checkout/${escapeHtml(session.payment_session_id)}">Annuler et modifier les infos</a>
    </div>
  </section>`;
}

function renderNoReceivingMethodsFallback(session: CheckoutSession, hidden = false): string {
  return `<section class="checkout-stage-card checkout-empty-card checkout-configuration-card" data-checkout-panel="buyer-identity" ${hidden ? 'hidden' : ''} data-visual-stage="info">
    <div class="checkout-stage-icon">!</div>
    <h1>Paiement indisponible</h1>
    <p>Ce marchand n&#39;a pas encore configure de moyen de reception actif.</p>
    <div class="checkout-empty-actions">
      <a class="checkout-secondary-action" href="/checkout/${escapeHtml(session.payment_session_id)}">Actualiser</a>
      ${renderReturnToMerchantAction(session)}
    </div>
  </section>`;
}

function renderStructuredFallback(session: CheckoutSession, methodAvailability: BuyerMethodAvailability): string {
  const hasCard = methodAvailability.card;
  const hasSbp = methodAvailability.sbp;
  const availableText = hasCard && hasSbp
    ? 'Choisissez une methode disponible.'
    : hasCard
      ? 'Ce marchand accepte actuellement : Carte.'
      : hasSbp
        ? 'Ce marchand accepte actuellement : SBP / telephone.'
        : 'Ce marchand n&#39;a pas encore configure de moyen de reception actif.';
  const fallbackActions = getFallbackActions(session, methodAvailability);
  const actions = [
    fallbackActions.has('switch_to_card') && hasCard
      ? `<button class="checkout-primary-action" type="button" data-show-panel="buyer-identity" data-progress-step="2" data-select-method="card">Payer par carte</button>`
      : '',
    fallbackActions.has('switch_to_sbp') && hasSbp
      ? `<button class="checkout-primary-action" type="button" data-show-panel="buyer-identity" data-progress-step="2" data-select-method="sbp">Payer par SBP</button>`
      : '',
    fallbackActions.has('refresh_methods')
      ? `<a class="checkout-secondary-action" href="/checkout/${escapeHtml(session.payment_session_id)}">Actualiser les methodes</a>`
      : '',
    fallbackActions.has('return_to_merchant') ? renderReturnToMerchantAction(session) : ''
  ].filter(Boolean).join('');
  const title = checkoutFallbackTitle(session.checkout_error_code, methodAvailability);
  const explanation = checkoutFallbackExplanation(session.checkout_error_code);

  return `<section class="checkout-stage-card checkout-empty-card checkout-configuration-card" data-visual-stage="instructions">
    <div class="checkout-stage-icon">!</div>
    <h1>${escapeHtml(title)}</h1>
    ${explanation ? `<p>${escapeHtml(explanation)}</p>` : ''}
    <p>${availableText}</p>
    <div class="checkout-empty-actions">${actions}</div>
  </section>`;
}

function checkoutFallbackTitle(
  code: StructuredCheckoutFallbackCode | undefined,
  methodAvailability: BuyerMethodAvailability
): string {
  if (code === 'receiving_route_unavailable') return 'Destination indisponible';
  if (code === 'amount_lease_unavailable') return 'Montant indisponible';
  if (code === 'checkout_selection_incomplete') return 'Selection incomplete';
  if (code === 'checkout_session_expired') return 'Session expiree';
  if (!hasReceivingMethod(methodAvailability)) return 'Paiement indisponible';
  return 'Methode indisponible';
}

function checkoutFallbackExplanation(code: StructuredCheckoutFallbackCode | undefined): string {
  if (code === 'receiving_route_unavailable') {
    return "La destination selectionnee n'est plus disponible pour ce paiement.";
  }
  if (code === 'amount_lease_unavailable') {
    return "Le montant exact reserve n'est plus disponible pour cette tentative.";
  }
  if (code === 'checkout_selection_incomplete') {
    return 'Des informations de paiement manquent avant de continuer.';
  }
  if (code === 'checkout_session_expired') {
    return 'Cette session de paiement a expire.';
  }
  return '';
}

function getFallbackActions(
  session: CheckoutSession,
  methodAvailability: BuyerMethodAvailability
): Set<string> {
  const actions = session.fallback_actions && session.fallback_actions.length > 0
    ? session.fallback_actions
    : [
        methodAvailability.card ? 'switch_to_card' : '',
        methodAvailability.sbp ? 'switch_to_sbp' : '',
        'refresh_methods',
        'return_to_merchant'
      ];
  return new Set(actions.filter(Boolean));
}

function renderReturnToMerchantAction(session: CheckoutSession): string {
  if (session.return_url) {
    return `<a class="checkout-ghost-action" href="${escapeHtml(session.return_url)}">Retour au marchand</a>`;
  }
  return `<button class="checkout-ghost-action" type="button" onclick="history.back()">Retour au marchand</button>`;
}

function renderCopyablePaymentRow(
  label: string,
  displayValue: string,
  copyValue: string,
  destination = false,
  paymentSessionId = '',
  ariaLabel = label
): string {
  const attr = destination
    ? `data-copy-destination="${escapeHtml(paymentSessionId)}"`
    : `data-copy-value="${escapeHtml(copyValue)}"`;
  return `<div class="payment-row">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(displayValue)}</strong>
    <button class="copy-icon-btn" type="button" ${attr} aria-label="Copier ${escapeHtml(ariaLabel)}">${iconSvg('copy')}</button>
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

function renderWaitingStatusStep(
  session: CheckoutSession,
  displayStatus: string,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined
): string {
  const state = checkoutStateView(session);
  return `<section class="checkout-stage-card checkout-status-card buyer-state-${state.tone}" data-visual-stage="status">
    <div class="checkout-stage-head">
      <h1>${escapeHtml(state.title)}</h1>
      <p>${escapeHtml(state.text)}</p>
    </div>
    ${renderPaymentTimeline(session)}
    ${renderStatusMessage(session)}
    ${renderStatusSummary(session, displayStatus, selectedRoute, selectedLauncher)}
    ${renderWaitingAction(session)}
  </section>`;
}

function renderStatusMessage(session: CheckoutSession): string {
  if (session.status === 'signal_detected' || session.status === 'matching' || session.status === 'needs_review') {
    return `<div class="checkout-signal-notice">Signal detecte, en attente de validation marchand.</div>`;
  }
  return `<div class="checkout-safe-notice">
    <span class="checkout-info-icon">i</span>
    <p>SwimPay suit le signal cote marchand. Ce n'est pas un recu bancaire officiel.</p>
  </div>`;
}

function renderWaitingAction(session: CheckoutSession): string {
  if (session.status === 'manual_confirmed' || session.status === 'fulfilled') {
    return `<button class="checkout-primary-action" type="button" onclick="history.back()">Retourner au marchand <span aria-hidden="true">-&gt;</span></button>`;
  }
  if (session.status === 'expired') {
    return `<a class="checkout-primary-action" href="/checkout/${escapeHtml(session.payment_session_id)}">Reessayer</a>`;
  }
  if (session.status === 'rejected') {
    return `<button class="checkout-secondary-action" type="button" onclick="history.back()">Contacter le marchand</button>`;
  }
  return `<a class="checkout-secondary-action checkout-refresh-action" href="/checkout/${escapeHtml(session.payment_session_id)}"><span></span>Actualisation...</a>`;
}

function renderPaymentTimeline(session: CheckoutSession): string {
  const confirmed = session.status === 'manual_confirmed' || session.status === 'fulfilled';
  const rejectedOrExpired = session.status === 'rejected' || session.status === 'expired';
  const signal = ['signal_detected', 'matching', 'needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const review = ['needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const claimedPaid = ['buyer_claimed_paid', 'signal_detected', 'matching', 'needs_review', 'manual_confirmed', 'fulfilled'].includes(session.status);
  const items: Array<[string, TimelineState]> = [
    ['Recherche du signal', signal || review || confirmed ? 'done' : rejectedOrExpired ? 'danger' : claimedPaid ? 'active' : 'pending'],
    ['Signal detecte', signal || review || confirmed ? 'done' : 'pending'],
    ['En attente de validation marchand', confirmed ? 'done' : review ? 'active' : 'pending'],
    ['Paiement confirme', confirmed ? 'done' : rejectedOrExpired ? 'danger' : 'pending']
  ];

  return `<div class="payment-timeline" aria-label="Suivi du paiement">
    ${items.map(([label, state]) => `<div class="timeline-item timeline-${state}">
      <span>${state === 'done' ? iconSvg('check') : ''}</span><strong>${escapeHtml(label)}</strong>
    </div>`).join('')}
  </div>`;
}

function checkoutStateView(session: CheckoutSession): CheckoutStateView {
  const safe = session.buyer_safe_status;
  if (session.status === 'expired' || safe === 'expired') {
    return { title: 'Paiement expire', text: "Le paiement n'a pas ete valide a temps.", tone: 'warning' };
  }
  if (session.status === 'rejected' || safe === 'not_validated') {
    return { title: 'Paiement rejete', text: 'Veuillez reessayer ou contacter le marchand.', tone: 'danger' };
  }
  if (session.status === 'manual_confirmed' || session.status === 'fulfilled' || safe === 'confirmed') {
    return { title: 'Paiement confirme', text: 'Votre commande peut maintenant etre traitee.', tone: 'success' };
  }
  if (session.status === 'needs_review' || session.status === 'matching' || safe === 'needs_review') {
    return { title: 'Validation marchand', text: 'Le marchand verifie ce paiement.', tone: 'warning' };
  }
  if (session.status === 'signal_detected' || safe === 'signal_detected') {
    return { title: 'Signal detecte', text: 'Signal detecte, en attente de validation marchand.', tone: 'info' };
  }
  return { title: 'Paiement en cours', text: 'SwimPay suit le signal de paiement cote marchand.', tone: 'info' };
}

function renderStatusSummary(
  session: CheckoutSession,
  displayStatus: string,
  selectedRoute: BuyerSafeReceivingRoute | undefined,
  selectedLauncher: PayerBankLauncherOption | undefined
): string {
  const amount = session.payable_amount ?? session.amount;
  return `<div class="checkout-status-summary">
    <h2>Resume</h2>
    ${renderSummaryRow('Montant', `${amount.value} ${amount.currency}`)}
    ${renderSummaryRow('Reference', session.reference)}
    ${selectedRoute ? renderSummaryRow('Destination', selectedRoute.receiver_identifier_masked) : ''}
    ${selectedLauncher ? renderSummaryRow('Banque', selectedLauncher.display_name) : ''}
    <div class="summary-row"><span>Statut</span><strong class="summary-pill">${escapeHtml(displayStatus)}</strong></div>
  </div>`;
}

function renderSummaryRow(label: string, value: string): string {
  return `<div class="summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderCheckoutTrustFooter(): string {
  return `<footer class="checkout-trust-footer">
    <div class="checkout-trust-badge">${iconSvg('shield')} Secured by SwimPay Cloud</div>
    <p>&copy; 2026 SwimPay Technologies Inc. All rights reserved.</p>
  </footer>`;
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

function swimPayWavesSvg(): string {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" class="swimpay-waves-mark">
    <path d="M10 17.5c4.9 0 4.9-3 9.8-3s4.9 3 9.8 3 4.9-3 8.4-3v5.2c-3.5 0-3.5 3-8.4 3s-4.9-3-9.8-3-4.9 3-9.8 3v-5.2z"/>
    <path d="M10 24.2c4.9 0 4.9-3 9.8-3s4.9 3 9.8 3 4.9-3 8.4-3v5.2c-3.5 0-3.5 3-8.4 3s-4.9-3-9.8-3-4.9 3-9.8 3v-5.2z"/>
    <path d="M10 30.9c4.9 0 4.9-3 9.8-3s4.9 3 9.8 3 4.9-3 8.4-3v5.2c-3.5 0-3.5 3-8.4 3s-4.9-3-9.8-3-4.9 3-9.8 3v-5.2z"/>
  </svg>`;
}

function iconSvg(icon: 'shield' | 'clock' | 'return' | 'card' | 'phone' | 'copy' | 'external' | 'check'): string {
  if (icon === 'shield') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-2.9 8.5-7 10-4.1-1.5-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-5"/></svg>`;
  }
  if (icon === 'clock') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>`;
  }
  if (icon === 'return') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H5v4"/><path d="M5 11c1.2-3.2 4.2-5 7.5-4.5 4 .6 6.8 4.2 6.2 8.2-.6 3.9-4.2 6.7-8.1 6.1"/></svg>`;
  }
  if (icon === 'card') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/><path d="M8 14h4"/></svg>`;
  }
  if (icon === 'phone') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="3"/><path d="M11 17.5h2"/></svg>`;
  }
  if (icon === 'copy') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>`;
  }
  if (icon === 'external') {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5"/><path d="M10 14L19 5"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>`;
}

function buyerCheckoutScript(): string {
  return `<script>
    (() => {
      const setProgress = (step) => {
        const progress = document.querySelector('[data-progress-bar]');
        if (!progress) return;
        progress.setAttribute('data-active-step', step);
        const segments = Array.from(progress.querySelectorAll('.checkout-progress-segment'));
        segments.forEach((segment, index) => {
          segment.classList.toggle('checkout-progress-active', index + 1 <= Number(step));
          segment.classList.toggle('checkout-progress-pending', index + 1 > Number(step));
        });
      };

      const showPanel = (id, step) => {
        const panels = Array.from(document.querySelectorAll('[data-checkout-panel]'));
        const panel = document.querySelector('[data-checkout-panel="' + id + '"]');
        if (!panel) return;
        panels.forEach((item) => {
          item.hidden = item !== panel;
        });
        document.querySelector('.checkout-screen-shell')?.setAttribute('data-current-stage', id === 'intro' ? 'intro' : 'info');
        setProgress(step || (id === 'intro' ? '1' : '2'));
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        const firstInput = panel.querySelector('input, select, button');
        if (firstInput && firstInput.focus) setTimeout(() => firstInput.focus(), 160);
      };

      const selectPaymentMethod = (method) => {
        if (!method) return;
        const form = document.querySelector('.expected-profile-form');
        const input = form?.querySelector('input[name=payment_method][value="' + method + '"]:not(:disabled)');
        if (!input) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      document.addEventListener('click', async (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-show-panel], [data-copy-value], [data-copy-destination]') : null;
        if (!target) return;

        if (target.hasAttribute('data-show-panel')) {
          showPanel(target.getAttribute('data-show-panel'), target.getAttribute('data-progress-step'));
          selectPaymentMethod(target.getAttribute('data-select-method'));
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
          const checked = form.querySelector('input[name=payment_method]:checked:not(:disabled)');
          const fallback = form.querySelector('input[name=payment_method]:not(:disabled)');
          const methodInput = checked || fallback;
          if (!methodInput) return;
          methodInput.checked = true;
          const method = methodInput.value || 'card';
          for (const card of form.querySelectorAll('.payment-method-card')) {
            const input = card.querySelector('input');
            card.classList.toggle('selected', input?.value === method && !input.disabled);
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
      padding: max(26px, env(safe-area-inset-top)) 18px max(28px, calc(28px + env(safe-area-inset-bottom)));
      background: #F7FAFC;
      background-image: linear-gradient(180deg, #F8FCFE 0%, #F7FAFC 62%, #FFFFFF 100%);
      min-height: 100dvh;
    }
    .buyer-checkout {
      max-width: 520px;
      margin: 0 auto;
      overflow: visible;
      color: #061426;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .checkout-shell-inner {
      width: 100%;
      min-width: 0;
    }
    .checkout-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 13px;
      margin: 2px auto 34px;
      animation: checkoutFadeUp 460ms cubic-bezier(0.23, 1, 0.32, 1) both;
    }
    .checkout-brand-mark {
      width: 50px;
      height: 50px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      color: #FFFFFF;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 25px;
      font-weight: 900;
      font-style: italic;
      background: linear-gradient(135deg, #00AFC2 0%, #007D9A 100%);
      box-shadow: 0 16px 28px rgba(0, 175, 194, 0.22);
    }
    .checkout-brand-mark svg,
    .checkout-stage-icon svg {
      width: 34px;
      height: 34px;
      fill: currentColor;
    }
    .checkout-brand-copy {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }
    .checkout-brand-copy strong {
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 27px;
      font-weight: 900;
      color: #061426;
      letter-spacing: 0;
    }
    .checkout-brand-copy span {
      margin-top: 8px;
      color: #00AFC2;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    .checkout-progress {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      width: min(100%, 382px);
      margin: 0 auto 42px;
    }
    .checkout-progress-segment {
      height: 6px;
      border-radius: 999px;
      background: #EAF0F4;
      overflow: hidden;
      position: relative;
    }
    .checkout-progress-active::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(90deg, #00AFC2, #00D2E5);
      animation: checkoutBar 420ms cubic-bezier(0.23, 1, 0.32, 1) both;
    }
    .checkout-flow,
    .checkout-stage-host {
      display: block;
      width: 100%;
      min-width: 0;
    }
    .checkout-stage-card {
      width: 100%;
      padding: clamp(28px, 6vw, 44px);
      border-radius: 32px;
      background: #FFFFFF;
      border: 1px solid rgba(226, 234, 240, 0.72);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04), 0 34px 80px rgba(6, 20, 38, 0.04);
      animation: checkoutStageIn 440ms cubic-bezier(0.23, 1, 0.32, 1) both;
    }
    .checkout-stage-card[hidden] {
      display: none;
    }
    .checkout-stage-head {
      margin-bottom: 28px;
    }
    .checkout-stage-head-center {
      text-align: center;
    }
    .checkout-stage-head h1 {
      font-family: 'Outfit', 'Inter', sans-serif;
      color: #061426;
      font-size: clamp(30px, 8vw, 42px);
      line-height: 1.04;
      letter-spacing: 0;
      font-weight: 900;
      margin: 0;
    }
    .checkout-stage-head p {
      margin: 12px 0 0;
      color: #64748B;
      font-size: 16px;
      line-height: 1.48;
      font-weight: 500;
    }
    .checkout-kicker {
      margin: 0 0 10px;
      color: #94A3B8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .checkout-stage-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 26px;
      display: grid;
      place-items: center;
      border-radius: 22px;
      background: rgba(0, 175, 194, 0.08);
      color: #00AFC2;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 26px;
      font-style: italic;
      font-weight: 900;
      box-shadow: 0 8px 18px rgba(6, 20, 38, 0.08);
    }
    .checkout-feature-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin: 42px 0 34px;
    }
    .checkout-feature-card {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      gap: 18px;
      align-items: center;
      text-align: left;
    }
    .checkout-feature-icon,
    .payment-method-icon,
    .bank-logo-mark,
    .checkout-info-icon {
      width: 46px;
      height: 46px;
      border-radius: 17px;
      display: grid;
      place-items: center;
      color: #00AFC2;
      background: #FFFFFF;
      border: 1px solid rgba(226, 234, 240, 0.82);
      box-shadow: 0 8px 16px rgba(6, 20, 38, 0.06);
      flex: 0 0 auto;
    }
    .checkout-feature-card svg,
    .payment-method-icon svg,
    .checkout-primary-action svg,
    .copy-icon-btn svg,
    .checkout-trust-badge svg,
    .timeline-item svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .checkout-feature-card strong {
      display: block;
      color: #061426;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 17px;
      font-weight: 900;
      line-height: 1.15;
    }
    .checkout-feature-card small {
      display: block;
      margin-top: 4px;
      color: #7A8AA0;
      font-size: 14px;
      line-height: 1.35;
      font-weight: 600;
    }
    .checkout-network-note {
      margin: 18px 0 0;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      color: #C8D1DA;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .checkout-network-note span,
    .checkout-security-line span,
    .checkout-session-pill i {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      display: inline-block;
      background: #20D48A;
    }
    .expected-profile-form,
    .method-field-stack {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .checkout-input-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .checkout-field,
    .checkout-field-block {
      display: flex;
      flex-direction: column;
      gap: 9px;
      color: #94A3B8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .checkout-field input,
    .checkout-field select {
      width: 100%;
      min-width: 0;
      min-height: 58px;
      border: 1px solid transparent;
      border-radius: 20px;
      background: #F7FAFC;
      color: #061426;
      padding: 15px 18px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: none;
      transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }
    .checkout-field input::placeholder {
      color: #C2CBD5;
    }
    .checkout-field input:focus,
    .checkout-field select:focus {
      outline: none;
      background: #FFFFFF;
      border-color: rgba(0, 175, 194, 0.62);
      box-shadow: 0 0 0 4px rgba(0, 175, 194, 0.12);
    }
    .method-toggle {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .payment-method-card {
      min-height: 86px;
      border-radius: 22px;
      border: 1px solid rgba(226, 234, 240, 0.82);
      background: #F9FBFD;
      display: grid;
      place-items: center;
      gap: 9px;
      padding: 14px;
      cursor: pointer;
      color: #94A3B8;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
    }
    .payment-method-card input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .payment-method-card strong {
      font-family: 'Outfit', 'Inter', sans-serif;
      color: currentColor;
      font-size: 17px;
      font-weight: 900;
      text-align: center;
    }
    .payment-method-card small {
      color: #94A3B8;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.2;
      text-align: center;
      text-transform: none;
    }
    .payment-method-card.selected {
      color: #00AFC2;
      background: rgba(0, 175, 194, 0.07);
      border-color: #00AFC2;
    }
    .payment-method-card.unavailable {
      color: #AAB6C2;
      background: #F3F6F9;
      cursor: not-allowed;
      opacity: 0.72;
    }
    .payment-method-card.unavailable .payment-method-icon {
      color: #AAB6C2;
      background: #F8FAFC;
    }
    .payment-method-card:active,
    .checkout-primary-action:active,
    .checkout-secondary-action:active,
    .checkout-option-card:active,
    .copy-icon-btn:active {
      transform: scale(0.98);
    }
    .checkout-security-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0 0;
      color: #94A3B8;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
    }
    .checkout-primary-action,
    .checkout-secondary-action,
    .checkout-ghost-action {
      width: 100%;
      min-height: 64px;
      border: 0;
      border-radius: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-decoration: none;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
    }
    .checkout-primary-action {
      color: #FFFFFF;
      background: linear-gradient(135deg, #00BFD1 0%, #0083A4 100%);
      box-shadow: 0 18px 34px rgba(0, 175, 194, 0.22);
    }
    .checkout-secondary-action {
      color: #00AFC2;
      background: #F2F6F9;
      box-shadow: none;
    }
    .checkout-ghost-action {
      min-height: 40px;
      color: #94A3B8;
      background: transparent;
      box-shadow: none;
      font-size: 15px;
    }
    .checkout-option-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .selection-form {
      margin: 0;
    }
    .checkout-option-card {
      width: 100%;
      min-height: 84px;
      border: 1px solid rgba(226, 234, 240, 0.82);
      border-radius: 24px;
      background: #F9FBFD;
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      color: #061426;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .checkout-option-card:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .checkout-option-card:not(:disabled):hover {
      border-color: rgba(0, 175, 194, 0.38);
      background: #FFFFFF;
    }
    .checkout-option-copy {
      min-width: 0;
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 3px;
    }
    .checkout-option-copy strong {
      color: #061426;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 900;
    }
    .checkout-option-copy small {
      color: #94A3B8;
      font-size: 14px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .checkout-option-arrow {
      color: #00AFC2;
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }
    .bank-logo-mark {
      background: rgba(0, 175, 194, 0.08);
      border: 0;
      color: #00AFC2;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-weight: 900;
    }
    .instruction-preview,
    .payment-details-card,
    .checkout-status-summary {
      overflow: hidden;
      border-radius: 28px;
      background: #F9FBFD;
      border: 1px solid rgba(226, 234, 240, 0.78);
      margin-bottom: 22px;
    }
    .instruction-preview div,
    .payment-row,
    .summary-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, auto) auto;
      align-items: center;
      gap: 14px;
      padding: 18px 22px;
      border-bottom: 1px solid rgba(226, 234, 240, 0.72);
    }
    .instruction-preview div {
      grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    }
    .instruction-preview div:last-child,
    .payment-row:last-child,
    .summary-row:last-child {
      border-bottom: 0;
    }
    .instruction-preview span,
    .payment-row span,
    .summary-row span {
      color: #94A3B8;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .instruction-preview strong,
    .payment-row strong,
    .summary-row strong {
      min-width: 0;
      color: #061426;
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      font-size: 17px;
      font-weight: 900;
      text-align: right;
      overflow-wrap: anywhere;
    }
    .checkout-session-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 50px;
      border-radius: 17px;
      padding: 12px 18px;
      margin-bottom: 26px;
      background: rgba(0, 175, 194, 0.08);
      color: #00AFC2;
      font-weight: 900;
    }
    .checkout-session-pill span {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .checkout-session-pill strong {
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      font-size: 18px;
    }
    .copy-icon-btn {
      width: 43px;
      height: 43px;
      border: 0;
      border-radius: 15px;
      display: grid;
      place-items: center;
      background: #FFFFFF;
      color: #00AFC2;
      box-shadow: 0 8px 18px rgba(6, 20, 38, 0.07);
      cursor: pointer;
      font-size: 0;
      transition: transform 160ms ease, background 160ms ease, color 160ms ease;
    }
    .copy-icon-btn.copy-ok,
    .copy-ok {
      background: rgba(32, 212, 138, 0.13);
      color: #20A970;
      font-size: 11px;
      font-weight: 900;
    }
    .copy-icon-btn.copy-ok svg {
      display: none;
    }
    .instruction-actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 26px;
    }
    .instruction-actions form {
      margin: 0;
    }
    .checkout-paid-action {
      color: #718096 !important;
    }
    .checkout-status-card {
      padding-bottom: clamp(28px, 6vw, 42px);
    }
    .payment-timeline {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin: 30px 0;
    }
    .timeline-item {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      color: #061426;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 17px;
      font-weight: 900;
    }
    .timeline-item span {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #F1F5F9;
      color: #C9D4DC;
      border: 2px solid transparent;
    }
    .timeline-done span {
      color: #FFFFFF;
      background: #00AFC2;
      box-shadow: 0 12px 24px rgba(0, 175, 194, 0.22);
    }
    .timeline-active span {
      border-color: #00AFC2;
      background: rgba(0, 175, 194, 0.08);
      box-shadow: 0 0 0 7px rgba(0, 175, 194, 0.08);
      animation: checkoutPulse 1.8s ease infinite;
    }
    .timeline-pending {
      color: #C8D1DA;
    }
    .timeline-danger span {
      color: #FFFFFF;
      background: #E5484D;
    }
    .checkout-signal-notice {
      margin: 22px 0;
      padding: 22px;
      border-radius: 18px;
      background: rgba(0, 175, 194, 0.08);
      color: #008EA2;
      font-weight: 900;
      line-height: 1.45;
    }
    .checkout-safe-notice {
      display: grid;
      grid-template-columns: 46px minmax(0, 1fr);
      align-items: center;
      gap: 14px;
      margin: 26px 0;
      padding: 18px;
      border-radius: 18px;
      background: #F9FBFD;
      color: #475569;
      font-size: 14px;
      font-weight: 700;
    }
    .checkout-safe-notice p {
      margin: 0;
    }
    .checkout-info-icon {
      color: #00AFC2;
      font-weight: 900;
    }
    .checkout-status-summary {
      margin-top: 28px;
      margin-bottom: 26px;
    }
    .checkout-status-summary h2 {
      margin: 0;
      padding: 20px 22px 4px;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 25px;
      color: #061426;
    }
    .summary-row {
      grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    }
    .summary-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(0, 175, 194, 0.08);
      color: #64748B !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 14px !important;
    }
    .checkout-refresh-action span {
      width: 19px;
      height: 19px;
      border-radius: 999px;
      border: 3px solid rgba(0, 175, 194, 0.22);
      border-top-color: #00AFC2;
      animation: checkoutSpin 1s linear infinite;
    }
    .checkout-empty-card {
      text-align: center;
    }
    .checkout-empty-card h1 {
      margin: 0 0 10px;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 34px;
    }
    .checkout-empty-card p {
      margin: 0;
      color: #64748B;
      font-size: 16px;
    }
    .checkout-configuration-card + .checkout-info-card {
      margin-top: 22px;
    }
    .checkout-empty-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 28px;
    }
    .checkout-trust-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      margin: 36px 0 0;
      color: #C8D1DA;
      text-align: center;
    }
    .checkout-trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      padding: 8px 18px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(226, 234, 240, 0.78);
      box-shadow: 0 8px 20px rgba(6, 20, 38, 0.05);
      color: #94A3B8;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      backdrop-filter: blur(12px);
    }
    .checkout-trust-badge svg {
      width: 15px;
      height: 15px;
      color: #20D48A;
    }
    .checkout-trust-footer p {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @keyframes checkoutFadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes checkoutStageIn {
      from { opacity: 0; transform: translateX(22px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes checkoutBar {
      from { transform: scaleX(0); transform-origin: left; }
      to { transform: scaleX(1); transform-origin: left; }
    }
    @keyframes checkoutPulse {
      0%, 100% { box-shadow: 0 0 0 6px rgba(0, 175, 194, 0.08); }
      50% { box-shadow: 0 0 0 10px rgba(0, 175, 194, 0.04); }
    }
    @keyframes checkoutSpin {
      to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .buyer-checkout *,
      .buyer-checkout *::before,
      .buyer-checkout *::after {
        animation-duration: 1ms !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }
    }
    @media (max-width: 620px) {
      .app-shell-checkout {
        padding-left: 16px;
        padding-right: 16px;
      }
      .checkout-brand {
        margin-bottom: 30px;
      }
      .checkout-progress {
        margin-bottom: 34px;
      }
      .checkout-input-grid,
      .method-toggle {
        grid-template-columns: 1fr;
      }
      .checkout-stage-card {
        border-radius: 30px;
      }
      .payment-row {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .payment-row strong {
        grid-column: 1;
        text-align: left;
      }
      .payment-row .copy-icon-btn {
        grid-column: 2;
        grid-row: 1 / span 2;
      }
      .summary-row {
        grid-template-columns: minmax(0, 1fr);
      }
      .summary-row strong {
        text-align: left;
      }
    }
    @media (max-width: 430px) {
      .app-shell-checkout {
        padding-top: max(18px, env(safe-area-inset-top));
        padding-left: 12px;
        padding-right: 12px;
      }
      .checkout-stage-card {
        padding: 28px;
        border-radius: 28px;
      }
      .checkout-brand-mark {
        width: 48px;
        height: 48px;
      }
      .checkout-brand-copy strong {
        font-size: 25px;
      }
      .checkout-primary-action,
      .checkout-secondary-action {
        min-height: 60px;
        font-size: 18px;
      }
      .checkout-feature-card {
        grid-template-columns: 48px minmax(0, 1fr);
        gap: 14px;
      }
      .checkout-feature-icon {
        width: 44px;
        height: 44px;
      }
    }
  </style>`;
}
