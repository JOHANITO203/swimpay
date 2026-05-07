import { describe, expect, it } from 'vitest';
import { buildApiServer, type OrderRepository, type StoredOrderRecord, type StoredPaymentSessionRecord } from './server.js';
import { InMemoryMerchantIntegrationRepository } from './developer-integration.js';
import {
  AdminRoles,
  BFF_SESSION_COOKIE_NAME,
  CSRF_HEADER_NAME,
  InMemoryAuthBffRepository,
  InMemoryMerchantApiKeyVerifier,
  MerchantPermissions,
  MerchantRoles,
  buildSessionCookieOptions,
  createGoogleOAuthProviderSeam,
  hasAdminPermission,
  hasMerchantPermission
} from './auth-bff.js';

class MinimalOrderRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();
  public readonly paymentSessions: StoredPaymentSessionRecord[] = [];

  async createOrderWithSession(input: Parameters<OrderRepository['createOrderWithSession']>[0]) {
    this.orders.set(input.order.id, input.order);
    this.paymentSessions.push(input.paymentSession);
    return { kind: 'created' as const, order: input.order, paymentSession: input.paymentSession };
  }

  async getOrderById() {
    return null;
  }

  async getPaymentSessionById() {
    return null;
  }

  async createReceivingRoute(input: Parameters<OrderRepository['createReceivingRoute']>[0]) {
    return { kind: 'created' as const, route: input.route };
  }

  async listReceivingRoutes() {
    return [];
  }

  async updateReceivingRoute() {
    return { kind: 'not_found' as const };
  }

  async listReceiverBanksForCheckout() {
    return [];
  }

  async listReceivingRoutesForCheckoutBank() {
    return [];
  }

  async getSelectedReceivingRouteCopyDetails() {
    return { kind: 'not_found' as const };
  }

  async recordCheckoutDestinationCopied() {
    return undefined;
  }

  async selectReceiverBank() {
    return { kind: 'not_found' as const };
  }

  async selectReceivingRoute() {
    return { kind: 'not_found' as const };
  }

  async selectPayerBankLauncher() {
    return { kind: 'not_found' as const };
  }

  async saveBuyerSenderPhoneHint() {
    return { kind: 'not_found' as const };
  }

  async markReceiverArmed() {
    return { kind: 'not_found' as const };
  }

  async markReceiverArmingRequested() {
    return { kind: 'not_found' as const };
  }

  async markPaymentInstructionsShown() {
    return { kind: 'not_found' as const };
  }

  async markBuyerClaimedPaid() {
    return { kind: 'not_found' as const };
  }
}

function buildAuthServer(environment = 'test') {
  const authBffRepository = new InMemoryAuthBffRepository();
  const merchantIntegrationRepository = new InMemoryMerchantIntegrationRepository();
  const merchantApiKeyVerifier = new InMemoryMerchantApiKeyVerifier();
  const orderRepository = new MinimalOrderRepository();
  const server = buildApiServer({
    environment,
    authBffRepository,
    merchantIntegrationRepository,
    merchantApiKeyVerifier,
    orderRepository,
    idGenerator: {
      orderId: () => 'ord_auth_01',
      paymentSessionId: () => 'ps_auth_01',
      auditEventId: () => 'aud_auth_01',
      referenceCode: () => 'SWP-AUTH01'
    },
    clock: () => new Date('2026-05-07T10:00:00.000Z'),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  });
  return { server, authBffRepository, merchantIntegrationRepository, merchantApiKeyVerifier, orderRepository };
}

async function bootstrapSession(input: { role?: string; merchantId?: string } = {}) {
  const { server, merchantIntegrationRepository } = buildAuthServer();
  const response = await server.inject({
    method: 'POST',
    url: '/auth/dev/bootstrap-session',
    payload: {
      user_id: '11111111-1111-4111-8111-111111111111',
      merchant_id: input.merchantId ?? '22222222-2222-4222-8222-222222222222',
      email: 'owner@example.com',
      role: input.role ?? 'owner'
    }
  });
  const setCookie = response.headers['set-cookie'];
  return {
    server,
    merchantIntegrationRepository,
    cookie: Array.isArray(setCookie) ? setCookie[0] : String(setCookie),
    csrfToken: response.json().csrf_token as string,
    body: response.json()
  };
}

