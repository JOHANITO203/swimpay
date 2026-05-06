import { describe, expect, it } from 'vitest';
import { buildWebServer } from './index.js';

function extractSection(body: string, id: string): string {
  const match = body.match(new RegExp(`<section[^>]+id="${id}"[\\s\\S]*?<\\/section>`, 'iu'));
  return match?.[0] ?? '';
}

describe('Developer Integration Wizard', () => {
  it('renders a Web and Android only integration wizard from connected-site navigation', async () => {
    const server = buildWebServer({ environment: 'test' });

    const connected = await server.inject({ method: 'GET', url: '/merchant/connected-site' });
    const settings = await server.inject({ method: 'GET', url: '/merchant/settings' });
    const wizard = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });

    expect(connected.statusCode).toBe(200);
    expect(settings.statusCode).toBe(200);
    expect(wizard.statusCode).toBe(200);

    expect(connected.body).toContain('Configurer l’intégration');
    expect(settings.body).toContain('Intégration développeur');

    expect(wizard.body).toContain('Site ou application connecté');
    expect(wizard.body).toContain('Connectez SwimPay à votre site ou votre application pour recevoir les mises à jour de paiement.');
    expect(wizard.body).toContain('Quel type de projet utilisez-vous ?');
    expect(wizard.body).toContain('Site web');
    expect(wizard.body).toContain('Application Android');
    expect(wizard.body).not.toMatch(/Shopify|WordPress|CRM|\bbot\b/iu);
  });

  it('renders masked credentials and webhook configuration without exposing secrets', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Clés SwimPay');
    expect(response.body).toContain('Merchant ID');
    expect(response.body).toContain('Clé publique');
    expect(response.body).toContain('Clé secrète');
    expect(response.body).toContain('Secret webhook');
    expect(response.body).toContain('••••');
    expect(response.body).toContain('Gardez vos clés secrètes côté serveur.');
    expect(response.body).toContain('Ne placez jamais la clé secrète dans une application Android.');
    expect(response.body).toContain('Webhook');
    expect(response.body).toContain('Webhook URL');
    expect(response.body).toContain('Tester la connexion');
    expect(response.body).toContain('Connexion réussie');
    expect(response.body).toContain('Action nécessaire');
    expect(response.body).toContain('Signature non vérifiée');
    expect(response.body).toContain('Endpoint indisponible');

    expect(response.body).not.toMatch(/whsec_[a-z0-9_]+|sk_live_|sk_test_|raw_notification|raw_phone|raw_card/iu);
    expect(response.body).not.toContain('webhook_secret');
  });

  it('renders safe Web SDK snippets based on @swimpay/node', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });
    const web = extractSection(response.body, 'web-integration-snippets');

    expect(web).toContain('Intégration Web');
    expect(web).toContain('npm install @swimpay/node');
    expect(web).toContain('import { SwimPay } from &quot;@swimpay/node&quot;');
    expect(web).toContain('swimpay.orders.create');
    expect(web).toContain('checkout.checkoutUrl');
    expect(web).toContain('swimpay.webhooks.verify');
    expect(web).toContain('idempotencyKey');
    expect(web).toContain('payment.confirmed');
    expect(web).toContain('payment.rejected');
    expect(web).toContain('payment.expired');

    expect(web).not.toMatch(/auto_confirm|autoConfirm|payment\.signal_detected|payment\.needs_review|official_bank_confirmation\s*[:=]\s*true/iu);
  });

  it('renders safe Android SDK snippets based on @swimpay/android', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });
    const android = extractSection(response.body, 'android-integration-snippets');

    expect(android).toContain('Intégration Android');
    expect(android).toContain('Application Android');
    expect(android).toContain('votre backend');
    expect(android).toContain('checkout_url');
    expect(android).toContain('retour app');
    expect(android).toContain('SwimPayCheckout.open');
    expect(android).toContain('SwimPayCheckout.parseReturnIntent');
    expect(android).toContain('rafraîchissez le statut depuis votre backend');

    expect(android).not.toMatch(/SWIMPAY_SECRET_KEY|Authorization\s*[:=]\s*Bearer|webhook|payment\.confirmed|fulfill|markOrderPaid|NotificationListener|READ_SMS|QUERY_ALL_PACKAGES/iu);
  });

  it('renders safe webhook delivery history and product truth guardrails', async () => {
    const server = buildWebServer({ environment: 'test' });
    const response = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Derniers événements');
    expect(response.body).toContain('Voir détail');
    expect(response.body).toContain('Réessayer');
    expect(response.body).toContain('Copier event id');
    expect(response.body).toContain('payment.confirmed');
    expect(response.body).toContain('manual confirmation');
    expect(response.body).toContain('official_bank_confirmation=false');

    expect(response.body).not.toMatch(/payment\.signal_detected[\s\S]{0,180}(fulfillment|fulfill|exécuter|traiter la commande|release|ship)/iu);
    expect(response.body).not.toMatch(/payment\.needs_review[\s\S]{0,180}(fulfillment|fulfill|exécuter|traiter la commande|release|ship)/iu);
    expect(response.body).not.toMatch(/auto_confirm\s*[:=]\s*true|autoConfirm\s*[:=]\s*true/iu);
    expect(response.body).not.toMatch(/official_bank_confirmation\s*[:=]\s*true|officialBankConfirmation\s*[:=]\s*true/iu);
    expect(response.body).not.toMatch(/confirmation bancaire officielle|paiement garanti/iu);
    expect(response.body).not.toMatch(/\+7\d{10}|\b\d{16}\b|raw notification|raw payload/iu);
  });
});
