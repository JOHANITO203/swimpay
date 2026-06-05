import { describe, expect, it, vi } from 'vitest';
import {
  PayerBankLauncherRegistry,
  V1ReceiverBankOptions,
  toBuyerSafeReceivingRoute,
  type BuyerSafeCheckoutStatus,
  type CheckoutFallbackAction,
  type CheckoutUnavailableReason,
  type CheckoutSessionState
} from '@swimpay/contracts';
import { ApiCheckoutSessionProvider, buildWebServer, type CheckoutSession, type CheckoutSessionProvider } from './index.js';

describe('hosted checkout web foundation', () => {
  it('renders the initial checkout as an intro-first guided flow', async () => {
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: new FakeCheckoutSessionProvider()
    });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Payer avec SwimPay');
    expect(response.body).toContain('checkout-language-selector');
    expect(response.body).toContain('href="?lang=fr"');
    expect(response.body).toContain('href="?lang=en"');
    expect(response.body).toContain('href="?lang=ru"');
    expect(response.body).toContain('Paiement guidé');
    expect(response.body).toContain('Suivi en temps réel');
    expect(response.body).toContain('Retour au marchand');
    expect(response.body).toContain('data-checkout-panel="buyer-identity" hidden');
    expect(response.body).toContain('Vos informations');
    expect(response.body).toContain('Veuillez remplir le formulaire de données ci-dessous');
    expect(response.body).toContain('SwimPay ne collecte pas vos données sensibles');
    expect(response.body).not.toContain('Ces donnees servent a reconnaitre le signal de paiement.');
    expect(response.body).not.toContain("Pas de CVV, pas de date d'expiration, pas de code SMS.");
    expect(response.body).toContain('sender_card_number');
    expect(response.body).toContain('sender_phone');
    expect(response.body).toContain('data-method-field="sbp" hidden');
    expect(response.body).toContain('Sberbank');
    expect(response.body).toContain('T-Bank');
    expect(response.body).toContain('data-sender-bank-choice="sber_ru"');
    expect(response.body).toContain('data-sender-bank-choice="ozon_bank"');
    expect(response.body).toContain('syncSenderBankChoices');
    for (const logoAssetKey of [
      'ic_bank_sberbank',
      'ic_bank_tbank',
      'ic_bank_vtb',
      'ic_bank_alfa',
      'ic_bank_gazprombank'
    ]) {
      expect(response.body).toContain(`data-logo-asset-key="${logoAssetKey}"`);
      expect(response.body).toContain(`.bank-logo-${logoAssetKey}`);
      expect(response.body).toMatch(new RegExp(`\\.bank-logo-${logoAssetKey}[^{]*\\{[^}]*data:image/`, 'u'));
    }
    expect(response.body).toContain('Ozon Банк');
    expect(response.body).toContain('data-logo-asset-key="ic_bank_ozon"');
    expect(response.body).toContain('Disponible');
    expect(response.body).not.toContain('Runtime verified');
    expect(response.body).not.toContain('137.00 RUB');
    expect(response.body).not.toContain('TANGO ALFA');
    expect(response.body).not.toContain('+7 *** *** **67');
    expect(response.body).not.toContain('2202 **** **** 7890');
    expect(response.body).not.toContain('Montant exact');
    expect(response.body).not.toContain('J&#39;ai paye');
    expect(response.body).not.toMatch(/confirmee? par la banque/i);
    expect(response.body).not.toMatch(/confirmera automatiquement/i);
    expect(response.body).not.toMatch(/paiement garanti/i);
  });

  it('embeds registered checkout bank logos without depending on the server cwd', async () => {
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue('C:\\not-the-swimpay-repo');
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: new FakeCheckoutSessionProvider()
    });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    cwd.mockRestore();
    expect(response.statusCode).toBe(200);
    for (const logoAssetKey of [
      'ic_bank_sberbank',
      'ic_bank_tbank',
      'ic_bank_vtb',
      'ic_bank_alfa',
      'ic_bank_gazprombank'
    ]) {
      expect(response.body).toMatch(new RegExp(`\\.bank-logo-${logoAssetKey}[^{]*\\{[^}]*data:image/`, 'u'));
    }
  });

  it('localizes the checkout entry screen from the lang query without changing checkout contracts', async () => {
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: new FakeCheckoutSessionProvider()
    });

    const english = await server.inject({ method: 'GET', url: '/checkout/ps_01?lang=en' });
    const russian = await server.inject({ method: 'GET', url: '/checkout/ps_01?lang=ru' });
    const french = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(english.statusCode).toBe(200);
    expect(english.body).toContain('Pay with SwimPay');
    expect(english.body).toContain('Guided payment');
    expect(english.body).toContain('Payment method');
    expect(english.body).toContain('Sending bank');
    expect(russian.statusCode).toBe(200);
    expect(russian.body).toContain('Оплатить через SwimPay');
    expect(russian.body).toContain('Понятная оплата');
    expect(russian.body).toContain('Способ оплаты');
    expect(russian.body).toContain('Банк отправителя');
    expect(french.body).toContain('Payer avec SwimPay');
    expect(`${english.body}\n${russian.body}\n${french.body}`).not.toMatch(/[\uFFFD\u00C3\u00C2]|(?:\u00D0|\u00D1)[\u0080-\u00ff]/u);
  });

  it('localizes every hosted checkout step and guards against mojibake or French residue', async () => {
    const stages: CheckoutSession[] = [
      { ...new FakeCheckoutSessionProvider().session, checkout_state: 'buyer_identity', buyer_safe_status: 'not_validated' },
      {
        ...new FakeCheckoutSessionProvider().session,
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        checkout_state: 'receiver_bank_selection',
        buyer_safe_status: 'not_validated'
      },
      {
        ...new FakeCheckoutSessionProvider().session,
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        checkout_state: 'receiving_route_selection',
        buyer_safe_status: 'not_validated'
      },
      {
        ...new FakeCheckoutSessionProvider().session,
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        selected_receiving_route_id: 'route_sber_card',
        checkout_state: 'payer_bank_launcher_selection',
        buyer_safe_status: 'not_validated'
      },
      {
        ...new FakeCheckoutSessionProvider().session,
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        selected_receiving_route_id: 'route_sber_card',
        selected_payer_bank_launcher_id: 'sber_ru',
        checkout_state: 'payment_instructions',
        buyer_safe_status: 'awaiting_payment'
      },
      {
        ...new FakeCheckoutSessionProvider().session,
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        selected_receiving_route_id: 'route_sber_card',
        selected_payer_bank_launcher_id: 'sber_ru',
        status: 'buyer_claimed_paid',
        checkout_state: 'buyer_claimed_paid',
        buyer_safe_status: 'searching_signal'
      }
    ];

    for (const locale of ['en', 'ru'] as const) {
      for (const session of stages) {
        const provider = new FakeCheckoutSessionProvider();
        provider.session = session;
        const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });
        const response = await server.inject({ method: 'GET', url: `/checkout/ps_01?lang=${locale}` });
        const visibleBody = stripScriptsAndStyles(response.body);
        expect(response.statusCode).toBe(200);
        expect(response.body).not.toMatch(/[\uFFFD\u00C3\u00C2]|(?:\u00D0|\u00D1)[\u0080-\u00ff]/u);
        expect(response.body).toContain(locale === 'en' ? 'data-copy-success-label="Copied"' : 'data-copy-success-label="Скопировано"');
        expect(visibleBody).not.toMatch(/Paiement|Banque|Methode|Indisponible|Disponible|Telephone|Carte|Retour|Continuer|Selection|Copier|marchand|J&#39;ai/u);
      }
    }
  });

  it('reveals only the compatible receiving route after buyer method selection', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Instructions de paiement');
    expect(response.body).toContain('Carte du destinataire');
    expect(response.body).toContain('2202 **** **** 7890');
    expect(response.body).not.toContain('Telephone du destinataire');
    expect(response.body).not.toContain('+7 *** *** **67');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('2202201234567890');
  });

  it('shows only card when the merchant has an active card route only', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'card_transfer');
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-payment-method="card"');
    expect(response.body).toContain('name="sender_card_number"');
    expect(response.body).not.toContain('data-payment-method="sbp"');
    expect(response.body).not.toContain('name="sender_phone"');
    expect(response.body).not.toContain('Telephone SBP');
    expect(response.body).not.toContain('indisponible');
    expect(response.body).not.toContain('Methode indisponible');
  });

  it('uses session available payment methods as the primary checkout source of truth', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      available_payment_methods: { card: true, sbp: false },
      available_routes: [
        {
          route_id: 'route_sber_card',
          method_type: 'card',
          bank_id: 'sber_ru',
          masked_value: '2202 **** **** 7890',
          status: 'active'
        }
      ]
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-payment-method="card"');
    expect(response.body).toContain('name="sender_card_number"');
    expect(response.body).not.toContain('data-payment-method="sbp"');
    expect(response.body).not.toContain('name="sender_phone"');
  });

  it('submits the only available buyer method even when mobile WebView leaves the radio unchecked', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      available_payment_methods: { card: true, sbp: false },
      available_routes: [
        {
          route_id: 'route_sber_card',
          method_type: 'card',
          bank_id: 'sber_ru',
          masked_value: '2202 **** **** 7890',
          status: 'active'
        }
      ]
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('type="hidden" name="payment_method" value="card"');
    expect(response.body).not.toContain('type="hidden" name="payment_method" value="sbp"');
    expect(response.body.match(/name="payment_method"/g)).toHaveLength(1);
  });

  it('does not send JSON content-type on bodyless checkout API posts', async () => {
    const originalFetch = globalThis.fetch;
    const calls: RequestInit[] = [];
    const provider = new ApiCheckoutSessionProvider('https://api.example', 'mch_test');
    globalThis.fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response(JSON.stringify(new FakeCheckoutSessionProvider().session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as typeof fetch;

    try {
      await provider.markPaymentInstructionsShown('ps_01');
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers && 'Content-Type' in calls[0].headers).not.toBe(true);
  });

  it('shows only SBP phone when the merchant has an active phone route only', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'phone_transfer');
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-payment-method="sbp"');
    expect(response.body).toContain('name="sender_phone"');
    expect(response.body).toContain('<rect x="7" y="3" width="10" height="18" rx="3"');
    expect(response.body).not.toContain('data-payment-method="card"');
    expect(response.body).not.toContain('name="sender_card_number"');
    expect(response.body).not.toContain('Carte indisponible');
    expect(response.body).not.toContain('Methode indisponible');
  });

  it('shows a merchant configuration fallback before collecting buyer info when no receiving methods exist', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = [];
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Paiement indisponible');
    expect(response.body).toContain('Ce marchand n&#39;a pas encore configure de moyen de reception actif.');
    expect(response.body).toContain('Actualiser');
    expect(response.body).toContain('Retour au marchand');
    expect(response.body).not.toContain('name="payment_method"');
    expect(response.body).not.toContain('Commencer l&rsquo;experience');
  });

  it('offers a recovery action when a selected method has no compatible receiving route later in the flow', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'card_transfer');
    provider.session = {
      ...provider.session,
      payment_method: 'sbp',
      sender_bank_id: 'tbank_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Methode indisponible');
    expect(response.body).toContain('Ce marchand accepte actuellement : Carte.');
    expect(response.body).toContain('Payer par carte');
    expect(response.body).toContain('data-select-method="card"');
    expect(response.body).toContain('Actualiser les methodes');
    expect(response.body).toContain('Changer de methode');
    expect(response.body).toContain('Carte disponible');
    expect(response.body).toContain('Retour au marchand');
    expect(response.body).not.toContain('Ouvrir ma banque');
  });

  it('offers SBP recovery when card becomes unavailable but phone receiving is available', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'phone_transfer');
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'tbank_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Methode indisponible');
    expect(response.body).toContain('Ce marchand accepte actuellement : SBP / telephone.');
    expect(response.body).toContain('Payer par SBP');
    expect(response.body).toContain('data-select-method="sbp"');
    expect(response.body).toContain('Actualiser les methodes');
    expect(response.body).not.toContain('Ouvrir ma banque');
  });

  it('renders phone payment instructions after route and launcher selection', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'sbp',
      sender_bank_id: 'tbank_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_phone',
      selected_payer_bank_launcher_id: 'tbank_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Instructions de paiement');
    expect(response.body).toContain('Telephone du destinataire');
    expect(response.body).toContain('+7 *** *** **67');
    expect(response.body).toContain('Banque de reception');
    expect(response.body).toContain('Banque d&#39;envoi');
    expect(response.body).toContain('data-logo-asset-key="ic_bank_sberbank"');
    expect(response.body).toContain('data-logo-asset-key="ic_bank_tbank"');
    expect(response.body).toContain('Ouvrir ma banque');
    expect(response.body).toContain('data-bank-launch-form');
    expect(response.body).toContain('data-selected-sender-bank-id="tbank_ru"');
    expect(response.body).toContain('data-payer-bank-launcher-id="tbank_ru"');
    expect(response.body).toContain(
      'data-launch-url="intent://tbank.ru/transfer#Intent;scheme=bank100000000004;package=com.idamob.tinkoff.android;category=android.intent.category.BROWSABLE;end"'
    );
    expect(response.body).toContain('J&#39;ai paye');
    expect(response.body).toContain('Copier les details');
    expect(response.body).toContain('Session active');
    expect(response.body).toContain('copy-icon-btn');
    expect(response.body).not.toContain('Continuer sur mobile');
    expect(response.body).not.toContain('QR');
    expect(response.body).not.toContain('Compte marchand');
    expect(response.body).not.toContain('+7 (999) 123-45-67');
    expect(response.body).not.toContain('2202201234567890');
  });

  it('renders card payment instructions with masked route details only', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Carte du destinataire');
    expect(response.body).toContain('2202 **** **** 7890');
    expect(response.body).toContain('copy-icon-btn');
    expect(response.body).toContain('137.00 RUB');
    expect(response.body).toContain('TANGO ALFA');
    expect(response.body).toContain('Ouvrir ma banque');
    expect(response.body).toContain('J&#39;ai paye');
    expect(response.body).toContain('Montant exact');
    expect(response.body).toContain('Banque de reception');
    expect(response.body).toContain('data-logo-asset-key="ic_bank_sberbank"');
    const launchUrl = response.body.match(/data-launch-url="([^"]*)"/u)?.[1] ?? '';
    expect(launchUrl).toBe(
      'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=ru.sberbankmobile;component=ru.sberbankmobile/ru.sberbank.mobile.feature.externalstarttransfer.impl.presentation.NativeContactShortcutActivity;end'
    );
    expect(launchUrl).not.toMatch(/amount|phone|card|reference|pan|cvv|137|TANGO|2202/iu);
    expect(response.body).not.toContain('2202201234567890');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('CVV');
    expect(response.body).not.toContain('SMS code');
    expect(response.body).not.toContain('bank password');
  });

  it('does not render any buyer edit button in runtime checkout', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('Annuler et modifier les infos');
    expect(response.body).not.toContain('Modifier les informations');
    expect(response.body).toContain('Details du virement');
  });

  it.each([
    ['manual_confirmed', 'confirmed', 'Paiement confirme', 'confirmed'],
    ['rejected', 'rejected', 'Paiement rejete', 'rejected'],
    ['expired', 'expired', 'Paiement expire', 'expired']
  ])('ignores checkout_edit=1 for final state %s', async (status, buyerSafeStatus, title, expectedSafeStatus) => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: status as CheckoutSession['status'],
      checkout_state: status as CheckoutSessionState,
      buyer_safe_status: buyerSafeStatus as BuyerSafeCheckoutStatus,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01?checkout_edit=1' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(title);
    expect(response.body).toContain(`data-checkout-current-safe-status="${expectedSafeStatus}"`);
    expect(response.body).not.toContain('Vos informations');
  });

  it('ignores checkout_edit=1 while waiting for merchant validation', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'needs_review',
      checkout_state: 'needs_review',
      buyer_safe_status: 'needs_review',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01?checkout_edit=1' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Validation marchand');
    expect(response.body).toContain('data-checkout-current-safe-status="needs_review"');
    expect(response.body).not.toContain('Vos informations');
  });

  it('ignores checkout_edit=1 during instructions step', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01?checkout_edit=1' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Details du virement');
    expect(response.body).not.toContain('Vos informations');
  });

  it('renders native Android bank launcher handoff when checkout was opened with SDK launcher scheme', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?swimpay_bank_launcher_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(200);
    const launchUrl = response.body.match(/data-launch-url="([^"]*)"/u)?.[1] ?? '';
    expect(launchUrl).toContain('merchantapp://swimpay-bank-launch?');
    expect(launchUrl).toContain('payer_bank_launcher_id=sber_ru');
    expect(launchUrl).toContain('package_name=ru.sberbankmobile');
    expect(launchUrl).toContain('explicit_activity_class_name=ru.sberbank.mobile.feature.externalstarttransfer.impl.presentation.NativeContactShortcutActivity');
    expect(launchUrl).not.toMatch(/amount|phone|card|reference|pan|cvv|137|TANGO|2202/iu);
  });

  it('renders Alfa native bank launcher as package-only without ESIA payload', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'alfa_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'alfa_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?swimpay_bank_launcher_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(200);
    const launchUrl = response.body.match(/data-launch-url="([^"]*)"/u)?.[1] ?? '';
    expect(launchUrl).toContain('merchantapp://swimpay-bank-launch?');
    expect(launchUrl).toContain('payer_bank_launcher_id=alfa_ru');
    expect(launchUrl).toContain('package_name=ru.alfabank.mobile.android');
    expect(launchUrl).not.toContain('explicit_activity_class_name');
    expect(launchUrl).not.toContain('EsiaAuthActivity');
    expect(launchUrl).not.toMatch(/auth_url|amount|phone|card|reference|pan|cvv|137|TANGO|2202/iu);
  });

  it('renders T-Bank native bank launcher as open-only deeplink without payment payload', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'tbank_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'tbank_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?swimpay_bank_launcher_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(200);
    const launchUrl = response.body.match(/data-launch-url="([^"]*)"/u)?.[1] ?? '';
    expect(launchUrl).toContain('merchantapp://swimpay-bank-launch?');
    expect(launchUrl).toContain('payer_bank_launcher_id=tbank_ru');
    expect(launchUrl).toContain('package_name=com.idamob.tinkoff.android');
    expect(launchUrl).toContain('launch_uri=bank100000000004%3A%2F%2Ftbank.ru%2Ftransfer');
    expect(launchUrl).not.toMatch(/card=|cardNumber|externalCardNumber|amount|phone|reference|pan|cvv|137|TANGO|2202/iu);
  });

  it('renders Ozon native bank launcher as open-only deeplink without payment payload', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'ozon_bank',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'ozon_bank',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?swimpay_bank_launcher_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(200);
    const launchUrl = response.body.match(/data-launch-url="([^"]*)"/u)?.[1] ?? '';
    expect(launchUrl).toContain('merchantapp://swimpay-bank-launch?');
    expect(launchUrl).toContain('payer_bank_launcher_id=ozon_bank');
    expect(launchUrl).toContain('package_name=ru.ozon.fintech.finance');
    expect(launchUrl).toContain('launch_uri=bank100000000273%3A%2F%2Ffinance.ozon.ru%2Ftransfer');
    expect(launchUrl).not.toMatch(/card=|cardNumber|externalCardNumber|amount|phone|reference|pan|cvv|137|TANGO|2202/iu);
  });

  it.each([
    ['buyer_claimed_paid', 'searching_signal', 'Paiement en cours', 'SwimPay suit le signal de paiement cote marchand.'],
    ['signal_detected', 'signal_detected', 'Signal detecte', 'Signal detecte, en attente de validation marchand.'],
    ['needs_review', 'needs_review', 'Validation marchand', 'Le marchand verifie ce paiement.'],
    ['manual_confirmed', 'confirmed', 'Paiement confirme', 'Votre commande peut maintenant etre traitee.'],
    ['expired', 'expired', 'Paiement expire', 'Le paiement n&#39;a pas ete valide a temps.'],
    ['rejected', 'rejected', 'Paiement rejete', 'Veuillez reessayer ou contacter le marchand.']
  ])('renders buyer checkout waiting panel for %s', async (status, buyerSafeStatus, title, text) => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: status as CheckoutSession['status'],
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      checkout_state: status as CheckoutSessionState,
      buyer_safe_status: buyerSafeStatus as BuyerSafeCheckoutStatus
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(title);
    expect(response.body).toContain(text);
    expect(response.body).toContain('payment-timeline');
    expect(response.body).not.toContain('confirmation bancaire officielle');
    expect(response.body).not.toContain('paiement garanti');
  });

  it('exposes a status polling endpoint mapped from backend session state', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = { ...provider.session, status: 'needs_review' };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01/status' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_01',
      order_id: 'ord_01',
      status: 'needs_review',
      display_status: 'Vérification manuelle nécessaire',
      result_state: 'review',
      amount: { value: '137.00', currency: 'RUB' },
      reference: 'TANGO ALFA',
      expires_at: '2026-05-02T10:15:00.000Z',
      official_bank_confirmation: false
    });
  });

  it('wires the buyer waiting screen to poll status and stop after a final state', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'buyer_claimed_paid',
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-checkout-status-poll-url="/checkout/ps_01/status"');
    expect(response.body).toContain('data-checkout-current-safe-status="searching_signal"');
    expect(response.body).toContain('fetch(pollUrl');
    expect(response.body).toContain("['confirmed', 'rejected', 'expired', 'cancelled']");
    expect(response.body).not.toContain('payment.confirmed');
    expect(response.body).not.toContain('official bank confirmation');
  });

  it('uses the Android SDK return scheme for the confirmed return-to-merchant button', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?swimpay_return_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Retourner au marchand');
    expect(response.body).toContain('href="merchantapp://swimpay-return?status=completed');
    expect(response.body).toContain('payment_session_id=ps_01');
    expect(response.body).toContain('order_id=ord_01');
    expect(response.body).toContain('external_id=ext_01');
    expect(response.body).not.toContain('onclick="history.back()"');
    expect(response.body).not.toContain('payment.confirmed');
  });

  it('prioritizes Android SDK return scheme over stored web return_url', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed',
      return_url: 'https://merchant.example/orders/ORDER_01'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?swimpay_return_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('href="merchantapp://swimpay-return?status=completed');
    expect(response.body).toContain('external_id=ext_01');
    expect(response.body).not.toContain('href="https://merchant.example/orders/ORDER_01"');
    expect(response.body).not.toContain('onclick="history.back()"');
  });

  it('accepts android_return_scheme as the native return scheme alias', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed',
      return_url: 'https://merchant.example/orders/ORDER_01'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?android_return_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('href="merchantapp://swimpay-return?status=completed');
    expect(response.body).toContain('external_id=ext_01');
    expect(response.body).not.toContain('href="https://merchant.example/orders/ORDER_01"');
  });

  it('falls back to stored web return_url when no Android return scheme is present', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed',
      return_url: 'https://merchant.example/orders/ORDER_01'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('href="https://merchant.example/orders/ORDER_01"');
    expect(response.body).not.toContain('merchantapp://swimpay-return');
    expect(response.body).not.toContain('onclick="history.back()"');
  });

  it('keeps a safe fallback when confirmed checkout has no configured return_url', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Retourner au marchand');
    expect(response.body).toContain('href="/merchant/return-unavailable?payment_session_id=ps_01&amp;order_id=ord_01&amp;external_id=ext_01"');
    expect(response.body).not.toContain('merchantapp://swimpay-return');
  });

  it('does not render a raw API return endpoint as the final buyer destination', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed',
      return_url: 'https://api.swimvpn.pro/swimpay-return?orderRef=ORDER_01'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Retourner au marchand');
    expect(response.body).not.toContain('href="https://api.swimvpn.pro/swimpay-return');
    expect(response.body).toContain('href="/merchant/return-unavailable?payment_session_id=ps_01&amp;order_id=ord_01&amp;external_id=ext_01"');
  });

  it('rejects unsafe return schemes and keeps the browser-history fallback', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01?swimpay_return_scheme=javascript'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Retourner au marchand');
    expect(response.body).toContain('href="/merchant/return-unavailable?payment_session_id=ps_01&amp;order_id=ord_01&amp;external_id=ext_01"');
    expect(response.body).not.toContain('javascript://swimpay-return');
  });

  it('renders sender banks from available_sender_banks as primary source', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      available_sender_banks: [
        {
          bank_id: 'sber_ru',
          payer_bank_launcher_id: 'sber_ru',
          display_name: 'Sberbank',
          logo_asset_key: 'ic_bank_sberbank',
          selectable: true,
          runtime_capture_status: 'runtime_verified',
          runtime_verified: true,
          auto_confirm_enabled: false,
          official_bank_confirmation: false
        },
        {
          bank_id: 'ozon_bank',
          payer_bank_launcher_id: 'ozon_bank',
          display_name: 'Ozon Банк',
          logo_asset_key: 'ic_bank_ozon',
          selectable: true,
          runtime_capture_status: 'runtime_verified',
          runtime_verified: true,
          auto_confirm_enabled: false,
          official_bank_confirmation: false
        }
      ]
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-sender-bank-choice="sber_ru"');
    expect(response.body).toContain('data-sender-bank-choice="ozon_bank"');
    expect(response.body).not.toContain('data-sender-bank-choice="tbank_ru"');
    expect(response.body).toContain('data-logo-asset-key="ic_bank_sberbank"');
    expect(response.body).toContain('data-logo-asset-key="ic_bank_ozon"');
    expect(response.body).not.toContain('Runtime verified');
  });

  it('prioritizes backend logo_asset_key for sender bank rendering', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      available_sender_banks: [
        {
          bank_id: 'sber_ru',
          payer_bank_launcher_id: 'sber_ru',
          display_name: 'Sberbank',
          logo_asset_key: 'ic_bank_unknown',
          selectable: true,
          runtime_capture_status: 'observed',
          runtime_verified: false,
          auto_confirm_enabled: false,
          official_bank_confirmation: false
        }
      ]
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });
    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-logo-asset-key="ic_bank_unknown"');
  });

  it('uses canonical checkout_state as primary renderer signal', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'receiver_arming',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });
    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Paiement confirme');
    expect(response.body).not.toContain('Vos informations');
  });

  it('serves deterministic return-unavailable page for missing return target', async () => {
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: new FakeCheckoutSessionProvider() });
    const response = await server.inject({
      method: 'GET',
      url: '/merchant/return-unavailable?payment_session_id=ps_01&order_id=ord_01&external_id=ext_01'
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Retour indisponible');
    expect(response.body).toContain('ps_01');
    expect(response.body).toContain('ord_01');
    expect(response.body.trimStart().startsWith('{')).toBe(false);
    expect(response.body).not.toContain('"error"');
  });

  it('proxies receiver, route and payer launcher selection without confirming payment', async () => {
    const provider = new FakeCheckoutSessionProvider();
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const receiverResponse = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/receiver-bank',
      payload: { receiver_bank_id: 'sber_ru' }
    });
    const routeResponse = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/receiving-route',
      payload: { receiving_route_id: 'route_sber_phone' }
    });
    const launcherResponse = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/payer-bank-launcher',
      payload: { payer_bank_launcher_id: 'tbank_ru' }
    });

    expect(receiverResponse.statusCode).toBe(200);
    expect(routeResponse.statusCode).toBe(200);
    expect(launcherResponse.statusCode).toBe(200);
    expect(provider.session.selected_receiver_bank_id).toBe('sber_ru');
    expect(provider.session.selected_receiving_route_id).toBe('route_sber_phone');
    expect(provider.session.selected_payer_bank_launcher_id).toBe('tbank_ru');
    expect(provider.session.status).not.toBe('manual_confirmed');
    expect(receiverResponse.json().official_bank_confirmation).toBe(false);
    expect(routeResponse.json().official_bank_confirmation).toBe(false);
    expect(launcherResponse.json().official_bank_confirmation).toBe(false);
  });

  it('redirects browser form posts back into the hosted checkout flow', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/receiving-route',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'receiving_route_id=route_sber_card&lang=ru'
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe('/checkout/ps_01?lang=ru');
  });

  it('renders structured fallback instead of crashing on stale forced payment method POST', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'card_transfer');
    provider.submitExpectedPaymentProfile = async () => {
      throw structuredCheckoutConflict('no_receiving_route_for_method', {
        available_payment_methods: { card: true, sbp: false },
        unavailable_reason: 'method_not_supported_by_merchant',
        fallback_actions: ['switch_to_card', 'refresh_methods', 'return_to_merchant']
      });
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/expected-payment-profile',
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'sbp',
        sender_bank_id: 'sber_ru',
        sender_phone: '+7 999 123-45-67'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Methode indisponible');
    expect(response.body).toContain('Ce marchand accepte actuellement : Carte.');
    expect(response.body).toContain('Payer par carte');
    expect(response.body).not.toContain('+7 999 123-45-67');
  });

  it('localizes structured checkout fallback after an English or Russian form post', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'card_transfer');
    provider.submitExpectedPaymentProfile = async () => {
      throw structuredCheckoutConflict('no_receiving_route_for_method', {
        available_payment_methods: { card: true, sbp: false },
        unavailable_reason: 'method_not_supported_by_merchant',
        fallback_actions: ['switch_to_card', 'refresh_methods', 'return_to_merchant']
      });
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/expected-payment-profile',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'buyer_first_name=Ivan&buyer_last_name=Petrov&payment_method=sbp&sender_bank_id=sber_ru&sender_phone=%2B7%20999%20123-45-67&lang=ru'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Способ недоступен');
    expect(response.body).toContain('Продавец сейчас принимает: карта.');
    expect(response.body).toContain('Оплатить картой');
    expect(response.body).toContain('Обновить способы');
    expect(response.body).not.toMatch(/Methode|Ce marchand|Payer par carte|Actualiser les methodes|Retour au marchand/u);
    expect(response.body).not.toContain('+7 999 123-45-67');
  });

  it('does not echo a submitted card PAN when card profile submission falls back', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = [];
    provider.submitExpectedPaymentProfile = async () => {
      throw structuredCheckoutConflict('no_receiving_route_for_method', {
        available_payment_methods: { card: false, sbp: false },
        unavailable_reason: 'merchant_no_active_receiving_method',
        fallback_actions: ['refresh_methods', 'return_to_merchant']
      });
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/expected-payment-profile',
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4242'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Paiement indisponible');
    expect(response.body).toContain('Actualiser les methodes');
    expect(response.body).toContain('Retour au marchand');
    expect(response.body).not.toContain('4242 4242 4242 4242');
    expect(response.body).not.toContain('4242424242424242');
  });

  it('renders structured fallback from intermediate receiving-route POST errors', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'card_transfer');
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated'
    };
    provider.selectReceivingRoute = async () => {
      throw structuredCheckoutConflict('receiving_route_unavailable', {
        available_payment_methods: { card: true, sbp: false },
        unavailable_reason: 'route_disabled',
        fallback_actions: ['switch_to_sbp']
      });
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/receiving-route',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'receiving_route_id=route_sber_card'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Destination indisponible');
    expect(response.body).toContain('Ce marchand accepte actuellement : Carte.');
    expect(response.body).toContain('Payer par carte');
    expect(response.body).toContain('Actualiser les methodes');
    expect(response.body).toContain('Retour au marchand');
    expect(response.body).not.toContain('Payer par SBP');
    expect(response.body).not.toContain('Internal Server Error');
  });

  it('renders route fallback when marking payment instructions returns a structured 409', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'phone_transfer');
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    provider.markPaymentInstructionsShown = async () => {
      throw structuredCheckoutConflict('receiving_route_unavailable', {
        available_payment_methods: { card: false, sbp: true },
        unavailable_reason: 'route_disabled',
        fallback_actions: ['switch_to_sbp', 'refresh_methods', 'return_to_merchant']
      });
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Destination indisponible');
    expect(response.body).toContain('Ce marchand accepte actuellement : SBP / telephone.');
    expect(response.body).toContain('Payer par SBP');
    expect(response.body).toContain('data-select-method="sbp"');
    expect(response.body).toContain('Actualiser les methodes');
    expect(response.body).toContain('Retour au marchand');
    expect(response.body).not.toContain('API Error');
    expect(response.body).not.toContain('Internal Server Error');
    expect(response.body).not.toMatch(/\b\d{16}\b/u);
    expect(response.body).not.toMatch(/\+7\d{10}/u);
  });

  it.each([
    ['amount_lease_unavailable', 'Montant indisponible'],
    ['checkout_selection_incomplete', 'Selection incomplete'],
    ['checkout_session_expired', 'Session expiree']
  ] as const)('renders actionable checkout fallback when continue-to-bank returns %s', async (code, title) => {
    const provider = new FakeCheckoutSessionProvider();
    provider.routes = provider.routes.filter((route) => route.rail_type === 'card_transfer');
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      payment_instructions_shown_at: '2026-05-02T10:01:00.000Z',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    provider.markReceiverArmed = async () => {
      throw structuredCheckoutConflict(code, {
        available_payment_methods: { card: true, sbp: false },
        unavailable_reason: code === 'amount_lease_unavailable' ? 'amount_lease_unavailable' : undefined,
        fallback_actions: ['switch_to_card', 'refresh_methods', 'return_to_merchant']
      });
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/continue-to-bank',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: ''
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(title);
    expect(response.body).toContain('Ce marchand accepte actuellement : Carte.');
    expect(response.body).toContain('Payer par carte');
    expect(response.body).toContain('Actualiser les methodes');
    expect(response.body).toContain('Retour au marchand');
    expect(response.body).not.toContain('API Error');
    expect(response.body).not.toContain('Internal Server Error');
    expect(response.body).not.toMatch(/\b\d{16}\b/u);
    expect(response.body).not.toMatch(/\+7\d{10}/u);
  });

  it('redirects duplicate continue-to-bank posts when the receiver is already armed', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'receiver_armed',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      payment_instructions_shown_at: '2026-05-02T10:01:00.000Z',
      checkout_state: 'awaiting_payment',
      buyer_safe_status: 'awaiting_payment'
    };
    provider.markReceiverArmed = async () => {
      const error = new Error('Checkout step cannot be applied from the current payment session status.') as Error & {
        status: number;
        body: {
          error: {
            code: 'checkout_step_out_of_order';
            details: { current_status: 'receiver_armed' };
          };
        };
      };
      error.status = 409;
      error.body = {
        error: {
          code: 'checkout_step_out_of_order',
          details: { current_status: 'receiver_armed' }
        }
      };
      throw error;
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/continue-to-bank',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: ''
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe('/checkout/ps_01');
    expect(response.body).not.toContain('Checkout step cannot be applied');
    expect(response.body).not.toContain('API Error');
  });

  it('proxies explicit receiving route copy details without rendering raw destination in html', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'sbp',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_phone',
      selected_payer_bank_launcher_id: 'sber_ru'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const page = await server.inject({ method: 'GET', url: '/checkout/ps_01' });
    const copy = await server.inject({ method: 'GET', url: '/checkout/ps_01/receiving-route/copy-details' });

    expect(page.body).not.toContain('+79991234567');
    expect(copy.statusCode).toBe(200);
    expect(copy.headers['cache-control']).toBe('no-store');
    expect(copy.headers.pragma).toBe('no-cache');
    expect(copy.json()).toMatchObject({
      receiver_identifier_masked: '+7 *** *** **67',
      masked_identifier: '+7 *** *** **67',
      receiver_identifier_copy_value: '+79991234567',
      destination_value: '+79991234567',
      reveal_expires_at: '2026-05-02T10:03:00.000Z',
      copy_action: 'explicit_buyer_copy',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
  });

  it('renders compact browser-QA states without unsafe wording or raw destination leakage', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'expired',
      checkout_state: 'expired',
      buyer_safe_status: 'expired'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Paiement expire');
    expect(response.body).toContain('checkout-flow');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('2202201234567890');
    expect(response.body).not.toContain('Compte marchand');
    expect(response.body).not.toMatch(/confirmee? par la banque/i);
    expect(response.body).not.toMatch(/confirmation officielle de banque fournie/i);
    expect(response.body).not.toMatch(/paiement garanti/i);
  });

  it('accepts the buyer paid claim without marking a payment as confirmed', async () => {
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: new FakeCheckoutSessionProvider()
    });

    const response = await server.inject({ method: 'POST', url: '/checkout/ps_01/claimed-paid' });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      payment_session_id: 'ps_01',
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      next_status: 'Recherche du signal bancaire',
      claim_result: 'claim_recorded',
      status: 'buyer_claimed_paid',
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      official_bank_confirmation: false
    });
  });

  it('reconciles a late buyer paid claim to the already confirmed checkout state', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'POST', url: '/checkout/ps_01/claimed-paid' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_01',
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed',
      claim_result: 'already_confirmed',
      buyer_claimed_paid: false,
      official_bank_confirmation: false
    });
    expect(provider.session.status).toBe('manual_confirmed');
  });

  it('preserves Android return scheme across buyer paid form redirects', async () => {
    const provider = new FakeCheckoutSessionProvider();
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/claimed-paid',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'swimpay_return_scheme=merchantapp'
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe('/checkout/ps_01?swimpay_return_scheme=merchantapp');
  });

  it('arms the receiver when buyer continues to bank without confirming payment', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

    const response = await server.inject({ method: 'POST', url: '/checkout/ps_01/continue-to-bank' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_01',
      status: 'receiver_armed',
      checkout_state: 'awaiting_payment',
      buyer_safe_status: 'awaiting_payment',
      official_bank_confirmation: false
    });
    expect(provider.session.status).toBe('receiver_armed');
    expect(provider.session.status).not.toBe('manual_confirmed');
  });

  describe('rail-aware rendering', () => {
    it('renders mobile_money route card with FR mobile-money labels and masked identifier', async () => {
      const provider = new FakeCheckoutSessionProvider();
      provider.session = {
        ...provider.session,
        payment_method: 'mobile_money',
        sender_bank_id: 'orange_money_ci',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        checkout_state: 'receiving_route_selection',
        buyer_safe_status: 'not_validated'
      };
      const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

      const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Compte mobile money');
      expect(response.body).toContain('+••• ••• ••67');
      expect(response.body).not.toContain('Carte du destinataire');
      expect(response.body).not.toContain('Telephone du destinataire');
    });

    it('renders wallet route card with FR wallet labels and masked identifier', async () => {
      const provider = new FakeCheckoutSessionProvider();
      provider.session = {
        ...provider.session,
        payment_method: 'wallet',
        sender_bank_id: 'wise_int',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        checkout_state: 'receiving_route_selection',
        buyer_safe_status: 'not_validated'
      };
      const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

      const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Wallet du marchand');
      expect(response.body).toContain('j•••@•••.com');
      expect(response.body).not.toContain('Carte du destinataire');
      expect(response.body).not.toContain('Telephone du destinataire');
    });

    it('renders wallet instructions with correct FR email destination label and method label', async () => {
      const provider = new FakeCheckoutSessionProvider();
      provider.session = {
        ...provider.session,
        payment_method: 'wallet',
        sender_bank_id: 'wise_int',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        selected_receiving_route_id: 'route_wallet',
        selected_payer_bank_launcher_id: 'wise_int',
        checkout_state: 'payment_instructions',
        buyer_safe_status: 'awaiting_payment'
      };
      const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

      const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('E-mail du wallet');
      expect(response.body).toContain('Wallet international');
    });

    it('renders mobile_money instructions with correct FR destination label and method label', async () => {
      const provider = new FakeCheckoutSessionProvider();
      provider.session = {
        ...provider.session,
        payment_method: 'mobile_money',
        sender_bank_id: 'orange_money_ci',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        selected_receiving_route_id: 'route_momo',
        selected_payer_bank_launcher_id: 'orange_money_ci',
        checkout_state: 'payment_instructions',
        buyer_safe_status: 'awaiting_payment'
      };
      const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

      const response = await server.inject({ method: 'GET', url: '/checkout/ps_01' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Numéro mobile money');
      expect(response.body).toContain('Mobile money');
    });

    it('renders wallet route card in EN with correct recipient label', async () => {
      const provider = new FakeCheckoutSessionProvider();
      provider.session = {
        ...provider.session,
        payment_method: 'wallet',
        sender_bank_id: 'wise_int',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        checkout_state: 'receiving_route_selection',
        buyer_safe_status: 'not_validated'
      };
      const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

      const response = await server.inject({ method: 'GET', url: '/checkout/ps_01?lang=en' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Merchant wallet');
      expect(response.body).not.toContain('Recipient card');
      expect(response.body).not.toContain('Recipient phone');
    });

    it('renders wallet route card in RU with correct recipient label', async () => {
      const provider = new FakeCheckoutSessionProvider();
      provider.session = {
        ...provider.session,
        payment_method: 'wallet',
        sender_bank_id: 'wise_int',
        selected_receiver_bank_id: 'sber_ru',
        selected_receiver_bank_profile_id: 'sber_ru',
        checkout_state: 'receiving_route_selection',
        buyer_safe_status: 'not_validated'
      };
      const server = buildWebServer({ environment: 'test', checkoutSessionProvider: provider });

      const response = await server.inject({ method: 'GET', url: '/checkout/ps_01?lang=ru' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Кошелёк продавца');
      expect(response.body).not.toContain('Карта получателя');
      expect(response.body).not.toContain('Телефон получателя');
    });
  });
});

type StructuredCheckoutErrorCode =
  | 'receiving_route_unavailable'
  | 'amount_lease_unavailable'
  | 'checkout_selection_incomplete'
  | 'checkout_session_expired'
  | 'no_receiving_route_for_method';

function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/giu, '')
    .replace(/<script[\s\S]*?<\/script>/giu, '');
}

function structuredCheckoutConflict(
  code: StructuredCheckoutErrorCode,
  details: {
    available_payment_methods?: { card: boolean; sbp: boolean } | undefined;
    unavailable_reason?: CheckoutUnavailableReason | undefined;
    fallback_actions?: CheckoutFallbackAction[] | undefined;
  }
): Error & {
  status: number;
  body: {
    error: {
      code: StructuredCheckoutErrorCode;
      details: typeof details;
    };
    official_bank_confirmation: false;
  };
} {
  const error = new Error('API Error') as Error & {
    status: number;
    body: {
      error: {
        code: StructuredCheckoutErrorCode;
        details: typeof details;
      };
      official_bank_confirmation: false;
    };
  };
  error.status = 409;
  error.body = {
    error: { code, details },
    official_bank_confirmation: false
  };
  return error;
}

class FakeCheckoutSessionProvider implements CheckoutSessionProvider {
  public session: CheckoutSession = {
    payment_session_id: 'ps_01',
    order_id: 'ord_01',
    external_id: 'ext_01',
    status: 'receiver_arming',
    amount: { value: '137.00', currency: 'RUB' },
    reference: 'TANGO ALFA',
    receiver_status: 'armed',
    expires_at: '2026-05-02T10:15:00.000Z',
    product_name: 'Premium Pack'
  };

  public routes = [
    toBuyerSafeReceivingRoute({
      route_id: 'route_sber_phone',
      merchant_id: 'mch_01',
      bank_profile_id: 'sber_ru',
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_encrypted: 'encrypted',
      receiver_identifier_hmac: 'hmac_sha256:phone',
      receiver_identifier_masked: '+7 *** *** **67',
      receiver_identifier_last4: '4567',
      route_code: 'SBER-PHONE',
      display_label: 'Sberbank telephone',
      enabled: true,
      recommended: true,
      review_policy: 'eligible_low_risk_later',
      fees_hint: 'Usually instant',
      lifecycle_status: 'active',
      created_at: '2026-05-02T10:00:00.000Z',
      updated_at: '2026-05-02T10:00:00.000Z'
    }),
    toBuyerSafeReceivingRoute({
      route_id: 'route_sber_card',
      merchant_id: 'mch_01',
      bank_profile_id: 'sber_ru',
      rail_type: 'card_transfer',
      receiver_identifier_type: 'card',
      receiver_identifier_encrypted: 'encrypted',
      receiver_identifier_hmac: 'hmac_sha256:card',
      receiver_identifier_masked: '2202 **** **** 7890',
      receiver_identifier_last4: '7890',
      route_code: 'SBER-CARD',
      display_label: 'Sberbank card',
      enabled: true,
      recommended: false,
      review_policy: 'review_first',
      lifecycle_status: 'active',
      created_at: '2026-05-02T10:00:00.000Z',
      updated_at: '2026-05-02T10:00:00.000Z'
    }),
    toBuyerSafeReceivingRoute({
      route_id: 'route_momo',
      merchant_id: 'mch_01',
      bank_profile_id: 'orange_money_ci',
      rail_type: 'mobile_money',
      receiver_identifier_type: 'phone',
      receiver_identifier_encrypted: 'encrypted',
      receiver_identifier_hmac: 'hmac_sha256:momo',
      receiver_identifier_masked: '+••• ••• ••67',
      receiver_identifier_last4: '0067',
      route_code: 'OM-CI',
      display_label: 'Orange Money CI',
      enabled: true,
      recommended: false,
      review_policy: 'review_first',
      lifecycle_status: 'active',
      created_at: '2026-05-02T10:00:00.000Z',
      updated_at: '2026-05-02T10:00:00.000Z'
    }),
    toBuyerSafeReceivingRoute({
      route_id: 'route_wallet',
      merchant_id: 'mch_01',
      bank_profile_id: 'wise_int',
      rail_type: 'wallet_transfer',
      receiver_identifier_type: 'email',
      receiver_identifier_encrypted: 'encrypted',
      receiver_identifier_hmac: 'hmac_sha256:wallet',
      receiver_identifier_masked: 'j•••@•••.com',
      receiver_identifier_last4: '.com',
      route_code: 'USD-WISE',
      display_label: 'Wise USD',
      enabled: true,
      recommended: false,
      review_policy: 'review_first',
      lifecycle_status: 'active',
      created_at: '2026-05-02T10:00:00.000Z',
      updated_at: '2026-05-02T10:00:00.000Z'
    })
  ];

  public async getCheckoutSession(paymentSessionId: string) {
    return paymentSessionId === this.session.payment_session_id ? this.session : null;
  }

  public async getReceiverBanks(paymentSessionId: string) {
    return {
      payment_session_id: paymentSessionId,
      receiver_banks: V1ReceiverBankOptions.map((bank) => {
        const bankRoutes = this.routes.filter((route) => route.bank_profile_id === bank.bank_profile_id);
        const railTypes = [...new Set(bankRoutes.map((route) => route.rail_type))];
        return {
          ...bank,
          available_route_count: bankRoutes.length,
          rail_types: railTypes,
          recommended_rail_type: railTypes[0] ?? null
        };
      })
    };
  }

  public async submitExpectedPaymentProfile(_paymentSessionId: string, body: Parameters<CheckoutSessionProvider['submitExpectedPaymentProfile']>[1]) {
    const compatibleRoute = this.routes.find((route) =>
      body.payment_method === 'card' ? route.rail_type === 'card_transfer' : route.rail_type === 'phone_transfer'
    );
    this.session = {
      ...this.session,
      payment_method: body.payment_method,
      sender_bank_id: body.sender_bank_id,
      sender_card_masked: body.payment_method === 'card' ? '2202 **** **** 4821' : undefined,
      sender_phone_masked: body.payment_method === 'sbp' ? '+7 *** *** **67' : undefined,
      selected_receiver_bank_id: compatibleRoute?.bank_profile_id,
      selected_receiver_bank_profile_id: compatibleRoute?.bank_profile_id,
      selected_payer_bank_launcher_id: body.sender_bank_id,
      amount: { value: '137.80', currency: 'RUB' },
      display_amount: { value: '137.00', currency: 'RUB' },
      payable_amount: { value: '137.80', currency: 'RUB' },
      reconciliation_delta_minor: 80,
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated'
    };
    return this.session;
  }

  public async selectReceiverBank(_paymentSessionId: string, receiverBankId: string) {
    this.session = {
      ...this.session,
      selected_receiver_bank_id: receiverBankId,
      selected_receiver_bank_profile_id: receiverBankId,
      selected_receiving_route_id: undefined,
      selected_payer_bank_launcher_id: undefined,
      status: 'receiver_arming',
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated'
    };
    return this.session;
  }

  public async getReceivingRoutes(paymentSessionId: string, bankProfileId: string) {
    return {
      payment_session_id: paymentSessionId,
      bank_profile_id: bankProfileId,
      routes: bankProfileId === 'sber_ru' ? this.routes : []
    };
  }

  public async selectReceivingRoute(_paymentSessionId: string, receivingRouteId: string) {
    this.session = {
      ...this.session,
      selected_receiving_route_id: receivingRouteId,
      selected_payer_bank_launcher_id: undefined,
      checkout_state: 'payer_bank_launcher_selection',
      buyer_safe_status: 'not_validated'
    };
    return this.session;
  }

  public async getReceivingRouteCopyDetails(paymentSessionId: string) {
    return {
      payment_session_id: paymentSessionId,
      receiving_route_id: 'route_sber_phone',
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_masked: '+7 *** *** **67',
      masked_identifier: '+7 *** *** **67',
      receiver_identifier_copy_value: '+79991234567',
      destination_value: '+79991234567',
      reveal_expires_at: '2026-05-02T10:03:00.000Z',
      copy_action: 'explicit_buyer_copy' as const,
      does_not_confirm_payment: true as const,
      official_bank_confirmation: false as const
    };
  }

  public async saveBuyerSenderPhoneHint(paymentSessionId: string, buyerSenderPhone: string) {
    void paymentSessionId;
    void buyerSenderPhone;
    this.session = { ...this.session, buyer_sender_phone_masked: '+7 *** *** **67' };
    return this.session;
  }

  public async getPayerBankLaunchers(paymentSessionId: string) {
    return { payment_session_id: paymentSessionId, payer_bank_launchers: PayerBankLauncherRegistry };
  }

  public async selectPayerBankLauncher(_paymentSessionId: string, payerBankLauncherId: string) {
    this.session = {
      ...this.session,
      selected_payer_bank_launcher_id: payerBankLauncherId,
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    return this.session;
  }

  public async markPaymentInstructionsShown() {
    this.session = {
      ...this.session,
      payment_instructions_shown_at: '2026-05-02T10:01:00.000Z',
      checkout_state: 'awaiting_payment',
      buyer_safe_status: 'awaiting_payment'
    };
    return this.session;
  }

  public async markReceiverArmed() {
    this.session = {
      ...this.session,
      status: 'receiver_armed',
      checkout_state: 'awaiting_payment',
      buyer_safe_status: 'awaiting_payment'
    };
    return this.session;
  }

  public async markBuyerClaimedPaid(paymentSessionId: string) {
    void paymentSessionId;
    if (this.session.status === 'manual_confirmed' || this.session.status === 'fulfilled' || this.session.buyer_safe_status === 'confirmed') {
      return {
        payment_session_id: this.session.payment_session_id,
        buyer_claimed_paid: false as const,
        does_not_confirm_payment: true as const,
        next_status: 'Paiement confirme',
        claim_result: 'already_confirmed' as const,
        status: this.session.status,
        checkout_state: this.session.checkout_state as CheckoutSessionState,
        buyer_safe_status: this.session.buyer_safe_status as BuyerSafeCheckoutStatus,
        official_bank_confirmation: false as const
      };
    }
    if (this.session.status === 'rejected' || this.session.buyer_safe_status === 'rejected') {
      return {
        payment_session_id: this.session.payment_session_id,
        buyer_claimed_paid: false as const,
        does_not_confirm_payment: true as const,
        next_status: 'Paiement rejete',
        claim_result: 'already_rejected' as const,
        status: this.session.status,
        checkout_state: this.session.checkout_state as CheckoutSessionState,
        buyer_safe_status: this.session.buyer_safe_status as BuyerSafeCheckoutStatus,
        official_bank_confirmation: false as const
      };
    }
    if (this.session.status === 'expired' || this.session.buyer_safe_status === 'expired') {
      return {
        payment_session_id: this.session.payment_session_id,
        buyer_claimed_paid: false as const,
        does_not_confirm_payment: true as const,
        next_status: 'Paiement expire',
        claim_result: 'already_expired' as const,
        status: this.session.status,
        checkout_state: this.session.checkout_state as CheckoutSessionState,
        buyer_safe_status: this.session.buyer_safe_status as BuyerSafeCheckoutStatus,
        official_bank_confirmation: false as const
      };
    }
    if (this.session.status === 'buyer_claimed_paid') {
      return {
        payment_session_id: this.session.payment_session_id,
        buyer_claimed_paid: true as const,
        does_not_confirm_payment: true as const,
        next_status: 'Recherche du signal bancaire',
        claim_result: 'claim_recorded' as const,
        status: this.session.status,
        checkout_state: this.session.checkout_state as CheckoutSessionState,
        buyer_safe_status: this.session.buyer_safe_status as BuyerSafeCheckoutStatus,
        official_bank_confirmation: false as const
      };
    }
    this.session = {
      ...this.session,
      status: 'buyer_claimed_paid',
      buyer_claimed_paid_at: '2026-05-02T10:02:00.000Z',
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal'
    };
    return {
      payment_session_id: this.session.payment_session_id,
      buyer_claimed_paid: true as const,
      does_not_confirm_payment: true as const,
      next_status: 'Recherche du signal bancaire',
      claim_result: 'claim_recorded' as const,
      status: this.session.status,
      checkout_state: this.session.checkout_state as CheckoutSessionState,
      buyer_safe_status: this.session.buyer_safe_status as BuyerSafeCheckoutStatus,
      official_bank_confirmation: false as const
    };
  }
}
