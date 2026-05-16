import { spawnSync } from 'node:child_process';

export const expectedServices = [
  'postgres',
  'valkey',
  'nats',
  'swimpay-api',
  'swimpay-signal-worker',
  'swimpay-job-worker',
  'swimpay-web',
  'proxy'
];

export const privateServices = ['postgres', 'valkey', 'nats'];
export const runtimeHealthServices = ['swimpay-api', 'swimpay-signal-worker', 'swimpay-job-worker', 'swimpay-web'];

export function inspectComposeConfig(config) {
  const failures = [];
  const services = config.services ?? {};
  const runtimeNetwork = config.networks?.swimpay_runtime;

  if (!runtimeNetwork) {
    failures.push('swimpay_runtime network must exist');
  }

  if (runtimeNetwork?.internal === true) {
    failures.push('swimpay_runtime network must allow outbound provider verification');
  }

  for (const serviceName of expectedServices) {
    if (!services[serviceName]) {
      failures.push(`missing service: ${serviceName}`);
    }
  }

  for (const serviceName of privateServices) {
    const service = services[serviceName];
    if (!service) {
      continue;
    }

    if (Array.isArray(service.ports) && service.ports.length > 0) {
      failures.push(`${serviceName} must not publish host ports`);
    }

    if (!service.networks || !Object.hasOwn(service.networks, 'swimpay_runtime')) {
      failures.push(`${serviceName} must use swimpay_runtime`);
    }

    if (!service.healthcheck) {
      failures.push(`${serviceName} must define a healthcheck`);
    }
  }

  for (const serviceName of runtimeHealthServices) {
    const service = services[serviceName];
    if (!service?.healthcheck) {
      failures.push(`${serviceName} must define a healthcheck`);
    }
    if (!service?.logging?.options?.['max-size'] || !service.logging.options['max-file']) {
      failures.push(`${serviceName} must use Docker log rotation options`);
    }
  }

  const proxy = services.proxy;
  if (!proxy || !Array.isArray(proxy.ports) || proxy.ports.length !== 1) {
    failures.push('proxy must publish exactly one host port');
  }

  const internalPublished = Object.entries(services)
    .filter(([serviceName]) => serviceName !== 'proxy')
    .filter(([, service]) => Array.isArray(service.ports) && service.ports.length > 0)
    .map(([serviceName]) => serviceName);

  if (internalPublished.length > 0) {
    failures.push(`only proxy may publish host ports; found: ${internalPublished.join(', ')}`);
  }

  return {
    ok: failures.length === 0,
    failures,
    checked_services: expectedServices
  };
}

function readComposeConfig() {
  const result = spawnSync('docker compose --env-file .env.example -f infra/docker-compose.yml config --format json', {
    cwd: process.cwd(),
    shell: true,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    throw new Error(`docker compose config failed with exit ${result.status ?? 1}`);
  }

  return JSON.parse(result.stdout);
}

function main() {
  const config = readComposeConfig();
  const result = inspectComposeConfig(config);

  console.log('SwimPay live runtime smoke config check');
  for (const serviceName of result.checked_services) {
    console.log(`- checked service: ${serviceName}`);
  }

  if (!result.ok) {
    for (const failure of result.failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exit(1);
  }

  console.log('PASS: Docker Compose runtime smoke config is safe for local startup.');
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('live-runtime-smoke.mjs')) {
  main();
}
