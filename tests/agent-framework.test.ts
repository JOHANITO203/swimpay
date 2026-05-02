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
  'scripts/android-emulator-doctor.mjs',
  'scripts/local-backend-doctor.mjs'
];

describe('local agent orchestration framework', () => {
  test('contains the required control files and scripts', () => {
    for (const file of requiredAgentFiles) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });

  test('task queue lists Sprint 4G persistent receiver tasks in the approved order', () => {
    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');

    const orderedTasks = [
      '097_android_persistent_device_state',
      '098_android_persistent_protected_outbox',
      '099_android_workmanager_retry_live_wiring',
      '100_android_live_backend_status_refresh',
      '101_android_debug_panel_persistence_polish',
      '102_real_device_offline_online_persistent_outbox_smoke',
      '103_sprint_4g_closeout_review'
    ];

    let previousIndex = -1;
    for (const task of orderedTasks) {
      const index = queue.search(new RegExp(`\\\`${task}\\\` - status: (pending|completed|blocked) - source: \\\`tasks/${task}\\.md\\\``));
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
    expect(pkg.scripts['backend:doctor']).toBe('node scripts/local-backend-doctor.mjs');
  });
});
