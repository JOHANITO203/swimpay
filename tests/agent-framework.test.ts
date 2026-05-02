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
  'scripts/agent-summary.mjs',
  'scripts/receiver-local-smoke.mjs',
  'scripts/android-toolchain-check.mjs',
  'scripts/android-emulator-doctor.mjs'
];

describe('local agent orchestration framework', () => {
  test('contains the required control files and scripts', () => {
    for (const file of requiredAgentFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });

  test('task queue lists Sprint 4C emulator smoke tasks in the approved order', () => {
    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');

    const orderedTasks = [
      '068_emulator_environment_doctor',
      '069_emulator_install_and_launch',
      '070_notification_access_manual_flow',
      '071_receiver_register_heartbeat_local_backend',
      '072_receiver_synthetic_signal_upload_local_backend',
      '073_receiver_outbox_offline_online_smoke',
      '074_emulator_smoke_closeout_review'
    ];

    let previousIndex = -1;
    for (const task of orderedTasks) {
      const index = queue.search(new RegExp(`\\\`${task}\\\` - status: (completed|blocked) - source: \\\`tasks/${task}\\.md\\\``));
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
    expect(pkg.scripts['smoke:receiver']).toBe('node scripts/receiver-local-smoke.mjs');
    expect(pkg.scripts['android:doctor']).toBe('node scripts/android-toolchain-check.mjs');
    expect(pkg.scripts['android:emulator-doctor']).toBe('node scripts/android-emulator-doctor.mjs');
  });
});
