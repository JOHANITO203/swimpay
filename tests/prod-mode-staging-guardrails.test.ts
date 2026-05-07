import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('production-mode staging guardrails', () => {
  it('documents required production auth and secret environment without committing real Google secrets', () => {
    const envExample = read('.env.example');
    const productionEnvExample = read('.env.production.example');
    const docs = read('docs/PRODUCTION_ENVIRONMENT.md');

    for (const required of [
      'GOOGLE_OAUTH_CLIENT_ID=',
      'GOOGLE_OAUTH_CLIENT_SECRET=',
      'GOOGLE_OAUTH_REDIRECT_URI=',
      'PHONE_HMAC_SECRET=',
      'WEBHOOK_SECRET_ENCRYPTION_KEY=',
      'ADMIN_TOKEN_HMAC_SECRET='
    ]) {
      expect(envExample).toContain(required);
      expect(productionEnvExample).toContain(required);
    }

    expect(`${envExample}\n${productionEnvExample}\n${docs}`).not.toMatch(/GOCSPX-[A-Za-z0-9_-]+/u);
    expect(docs).toContain('Local `Bearer test_*` merchant bearers must fail closed in production mode.');
    expect(docs).toContain('Merchant API keys are server-side only.');
    expect(docs).toContain('official_bank_confirmation');
    expect(docs).not.toMatch(/official_bank_confirmation["'`\s:=]+true/iu);
  });

  it('keeps the staging seed script explicit, synthetic and opt-in only', () => {
    const script = read('scripts/seed-staging-auth-bff.mjs');

    expect(script).toContain('SWIMPAY_STAGING_SEED_CONFIRM');
    expect(script).toContain('seed-local-staging-auth');
    expect(script).toContain('SWIMPAY_STAGING_SEED_ALLOW_PRODUCTION');
    expect(script).toContain('staging-merchant@example.test');
    expect(script).toContain('api_key_sha256:');
    expect(script).toContain('bff_session_sha256:');
    expect(script).not.toMatch(/client_secret_[A-Za-z0-9_-]+\.apps\.googleusercontent\.com\.json/u);
    expect(script).not.toMatch(/GOCSPX-[A-Za-z0-9_-]+/u);
  });
});

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}
