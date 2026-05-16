import { describe, expect, test } from 'vitest';
import { inspectComposeConfig } from '../scripts/live-runtime-smoke.mjs';

describe('live runtime smoke checks', () => {
  test('accepts the expected private single-server Compose shape', () => {
    const result = inspectComposeConfig({
      networks: {
        swimpay_runtime: { internal: false },
        swimpay_public: {}
      },
      services: {
        postgres: privateService(),
        valkey: privateService(),
        nats: privateService(),
        'swimpay-api': runtimeService(),
        'swimpay-signal-worker': runtimeService(),
        'swimpay-job-worker': runtimeService(),
        'swimpay-web': runtimeService(),
        proxy: {
          ports: [{ target: 80, published: '8080', protocol: 'tcp' }],
          healthcheck: { test: ['CMD', 'true'] },
          networks: { swimpay_runtime: null, swimpay_public: null },
          logging: dockerLogging()
        }
      }
    });

    expect(result).toMatchObject({ ok: true, failures: [] });
  });

  test('rejects public host ports on PostgreSQL, Valkey or NATS', () => {
    const result = inspectComposeConfig({
      networks: {
        swimpay_runtime: { internal: false }
      },
      services: {
        postgres: { ...privateService(), ports: [{ target: 5432, published: '5432' }] },
        valkey: privateService(),
        nats: privateService(),
        'swimpay-api': runtimeService(),
        'swimpay-signal-worker': runtimeService(),
        'swimpay-job-worker': runtimeService(),
        'swimpay-web': runtimeService(),
        proxy: { ports: [{ target: 80, published: '8080' }], healthcheck: { test: ['CMD', 'true'] } }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('postgres must not publish host ports');
  });

  test('rejects missing runtime healthchecks', () => {
    const result = inspectComposeConfig({
      networks: {
        swimpay_runtime: { internal: false }
      },
      services: {
        postgres: privateService(),
        valkey: privateService(),
        nats: privateService(),
        'swimpay-api': { ...runtimeService(), healthcheck: undefined },
        'swimpay-signal-worker': runtimeService(),
        'swimpay-job-worker': runtimeService(),
        'swimpay-web': runtimeService(),
        proxy: { ports: [{ target: 80, published: '8080' }], healthcheck: { test: ['CMD', 'true'] } }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('swimpay-api must define a healthcheck');
  });
});

function privateService() {
  return {
    networks: { swimpay_runtime: null },
    healthcheck: { test: ['CMD', 'true'] },
    logging: dockerLogging()
  };
}

function runtimeService() {
  return {
    networks: { swimpay_runtime: null },
    expose: ['3000'],
    healthcheck: { test: ['CMD', 'true'] },
    logging: dockerLogging()
  };
}

function dockerLogging() {
  return {
    options: {
      'max-size': '50m',
      'max-file': '3'
    }
  };
}
