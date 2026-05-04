import { describe, expect, it } from 'vitest';
import { buildWebServer } from './index.js';

describe('UI Copy Guardrails and Wording', () => {
  const forbiddenWords = [
    'HMAC',
    'package/cert',
    'TO_VERIFY',
    'approved_for_review_only',
    'official_bank_confirmation',
    'signal runtime',
    'template confidence',
    'receiver route',
    'webhook payload',
    'auto-confirm bancaire',
    'confirmation bancaire officielle',
    'Payment Signal Engine',
    'bank evidence',
    'production trust'
  ];

  it('merchant dashboard does not contain forbidden technical wording', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/merchant/dashboard' });

    expect(response.statusCode).toBe(200);
    for (const word of forbiddenWords) {
      expect(response.body).not.toContain(word);
    }
  });

  it('renders separated onboarding screens with approved merchant copy', async () => {
    const server = buildWebServer({ environment: 'test' });
    const welcome = await server.inject({ method: 'GET', url: '/merchant/onboarding/1' });
    const phone = await server.inject({ method: 'GET', url: '/merchant/onboarding/2' });
    const banks = await server.inject({ method: 'GET', url: '/merchant/onboarding/3' });
    const method = await server.inject({ method: 'GET', url: '/merchant/onboarding/4' });
    const test = await server.inject({ method: 'GET', url: '/merchant/onboarding/5' });

    expect(welcome.body).toContain('Recevez vos paiements plus facilement');
    expect(welcome.body).toContain('SwimPay détecte les paiements reçus, vous aide à les valider et prévient votre site ou votre application.');
    expect(welcome.body).toContain('Détection rapide');
    expect(welcome.body).toContain('Repérez plus vite les paiements reçus.');
    expect(phone.body).toContain('Connectez votre téléphone');
    expect(phone.body).toContain('Accès nécessaire');
    expect(phone.body).toContain('SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.');
    expect(banks.body).toContain('Choisissez vos banques');
    expect(banks.body).toContain('Validation manuelle en bêta');
    expect(method.body).toContain('Ajoutez votre moyen de réception');
    expect(method.body).toContain('Carte bancaire');
    expect(method.body).toContain('Numéro de téléphone');
    expect(test.body).toContain('Vérifiez que tout fonctionne');
    expect(test.body).toContain('Site ou application connecté');

    const combined = [welcome.body, phone.body, banks.body, method.body, test.body].join('\n');
    for (const word of forbiddenWords) {
      expect(combined).not.toContain(word);
    }
  });

  it('renders merchant screen gaps with simple approved labels', async () => {
    const server = buildWebServer({ environment: 'test' });
    const pages = await Promise.all([
      server.inject({ method: 'GET', url: '/merchant/banks' }),
      server.inject({ method: 'GET', url: '/merchant/orders' }),
      server.inject({ method: 'GET', url: '/merchant/orders/ord_123' }),
      server.inject({ method: 'GET', url: '/merchant/receiver-phone' }),
      server.inject({ method: 'GET', url: '/merchant/tests' }),
      server.inject({ method: 'GET', url: '/merchant/settings' }),
      server.inject({ method: 'GET', url: '/merchant/connected-site' })
    ]);

    for (const page of pages) {
      expect(page.statusCode).toBe(200);
      for (const word of forbiddenWords) {
        expect(page.body).not.toContain(word);
      }
    }

    expect(pages[0].body).toContain('Banques');
    expect(pages[0].body).toContain('Sélectionnez les banques que vos clients pourront choisir au paiement.');
    expect(pages[1].body).toContain('Commandes');
    expect(pages[2].body).toContain('Détail commande');
    expect(pages[3].body).toContain('Téléphone Receiver');
    expect(pages[3].body).toContain('Accès notifications désactivé');
    expect(pages[4].body).toContain('Tests');
    expect(pages[4].body).toContain('Lancez un test pour vérifier votre configuration avant les vrais paiements.');
    expect(pages[5].body).toContain('Paramètres');
    expect(pages[5].body).toContain('Business');
    expect(pages[6].body).toContain('Site ou application connecté');
  });

  it('renders merchant review detail with simple labels and separated actions', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/merchant/review-queue/pay_01' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Vérifier ce paiement');
    expect(response.body).toContain('Validation manuelle en bêta');
    expect(response.body).toContain('Référence non visible');
    expect(response.body).toContain('Confirmer le paiement');
    expect(response.body).toContain('Rejeter le signal');
    expect(response.body).toContain('Rejeter la commande');
    expect(response.body).not.toContain('reason_code');
    expect(response.body).not.toContain('template confidence');
  });

  it('checkout does not claim official bank confirmation', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/checkout/any' });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('confirmation bancaire officielle');
    expect(response.body).not.toContain('paiement garanti');
    expect(response.body).toContain('Payer avec SwimPay');
    expect(response.body).toContain('SwimPay suit le signal côté marchand.');
  });

  it('masks sensitive PII in merchant UI', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/admin/merchant-receiving-routes' });

    if (response.statusCode === 200) {
      const phoneRegex = /\+7\d{10}/;
      const cardRegex = /\d{16}/;
      expect(response.body).not.toMatch(phoneRegex);
      expect(response.body).not.toMatch(cardRegex);
    }
  });
});
