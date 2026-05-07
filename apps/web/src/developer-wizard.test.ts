import { describe, expect, it } from 'vitest';
import {
  buildWebServer,
  resolveMerchantServerBearerToken,
  type MerchantIntegrationClient,
  type MerchantIntegrationPayload,
  type MerchantWebhookDeliveryPayload
} from './index.js';

function extractSection(body: string, id: string): string {
  const match = body.match(new RegExp(`<section[^>]+id="${id}"[\\s\\S]*?<\\/section>`, 'iu'));
  return match?.[0] ?? '';
}

class FakeMerchantIntegrationClient implements MerchantIntegrationClient {
  public savedWebhookUrl: string | null = null;
  public retriedDeliveryId: string | null = null;
  public tested = false;

  constructor(private readonly overrides: Partial<MerchantIntegrationPayload> = {}) {}

  async getIntegration(): Promise<MerchantIntegrationPayload> {
    return this.integration();
  }

  async ensureKeys(): Promise<MerchantIntegrationPayload> {
    return this.integration({ secret_key_once: 'sk_test_show_once_secret_value', secret_key_show_once: true });
  }

  async rotateKeys(): Promise<MerchantIntegrationPayload> {
    return this.integration({ secret_key_once: 'sk_test_rotated_secret_value', secret_key_show_once: true });
  }

  async rotateWebhookSecret(): Promise<MerchantIntegrationPayload> {
    return this.integration({ webhook_secret_once: 'whsec_rotated_secret_value', webhook_secret_show_once: true });
  }

  async updateWebhookUrl(webhookUrl: string): Promise<MerchantIntegrationPayload> {
    this.savedWebhookUrl = webhookUrl;
    return this.integration({ webhook_url: webhookUrl, webhook_status: 'active' });
  }

  async testWebhook() {
    this.tested = true;
    return {
      status: 'test_queued',
      delivery_id: 'del_test',
      event_id: 'evt_test',
      safe_status: 'Safe test webhook queued.',
      test_only: true,
      triggers_fulfillment: false,
      official_bank_confirmation: false
    } as const;
  }

  async listDeliveries(): Promise<MerchantWebhookDeliveryPayload[]> {
    return [
      {
        event_id: 'evt_public_confirmed',
        event_type: 'payment.confirmed',
        delivery_id: 'del_failed',
        status: 'failed',
        attempts: 3,
        last_http_status: 503,
        created_at: '2026-05-07T10:00:00.000Z',
        delivered_at: null,
        next_retry_at: '2026-05-07T10:05:00.000Z',
        safe_error_summary: 'connection failed [secret] [phone] [card]'
      }
    ];
  }

  async retryDelivery(deliveryId: string) {
    this.retriedDeliveryId = deliveryId;
    return { status: 'retry_queued', delivery_id: 'del_retry', replay_of_delivery_id: deliveryId };
  }

  private integration(extra: Partial<MerchantIntegrationPayload> = {}): MerchantIntegrationPayload {
    return {
      merchant_id: 'mch_live_backend_123',
      public_key: 'pk_live_backend_8X2A',
      secret_key_masked: 'sk_live_••••1234',
      webhook_secret_masked: 'whsec_••••9876',
      webhook_url: 'https://merchant.example/webhooks/swimpay',
      webhook_status: 'active',
      integration_type: 'both',
      public_webhook_events: ['payment.confirmed', 'payment.rejected', 'payment.expired'],
      payment_confirmed_after_manual_confirmation: true,
      official_bank_confirmation: false,
      ...this.overrides,
      ...extra
    };
  }
}

