import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('production runtime secret guardrails', () => {
  it('requires externally injected runtime secrets instead of production local defaults', () => {
    const compose = readFileSync(join(root, 'infra/docker-compose.yml'), 'utf8');

    for (const required of [
      'DATABASE_URL: ${DATABASE_URL:?set DATABASE_URL from external secret storage}',
      'CHECKOUT_BASE_URL: ${CHECKOUT_BASE_URL:?set CHECKOUT_BASE_URL to the public checkout URL}',
      'PHONE_HMAC_SECRET: ${PHONE_HMAC_SECRET:?set PHONE_HMAC_SECRET from external secret storage}',
      'WEBHOOK_SECRET_ENCRYPTION_KEY: ${WEBHOOK_SECRET_ENCRYPTION_KEY:?set WEBHOOK_SECRET_ENCRYPTION_KEY from external secret storage}',
      'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD from external secret storage}'
    ]) {
      expect(compose).toContain(required);
    }

    expect(compose).not.toContain('DATABASE_URL: ${DATABASE_URL:-postgres://swimpay:swimpay_dev_password@postgres:5432/swimpay}');
    expect(compose).not.toContain('CHECKOUT_BASE_URL: ${CHECKOUT_BASE_URL:-http://localhost:3001/checkout}');
    expect(compose).not.toContain('PHONE_HMAC_SECRET: ${PHONE_HMAC_SECRET:-local_dev_phone_hmac_secret}');
    expect(compose).not.toContain(
      'WEBHOOK_SECRET_ENCRYPTION_KEY: ${WEBHOOK_SECRET_ENCRYPTION_KEY:-local_dev_webhook_secret_encryption_key}'
    );
    expect(compose).not.toContain('POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-swimpay_dev_password}');
  });

  it('keeps local-only secret examples out of the production env template', () => {
    const productionEnvExample = readFileSync(join(root, '.env.production.example'), 'utf8');

    expect(productionEnvExample).toContain('DATABASE_URL=postgres://swimpay:<POSTGRES_PASSWORD>@postgres:5432/swimpay');
    expect(productionEnvExample).toContain('CHECKOUT_BASE_URL=https://swimpay.pro/checkout');
    expect(productionEnvExample).toContain('PHONE_HMAC_SECRET=');
    expect(productionEnvExample).toContain('WEBHOOK_SECRET_ENCRYPTION_KEY=');
    expect(productionEnvExample).not.toMatch(/swimpay_dev_password|local_dev_phone_hmac_secret|localhost:3001\/checkout/u);
  });

  it('documents Android release production config and the Google web BFF seam', () => {
    const docs = readFileSync(join(root, 'docs/ANDROID_RELEASE_AND_PRODUCTION_CONFIG.md'), 'utf8');

    expect(docs).toContain('SWIMPAY_ANDROID_PRODUCTION_BACKEND_BASE_URL');
    expect(docs).toContain('SWIMPAY_ANDROID_PRODUCTION_GOOGLE_SERVER_CLIENT_ID');
    expect(docs).toContain('R8 minification and resource shrinking');
    expect(docs).toContain('Android Google is optional recovery/linking only');
    expect(docs).toContain('web BFF Google redirect endpoints are still an explicit 501 seam');
    expect(docs).toContain('Android never confirms orders locally');
  });
});
