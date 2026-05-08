import { describe, expect, it, vi } from 'vitest';
import {
  ApiMerchantRouteAdminClient,
  buildWebServer,
  type MerchantRouteAdminClient,
  type MerchantRouteAdminRoute
} from './index.js';

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
    expect(response.body).toContain('name="bank_id"');
    expect(response.body).toContain('name="value"');
    expect(response.body).toContain('Ajouter une carte');
    expect(response.body).toContain('Ajouter telephone SBP');
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
        bank_id: 'tbank_ru',
        type: 'phone',
        value: '+7 (900) 111-22-33',
        label: 'T-Bank phone',
        is_default: true
      }
    });
    const page = await server.inject({
      method: 'GET',
      url: '/admin/merchant-receiving-routes'
    });

    expect(create.statusCode).toBe(303);
    expect(client.createdRoutes[0]).toMatchObject({
      bank_id: 'tbank_ru',
      type: 'phone',
      value: '+7 (900) 111-22-33',
      label: 'T-Bank phone'
    });
    expect(page.body).toContain('T-Bank phone');
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

  it('sends the server-side merchant bearer on receiving-method writes', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({
        method: {
          id: 'route_live',
          type: 'card',
          bank_id: 'sber_ru',
          label: 'SBER-CARD',
          masked_value: '2202 **** **** 7890',
          status: 'active',
          is_default: false
        }
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }) as typeof fetch;
    try {
      const client = new ApiMerchantRouteAdminClient('https://api.example', 'test_mch_dev');
      await client.createRoute({ route_code: 'SBER-CARD' });
      await client.updateRoute('route_live', { enabled: false });

      expect(calls).toHaveLength(2);
      expect(calls[0]?.init?.method).toBe('POST');
      expect(calls[0]?.url).toBe('https://api.example/v1/merchant/receiving-methods');
      expect(calls[1]?.init?.method).toBe('POST');
      expect(calls[1]?.url).toBe('https://api.example/v1/merchant/receiving-methods/route_live/disable');
      const writeHeaders = new Headers(calls[0]?.init?.headers);
      const disableHeaders = new Headers(calls[1]?.init?.headers);
      expect(writeHeaders.get('Authorization')).toBe('Bearer test_mch_dev');
      expect(writeHeaders.get('Content-Type')).toBe('application/json');
      expect(disableHeaders.get('Authorization')).toBe('Bearer test_mch_dev');
    } finally {
      globalThis.fetch = previousFetch;
    }
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
      bank_profile_id: String(input.bank_id),
      rail_type: 'phone_transfer',
      receiver_identifier_type: 'phone',
      receiver_identifier_masked: '+7 *** *** **33',
      route_code: String(input.label),
      display_label: String(input.label),
      enabled: true,
      recommended: Boolean(input.is_default),
      review_policy: 'eligible_low_risk_later',
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