describe('Developer Integration Wizard', () => {
  it('renders Web and Android only navigation and live backend data', async () => {
    const server = buildWebServer({ environment: 'test', merchantIntegrationClient: new FakeMerchantIntegrationClient() });

    const connected = await server.inject({ method: 'GET', url: '/merchant/connected-site' });
    const settings = await server.inject({ method: 'GET', url: '/merchant/settings' });
    const wizard = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });

    expect(connected.statusCode).toBe(200);
    expect(settings.statusCode).toBe(200);
    expect(wizard.statusCode).toBe(200);
    expect(settings.body).toContain('Int');
    expect(wizard.body).toContain('Site web');
    expect(wizard.body).toContain('Application Android');
    expect(wizard.body).toContain('mch_live_backend_123');
    expect(wizard.body).toContain('pk_live_backend_8X2A');
    expect(wizard.body).toContain('sk_live_••••1234');
    expect(wizard.body).toContain('whsec_••••9876');
    expect(wizard.body).toContain('https://merchant.example/webhooks/swimpay');
    expect(wizard.body).not.toMatch(/Shopify|WordPress|CRM|\bbot\b/iu);
  });

  it('renders a safe unavailable state when backend lifecycle is unavailable', async () => {
    const server = buildWebServer({ environment: 'test', merchantIntegrationClient: null });
    const response = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Connexion en attente');
    expect(response.body).toContain('disabled aria-disabled="true"');
    expect(response.body).toContain('Intégration Web');
    expect(response.body).toContain('Intégration Android');
    expect(response.body).not.toMatch(/sk_test_|sk_live_[A-Za-z0-9_-]{8,}|whsec_[A-Za-z0-9_-]{8,}/u);
  });

  it('does not create a local development bearer in production', async () => {
    expect(resolveMerchantServerBearerToken({
      environment: 'production',
      checkoutMerchantId: 'mch_dev'
    })).toBeNull();
    expect(resolveMerchantServerBearerToken({
      environment: 'production',
      checkoutMerchantId: 'mch_dev',
      explicitToken: 'test_mch_dev'
    })).toBeNull();
    expect(resolveMerchantServerBearerToken({
      environment: 'test',
      checkoutMerchantId: 'mch_dev'
    })).toBe('test_mch_dev');
  });

  it('keeps production wizard actions unavailable without an approved server token', async () => {
    const previousToken = process.env.MERCHANT_INTEGRATION_BEARER_TOKEN;
    process.env.MERCHANT_INTEGRATION_BEARER_TOKEN = 'test_mch_dev';
    try {
      const server = buildWebServer({ environment: 'production' });
      const page = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });
      const action = await server.inject({ method: 'POST', url: '/merchant/developer-integration/keys' });

      expect(page.statusCode).toBe(200);
      expect(page.body).toContain('Connexion en attente');
      expect(page.body).toContain('disabled aria-disabled="true"');
      expect(page.body).not.toMatch(/sk_test_|secret_key_once|whsec_[A-Za-z0-9_-]{8,}/u);
      expect(action.statusCode).toBe(200);
      expect(action.body).toContain('Service momentan');
      expect(action.body).not.toMatch(/sk_test_|secret_key_once|whsec_[A-Za-z0-9_-]{8,}/u);
    } finally {
      if (previousToken === undefined) {
        delete process.env.MERCHANT_INTEGRATION_BEARER_TOKEN;
      } else {
        process.env.MERCHANT_INTEGRATION_BEARER_TOKEN = previousToken;
      }
    }
  });

  it('shows one-time secrets only on immediate action responses', async () => {
    const client = new FakeMerchantIntegrationClient();
    const server = buildWebServer({ environment: 'test', merchantIntegrationClient: client });

    const created = await server.inject({ method: 'POST', url: '/merchant/developer-integration/keys' });
    const normalRead = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });
    const webhookRotated = await server.inject({ method: 'POST', url: '/merchant/developer-integration/webhook-secret/rotate' });

    expect(created.statusCode).toBe(200);
    expect(created.body).toContain('sk_test_show_once_secret_value');
    expect(created.body).toContain('Copiez cette valeur maintenant');
    expect(normalRead.body).not.toContain('sk_test_show_once_secret_value');
    expect(normalRead.body).not.toContain('secret_key_once');
    expect(webhookRotated.body).toContain('whsec_rotated_secret_value');
    expect(normalRead.body).not.toContain('webhook_secret_once');
  });

  it('wires webhook URL save, test webhook and delivery retry through the client', async () => {
    const client = new FakeMerchantIntegrationClient();
    const server = buildWebServer({ environment: 'test', merchantIntegrationClient: client });

    const saved = await server.inject({
      method: 'POST',
      url: '/merchant/developer-integration/webhook-url',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'webhook_url=https%3A%2F%2Fmerchant.example%2Fhooks%2Fswimpay'
    });
    const tested = await server.inject({ method: 'POST', url: '/merchant/developer-integration/test-webhook' });
    const retried = await server.inject({ method: 'POST', url: '/merchant/developer-integration/webhook-deliveries/del_failed/retry' });

    expect(saved.statusCode).toBe(200);
    expect(client.savedWebhookUrl).toBe('https://merchant.example/hooks/swimpay');
    expect(tested.statusCode).toBe(303);
    expect(client.tested).toBe(true);
    expect(retried.statusCode).toBe(303);
    expect(client.retriedDeliveryId).toBe('del_failed');
  });

  it('keeps snippets and delivery history free of secrets, raw PII and internal fulfillment events', async () => {
    const server = buildWebServer({ environment: 'test', merchantIntegrationClient: new FakeMerchantIntegrationClient() });
    const response = await server.inject({ method: 'GET', url: '/merchant/developer-integration' });
    const web = extractSection(response.body, 'web-integration-snippets');
    const android = extractSection(response.body, 'android-integration-snippets');

    expect(response.body).toContain('Derniers événements');
    expect(response.body).toContain('payment.confirmed');
    expect(response.body).toContain('payment.rejected');
    expect(response.body).toContain('payment.expired');
    expect(response.body).toContain('[secret]');
    expect(response.body).toContain('[phone]');
    expect(response.body).toContain('[card]');

    expect(web).toContain('@swimpay/node');
    expect(web).toContain('swimpay.webhooks.verify');
    expect(web).not.toMatch(/auto_confirm|autoConfirm|payment\.signal_detected|payment\.needs_review|official_bank_confirmation\s*[:=]\s*true/iu);

    expect(android).toContain('SwimPayCheckout.open');
    expect(android).toContain('SwimPayCheckout.parseReturnIntent');
    expect(android).not.toMatch(/SWIMPAY_SECRET_KEY|SWIMPAY_WEBHOOK_SECRET|Authorization\s*[:=]\s*Bearer|webhook|payment\.confirmed|fulfill|markOrderPaid|NotificationListener|READ_SMS|QUERY_ALL_PACKAGES/iu);

    expect(response.body).not.toMatch(/raw_notification|raw payload|payload_json|\+7\d{10}|\b\d{16}\b|confirmation bancaire officielle|paiement garanti/iu);
    expect(response.body).not.toMatch(/official_bank_confirmation\s*[:=]\s*true|officialBankConfirmation\s*[:=]\s*true/iu);
  });
});
