import { describe, expect, it } from 'vitest';
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
    expect(response.body).toContain('Paiement par transfert bancaire');
    expect(response.body).toContain('SwimPay reconnait le paiement a partir du signal de reception cote marchand.');
    expect(response.body).toContain('Numero utilise dans votre app bancaire');
    expect(response.body).toContain('SwimPay ne lit pas votre telephone et ne se connecte pas a votre banque.');
    expect(response.body).toContain('137.00 RUB');
    expect(response.body).toContain('SWP-A8K2');
    expect(response.body).toContain('Copier le montant');
    expect(response.body).toContain('Copier la reference');
    expect(response.body).toContain('Ouvrir la banque');
    expect(response.body).toContain('J&#39;ai paye');
    expect(response.body).toContain('data-does-not-confirm="true"');
    expect(response.body).toContain('En attente du transfert');
    expect(response.body).not.toMatch(/confirm[eé] par la banque/i);
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
      display_status: 'Verification manuelle necessaire',
      result_state: 'review',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'SWP-A8K2',
      expires_at: '2026-05-02T10:15:00.000Z'
    });
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
      next_status: 'Recherche du signal bancaire'
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
}
