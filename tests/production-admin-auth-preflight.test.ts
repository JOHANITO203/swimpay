import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildProductionAdminAuthPreflightPolicy,
  inspectProductionAdminAuthPreflight,
  renderProductionAdminAuthPreflightReport
} from '../scripts/production-admin-auth-preflight.mjs';

const root = process.cwd();

describe('production admin auth and secret injection preflight', () => {
  test('defines a non-mutating production admin auth policy', () => {
    const policy = buildProductionAdminAuthPreflightPolicy();

    expect(policy.scope).toBe('production_admin_auth_secret_injection_preflight');
    expect(policy.mutatesSecrets).toBe(false);
    expect(policy.requiresProductionDeployment).toBe(false);
    expect(policy.allowedProductionAdminAuthModes).toContain('signed_token');
    expect(policy.forbiddenProductionValues).toContain('ADMIN_AUTH_MODE=dev_token');
    expect(policy.forbiddenProductionValues).toContain('DEV_ADMIN_TOKEN set');
    expect(JSON.stringify(policy)).not.toMatch(/official_bank_confirmation|auto_confirm_enabled":true|bank_confirmed/iu);
  });

  test('rejects dev admin auth values in a production environment', () => {
    const result = inspectProductionAdminAuthPreflight({
      root,
      envText: [
        'NODE_ENV=production',
        'ADMIN_AUTH_MODE=dev_token',
        'DEV_ADMIN_TOKEN=change_me_local_admin_token',
        'DEV_ADMIN_OPERATOR_ID=dev_operator',
        'DEV_ADMIN_ROLE=admin',
        'ADMIN_TOKEN_HMAC_SECRET=change_me_only_for_signed_admin_tokens'
      ].join('\n'),
      templateMode: false
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('production environment must not use ADMIN_AUTH_MODE=dev_token');
    expect(result.failures).toContain('production environment must not set DEV_ADMIN_TOKEN');
    expect(result.failures).toContain('ADMIN_TOKEN_HMAC_SECRET must not use a change_me placeholder');
  });

  test('accepts the repository production template as a no-secret handoff shape', () => {
    const result = inspectProductionAdminAuthPreflight({ root });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.summary.productionTemplatePresent).toBe(true);
    expect(result.summary.devAdminValuesRejected).toBe(true);
    expect(result.summary.secretInjectionDocumented).toBe(true);
    expect(result.summary.noCommittedProductionSecrets).toBe(true);
  });

  test('renders a safe report without raw tokens or secrets', () => {
    const report = renderProductionAdminAuthPreflightReport(
      inspectProductionAdminAuthPreflight({
        root,
        now: '2026-05-03T15:00:00+03:00'
      })
    );

    expect(report).toContain('# Production Admin Auth Preflight');
    expect(report).toContain('status: PASS');
    expect(report).toContain('ADMIN_AUTH_MODE=dev_token');
    expect(report).not.toMatch(/op_ops_[A-Za-z0-9_.-]+|ADMIN_TOKEN_HMAC_SECRET=.*[A-Za-z0-9_-]{16,}|raw_phone|raw_notification_text/iu);
  });

  test('Sprint 5B task artifacts and npm script remain available after later queues take over', () => {
    const taskArtifacts = [
      '265_production_admin_auth_mode_preflight',
      '266_production_secret_injection_template',
      '267_no_secret_in_repo_checks',
      '268_signed_token_helper_local_only_guard',
      '269_production_admin_auth_preflight_tests',
      '270_security_docs_production_admin_auth_update',
      '271_sprint_5b_validation',
      '272_sprint_5b_closeout_review'
    ];

    for (const task of taskArtifacts) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['production:admin-auth-preflight']).toBe('node scripts/production-admin-auth-preflight.mjs');
  });
});
