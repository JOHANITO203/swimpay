import {
  AppShell,
  BottomNav,
  Button,
  Card,
  EmptyState,
  IconBubble,
  MetricCard,
  OptionButton,
  PageHeader,
  PaymentAmountBlock,
  ReviewPaymentCard,
  StatusChip,
  StatusPanel,
  StepProgress,
  SwimPayBrand,
  escapeHtml
} from '../ui/Components.js';
import type { MerchantIntegrationPayload, MerchantRouteAdminRoute, MerchantWebhookDeliveryPayload } from '../index.js';

const bankOptions = [
  ['Sberbank', 'S', 'Activée'],
  ['T-Bank', 'T', 'Activée'],
  ['VTB', 'V', 'À configurer'],
  ['Alfa-Bank', 'A', 'Activée'],
  ['Gazprombank', 'G', 'En pause']
] as const;

type UiStateVariant = 'ready' | 'action' | 'empty' | 'error' | 'offline' | 'expired' | 'rejected';

export function renderHomePage(): string {
  return AppShell({
    title: 'Accueil',
    chrome: 'plain',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'SwimPay',
        subtitle: 'Gérez vos paiements, vos moyens de réception et votre configuration.',
        align: 'center'
      })}
      <div class="cluster" style="justify-content:center;">
        <a href="/merchant/onboarding/1" style="text-decoration:none;">${Button({ text: 'Onboarding', variant: 'primary' })}</a>
        <a href="/merchant/dashboard" style="text-decoration:none;">${Button({ text: 'Tableau de bord', variant: 'secondary' })}</a>
      </div>
    </div></section>`
  });
}

export function renderOnboardingPage(step: number): string {
  const normalizedStep = Math.min(Math.max(step, 1), 5);
  const renderers = [
    renderWelcomeStep,
    renderConnectPhoneStep,
    renderChooseBanksStep,
    renderReceivingMethodStep,
    renderConfigurationTestStep
  ] as const;
  const content = renderers[normalizedStep - 1]?.() ?? renderWelcomeStep();
  const progress = normalizedStep === 5
    ? StepProgress({ current: normalizedStep, total: 5, numbered: true, completeText: 'Configuration terminée' })
    : StepProgress({ current: normalizedStep, total: 3, numbered: false });

  return AppShell({
    title: onboardingTitle(normalizedStep),
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${content}
      ${progress}
    </div></section>`
  });
}

function onboardingTitle(step: number): string {
  return [
    'Recevez vos paiements plus facilement',
    'Connectez votre téléphone',
    'Choisissez vos banques',
    'Ajoutez votre moyen de réception',
    'Vérifiez que tout fonctionne'
  ][step - 1] ?? 'Onboarding';
}

function renderWelcomeStep(): string {
  return `${PageHeader({
    title: 'Recevez vos paiements plus facilement',
    subtitle: 'SwimPay détecte les paiements reçus, vous aide à les valider et prévient votre site ou votre application.'
  })}
  <div class="stack">
    ${OptionButton({ title: 'Détection rapide', subtitle: 'Repérez plus vite les paiements reçus.', icon: 'D' })}
    ${OptionButton({ title: 'Validation simple', subtitle: 'Confirmez ou rejetez en quelques secondes.', icon: 'V' })}
    ${OptionButton({ title: 'Business connecté', subtitle: 'Votre site ou application reçoit la mise à jour.', icon: 'B' })}
  </div>
  <div style="margin-top:34px;"><a href="/merchant/onboarding/2" style="text-decoration:none;">${Button({ text: 'Commencer', variant: 'primary', class: 'btn-wide' })}</a></div>`;
}

function renderConnectPhoneStep(): string {
  return `${PageHeader({
    title: 'Connectez votre téléphone',
    subtitle: 'SwimPay a besoin d’accéder aux notifications de cet appareil pour fonctionner.'
  })}
  ${StatusPanel({
    title: 'Accès nécessaire',
    text: 'Activez l’accès aux notifications pour détecter les paiements reçus.',
    variant: 'warning',
    icon: '!'
  })}
  <div style="margin-top:34px;"><a href="/merchant/onboarding/3" style="text-decoration:none;">${Button({ text: 'Activer l’accès', variant: 'primary', class: 'btn-wide' })}</a></div>
  <p class="safe-note" style="justify-content:center;margin-top:22px;">${IconBubble({ icon: 'S', tone: 'muted' })}<span>SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.</span></p>`;
}

function renderChooseBanksStep(): string {
  return `${PageHeader({
    title: 'Choisissez vos banques',
    subtitle: 'Sélectionnez les banques que vous utilisez pour recevoir vos paiements.'
  })}
  <div style="text-align:center;margin-bottom:22px;">${StatusChip({ text: 'Validation manuelle en bêta', variant: 'info' })}</div>
  <div class="stack">
    ${bankOptions.map(([name, icon]) => OptionButton({ title: name, icon, square: true })).join('')}
  </div>
  <div style="margin-top:28px;"><a href="/merchant/onboarding/4" style="text-decoration:none;">${Button({ text: 'Continuer', variant: 'primary', class: 'btn-wide' })}</a></div>`;
}

