import { describe, expect, it } from 'vitest';
import { buildWebServer, type MerchantRouteAdminClient, type MerchantRouteAdminRoute } from './index.js';

describe('merchant receiving route admin web surface', () => {
  it('renders masked routes, create form and beta review-first warning without raw identifiers', async () => {
    const client = new FakeMerchantRouteAdminClient();
    const server = buildWebServer({
      environment: 'test',
      merchantRouteAdminClient: client
    });

    const response = await server.inject({
      method: 'GET',
      url: '/admin/merchant-receiving-routes'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Moyens de réception');
    expect(response.body).toContain('SBER-PHONE');
    expect(response.body).toContain('+7 *** *** **67');
    expect(response.body).toContain('2202 **** **** 7890');
    expect(response.body).toContain('Validation manuelle en bêta');
    expect(response.body).toContain('name="receiver_identifier"');
    expect(response.body).not.toContain('+79991234567');
    expect(response.body).not.toContain('2202201234567890');
    expect(response.body).not.toMatch(/confirmee? par la banque/i);
    expect(response.body).not.toMatch(/paiement garanti/i);
  });

  it('creates a route then redirects without rendering the raw submitted identifier', async () => {
    const client = new FakeMerchantRouteAdminClient();
    const server = buildWebServer({
      environment: 'test',
      merchantRouteAdminClient: client
    });

    const create = await server.inject({
      method: 'POST',
      url: '/admin/merchant-receiving-routes',
      headers: { 'content-type': 'application/json' },
      payload: {
        bank_profile_id: 'tbank_ru',
        rail_type: 'phone_transfer',
        receiver_identifier: '+7 (900) 111-22-33',
        route_code: 'TBANK-PHONE',
        display_label: 'T-Bank phone',
        recommended: true,
        fees_hint: 'Manual transfer'
      }
    });
    const page = await server.inject({
      method: 'GET',
      url: '/admin/merchant-receiving-routes'
    });

    expect(create.statusCode).toBe(303);
    expect(client.createdRoutes[0]).toMatchObject({
      bank_profile_id: 'tbank_ru',
      rail_type: 'phone_transfer',
      receiver_identifier: '+7 (900) 111-22-33',
      route_code: 'TBANK-PHONE'
    });
    expect(page.body).toContain('TBANK-PHONE');
    expect(page.body).toContain('+7 *** *** **33');
    expect(page.body).not.toContain('+7 (900) 111-22-33');
  });

  it('supports disable and mark recommended actions without exposing raw identifiers', async () => {
    const client = new FakeMerchantRouteAdminClient();
    const server = buildWebServer({
      environment: 'test',
      merchantRouteAdminClient: client
    });

    const disabled = await server.inject({
      method: 'POST',
      url: '/admin/merchant-receiving-routes/route_phone/disable'
    });
    const recommended = await server.inject({
      method: 'POST',
      url: '/admin/merchant-receiving-routes/route_card/recommend'
    });

    expect(disabled.statusCode).toBe(303);
    expect(recommended.statusCode).toBe(303);
    expect(client.patches).toEqual([
      { routeId: 'route_phone', patch: { enabled: false } },
      { routeId: 'route_card', patch: { recommended: true } }
    ]);
  });
});

class FakeMerchantRouteAdminClient implements MerchantRouteAdminClient {
  public readonly createdRoutes: Array<Record<string, unknown>> = [];
  public readonly patches: Array<{ routeId: string; patch: Record<string, unknown> }> = [];
  private routes: MerchantRouteAdminRoute[] = [
    {
      route_id: 'route_phone',
      bank_profile_id: 'sber_ru',
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_masked: '+7 *** *** **67',
      route_code: 'SBER-PHONE',
      display_label: 'Sberbank phone',
      enabled: true,
      recommended: true,
      review_policy: 'eligible_low_risk_later',
      fees_hint: 'Usually instant',
      updated_at: '2026-05-02T10:00:00.000Z'
    },
    {
      route_id: 'route_card',
      bank_profile_id: 'sber_ru',
      rail_type: 'card_transfer',
      receiver_identifier_type: 'card',
      receiver_identifier_masked: '2202 **** **** 7890',
      route_code: 'SBER-CARD',
      display_label: 'Sberbank card',
      enabled: true,
      recommended: false,
      review_policy: 'review_first',
      updated_at: '2026-05-02T10:00:00.000Z'
    }
  ];

  async listRoutes(): Promise<MerchantRouteAdminRoute[]> {
    return this.routes;
  }

  async createRoute(input: Record<string, unknown>): Promise<MerchantRouteAdminRoute> {
    this.createdRoutes.push(input);
    const route: MerchantRouteAdminRoute = {
      route_id: 'route_tbank_phone',
      bank_profile_id: String(input.bank_profile_id),
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_masked: '+7 *** *** **33',
      route_code: String(input.route_code),
      display_label: String(input.display_label),
      enabled: true,
      recommended: Boolean(input.recommended),
      review_policy: 'eligible_low_risk_later',
      fees_hint: typeof input.fees_hint === 'string' ? input.fees_hint : undefined,
      updated_at: '2026-05-02T10:01:00.000Z'
    };
    this.routes = [...this.routes, route];
    return route;
  }

  async updateRoute(routeId: string, patch: Record<string, unknown>): Promise<MerchantRouteAdminRoute> {
    this.patches.push({ routeId, patch });
    const route = this.routes.find((item) => item.route_id === routeId);
    if (!route) {
      throw new Error('missing route');
    }
    Object.assign(route, patch);
    return route;
  }
}
