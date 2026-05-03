import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildOperatorIdentityLifecyclePolicy,
  inspectOperatorIdentityReadiness,
  renderOperatorIdentityReadinessReport
} from '../scripts/operator-identity-readiness.mjs';

const root = process.cwd();

describe('production operator identity and secret lifecycle readiness', () => {
  test('defines a non-mutating identity lifecycle policy with explicit production gaps', () => {
    const policy = buildOperatorIdentityLifecyclePolicy();

    expect(policy.scope).toBe('production_operator_identity_secret_lifecycle');
    expect(policy.mutatesSecrets).toBe(false);
    expect(policy.generatesProductionSecrets).toBe(false);
    expect(policy.requiresProductionDeployment).toBe(false);
    expect(policy.requiredControls).toContain('operator_onboarding');
    expect(policy.requiredControls).toContain('credential_rotation');
    expect(policy.requiredControls).toContain('credential_revocation');
    expect(policy.requiredControls).toContain('break_glass_access');
    expect(policy.requiredControls).toContain('audit_review');
    expect(policy.forbiddenProductionStates).toContain('ADMIN_AUTH_MODE=dev_token');
    expect(policy.forbiddenProductionStates).toContain('DEV_ADMIN_TOKEN set');
    expect(JSON.stringify(policy)).not.toMatch(/official_bank_confirmation|auto_confirm_enabled":true|bank_confirmed/iu);
  });

  test('inspects required docs and scripts without requiring real secrets', () => {
    const result = inspectOperatorIdentityReadiness({ root });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.summary.requiredArtifactsPresent).toBe(true);
    expect(result.summary.localTokenHelperMarkedNonProduction).toBe(true);
    expect(result.summary.productionLifecycleDocumented).toBe(true);
    expect(result.summary.productionPreflightDocumented).toBe(true);
    expect(result.summary.noForbiddenSafetyText).toBe(true);
    expect(result.missingArtifacts).not.toContain('.swimpay-agent/SPRINT_5A_REPORT.md');
    expect(result.missingArtifacts).not.toContain('tasks/264_sprint_5a_closeout_review.md');
  });

  test('renders a safe report without tokens, HMAC secrets or raw PII', () => {
    const report = renderOperatorIdentityReadinessReport(
      inspectOperatorIdentityReadiness({
        root,
        now: '2026-05-03T14:30:00+03:00'
      })
    );

    expect(report).toContain('# Operator Identity and Secret Lifecycle Readiness');
    expect(report).toContain('status: PASS');
    expect(report).toContain('ADMIN_AUTH_MODE=dev_token');
    expect(report).not.toMatch(/op_ops_[A-Za-z0-9_.-]+|ADMIN_TOKEN_HMAC_SECRET=.*[A-Za-z0-9_-]{16,}|raw_phone|raw_notification_text/iu);
  });

  test('Sprint 5A task artifacts and npm script remain available', () => {
    const taskArtifacts = [
      '257_operator_identity_lifecycle_policy',
      '258_operator_secret_storage_and_rotation_runbook',
      '259_operator_revocation_and_break_glass_runbook',
      '260_production_admin_auth_preflight_gate',
      '261_operator_identity_readiness_tests',
      '262_security_docs_operator_identity_update',
      '263_sprint_5a_validation',
      '264_sprint_5a_closeout_review'
    ];

    for (const task of taskArtifacts) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['operator:identity-readiness']).toBe('node scripts/operator-identity-readiness.mjs');
  });
});
