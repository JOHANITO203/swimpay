import { describe, expect, test } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('single-server docker compose deployment', () => {
  const composePath = join(root, 'infra/docker-compose.yml');
  const compose = readFileSync(composePath, 'utf8');

  test('defines a proxy and all required private services', () => {
    for (const service of [
      'proxy',
      'postgres',
      'valkey',
      'nats',
      'swimpay-api',
      'swimpay-signal-worker',
      'swimpay-job-worker',
      'swimpay-web'
    ]) {
      expect(compose).toContain(`  ${service}:`);
    }

    expect(existsSync(join(root, 'infra/caddy/Caddyfile'))).toBe(true);
  });

  test('publishes host ports only from the proxy service', () => {
    const serviceBlocks = compose.split(/\n(?= {2}[a-z0-9-]+:\n)/u).slice(1);
    const servicesWithPorts = serviceBlocks
      .filter((block) => block.includes('\n    ports:'))
      .map((block) => block.match(/^ {2}([a-z0-9-]+):/u)?.[1]);

    expect(servicesWithPorts).toEqual(['proxy']);
    expect(compose).not.toContain('${API_PORT:-3000}:3000');
    expect(compose).not.toContain('${WEB_PORT:-3001}:3001');
  });

  test('keeps PostgreSQL, Valkey and NATS private with health checks and log rotation', () => {
    for (const service of ['postgres', 'valkey', 'nats']) {
      const serviceBlock = compose.match(new RegExp(` {2}${service}:\\n[\\s\\S]*?(?=\\n {2}[a-z0-9-]+:\\n|\\nnetworks:)`, 'u'))?.[0] ?? '';

      expect(serviceBlock).toContain('swimpay_private');
      expect(serviceBlock).toContain('healthcheck:');
      expect(serviceBlock).not.toContain('ports:');
    }

    expect(compose).toContain('max-size: "${DOCKER_LOG_MAX_SIZE:-50m}"');
    expect(compose).toContain('max-file: "${DOCKER_LOG_MAX_FILE:-3}"');
  });
});
