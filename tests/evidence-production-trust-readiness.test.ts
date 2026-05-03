import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildProductionTrustReadinessChecklist,
  inspectProductionTrustReadiness,
  renderProductionTrustReadinessReport
} from '../scripts/evidence-production-trust-readiness.mjs';

const root = process.cwd();

describe('production trust handoff readiness packaging', () => {
  test('builds a non-mutating operator readiness checklist with hard safety gates', () => {
    const checklist = buildProductionTrustReadinessChecklist();

    expect(checklist.scope).toBe('operator_handoff_readiness');
    expect(checklist.mutatesEvidence).toBe(false);
    expect(checklist.requiresProductionDeployment).toBe(false);
    expect(checklist.requiresRealNotifications).toBe(false);
    expect(checklist.requiredArtifacts).toContain('docs/BANK_EVIDENCE_SIGNED_COMPOSE_HANDOFF_PLAYBOOK.md');
    expect(checklist.requiredArtifacts).toContain('infra/docker-compose.signed-admin.override.yml');
    expect(checklist.acceptanceCriteria).toContain('metadata trust must be revoked after every rehearsal');
    expect(JSON.stringify(checklist)).not.toMatch(/official_bank_confirmation|bank_confirmed|auto_confirm_enabled":true/iu);
  });

  test('inspects the current repository for handoff readiness artifacts and safety wording', () => {
    const result = inspectProductionTrustReadiness({ root });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.summary.requiredArtifactsPresent).toBe(true);
    expect(result.summary.blockersClear).toBe(true);
    expect(result.summary.sprint4YPassed).toBe(true);
    expect(result.summary.noForbiddenSafetyText).toBe(true);
    expect(result.summary.defaultComposeModeDocumented).toBe(true);
  });

  test('renders a concise markdown report without secrets or raw PII', () => {
    const report = renderProductionTrustReadinessReport(
      inspectProductionTrustReadiness({
        root,
        now: '2026-05-03T14:10:00+03:00'
      })
    );

    expect(report).toContain('# Production Trust Handoff Readiness Check');
    expect(report).toContain('status: PASS');
    expect(report).toContain('metadata trust must be revoked');
    expect(report).not.toMatch(/raw_phone|raw_notification_text|official_bank_confirmation":true|auto_confirm_enabled":true/iu);
  });

  test('Sprint 4Z task artifacts and npm script remain available', () => {
    const taskArtifacts = [
      '249_operator_handoff_package_checklist',
      '250_production_trust_readiness_gate',
      '251_signed_compose_evidence_trail_packaging',
      '252_operator_secret_and_token_handling_runbook',
      '253_handoff_acceptance_tests',
      '254_production_readiness_docs',
      '255_sprint_4z_validation',
      '256_sprint_4z_closeout_review'
    ];

    for (const task of taskArtifacts) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['handoff:evidence-readiness']).toBe('node scripts/evidence-production-trust-readiness.mjs');
  });
});
