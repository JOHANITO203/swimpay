import { describe, expect, it } from 'vitest';
import {
  PayerBankLauncherRegistry,
  V1ReceiverBankOptions,
  toBuyerSafeReceivingRoute,
  type BuyerSafeCheckoutStatus,
  type CheckoutSessionState
} from '@swimpay/contracts';
import { buildWebServer, type CheckoutSession, type CheckoutSessionProvider } from './index.js';

describe('hosted checkout web foundation', () => {
  it('renders the initial buyer checkout as bank-first without route details', async () => {
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: new FakeCheckoutSessionProvider()
    });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Payer avec SwimPay');
    expect(response.body).toContain('Suivez votre paiement bancaire jusqu');
    expect(response.body).toContain('Paiement guidé');
    expect(response.body).toContain('Suivi en temps réel');
    expect(response.body).toContain('Retour au marchand après validation');
    expect(response.body).toContain('Choisissez une banque');
    expect(response.body).toContain('Sélectionnez où envoyer le paiement.');
    expect(response.body).toContain('Sberbank');
    expect(response.body).toContain('Tinkoff / T-Bank');
    expect(response.body).toContain('Disponible');
    expect(response.body).toContain('137.00 RUB');
    expect(response.body).toContain('TANGO ALFA');
    expect(response.body).not.toContain('+7 *** *** **67');
    expect(response.body).not.toContain('2202 **** **** 7890');
    expect(response.body).not.toContain('Other bank / manual transfer');
    expect(response.body).not.toContain('Carte bancaire');
    expect(response.body).not.toContain('Numéro de téléphone');
    expect(response.body).not.toContain('Copier le montant');
    expect(response.body).not.toContain('J&#39;ai payé');
    expect(response.body).not.toMatch(/confirmee? par la banque/i);
    expect(response.body).not.toMatch(/confirmera automatiquement/i);
    expect(response.body).not.toMatch(/paiement bancaire officiel/i);
    expect(response.body).not.toMatch(/paiement garanti/i);
  });

  it('reveals payment methods only after bank selection without destination values', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated'
    };
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Choisissez comment payer');
    expect(response.body).toContain('Carte bancaire');
    expect(response.body).toContain('Simple et neutre');
    expect(response.body).toContain('Frais possibles selon votre banque');
    expect(response.body).toContain('Numéro de téléphone');
    expect(response.body).toContain('Pratique pour les virements via SBP');
    expect(response.body).not.toContain('+7 *** *** **67');
    expect(response.body).not.toContain('2202 **** **** 7890');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('2202201234567890');
  });

  it('renders phone payment instructions after bank, route and launcher selection', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_phone',
      selected_payer_bank_launcher_id: 'other_manual',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Envoyez le paiement');
    expect(response.body).toContain('SwimPay suit le signal côté marchand.');
    expect(response.body).toContain('Téléphone');
    expect(response.body).toContain('+7 *** *** **67');
    expect(response.body).toContain('Votre numéro d');
    expect(response.body).toContain('Continuer vers ma banque');
    expect(response.body).toContain('J&#39;ai payé');
    expect(response.body).toContain('Ces informations servent uniquement');
    expect(response.body).toContain('SwimPay ne débite pas votre carte.');
    expect(response.body).toContain('Envoyez exactement ce montant.');
    expect(response.body).toContain('Sans ces informations, la validation peut prendre plus de temps.');
    expect(response.body).toContain('Paiement en attente');
    expect(response.body).toContain('Effectuez le paiement dans votre application bancaire.');
    expect(response.body).toContain('Continuer sur mobile');
    expect(response.body).toContain('QR');
    expect(response.body).not.toContain('Copier la destination');
    expect(response.body).not.toContain('data-copy-route="true"');
    expect(response.body).not.toContain('Copier le montant');
    expect(response.body).not.toContain('Copier la reference');
    expect(response.body).not.toContain('data-does-not-confirm="true"');
    expect(response.body).not.toContain('Compte marchand');
    expect(response.body).not.toContain('+7 (999) 123-45-67');
    expect(response.body).not.toContain('2202201234567890');
  });

  it('renders card payment instructions with masked route details only', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'other_manual',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Envoyez le paiement');
    expect(response.body).toContain('Carte');
    expect(response.body).toContain('2202 **** **** 7890');
    expect(response.body).toContain('Copier');
    expect(response.body).toContain('137.00 RUB');
    expect(response.body).toContain('TANGO ALFA');
    expect(response.body).toContain('Continuer vers ma banque');
    expect(response.body).toContain('J&#39;ai payé');
    expect(response.body).toContain('Carte source');
    expect(response.body).not.toContain('2202201234567890');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('CVV');
    expect(response.body).not.toContain('SMS code');
    expect(response.body).not.toContain('bank password');
  });

  it.each([
    ['awaiting_payment', 'awaiting_payment', 'Paiement en attente', 'Effectuez le paiement dans votre application bancaire.'],
    ['buyer_claimed_paid', 'searching_signal', 'Recherche du signal', 'Nous vérifions la réception côté marchand.'],
    ['signal_detected', 'signal_detected', 'Signal détecté', 'Nous vérifions les détails du paiement.'],
    ['needs_review', 'needs_review', 'Vérification en cours', 'Le marchand vérifie ce paiement.'],
    ['manual_confirmed', 'confirmed', 'Paiement validé', 'Votre commande peut maintenant être traitée.'],
    ['expired', 'expired', 'Session expirée', 'Le paiement n’a pas été validé à temps.'],
    ['rejected', 'not_validated', 'Paiement non validé', 'Veuillez réessayer ou contacter le marchand.']
  ])('renders buyer checkout state panel for %s', async (status, buyerSafeStatus, title, text) => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: status as CheckoutSession['status'],
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'other_manual',
      checkout_state: status as CheckoutSessionState,
      buyer_safe_status: buyerSafeStatus as BuyerSafeCheckoutStatus
    };
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(title);
    expect(response.body).toContain(text);
    expect(response.body).not.toContain('confirmation bancaire officielle');
    expect(response.body).not.toContain('paiement garanti');
  });

  it('exposes a status polling endpoint mapped from backend session state', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      status: 'needs_review'
    };
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01/status'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_01',
      order_id: 'ord_01',
      status: 'needs_review',
      display_status: 'Vérification manuelle nécessaire',
      result_state: 'review',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'TANGO ALFA',
      expires_at: '2026-05-02T10:15:00.000Z',
      official_bank_confirmation: false
    });
  });

  it('proxies receiver, route and payer launcher selection without confirming payment', async () => {
    const provider = new FakeCheckoutSessionProvider();
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

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
      payload: { payer_bank_launcher_id: 'other_manual' }
    });

    expect(receiverResponse.statusCode).toBe(200);
    expect(routeResponse.statusCode).toBe(200);
    expect(launcherResponse.statusCode).toBe(200);
    expect(provider.session.selected_receiver_bank_id).toBe('sber_ru');
    expect(provider.session.selected_receiving_route_id).toBe('route_sber_phone');
    expect(provider.session.selected_payer_bank_launcher_id).toBe('other_manual');
    expect(provider.session.status).not.toBe('manual_confirmed');
    expect(receiverResponse.json().official_bank_confirmation).toBe(false);
    expect(routeResponse.json().official_bank_confirmation).toBe(false);
    expect(launcherResponse.json().official_bank_confirmation).toBe(false);
  });

  it('proxies explicit receiving route copy details without rendering raw destination in html', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_phone',
      selected_payer_bank_launcher_id: 'other_manual'
    };
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const page = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });
    const copy = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01/receiving-route/copy-details'
    });

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
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const response = await server.inject({
      method: 'GET',
      url: '/checkout/ps_01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Session expirée');
    expect(response.body).toContain('checkout-grid');
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

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/claimed-paid'
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      payment_session_id: 'ps_01',
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      next_status: 'Recherche du signal bancaire',
      status: 'buyer_claimed_paid',
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      official_bank_confirmation: false
    });
  });

  it('arms the receiver when buyer continues to bank without confirming payment', async () => {
    const provider = new FakeCheckoutSessionProvider();
    provider.session = {
      ...provider.session,
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'other_manual',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment'
    };
    const server = buildWebServer({
      environment: 'test',
      checkoutSessionProvider: provider
    });

    const response = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/continue-to-bank'
    });

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
});