function renderReceivingMethodStep(): string {
  return `${PageHeader({
    title: 'Ajoutez votre moyen de réception',
    subtitle: 'Vos clients utiliseront ces informations pour vous payer.'
  })}
  <div class="stack">
    ${OptionButton({ title: 'Carte bancaire', subtitle: 'Recevez les paiements sur votre carte.', icon: 'C', selected: true })}
    ${OptionButton({ title: 'Numéro de téléphone', subtitle: 'Pratique pour les virements via SBP.', icon: 'T' })}
  </div>
  <div style="margin-top:34px;"><a href="/merchant/onboarding/5" style="text-decoration:none;">${Button({ text: 'Ajouter', variant: 'primary', class: 'btn-wide' })}</a></div>`;
}

function renderConfigurationTestStep(): string {
  const checklist = ['Téléphone connecté', 'Banque choisie', 'Moyen de réception ajouté', 'Site ou application connecté'];
  return `${PageHeader({
    title: 'Vérifiez que tout fonctionne',
    subtitle: 'Lancez un test avant de recevoir vos premiers paiements.'
  })}
  <div class="stack">
    ${checklist.map((item) => Card({ children: `<div class="split">${IconBubble({ icon: 'OK', tone: 'success' })}<strong style="flex:1;color:var(--color-navy);font-size:21px;">${item}</strong><span style="color:var(--color-teal);font-size:30px;">›</span></div>` })).join('')}
  </div>
  <div style="margin-top:28px;"><a href="/merchant/dashboard" style="text-decoration:none;">${Button({ text: 'Lancer un test', variant: 'primary', class: 'btn-wide' })}</a></div>`;
}

export function renderMerchantDashboard(): string {
  return AppShell({
    title: 'Tableau de bord',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({ title: 'Tableau de bord' })}
      ${StatusPanel({
        title: 'SwimPay est prêt',
        text: 'Votre téléphone est connecté et vos paiements peuvent être détectés.',
        variant: 'success',
        icon: 'OK'
      })}
      <div class="metrics-grid" style="margin-top:26px;">
        ${MetricCard({ label: 'À vérifier', value: '7', icon: 'R' })}
        ${MetricCard({ label: 'Validés aujourd’hui', value: '24', icon: 'V' })}
        ${MetricCard({ label: 'Notifications envoyées', value: '31', icon: 'N' })}
        ${MetricCard({ label: 'Téléphone', value: 'Connecté', icon: 'T' })}
      </div>
      <h2 class="section-title">Derniers paiements détectés</h2>
      <div class="payment-list">
        ${ReviewPaymentCard({ amount: '58,41 ₽', bank: 'Sberbank', helper: 'Il y a 2 min', status: 'À vérifier', action: 'Examiner', variant: 'warning' })}
        ${ReviewPaymentCard({ amount: '129,00 ₽', bank: 'T-Bank', helper: 'Il y a 8 min', status: 'Validé', action: 'Voir', variant: 'success' })}
        ${ReviewPaymentCard({ amount: '45,00 ₽', bank: 'Alfa-Bank', helper: 'Il y a 12 min', status: 'En attente', action: 'Voir', variant: 'info' })}
      </div>
      ${BottomNav({ active: 'home' })}
    </div></section>`
  });
}

export function renderMerchantReceivingMethodsPage(routes: MerchantRouteAdminRoute[]): string {
  return AppShell({
    title: 'Moyens de réception',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Moyens de réception',
        subtitle: 'Ajoutez les cartes ou numéros que vos clients utiliseront pour vous payer.'
      })}
      <form method="post" action="/merchant/receiving-methods" class="route-create-form">
        <label>Banque
          <select name="bank_id" required>
            <option value="sber_ru">Sberbank</option>
            <option value="tbank_ru">T-Bank</option>
            <option value="vtb_ru">VTB</option>
            <option value="alfa_ru">Alfa-Bank</option>
            <option value="gazprombank_ru">Gazprombank</option>
          </select>
        </label>
        <label>Coordonnee de reception
          <input name="value" placeholder="Carte ou telephone +7" autocomplete="off" inputmode="numeric" required>
        </label>
        <label>Nom court
          <input name="label" placeholder="Carte principale, telephone T-Bank" autocomplete="off">
        </label>
        <div class="two-col" style="margin-top:14px;">
          <button class="btn secondary" type="submit" name="type" value="card">${IconBubble({ icon: 'C' })}<span>Ajouter une carte</span></button>
          <button class="btn secondary" type="submit" name="type" value="phone">${IconBubble({ icon: 'SBP' })}<span>Ajouter telephone SBP</span></button>
        </div>
      </form>
      <div class="stack">
        ${routes.length > 0 ? routes.map(renderReceivingMethodCard).join('') : EmptyState({
          title: 'Aucun moyen de réception',
          text: 'Ajoutez une carte ou un numéro pour commencer à recevoir des paiements.',
          cta: 'Ajouter un moyen'
        })}
      </div>
      <p class="safe-note" style="margin-top:28px;">${IconBubble({ icon: 'S', tone: 'muted' })}<span>Les informations complètes ne sont jamais envoyées dans les webhooks.</span></p>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

function renderReceivingMethodCard(route: MerchantRouteAdminRoute): string {
  const isPhone = route.rail_type === 'phone_transfer';
  const title = isPhone ? 'Numéro de téléphone' : 'Carte bancaire';
  const bank = toBankDisplayName(route.bank_profile_id);
  const helper = isPhone ? '<p class="muted" style="margin:8px 0 0;">Pratique pour SBP</p>' : StatusChip({ text: 'Validation manuelle en bêta', variant: 'info' });
  return Card({
    class: 'receiving-method-card',
    children: `<div class="split">
      <div class="cluster" style="align-items:flex-start;">
        ${IconBubble({ icon: isPhone ? 'T' : 'C' })}
        <div>
          <h3 style="font-size:26px;">${title}</h3>
          <p class="muted" style="font-size:19px;margin:4px 0;">${escapeHtml(bank)} · ${escapeHtml(route.receiver_identifier_masked)}</p>
          <p class="muted" style="font-size:13px;margin:2px 0 8px;">${escapeHtml(route.route_code)}</p>
          ${helper}
        </div>
      </div>
      ${StatusChip({ text: route.enabled ? 'Active' : 'Inactive', variant: route.enabled ? 'success' : 'muted' })}
    </div>
    <div class="cluster method-actions" style="margin-top:22px;border-top:1px solid rgba(225,232,237,0.9);padding-top:18px;">
      ${Button({ text: 'Modifier', variant: 'ghost', class: 'btn-small' })}
      <form method="post" action="/merchant/receiving-methods/${escapeHtml(route.route_id)}/disable">${Button({ text: 'Désactiver', variant: 'ghost', class: 'btn-small', type: 'submit' })}</form>
      <form method="post" action="/merchant/receiving-methods/${escapeHtml(route.route_id)}/recommend">${Button({ text: 'Définir par défaut', variant: 'ghost', class: 'btn-small', type: 'submit' })}</form>
    </div>`
  });
}

export function renderMerchantBanksPage(): string {
  return AppShell({
    title: 'Banques',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Banques',
        subtitle: 'Sélectionnez les banques que vos clients pourront choisir au paiement.'
      })}
      <div style="text-align:center;margin-bottom:22px;">${StatusChip({ text: 'Validation manuelle en bêta', variant: 'info' })}</div>
      <div class="stack">
        ${bankOptions.map(([name, icon, status]) => Card({
          children: `<div class="split">
            <div class="cluster">${IconBubble({ icon })}<strong style="font-size:22px;color:var(--color-navy);">${name}</strong></div>
            ${StatusChip({ text: status, variant: status === 'Activée' ? 'success' : status === 'En pause' ? 'muted' : 'warning' })}
          </div>`
        })).join('')}
      </div>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

export function renderMerchantReviewQueuePage(): string {
  return AppShell({
    title: 'Paiements à vérifier',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Paiements à vérifier',
        subtitle: 'Confirmez uniquement les paiements que vous reconnaissez.'
      })}
      <div class="cluster" style="justify-content:center;margin-bottom:28px;">
        ${['Tous', 'À vérifier', 'Validés', 'Rejetés', 'Expirés'].map((filter) => Button({ text: filter, variant: filter === 'À vérifier' ? 'primary' : 'secondary', class: 'btn-small' })).join('')}
      </div>
      <div class="payment-list">
        ${ReviewPaymentCard({ amount: '58,41 ₽', bank: 'Sberbank', helper: 'Signal détecté il y a 2 min', status: 'À vérifier', action: 'Examiner', variant: 'warning' })}
        ${ReviewPaymentCard({ amount: '129,00 ₽', bank: 'T-Bank', helper: 'Référence non visible', status: 'À vérifier', action: 'Examiner', variant: 'warning' })}
        ${ReviewPaymentCard({ amount: '45,00 ₽', bank: 'Alfa-Bank', helper: 'Confirmé manuellement', status: 'Validé', action: 'Voir', variant: 'success' })}
      </div>
      ${BottomNav({ active: 'review' })}
    </div></section>`
  });
}

