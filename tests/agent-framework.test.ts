import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const requiredAgentFiles = [
  '.swimpay-agent/README.md',
  '.swimpay-agent/AGENT_RULES.md',
  '.swimpay-agent/TASK_QUEUE.md',
  '.swimpay-agent/CURRENT_TASK.md',
  '.swimpay-agent/PROGRESS_LOG.md',
  '.swimpay-agent/DECISION_LOG.md',
  '.swimpay-agent/BLOCKERS.md',
  '.swimpay-agent/NEXT_ACTION.md',
  '.swimpay-agent/SAFETY_CHECKLIST.md',
  '.swimpay-agent/run_task.sh',
  '.swimpay-agent/validate_task.sh',
  '.swimpay-agent/summarize_work.sh',
  'scripts/agent-runner.mjs',
  'scripts/agent-validate.mjs',
  'scripts/agent-summary.mjs'
];

describe('local agent orchestration framework', () => {
  test('contains the required control files and scripts', () => {
    for (const file of requiredAgentFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });

  test('task queue lists imported bank template tasks as executable in the approved order', () => {
    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');

    expect(queue).toContain('003_implement_order_api');
    expect(queue).toContain('source: `tasks/003_implement_order_api.md`');

    const orderedTasks = [
      '010_review_queue',
      '011_hosted_checkout',
      '012_webhook_worker',
      '018_bank_template_package_setup',
      '019_bank_profile_registry',
      '020_bank_template_parser_core',
      '021_bank_template_fixtures_tests',
      '022_bank_template_drift_radar',
      '013_bank_template_learning',
      '014_deployment_docker_compose',
      '015_security_hardening',
      '016_end_to_end_tests',
      '017_admin_console_minimal',
      '023_bank_template_admin_console'
    ];

    let previousIndex = -1;
    for (const task of orderedTasks) {
      const index = queue.indexOf(`\`${task}\` - status: pending - source: \`tasks/${task}.md\``);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }

    expect(queue).not.toContain('status: missing');
  });

  test('agent rules include critical SwimPay guardrails', () => {
    const rules = readFileSync(join(root, '.swimpay-agent/AGENT_RULES.md'), 'utf8');

    expect(rules).toContain('The agent may:');
    expect(rules).toContain('The agent must not:');
    expect(rules).toContain('claim official bank confirmation');
    expect(rules).toContain('store raw phone numbers');
    expect(rules).toContain('store raw notification text by default');
    expect(rules).toContain('continue if tests fail and the failure is not understood');
  });

  test('package scripts expose the local agent commands', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts['agent:next']).toBe('node scripts/agent-runner.mjs');
    expect(pkg.scripts['agent:validate']).toBe('node scripts/agent-validate.mjs');
    expect(pkg.scripts['agent:summary']).toBe('node scripts/agent-summary.mjs');
  });
});
