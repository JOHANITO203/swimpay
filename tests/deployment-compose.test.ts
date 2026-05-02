import { describe, expect, test } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const dockerizedWorkspaces = [
  { app: 'api', packageName: '@swimpay/api' },
  { app: 'signal-worker', packageName: '@swimpay/signal-worker' },
  { app: 'job-worker', packageName: '@swimpay/job-worker' },
  { app: 'web', packageName: '@swimpay/web' }
] as const;

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

  test('configures PostgreSQL to accept private Docker network connections only', () => {
    const postgresConfig = readFileSync(join(root, 'infra/postgres/postgresql.conf'), 'utf8');

    expect(postgresConfig).toContain("listen_addresses = '*'");
    expect(compose).not.toContain('5432:5432');
  });

  test('dockerized apps copy their declared workspace package dependencies', () => {
    for (const workspace of dockerizedWorkspaces) {
      const packageJson = JSON.parse(
        readFileSync(join(root, 'apps', workspace.app, 'package.json'), 'utf8')
      ) as { dependencies?: Record<string, string> };
      const dockerfile = readFileSync(join(root, 'apps', workspace.app, 'Dockerfile'), 'utf8');
      const workspaceDeps = Object.keys(packageJson.dependencies ?? {})
        .filter((dependency) => dependency.startsWith('@swimpay/'))
        .filter((dependency) => dependency !== workspace.packageName)
        .map((dependency) => dependency.replace('@swimpay/', ''));

      for (const dependency of workspaceDeps) {
        expect(dockerfile, `${workspace.app} Dockerfile should copy packages/${dependency}`).toContain(
          `COPY packages/${dependency}`
        );
        expect(
          dockerfile,
          `${workspace.app} Dockerfile should include packages/${dependency}/package.json before npm ci`
        ).toContain(`COPY packages/${dependency}/package.json packages/${dependency}/package.json`);
      }
    }
  });
});