class FakeCheckoutSessionProvider implements CheckoutSessionProvider {
  public session: CheckoutSession = {
    payment_session_id: 'ps_01',
    order_id: 'ord_01',
    status: 'receiver_arming',
    amount: {
      value: '137.00',
      currency: 'RUB'
    },
    reference: 'TANGO ALFA',
    receiver_status: 'armed',
    expires_at: '2026-05-02T10:15:00.000Z',
    product_name: 'Premium Pack'
  };

  private readonly routes = [
    toBuyerSafeReceivingRoute({
      route_id: 'route_sber_phone',
      merchant_id: 'mch_01',
      bank_profile_id: 'sber_ru',
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_encrypted: 'encrypted',
      receiver_identifier_masked: '+7 *** *** **67',
      route_code: 'SBER-PHONE',
      display_label: 'Sberbank telephone',
      enabled: true,
      recommended: true,
      review_policy: 'eligible_low_risk_later',
      fees_hint: 'Usually instant',
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
      receiver_identifier_masked: '2202 **** **** 7890',
      route_code: 'SBER-CARD',
      display_label: 'Sberbank card',
      enabled: true,
      recommended: false,
      review_policy: 'review_first',
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
      receiver_banks: V1ReceiverBankOptions.map((bank) =>
        bank.receiver_bank_id === 'sber_ru'
          ? {
              ...bank,
              available_route_count: 2,
              rail_types: ['phone_transfer', 'card_transfer'] as const,
              recommended_rail_type: 'phone_transfer' as const
            }
          : bank
      )
    };
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
    this.session = {
      ...this.session,
      buyer_sender_phone_masked: '+7 *** *** **67'
    };
    return this.session;
  }

  public async getPayerBankLaunchers(paymentSessionId: string) {
    return {
      payment_session_id: paymentSessionId,
      payer_bank_launchers: PayerBankLauncherRegistry
    };
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
      status: 'awaiting_payment',
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
      status: this.session.status,
      checkout_state: this.session.checkout_state as CheckoutSessionState,
      buyer_safe_status: this.session.buyer_safe_status as BuyerSafeCheckoutStatus,
      official_bank_confirmation: false as const
    };
  }
}