export function renderMerchantPaymentDetailPage(): string {
  const reasons = ['Validation manuelle en bêta', 'Référence non visible'];
  return AppShell({
    title: 'Vérifier ce paiement',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      <a href="/merchant/review-queue" style="text-decoration:none;color:var(--color-teal);font-size:34px;">‹</a>
      ${SwimPayBrand()}
      ${PageHeader({ title: 'Vérifier ce paiement' })}
      ${StatusPanel({ title: 'À vérifier', text: 'Ce paiement nécessite une validation manuelle.', variant: 'warning', icon: '!' })}
      ${Card({
        class: 'payment-detail-card',
        children: `
          ${PaymentAmountBlock({ label: 'Montant attendu', value: '58,41 ₽', icon: 'M' })}
          ${PaymentAmountBlock({ label: 'Montant détecté', value: '58,41 ₽', icon: 'D' })}
          ${PaymentAmountBlock({ label: 'Banque', value: 'Sberbank', icon: 'B' })}
          ${PaymentAmountBlock({ label: 'Moyen de réception', value: 'Carte · •••• 4821', icon: 'C' })}
          ${PaymentAmountBlock({ label: 'Référence', value: 'TANGO ALFA', icon: 'R' })}
          ${PaymentAmountBlock({ label: 'Signal reçu', value: 'Il y a 2 min', icon: 'S' })}
        `
      })}
      <h2 class="section-title">Pourquoi ce paiement est à vérifier ?</h2>
      ${Card({ children: reasons.map((reason) => `<div class="cluster" style="padding:10px 0;">${IconBubble({ icon: '!', tone: 'warning' })}<span class="muted" style="font-size:18px;">${reason}</span></div>`).join('') })}
      <div class="stack" style="margin-top:28px;">
        ${Button({ text: 'Confirmer le paiement', variant: 'primary' })}
        ${Button({ text: 'Rejeter le signal', variant: 'secondary' })}
        ${Button({ text: 'Rejeter la commande', variant: 'ghost', class: 'danger-text' })}
      </div>
    </div></section>`
  });
}

export function renderMerchantOrdersPage(): string {
  return AppShell({
    title: 'Commandes',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Commandes',
        subtitle: 'Suivez les commandes liées aux paiements détectés.'
      })}
      <div class="stack">
        ${renderOrderRow('ord_123', 'Client #12 · Aujourd’hui, 14:20', '58,41 ₽', 'Validé', 'success')}
        ${renderOrderRow('ord_124', 'Client #13 · Aujourd’hui, 14:15', '129,00 ₽', 'En attente', 'warning')}
      </div>
      ${BottomNav({ active: 'orders' })}
    </div></section>`
  });
}

