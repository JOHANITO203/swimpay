import { describe, expect, it } from 'vitest';
import { PayerBankLauncherRegistry, V1ReceiverBankOptions } from '@swimpay/contracts';
import { buildWebServer, type CheckoutSession, type CheckoutSessionProvider } from './index.js';

describe('hosted checkout web foundation', () => {
  it('renders the buyer checkout flow with safe payment-signal wording', async () => {
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
    expect(response.body).toContain('Pay with SwimPay');
    expect(response.body).toContain('SwimPay recherchera le signal de paiement côté marchand.');
    expect(response.body).toContain('Choisir la banque du marchand');
    expect(response.body).toContain('Sberbank');
    expect(response.body).toContain('Tinkoff / T-Bank');
    expect(response.body).toContain('review_required_beta');
    expect(response.body).toContain('Choisir votre app bancaire');
    expect(response.body).toContain('Other bank / manual transfer');
    expect(response.body).toContain('does_not_confirm_payment=true');
    expect(response.body).toContain('Numero utilise dans votre app bancaire');
    expect(response.body).toContain('SwimPay ne lit pas votre telephone et ne se connecte pas a votre banque.');
    expect(response.body).toContain('137.00 RUB');
    expect(response.body).toContain('SWP-A8K2');
    expect(response.body).toContain('Copier le montant');
    expect(response.body).toContain('Copier la reference');
    expect(response.body).toContain("Ouvrir l'app bancaire");
    expect(response.body).toContain('J&#39;ai paye');
    expect(response.body).toContain('data-does-not-confirm="true"');
    expect(response.body).toContain('En attente du transfert');
    expect(response.body).not.toMatch(/confirm[eé] par la banque/i);
    expect(response.body).not.toMatch(/confirmera automatiquement/i);
    expect(response.body).not.toMatch(/paiement bancaire officiel/i);
    expect(response.body).not.toMatch(/paiement garanti/i);
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
    expect(response.json()).toEqual({
      payment_session_id: 'ps_01',
      order_id: 'ord_01',
      status: 'needs_review',
      checkout_state: 'needs_review',
      buyer_safe_status: 'needs_review',
      display_status: 'Verification manuelle necessaire',
      result_state: 'review',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'SWP-A8K2',
      expires_at: '2026-05-02T10:15:00.000Z',
      official_bank_confirmation: false
    });
  });

  it('proxies receiver and payer launcher selection without confirming payment', async () => {
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
    const launcherResponse = await server.inject({
      method: 'POST',
      url: '/checkout/ps_01/payer-bank-launcher',
      payload: { payer_bank_launcher_id: 'other_manual' }
    });

    expect(receiverResponse.statusCode).toBe(200);
    expect(launcherResponse.statusCode).toBe(200);
    expect(provider.session.selected_receiver_bank_id).toBe('sber_ru');
    expect(provider.session.selected_payer_bank_launcher_id).toBe('other_manual');
    expect(provider.session.status).not.toBe('auto_confirmed');
    expect(receiverResponse.json().official_bank_confirmation).toBe(false);
    expect(launcherResponse.json().official_bank_confirmation).toBe(false);
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
});

class FakeCheckoutSessionProvider implements CheckoutSessionProvider {
  public session: CheckoutSession = {
    payment_session_id: 'ps_01',
    order_id: 'ord_01',
    status: 'awaiting_payment',
    amount: {
      value: '137.00',
      currency: 'RUB'
    },
    reference: 'SWP-A8K2',
    receiver_status: 'armed',
    expires_at: '2026-05-02T10:15:00.000Z',
    product_name: 'Premium Pack'
  };

  public async getCheckoutSession(paymentSessionId: string) {
    return paymentSessionId === this.session.payment_session_id ? this.session : null;
  }

  public async getReceiverBanks(paymentSessionId: string) {
    return {
      payment_session_id: paymentSessionId,
      receiver_banks: V1ReceiverBankOptions
    };
  }

  public async selectReceiverBank(_paymentSessionId: string, receiverBankId: string) {
    this.session = {
      ...this.session,
      selected_receiver_bank_id: receiverBankId,
      selected_receiver_bank_profile_id: receiverBankId,
      selected_payer_bank_launcher_id: undefined,
      checkout_state: 'payer_bank_launcher_selection',
      buyer_safe_status: 'not_validated'
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

  public async markBuyerClaimedPaid() {
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
      checkout_state: this.session.checkout_state,
      buyer_safe_status: this.session.buyer_safe_status,
      official_bank_confirmation: false as const
    };
  }
}