describe('Auth BFF foundation', () => {
  it('defines merchant/admin permission boundaries', () => {
    expect(hasMerchantPermission(MerchantRoles.DEVELOPER, MerchantPermissions.INTEGRATION_WEBHOOK_UPDATE)).toBe(true);
    expect(hasMerchantPermission(MerchantRoles.OPERATOR, MerchantPermissions.INTEGRATION_WEBHOOK_UPDATE)).toBe(false);
    expect(hasAdminPermission(AdminRoles.SWIMPAY_ADMIN, 'admin.audit.read')).toBe(true);
    expect(hasAdminPermission(AdminRoles.READONLY_AUDITOR, 'admin.feedback.read')).toBe(false);
  });

  it('builds secure production session cookies and fails Google OAuth closed when not configured', () => {
    expect(buildSessionCookieOptions('production')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    });
    expect(createGoogleOAuthProviderSeam({}, 'production')).toMatchObject({
      configured: false,
      productionReady: false,
      reason: 'google_oauth_not_configured'
    });
  });

  it('creates an opaque BFF session, exposes /v1/me safely and logs out with CSRF', async () => {
    const { server, cookie, csrfToken, body } = await bootstrapSession();
    expect(cookie).toContain(`${BFF_SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain('HttpOnly');
    expect(body.active_membership.role).toBe('owner');
    expect(body.active_membership.permissions).toContain('integration.webhook.update');
    expect(body).not.toHaveProperty('session_id');

    const me = await server.inject({ method: 'GET', url: '/v1/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().active_merchant_id).toBe('22222222-2222-4222-8222-222222222222');
    expect(me.body).not.toMatch(/bff_[A-Za-z0-9_-]+|csrf_[A-Za-z0-9_-]+/u);

    const blockedLogout = await server.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });
    expect(blockedLogout.statusCode).toBe(403);

    const logout = await server.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie, [CSRF_HEADER_NAME]: csrfToken }
    });
    expect(logout.statusCode).toBe(204);

    const afterLogout = await server.inject({ method: 'GET', url: '/v1/me', headers: { cookie } });
    expect(afterLogout.statusCode).toBe(401);
  });

  it('uses active merchant session for developer integration and requires CSRF for mutations', async () => {
    const { server, cookie, csrfToken, merchantIntegrationRepository } = await bootstrapSession({
      merchantId: '33333333-3333-4333-8333-333333333333'
    });

    const read = await server.inject({ method: 'GET', url: '/v1/merchant/integration', headers: { cookie } });
    expect(read.statusCode).toBe(200);
    expect(read.json().merchant_id).toBe('33333333-3333-4333-8333-333333333333');

    const blocked = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: { cookie },
      payload: { merchant_id: '44444444-4444-4444-8444-444444444444', webhook_url: 'https://merchant.example/hooks' }
    });
    expect(blocked.statusCode).toBe(403);

    const updated = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: { cookie, [CSRF_HEADER_NAME]: csrfToken },
      payload: { merchant_id: '44444444-4444-4444-8444-444444444444', webhook_url: 'https://merchant.example/hooks' }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().merchant_id).toBe('33333333-3333-4333-8333-333333333333');
    expect(
      (await merchantIntegrationRepository.getIntegration('44444444-4444-4444-8444-444444444444', '2026-05-07T10:00:00.000Z'))
        .webhookUrl
    ).toBeNull();
  });

  it('denies developer integration mutations when membership lacks permission', async () => {
    const { server, cookie, csrfToken } = await bootstrapSession({ role: 'operator' });

    const response = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers: { cookie, [CSRF_HEADER_NAME]: csrfToken },
      payload: { webhook_url: 'https://merchant.example/hooks' }
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('integration.webhook.update');
  });

  it('keeps dev bootstrap disabled in production and accepts stored API keys for order creation', async () => {
    const { server, merchantApiKeyVerifier, orderRepository } = buildAuthServer('production');
    merchantApiKeyVerifier.seedRawKey('sk_live_server_only', {
      merchantId: '55555555-5555-4555-8555-555555555555',
      apiKeyId: 'key_01',
      scopes: ['orders.write']
    });

    const devBootstrap = await server.inject({ method: 'POST', url: '/auth/dev/bootstrap-session' });
    expect(devBootstrap.statusCode).toBe(404);

    const testBearer = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_merchant_dev' },
      payload: validOrderPayload()
    });
    expect(testBearer.statusCode).toBe(401);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_server_only' },
      payload: validOrderPayload()
    });
    expect(created.statusCode).toBe(201);
    expect(orderRepository.orders.get('ord_auth_01')?.merchantId).toBe('55555555-5555-4555-8555-555555555555');
    expect(created.body).not.toContain('sk_live_server_only');
  });
});

function validOrderPayload() {
  return {
    external_id: 'ORDER_AUTH_01',
    amount: {
      value: '1390.00',
      currency: 'RUB'
    },
    buyer: {
      bank_phone: '+79991234567'
    },
    expires_in_seconds: 900
  };
}