export function renderMerchantOrderDetailPage(): string {
  return AppShell({
    title: 'Détail commande',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Détail commande',
        subtitle: 'Vérifiez l’état de la commande et du paiement associé.'
      })}
      ${StatusPanel({ title: 'Validé', text: 'Le paiement a été confirmé manuellement.', variant: 'success', icon: 'OK' })}
      ${Card({
        children: `
          ${PaymentAmountBlock({ label: 'Commande', value: 'ord_123', icon: 'C' })}
          ${PaymentAmountBlock({ label: 'Montant', value: '58,41 ₽', icon: 'M' })}
          ${PaymentAmountBlock({ label: 'Paiement', value: 'Validé', icon: 'V' })}
          ${PaymentAmountBlock({ label: 'Notification envoyée', value: 'il y a 3 min', icon: 'N' })}
        `
      })}
      ${BottomNav({ active: 'orders' })}
    </div></section>`
  });
}

export function renderConnectedSitePage(): string {
  return AppShell({
    title: 'Site ou application connecté',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Site ou application connecté',
        subtitle: 'Votre site ou application reçoit une notification quand un paiement change de statut.'
      })}
      ${StatusPanel({ title: 'Connexion active', text: 'Dernière notification envoyée il y a 3 min.', variant: 'success', icon: 'OK' })}
      ${Card({
        children: `
          ${PaymentAmountBlock({ label: 'URL de notification', value: 'https://votre-site.com/swimpay', icon: 'U' })}
          ${PaymentAmountBlock({ label: 'Statut', value: 'Actif', icon: 'S' })}
        `
      })}
      ${Card({
        children: `
          <div class="stack">
            ${settingsAction('Tester la connexion', 'Envoyez un événement de test à votre URL.', 'T')}
            ${settingsAction('Copier la clé développeur', 'Utilisez cette clé pour sécuriser vos requêtes.', 'C')}
            ${settingsAction('Voir les derniers envois', 'Consultez l’historique des notifications envoyées.', 'E')}
          </div>
        `
      })}
      <h2 class="section-title">Derniers envois</h2>
      ${Card({
        children: `
          ${PaymentAmountBlock({ label: 'Paiement confirmé · Envoyé', value: 'il y a 3 min', icon: 'OK' })}
          ${PaymentAmountBlock({ label: 'Paiement à vérifier · Envoyé', value: 'il y a 8 min', icon: '!' })}
          ${PaymentAmountBlock({ label: 'Paiement détecté · Échec', value: 'il y a 12 min', icon: 'X' })}
        `
      })}
      <p style="text-align:center;margin-top:22px;"><a href="#" style="color:var(--color-teal);font-weight:800;text-decoration:none;">Afficher les détails développeur</a></p>
      <p style="text-align:center;margin-top:16px;"><a href="/merchant/developer-integration" style="text-decoration:none;">${Button({ text: 'Configurer l’intégration', variant: 'primary', class: 'btn-wide' })}</a></p>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

export function renderDeveloperIntegrationWizardPage(params: {
  integration?: MerchantIntegrationPayload | null;
  deliveries?: MerchantWebhookDeliveryPayload[];
  unavailable?: boolean;
  actionMessage?: string;
} = {}): string {
  const integration = params.integration ?? null;
  const deliveries = params.deliveries ?? [];
  const webhookUrl = integration?.webhook_url ?? '';
  const webhookStatus = toWebhookStatusLabel(integration?.webhook_status);
  const secretKeyMasked = integration?.secret_key_masked ?? 'Non créée';
  const webhookSecretMasked = integration?.webhook_secret_masked ?? 'Non créé';
  const publicEvents = integration?.public_webhook_events ?? ['payment.confirmed', 'payment.rejected', 'payment.expired'];
  const actionButtonAttr = params.unavailable ? 'disabled aria-disabled="true"' : '';
  return AppShell({
    title: 'Intégration développeur',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Site ou application connecté',
        subtitle: 'Connectez SwimPay à votre site ou votre application pour recevoir les mises à jour de paiement.'
      })}
      ${params.unavailable ? StatusPanel({
        title: 'Connexion en attente',
        text: 'Les informations développeur seront synchronisées dès que SwimPay sera connecté.',
        variant: 'warning',
        icon: '!'
      }) : ''}
      ${params.actionMessage ? StatusPanel({ title: 'Mise à jour', text: params.actionMessage, variant: 'info', icon: 'i' }) : ''}
      ${integration?.secret_key_once ? renderOneTimeSecret('Clé secrète à copier maintenant', integration.secret_key_once) : ''}
      ${integration?.webhook_secret_once ? renderOneTimeSecret('Secret webhook à copier maintenant', integration.webhook_secret_once) : ''}
      <div style="margin-bottom:22px;">${Button({ text: 'Configurer l’intégration', variant: 'primary', class: 'btn-wide' })}</div>
      ${Card({
        children: `<h2 class="section-title" style="margin-top:0;">Quel type de projet utilisez-vous ?</h2>
          <div class="two-col">
            ${OptionButton({ title: 'Site web', subtitle: 'Pour une boutique ou un checkout web.', icon: 'W' })}
            ${OptionButton({ title: 'Application Android', subtitle: 'Pour une application mobile ou un APK.', icon: 'A' })}
          </div>
          <p class="muted" style="margin:18px 0 0;">V1 prend en charge les intégrations Web et Android.</p>`
      })}
      ${Card({
        children: `<h2 class="section-title" style="margin-top:0;">Clés SwimPay</h2>
          ${developerField('Merchant ID', integration?.merchant_id ?? 'Connexion en attente')}
          ${developerField('Clé publique', integration?.public_key ?? 'Connexion en attente')}
          ${developerField('Clé secrète', secretKeyMasked)}
          ${developerField('Secret webhook', webhookSecretMasked)}
          <div class="cluster" style="margin:18px 0;">
            <form method="post" action="/merchant/developer-integration/keys">${Button({ text: secretKeyMasked === 'Non créée' ? 'Créer la clé' : 'Voir la clé masquée', variant: 'secondary', class: 'btn-small', type: 'submit', attr: actionButtonAttr })}</form>
            <form method="post" action="/merchant/developer-integration/keys/rotate">${Button({ text: 'Renouveler la clé', variant: 'secondary', class: 'btn-small', type: 'submit', attr: actionButtonAttr })}</form>
            <form method="post" action="/merchant/developer-integration/webhook-secret/rotate">${Button({ text: 'Renouveler le secret webhook', variant: 'secondary', class: 'btn-small', type: 'submit', attr: actionButtonAttr })}</form>
          </div>
          <p class="safe-note" style="margin-top:18px;">${IconBubble({ icon: 'S', tone: 'muted' })}<span>Gardez vos clés secrètes côté serveur.</span></p>
          <p class="safe-note" style="margin-top:10px;">${IconBubble({ icon: 'A', tone: 'warning' })}<span>Ne placez jamais la clé secrète dans une application Android.</span></p>`
      })}
      ${Card({
        children: `<h2 class="section-title" style="margin-top:0;">Webhook</h2>
          <form method="post" action="/merchant/developer-integration/webhook-url" class="route-create-form">
            <label class="muted" for="webhook_url">Webhook URL</label>
            <input id="webhook_url" name="webhook_url" value="${escapeHtml(webhookUrl)}" placeholder="https://merchant.example/webhooks/swimpay" autocomplete="off" ${params.unavailable ? 'disabled aria-disabled="true"' : ''}>
            <div style="margin-top:12px;">${Button({ text: 'Enregistrer', variant: 'secondary', class: 'btn-small', type: 'submit', attr: actionButtonAttr })}</div>
          </form>
          ${developerField('Status', webhookStatus)}
          ${developerField('Événements publics', publicEvents.join(', '))}
          <div class="cluster" style="margin:18px 0;">
            <form method="post" action="/merchant/developer-integration/test-webhook">${Button({ text: 'Tester la connexion', variant: 'primary', class: 'btn-small', type: 'submit', attr: actionButtonAttr })}</form>
          </div>
          <div class="cluster">
            ${StatusChip({ text: 'Connexion réussie', variant: 'success' })}
            ${StatusChip({ text: 'Action nécessaire', variant: 'warning' })}
            ${StatusChip({ text: 'Signature non vérifiée', variant: 'danger' })}
            ${StatusChip({ text: 'Endpoint indisponible', variant: 'muted' })}
          </div>
          <p class="muted" style="margin-top:16px;">Le test est envoyé par SwimPay avec un marqueur de test et ne déclenche aucun traitement de commande.</p>`
      })}
      ${renderWebIntegrationSnippets()}
      ${renderAndroidIntegrationSnippets()}
      ${renderWebhookDeliveryHistory(deliveries, actionButtonAttr)}
      <p class="safe-note" style="margin-top:26px;">${IconBubble({ icon: 'V', tone: 'teal' })}<span>payment.confirmed est envoyé après manual confirmation du marchand. official_bank_confirmation=false.</span></p>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

function renderDeveloperIntegrationWizardPageStatic(params: {
  integration?: MerchantIntegrationPayload | null;
  deliveries?: MerchantWebhookDeliveryPayload[];
  unavailable?: boolean;
  actionMessage?: string;
} = {}): string {
  const integration = params.integration ?? null;
  const deliveries = params.deliveries ?? [];
  const webhookUrl = integration?.webhook_url ?? '';
  const webhookStatus = toWebhookStatusLabel(integration?.webhook_status);
  const secretKeyMasked = integration?.secret_key_masked ?? 'Non créée';
  const webhookSecretMasked = integration?.webhook_secret_masked ?? 'Non créé';
  const publicEvents = integration?.public_webhook_events ?? ['payment.confirmed', 'payment.rejected', 'payment.expired'];
  void deliveries;
  void webhookUrl;
  void webhookStatus;
  void secretKeyMasked;
  void webhookSecretMasked;
  void publicEvents;
  return AppShell({
    title: 'Intégration développeur',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Site ou application connecté',
        subtitle: 'Connectez SwimPay à votre site ou votre application pour recevoir les mises à jour de paiement.'
      })}
      <div style="margin-bottom:22px;">${Button({ text: 'Configurer l’intégration', variant: 'primary', class: 'btn-wide' })}</div>
      ${Card({
        children: `<h2 class="section-title" style="margin-top:0;">Quel type de projet utilisez-vous ?</h2>
          <div class="two-col">
            ${OptionButton({ title: 'Site web', subtitle: 'Pour une boutique ou un checkout web.', icon: 'W' })}
            ${OptionButton({ title: 'Application Android', subtitle: 'Pour une application mobile ou un APK.', icon: 'A' })}
          </div>
          <p class="muted" style="margin:18px 0 0;">V1 prend en charge les intégrations Web et Android.</p>`
      })}
      ${Card({
        children: `<h2 class="section-title" style="margin-top:0;">Clés SwimPay</h2>
          ${developerField('Merchant ID', 'mch_live_••••1234')}
          ${developerField('Clé publique', 'pk_live_••••8X2A')}
          ${developerField('Clé secrète', '•••• •••• ••••')}
          ${developerField('Secret webhook', '•••• •••• ••••')}
          <p class="safe-note" style="margin-top:18px;">${IconBubble({ icon: 'S', tone: 'muted' })}<span>Gardez vos clés secrètes côté serveur.</span></p>
          <p class="safe-note" style="margin-top:10px;">${IconBubble({ icon: 'A', tone: 'warning' })}<span>Ne placez jamais la clé secrète dans une application Android.</span></p>`
      })}
      ${Card({
        children: `<h2 class="section-title" style="margin-top:0;">Webhook</h2>
          ${developerField('Webhook URL', 'https://merchant.example/webhooks/swimpay')}
          ${developerField('Status', 'Connexion active')}
          ${developerField('Last test result', 'Connexion réussie')}
          <div class="cluster" style="margin:18px 0;">
            ${Button({ text: 'Enregistrer', variant: 'secondary', class: 'btn-small' })}
            ${Button({ text: 'Tester la connexion', variant: 'primary', class: 'btn-small' })}
          </div>
          <div class="cluster">
            ${StatusChip({ text: 'Connexion réussie', variant: 'success' })}
            ${StatusChip({ text: 'Action nécessaire', variant: 'warning' })}
            ${StatusChip({ text: 'Signature non vérifiée', variant: 'danger' })}
            ${StatusChip({ text: 'Endpoint indisponible', variant: 'muted' })}
          </div>
          <p class="muted" style="margin-top:16px;">Le test est envoyé par SwimPay avec un marqueur de test et ne déclenche aucun traitement de commande.</p>`
      })}
      ${renderWebIntegrationSnippets()}
      ${renderAndroidIntegrationSnippets()}
      ${renderWebhookDeliveryHistory()}
      <p class="safe-note" style="margin-top:26px;">${IconBubble({ icon: 'V', tone: 'teal' })}<span>payment.confirmed est envoyé après manual confirmation du marchand. official_bank_confirmation=false.</span></p>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

void renderDeveloperIntegrationWizardPageStatic;

export function renderReceiverPhonePage(): string {
  return AppShell({
    title: 'Téléphone Receiver',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Téléphone Receiver',
        subtitle: 'Ce téléphone permet à SwimPay de détecter les paiements reçus.'
      })}
      ${StatusPanel({ title: 'Action nécessaire', text: 'Accès notifications désactivé.', variant: 'warning', icon: '!' })}
      ${Card({
        children: `
          ${PaymentAmountBlock({ label: 'Accès notifications', value: 'Désactivé', icon: 'N' })}
          ${PaymentAmountBlock({ label: 'Banques surveillées', value: '5 banques', icon: 'B' })}
          ${PaymentAmountBlock({ label: 'File d’envoi', value: 'OK', icon: 'F' })}
          ${PaymentAmountBlock({ label: 'Dernière synchronisation', value: 'Il y a 12 s', icon: 'S' })}
        `
      })}
      <div style="margin-top:24px;">${Button({ text: 'Réactiver l’accès', variant: 'primary', class: 'btn-wide' })}</div>
      <p class="safe-note" style="justify-content:center;margin-top:22px;">${IconBubble({ icon: 'S', tone: 'muted' })}<span>SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.</span></p>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

export function renderTestsPage(): string {
  return AppShell({
    title: 'Tests',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Tests',
        subtitle: 'Lancez un test pour vérifier votre configuration avant les vrais paiements.'
      })}
      ${renderConfigurationState('ready')}
      <div class="stack" style="margin-top:22px;">
        ${renderConfigurationState('action')}
        ${renderConfigurationState('error')}
      </div>
      <div style="margin-top:28px;">${Button({ text: 'Lancer un test', variant: 'primary', class: 'btn-wide' })}</div>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

export function renderSettingsPage(): string {
  const sections = ['Business', 'Paiements', 'Développeur', 'Sécurité'];
  return AppShell({
    title: 'Paramètres',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${PageHeader({ title: 'Paramètres' })}
      <div class="stack">
        ${sections.map((section) => Card({ children: `<div class="split"><div class="cluster">${IconBubble({ icon: section.slice(0, 1) })}<strong style="font-size:20px;color:var(--color-navy);">${section}</strong></div><span style="color:var(--color-teal);font-size:30px;">›</span></div>` })).join('')}
        ${Card({ children: `<a href="/merchant/developer-integration" style="text-decoration:none;color:inherit;"><div class="split"><div class="cluster">${IconBubble({ icon: 'I' })}<strong style="font-size:20px;color:var(--color-navy);">Intégration développeur</strong></div><span style="color:var(--color-teal);font-size:30px;">›</span></div></a>` })}
        ${Card({ children: `<h3>Validation manuelle activée</h3><p class="muted">Les paiements doivent être confirmés avant notification finale.</p>` })}
      </div>
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

export function renderMerchantRoutesUnavailablePage(): string {
  return AppShell({
    title: 'Erreur',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${StatusPanel({ title: 'Action requise', text: 'Le service est momentanément indisponible.', variant: 'warning' })}
    </div></section>`
  });
}

