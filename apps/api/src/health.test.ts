import { describe, expect, test } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import { buildApiServer } from './server.js';

describe('api health route', () => {
  test('returns safe service health, uptime, timestamp and dependency statuses', async () => {
    const server = buildApiServer({
      environment: 'test',
      healthChecks: {
        database: async () => 'skipped',
        nats: async () => 'skipped',
        valkey: async () => 'skipped'
      },
      clock: () => new Date('2026-05-02T12:00:30.000Z'),
      startedAt: new Date('2026-05-02T12:00:00.000Z')
    });

    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: 'swimpay-api',
      version: '0.1.0',
      environment: 'test',
      dependencies: {
        database: 'skipped',
        nats: 'skipped',
        valkey: 'skipped'
      },
      uptime_seconds: 30,
      timestamp: '2026-05-02T12:00:30.000Z'
    });
    expect(response.body).not.toContain('secret');
  });

  test('protects metrics snapshot with admin RBAC and permits read-only access', async () => {
    const metrics = new InMemoryMetricsRegistry();
    metrics.increment(MetricNames.ORDERS_CREATED_TOTAL);
    metrics.increment(MetricNames.SIGNALS_NEEDS_REVIEW_TOTAL);
    metrics.setGauge(MetricNames.WEBHOOK_DELIVERIES_PENDING, 2);

    const server = buildApiServer({
      environment: 'test',
      metrics,
      healthChecks: {
        database: async () => 'skipped',
        nats: async () => 'skipped',
        valkey: async () => 'skipped'
      },
      adminAuth: {
        mode: 'dev_token',
        environment: 'test',
        devToken: 'local-admin-token',
        devOperatorId: 'ops_readonly',
        devRole: 'read_only'
      }
    });

    const unauthorized = await server.inject({ method: 'GET', url: '/v1/admin/metrics' });
    const authorized = await server.inject({
      method: 'GET',
      url: '/v1/admin/metrics',
      headers: { authorization: 'Bearer local-admin-token' }
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toEqual({
      metrics: {
        counters: {
          orders_created_total: 1,
          signals_needs_review_total: 1
        },
        gauges: {
          webhook_deliveries_pending: 2
        }
      }
    });
    expect(authorized.body).not.toContain('+7999');
    expect(authorized.body).not.toContain('raw notification');
  });
});
