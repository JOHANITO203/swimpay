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
import type { MerchantRouteAdminRoute } from '../index.js';

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
      <div class="two-col" style="margin-bottom:22px;">
        ${Button({ text: 'Ajouter une carte', variant: 'secondary' })}
        ${Button({ text: 'Ajouter un numéro', variant: 'secondary' })}
      </div>
      <form method="post" action="/merchant/receiving-methods" class="route-create-form">
        <input name="receiver_identifier" placeholder="Saisie réservée à la création" autocomplete="off">
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
      ${BottomNav({ active: 'more' })}
    </div></section>`
  });
}

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