function renderOrderRow(id: string, helper: string, amount: string, status: string, variant: 'success' | 'warning'): string {
  return Card({
    children: `<div class="split">
      <div class="cluster">${IconBubble({ icon: 'C' })}<div><strong style="color:var(--color-navy);font-size:20px;">${id}</strong><p class="muted" style="margin:4px 0 0;">${helper}</p></div></div>
      <div style="text-align:right;"><strong style="color:var(--color-navy);font-size:20px;">${amount}</strong><br>${StatusChip({ text: status, variant })}</div>
    </div>`
  });
}

function settingsAction(title: string, subtitle: string, icon: string): string {
  return `<div class="split">
    <span class="cluster">${IconBubble({ icon })}<span><strong>${title}</strong><small class="muted" style="display:block;">${subtitle}</small></span></span>
    <span style="color:var(--color-teal);font-size:30px;">›</span>
  </div>`;
}

function developerField(label: string, value: string): string {
  return `<div class="split" style="padding:12px 0;border-bottom:1px solid rgba(225,232,237,0.75);">
    <span class="muted">${escapeHtml(label)}</span>
    <strong style="color:var(--color-navy);text-align:right;">${escapeHtml(value)}</strong>
  </div>`;
}

function renderOneTimeSecret(title: string, secret: string): string {
  return StatusPanel({
    title,
    text: `Copiez cette valeur maintenant. Elle ne sera plus affichée ensuite. ${secret}`,
    variant: 'warning',
    icon: '!'
  });
}

