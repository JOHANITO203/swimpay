#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const composePath = join(repoRoot, 'infra/docker-compose.yml');
const envPath = join(repoRoot, '.env.example');
const caddyPath = join(repoRoot, 'infra/caddy/Caddyfile');
const env = parseEnv(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '');
const hostPort = env.HTTP_PORT ?? '8080';
const apiHealthUrl = `http://localhost:${hostPort}/api-health`;

function run(command, args) {
  return spawnSync(command, args, { cwd: repoRoot, shell: true, encoding: 'utf8' });
}

function statusLine(label, ok, detail = '') {
  console.log(`${label}: ${ok ? 'PASS' : 'FAIL'}${detail ? ` - ${detail}` : ''}`);
}

function firstLine(value) {
  return value.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim() ?? '';
}

console.log('# SwimPay Local Backend Doctor');
statusLine('docker-compose file exists', existsSync(composePath), composePath);
statusLine('env example exists', existsSync(envPath), envPath);
statusLine('caddy file exists', existsSync(caddyPath), caddyPath);
console.log(`Expected host proxy port: ${hostPort}`);
console.log(`Expected API health URL: ${apiHealthUrl}`);
console.log('Note: swimpay-api listens on private container port 3000 and is intentionally not host-published.');

const docker = run('docker', ['version', '--format', '{{.Server.Version}}']);
statusLine('docker server available', docker.status === 0, firstLine(docker.stdout || docker.stderr));

const compose = run('docker', ['compose', '--env-file', '.env.example', '-f', 'infra/docker-compose.yml', 'config']);
statusLine('compose config valid', compose.status === 0, compose.status === 0 ? 'valid' : firstLine(compose.stderr || compose.stdout));

const ps = run('docker', ['compose', '--env-file', '.env.example', '-f', 'infra/docker-compose.yml', 'ps']);
statusLine('compose ps available', ps.status === 0);
if (ps.stdout.trim()) {
  console.log(ps.stdout.trim());
}

const health = await globalThis.fetch(apiHealthUrl).then(
  async (response) => ({ ok: response.ok, text: await response.text() }),
  (error) => ({ ok: false, text: String(error) })
);
statusLine('api health via proxy', health.ok, health.text);

function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const index = trimmed.indexOf('=');
    if (index === -1) {
      continue;
    }
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return values;
}
