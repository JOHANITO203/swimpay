import { describe, expect, test } from 'vitest';
import { buildApiServer } from './server.js';

describe('api health route', () => {
  test('returns service name, version, environment and dependency statuses', async () => {
    const server = buildApiServer({
      environment: 'test',
      healthChecks: {
        database: async () => 'skipped',
        nats: async () => 'skipped',
        valkey: async () => 'skipped'
      }
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
      }
    });
  });
});