function toWebhookStatusLabel(status: string | null | undefined): string {
  if (status === 'active') return 'Connexion active';
  if (status === 'problem') return 'Action nécessaire';
  if (status === 'not_configured') return 'À configurer';
  return 'Connexion en attente';
}

function toDeliveryStatusLabel(status: string): string {
  if (status === 'delivered' || status === 'sent') return 'Envoyé';
  if (status === 'pending') return 'En attente';
  if (status === 'failed' || status === 'dead') return 'Action nécessaire';
  return status;
}

function renderSnippet(title: string, code: string): string {
  return `<div style="margin-top:18px;">
    <h3 style="font-size:18px;color:var(--color-navy);margin:0 0 10px;">${escapeHtml(title)}</h3>
    <pre style="white-space:pre-wrap;overflow:auto;border-radius:24px;background:#071B33;color:#F7FBFC;padding:18px;font-size:13px;line-height:1.55;"><code>${escapeHtml(code)}</code></pre>
  </div>`;
}

function renderWebIntegrationSnippets(): string {
  const install = 'npm install @swimpay/node';
  const createOrder = `import { SwimPay } from "@swimpay/node";

const swimpay = new SwimPay({
  secretKey: process.env.SWIMPAY_SECRET_KEY!,
  apiBaseUrl: process.env.SWIMPAY_API_BASE_URL
});

const checkout = await swimpay.orders.create({
  externalOrderId: order.id,
  amountMinor: order.amountMinor,
  currency: "RUB",
  returnUrl: "https://merchant.example/orders/" + order.id
}, {
  idempotencyKey: order.id
});

return checkout.checkoutUrl;`;
  const redirect = `// Browser/frontend: redirect only.
window.location.href = checkout.checkoutUrl;`;
  const verify = `const event = swimpay.webhooks.verify(
  req.body,
  req.headers,
  process.env.SWIMPAY_WEBHOOK_SECRET!
);

switch (event.type) {
  case "payment.confirmed":
    // Fulfill after merchant manual confirmation.
    break;
  case "payment.rejected":
  case "payment.expired":
    break;
}`;

  return Card({
    children: `<section id="web-integration-snippets">
      <h2 class="section-title" style="margin-top:0;">Intégration Web</h2>
      <p class="muted">Utilisez le SDK serveur @swimpay/node pour créer les commandes et vérifier les événements.</p>
      ${renderSnippet('Installation', install)}
      <section data-snippet="web-server">
        ${renderSnippet('Créer une commande côté serveur', createOrder)}
        ${renderSnippet('Vérifier les événements', verify)}
      </section>
      <section data-snippet="web-browser">
        ${renderSnippet('Rediriger vers checkout_url', redirect)}
      </section>
    </section>`
  });
}

function renderAndroidIntegrationSnippets(): string {
  const flow = 'Application Android → votre backend → SwimPay → checkout_url → retour app → votre backend vérifie le statut';
  const kotlin = `val checkoutUrl = merchantBackend.createSwimPayCheckout(orderId)

SwimPayCheckout.open(
  activity = this,
  checkoutUrl = checkoutUrl
)

override fun onNewIntent(intent: Intent) {
  super.onNewIntent(intent)
  val result = SwimPayCheckout.parseReturnIntent(intent)
  if (result != null) {
    // Ne validez pas localement.
    refreshOrderStatusFromBackend()
  }
}`;

  return Card({
    children: `<section id="android-integration-snippets">
      <h2 class="section-title" style="margin-top:0;">Intégration Android</h2>
      <p class="muted">${escapeHtml(flow)}</p>
      <p class="safe-note" style="margin-top:14px;">${IconBubble({ icon: 'A', tone: 'warning' })}<span>Votre application Android ne doit jamais contenir la clé secrète SwimPay.</span></p>
      <p class="muted" style="margin-top:10px;">Après le retour, rafraîchissez le statut depuis votre backend.</p>
      <section data-snippet="android">
        ${renderSnippet('Ouvrir checkout_url et gérer le retour app', kotlin)}
      </section>
    </section>`
  });
}

function renderWebhookDeliveryHistory(deliveries: MerchantWebhookDeliveryPayload[] = [], actionButtonAttr = ''): string {
  if (deliveries.length > 0) {
    return Card({
      children: `<h2 class="section-title" style="margin-top:0;">Derniers événements</h2>
        <div class="stack">
          ${deliveries.map((delivery) => `<div class="split" style="gap:18px;border-bottom:1px solid rgba(225,232,237,0.75);padding:12px 0;">
            <div>
              <strong style="color:var(--color-navy);">${escapeHtml(delivery.event_type)}</strong>
              <p class="muted" style="margin:4px 0 0;">Créé ${escapeHtml(delivery.created_at)} · Livré ${escapeHtml(delivery.delivered_at ?? 'En attente')}</p>
              ${delivery.safe_error_summary ? `<p class="muted" style="margin:4px 0 0;">${escapeHtml(delivery.safe_error_summary)}</p>` : ''}
            </div>
            <div style="text-align:right;">
              ${StatusChip({ text: toDeliveryStatusLabel(delivery.status), variant: delivery.status === 'delivered' || delivery.status === 'sent' ? 'success' : 'warning' })}
              <p class="muted" style="margin:6px 0 0;">${escapeHtml(String(delivery.attempts))} tentative(s) · HTTP ${escapeHtml(String(delivery.last_http_status ?? '—'))}</p>
              <form method="post" action="/merchant/developer-integration/webhook-deliveries/${escapeHtml(delivery.delivery_id)}/retry" style="margin-top:8px;">${Button({ text: 'Réessayer', variant: 'secondary', class: 'btn-small', type: 'submit', attr: actionButtonAttr })}</form>
              <p class="muted" style="margin:6px 0 0;">event id: ${escapeHtml(delivery.event_id)}</p>
            </div>
          </div>`).join('')}
        </div>`
    });
  }

  const rows = [
    ['payment.confirmed', 'Envoyé', 'Aujourd’hui, 14:20', 'Aujourd’hui, 14:20', '1', '200'],
    ['payment.rejected', 'Envoyé', 'Aujourd’hui, 13:10', 'Aujourd’hui, 13:11', '1', '200'],
    ['payment.expired', 'Action nécessaire', 'Hier, 18:05', '—', '3', '503']
  ] as const;

  return Card({
    children: `<h2 class="section-title" style="margin-top:0;">Derniers événements</h2>
      <div class="stack">
        ${rows.map(([type, status, createdAt, deliveredAt, attempts, httpStatus]) => `<div class="split" style="gap:18px;border-bottom:1px solid rgba(225,232,237,0.75);padding:12px 0;">
          <div>
            <strong style="color:var(--color-navy);">${type}</strong>
            <p class="muted" style="margin:4px 0 0;">Créé ${createdAt} · Livré ${deliveredAt}</p>
          </div>
          <div style="text-align:right;">
            ${StatusChip({ text: status, variant: status === 'Envoyé' ? 'success' : 'warning' })}
            <p class="muted" style="margin:6px 0 0;">${attempts} tentative(s) · HTTP ${httpStatus}</p>
          </div>
        </div>`).join('')}
      </div>
      <div class="cluster" style="margin-top:18px;">
        ${Button({ text: 'Voir détail', variant: 'secondary', class: 'btn-small' })}
        ${Button({ text: 'Réessayer', variant: 'secondary', class: 'btn-small' })}
        ${Button({ text: 'Copier event id', variant: 'ghost', class: 'btn-small' })}
      </div>`
  });
}

function renderConfigurationState(state: UiStateVariant): string {
  const states: Record<UiStateVariant, { title: string; text: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    ready: { title: 'SwimPay est prêt', text: 'Votre configuration fonctionne pour la bêta.', variant: 'success' },
    action: { title: 'Action nécessaire', text: 'Le téléphone n’est pas connecté.', variant: 'warning' },
    empty: { title: 'Aucun paiement à vérifier', text: 'Les nouveaux paiements apparaîtront ici.', variant: 'info' },
    error: { title: 'Site non joignable', text: 'Votre site n’a pas répondu au dernier test.', variant: 'danger' },
    offline: { title: 'Téléphone hors ligne', text: 'Les paiements ne peuvent pas être détectés pour le moment.', variant: 'warning' },
    expired: { title: 'Expiré', text: 'Cette session n’est plus active.', variant: 'warning' },
    rejected: { title: 'Rejeté', text: 'Ce paiement a été rejeté.', variant: 'danger' }
  };
  const selected = states[state];
  return StatusPanel({ title: selected.title, text: selected.text, variant: selected.variant, icon: selected.variant === 'success' ? 'OK' : '!' });
}

function toBankDisplayName(bankProfileId: string): string {
  const map: Record<string, string> = {
    sber_ru: 'Sberbank',
    sberbank_ru: 'Sberbank',
    tbank_ru: 'T-Bank',
    vtb_ru: 'VTB',
    alfa_ru: 'Alfa-Bank',
    gazprombank_ru: 'Gazprombank'
  };
  return map[bankProfileId] ?? bankProfileId;
}
